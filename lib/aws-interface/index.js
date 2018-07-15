let fs = require('fs');
let aws = require('aws-sdk');
let resolve = require('path').resolve;
let util = require('../utilities');

module.exports = {
    createAPIGW: function(derpConfigData, cb) {
        util.showLog(`Deploying API Gateway for ${derpConfigData.appName}...`);

        let apigw = new aws.APIGateway({ region: derpConfigData.region });

        let params = {
            name: `derp-apigw-${derpConfigData.appName}`,
            description: `API Gateway for DERP App ${derpConfigData.appName}`,
            endpointConfiguration: { types: ["REGIONAL"] }
        };

        apigw.createRestApi(params, (err, data) => {
            if (err) console.log(err, err.stack); // an error occurred
            else {
                derpConfigData.gateway = { id: data.id };
                let getResParams = {
                    restApiId: derpConfigData.gateway.id
                };

                apigw.getResources(getResParams, (rErr, rData) => {
                    derpConfigData.gateway.rootResourceId = rData.items[0].id;
                    util.updateDerpConfigFileData(derpConfigData);
                    util.showLog(`Deployed API Gateway for ${derpConfigData.appName} (${data.id}).`);
                    cb(derpConfigData);
                });
            }
        });
    },

    updateAPIGW: function(derpConfigData, route, routeName) {
        //TODO: complex routes:
        // 1) hierarchical resources: /api/users
        // e.g. /api/users
        // 2) params: /api/users/<{pathPartName}>
        // e.g. /api/users/{id} = /api/users/1 

        let routeDefParts = util.getRoutePathParts(route.apiPath);

        util.showLog(`Updating API Gateway ${derpConfigData.gateway.id} with ${routeName} route...`);

        let apigw = new aws.APIGateway({ region: derpConfigData.region });
        let params = {
            parentId: derpConfigData.gateway.rootResourceId,
            restApiId: derpConfigData.gateway.id,
            pathPart: route.apiPath
        };

        apigw.createResource(params, (err, data) => {
            if (err) console.log(err, err.stack); // an error occurred
            else {
                derpConfigData.routes[routeName].gateway = { resource: data };
                util.showLog(`Deployed Route for ${routeName} (${data.id}).`);

                //create method
                let methodParams = {
                    authorizationType: 'NONE',
                    httpMethod: route.type,
                    resourceId: data.id,
                    restApiId: derpConfigData.gateway.id
                };

                apigw.putMethod(methodParams, (mErr, mData) => {
                    if (mErr) console.log(mErr, mErr.stack); // an error occurred
                    else {
                        derpConfigData.routes[routeName].gateway.method = mData;
                        util.updateDerpConfigFileData(derpConfigData);
                        util.showLog(`Deployed ${route.type} method for ${routeName} API Gateway.`);

                        let apiPutIntParams = {
                            httpMethod: route.type,
                            resourceId: route.gateway.resource.id,
                            restApiId: derpConfigData.gateway.id,
                            type: 'AWS_PROXY',
                            integrationHttpMethod: 'POST',
                            uri: `arn:aws:apigateway:${derpConfigData.region}:lambda:path//2015-03-31/functions/${derpConfigData.routes[routeName].lambda.functionArn}/invocations`
                        };

                        apigw.putIntegration(apiPutIntParams, (pErr, pData) => {
                            if (pErr) console.log(pErr, pErr.stack); // an error occurred
                            else {
                                util.showLog(`Integrated Lambda function with API Gateway.`);

                                //add perms via lambda
                                let lambda = new aws.Lambda({ region: derpConfigData.region });
                                let lambdaAddPermsParams = {
                                    Action: "lambda:InvokeFunction",
                                    FunctionName: derpConfigData.routes[routeName].lambda.functionName,
                                    Principal: "apigateway.amazonaws.com",
                                    StatementId: "ID-1"
                                };

                                lambda.addPermission(lambdaAddPermsParams, (laErr, laData) => {
                                    if (laErr) console.log(pErr, pErr.stack); // an error occurred
                                    else {
                                        util.showLog(`Added permission to Lambda function for API Gateway invocation.`);

                                        let apigCDParams = {
                                            restApiId: derpConfigData.gateway.id,
                                            stageName: 'api'
                                        };

                                        apigw.createDeployment(apigCDParams, (cdErr, cdData) => {
                                            if (cdErr) console.log(cdErr, cdErr.stack); // an error occurred
                                            else {
                                                util.showLog(`API Gateway Deployed to API stage.`);
                                                util.showLog(`Route fully deployed!`);
                                                derpConfigData.routes[routeName].url = `https://${derpConfigData.gateway.id}.execute-api.${derpConfigData.region}.amazonaws.com/api/${derpConfigData.routes[routeName].apiPath}`;
                                                util.updateDerpConfigFileData(derpConfigData);
                                                util.showLog(`View route at https://${derpConfigData.gateway.id}.execute-api.${derpConfigData.region}.amazonaws.com/api/${derpConfigData.routes[routeName].apiPath}`);
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    },

    createOrUpdateAPIGW: function(derpConfigData, route, routeName) {
        if (!derpConfigData.gateway) {
            //no gateway configured, create
            this.createAPIGW(derpConfigData, (derpConfigData) => {
                this.updateAPIGW(derpConfigData, route, routeName);
            });
        } else {
            if (!derpConfigData.routes[routeName].gateway) {
                //update app's gw
                this.updateAPIGW(derpConfigData, route, routeName);
            } else {
                //apigw already exists, only updated lambda function
                util.showLog(`Route fully deployed!`);
                util.showLog(`View route at https://${derpConfigData.gateway.id}.execute-api.${derpConfigData.region}.amazonaws.com/api/${derpConfigData.routes[routeName].apiPath}`);
            }
        }
    },

    createLambdaRole: function(derpConfigData, cb) {
        if (derpConfigData['lambda-role']) {
            if (derpConfigData['lambda-role'].roleArn && derpConfigData['lambda-role'].roleName)
                return cb(derpConfigData);
        }

        let iam = new aws.IAM({ region: derpConfigData.region });
        let lambdaTrustPath = resolve(__dirname, "../policies/lambda-trust.json");
        let iamRoleParams = {
            AssumeRolePolicyDocument: JSON.stringify(require(lambdaTrustPath)),
            RoleName: `derp-${derpConfigData.appName}-lambda`
        };

        iam.createRole(iamRoleParams, (rErr, rData) => {
            if (rErr) console.log(rErr, rErr.stack); // an error occurred
            else {
                derpConfigData['lambda-role'] = derpConfigData['lambda-role'] || {};
                derpConfigData['lambda-role'].roleName = rData.Role.RoleName;
                derpConfigData['lambda-role'].roleArn = rData.Role.Arn;
                util.updateDerpConfigFileData(derpConfigData);
                util.showLog(`Created Service Role For Lambda.`);
                cb(derpConfigData);
            }
        });
    },

    createLambdaRoleInlinePolicy: function(derpConfigData, cb) {
        if (derpConfigData['lambda-role'] && derpConfigData['lambda-role'].policy) {
            return cb(derpConfigData);
        }

        let iam = new aws.IAM({ region: derpConfigData.region });
        let lambdaPolicyPath = resolve(__dirname, "../policies/lambda.json");
        let iamPolicyParams = {
            PolicyName: `derp-${derpConfigData.appName}-lambda`,
            PolicyDocument: JSON.stringify(require(lambdaPolicyPath)),
            RoleName: derpConfigData['lambda-role'].roleName
        };

        iam.putRolePolicy(iamPolicyParams)
            .on('retry', (response) => {
                if (response.error) {
                    util.showLog(`Retrying lambda role policy association...`);
                    response.error.retryable = true; // retry this error
                    response.error.retryDelay = 10000; // wait 10 seconds
                }
            })
            .on('error', (err) => {
                console.log(err, err.stack); // an error occurred
            })
            .on('success', (data) => {
                util.showLog(`Added Inline Policy For Lambda Role`);
                derpConfigData['lambda-role'].policy = 'inline';
                util.updateDerpConfigFileData(derpConfigData);
                cb(derpConfigData);
            })
            .send();
    },

    setupUpdateLambdaParams: function(derpConfigData, routeName) {
        let AdmZip = require('adm-zip');
        let zip = new AdmZip();
        zip.addLocalFolder(`${derpConfigData.routes[routeName].path}`);
        let s3ZipBuffer = zip.toBuffer();

        let lambdaParams = {
            ZipFile: s3ZipBuffer,
            FunctionName: `derp-${derpConfigData.appName}-${routeName}`,
        };

        return lambdaParams;
    },

    setupNewLambdaParams: function(derpConfigData, routeName) {
        let AdmZip = require('adm-zip');
        let zip = new AdmZip();
        zip.addLocalFolder(`${derpConfigData.routes[routeName].path}`);
        let s3ZipBuffer = zip.toBuffer();

        let lambdaParams = {
            Code: {
                ZipFile: s3ZipBuffer
            },
            FunctionName: `derp-${derpConfigData.appName}-${routeName}`,
            Handler: 'index.handler',
            Role: derpConfigData['lambda-role'].roleArn,
            Runtime: 'nodejs8.10'
        };

        return lambdaParams;
    },

    updateLambdaFunction: function(derpConfigData, routeName, cb) {
        let lambda = new aws.Lambda({ region: derpConfigData.region });
        lambda.updateFunctionCode(this.setupUpdateLambdaParams(derpConfigData, routeName), (err, data) => {
            if (err) console.log(err, err.stack); // an error occurred
            else {
                util.showLog('Lambda function updated.');
                cb(derpConfigData);
            }
        });
    },

    createLambdaFunction: function(derpConfigData, routeName, cb) {
        if (derpConfigData.routes[routeName].lambda &&
            derpConfigData.routes[routeName].lambda.functionArn) {
            //lambda already exists, update function
            util.showLog(`Found deployed lambda for ${routeName}, updating...`);
            this.updateLambdaFunction(derpConfigData, routeName, cb);
        } else {
            //lambda not found, create function
            let lambda = new aws.Lambda({ region: derpConfigData.region });
            lambda.createFunction(this.setupNewLambdaParams(derpConfigData, routeName))
                .on('retry', (response) => {
                    if (response.error) {
                        util.showLog('Waiting for Lambda role to associate new policy...');
                        response.error.retryable = true; // retry this error
                        response.error.retryDelay = 5000; // wait 5 seconds
                    }
                })
                .on('error', (err) => {
                    console.log(err, err.stack);
                })
                .on('success', (response) => {
                    let data = response.data;
                    derpConfigData.routes[routeName].lambda =
                        derpConfigData.routes[routeName].lambda || {};
                    derpConfigData.routes[routeName].lambda.functionArn = data.FunctionArn;
                    derpConfigData.routes[routeName].lambda.functionName = data.FunctionName;
                    util.updateDerpConfigFileData(derpConfigData);
                    util.showLog('Lambda function created.');
                    cb(derpConfigData);
                })
                .send();
        }
    },

    createOrUpdateLambda: function(derpConfigData, route, routeName, cb) {
        util.showLog(`Deploying Lambda for ${routeName}...`);

        this.createLambdaRole(derpConfigData,
            (derpConfigData) => this.createLambdaRoleInlinePolicy(derpConfigData,
                (derpConfigData) => this.createLambdaFunction(derpConfigData, routeName, cb)
            ));
    }
};