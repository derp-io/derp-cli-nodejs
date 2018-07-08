let fs = require('fs');
let aws = require('aws-sdk');
let resolve = require('path').resolve;

module.exports = {
    derpConfigFilePath: './derp.json',
    routesFolderPath: './routes',

    getDerpConfigFileData: function() {
        return JSON.parse(fs.readFileSync(this.derpConfigFilePath, 'utf8'));
    },

    updateDerpConfigFileData: function(data) {
        fs.writeFileSync(this.derpConfigFilePath, JSON.stringify(data, null, 4));
    },

    isDerpConfigCreated: function() {
        return fs.existsSync('./derp.json');
    },

    routesFolderExists: function() {
        return fs.existsSync(`${this.routesFolderPath}`);
    },

    createRoutesFolder: function() {
        if (!this.routesFolderExists()) {
            fs.mkdirSync(this.routesFolderPath);
        }
    },

    routeFolderExists: function(routeName) {
        if (this.routesFolderExists()) {
            return fs.existsSync(`${this.routesFolderPath}/${routeName}`)
        }
    },

    createRouteFolder: function(routeName) {
        if (!this.routeFolderExists(routeName)) {
            fs.mkdirSync(`${this.routesFolderPath}/${routeName}`);
            let routeStubNodePath = resolve(__dirname, "routeStubs/routeStubNode.js");
            let packagejsonPath = resolve(__dirname, "routeStubs/package.json");
            fs.copyFileSync(routeStubNodePath, `${this.routesFolderPath}/${routeName}/index.js`);
            fs.copyFileSync(packagejsonPath, `${this.routesFolderPath}/${routeName}/package.json`);
        }
    },

    createAPIGW: function(derpConfigData, cb) {
        this.showLog(`Deploying API Gateway for ${derpConfigData.appName}...`);

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
                }
                apigw.getResources(getResParams, (rErr, rData) => {
                    derpConfigData.gateway.rootResourceId = rData.items[0].id;
                    this.updateDerpConfigFileData(derpConfigData);
                    this.showLog(`Deployed API Gateway for ${derpConfigData.appName} (${data.id}).`);
                    cb(derpConfigData);
                });
            }
        });
    },

    updateAPIGW: function(derpConfigData, route, routeName) {
        this.showLog(`Updating API Gateway ${derpConfigData.gateway.id} with ${routeName} route...`);

        let apigw = new aws.APIGateway({ region: derpConfigData.region });
        let params = {
            parentId: derpConfigData.gateway.rootResourceId,
            restApiId: derpConfigData.gateway.id,
            pathPart: route.apiPath
        }

        apigw.createResource(params, (err, data) => {
            if (err) console.log(err, err.stack); // an error occurred
            else {
                derpConfigData.routes[routeName].gateway = { resource: data };
                this.showLog(`Deployed Route for ${routeName} (${data.id}).`);

                //create method
                let methodParams = {
                    authorizationType: 'NONE',
                    httpMethod: route.type,
                    resourceId: data.id,
                    restApiId: derpConfigData.gateway.id
                }

                apigw.putMethod(methodParams, (mErr, mData) => {
                    if (mErr) console.log(mErr, mErr.stack); // an error occurred
                    else {
                        derpConfigData.routes[routeName].gateway.method = mData;
                        this.updateDerpConfigFileData(derpConfigData);
                        this.showLog(`Deployed ${route.type} method for ${routeName} API Gateway.`);

                        let apiPutIntParams = {
                            httpMethod: route.type,
                            resourceId: route.gateway.resource.id,
                            restApiId: derpConfigData.gateway.id,
                            type: 'AWS_PROXY',
                            integrationHttpMethod: 'POST',
                            uri: `arn:aws:apigateway:${derpConfigData.region}:lambda:path//2015-03-31/functions/${derpConfigData.routes[routeName].lambda.functionArn}/invocations`
                        }

                        apigw.putIntegration(apiPutIntParams, (pErr, pData) => {
                            if (pErr) console.log(pErr, pErr.stack); // an error occurred
                            else {
                                this.showLog(`Integrated Lambda function with API Gateway`);

                                //add perms via lambda
                                let lambda = new aws.Lambda({ region: derpConfigData.region });
                                let lambdaAddPermsParams = {
                                    Action: "lambda:InvokeFunction",
                                    FunctionName: derpConfigData.routes[routeName].lambda.functionName,
                                    Principal: "apigateway.amazonaws.com",
                                    StatementId: "ID-1"
                                }

                                lambda.addPermission(lambdaAddPermsParams, (laErr, laData) => {
                                    if (laErr) console.log(pErr, pErr.stack); // an error occurred
                                    else {
                                        this.showLog(`Added permission to Lambda function for API Gateway invocation.`);

                                        let apigCDParams = {
                                            restApiId: derpConfigData.gateway.id,
                                            stageName: 'api'
                                        }
                                        apigw.createDeployment(apigCDParams, (cdErr, cdData) => {
                                            if (cdErr) console.log(cdErr, cdErr.stack); // an error occurred
                                            else {
                                                this.showLog(`API Gateway Deployed to API stage.`)
                                                this.showLog(`Route fully deployed!`);
                                                derpConfigData.routes[routeName].url = `https://${derpConfigData.gateway.id}.execute-api.${derpConfigData.region}.amazonaws.com/api/${derpConfigData.routes[routeName].apiPath}`;
                                                this.updateDerpConfigFileData(derpConfigData);
                                                this.showLog(`View route at https://${derpConfigData.gateway.id}.execute-api.${derpConfigData.region}.amazonaws.com/api/${derpConfigData.routes[routeName].apiPath}`);
                                            }
                                        });
                                    }
                                })
                            }
                        });
                    }
                })
            }
        })
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
                this.showLog(`Route fully deployed!`);
                this.showLog(`View route at https://${derpConfigData.gateway.id}.execute-api.${derpConfigData.region}.amazonaws.com/api/${derpConfigData.routes[routeName].apiPath}`);
            }
        }
    },

    createLambdaRole: function(derpConfigData, cb) {
        if (derpConfigData['lambda-role']) {
            if (derpConfigData['lambda-role'].roleArn && derpConfigData['lambda-role'].roleName)
                return cb(derpConfigData);
        }

        let iam = new aws.IAM({ region: derpConfigData.region });
        let lambdaTrustPath = resolve(__dirname, "policies/lambda-trust.json");
        let iamRoleParams = {
            AssumeRolePolicyDocument: JSON.stringify(require(lambdaTrustPath)),
            RoleName: `derp-${derpConfigData.appName}-lambda`
        }
        iam.createRole(iamRoleParams, (rErr, rData) => {
            if (rErr) console.log(rErr, rErr.stack); // an error occurred
            else {
                derpConfigData['lambda-role'] = derpConfigData['lambda-role'] || {};
                derpConfigData['lambda-role'].roleName = rData.Role.RoleName;
                derpConfigData['lambda-role'].roleArn = rData.Role.Arn;
                this.updateDerpConfigFileData(derpConfigData);
                this.showLog(`Created Service Role For Lambda`);
                cb(derpConfigData);
            }
        });
    },

    createLambdaRoleInlinePolicy: function(derpConfigData, cb) {
        if (derpConfigData['lambda-role']) {
            return cb(derpConfigData);
        }

        let iam = new aws.IAM({ region: derpConfigData.region });
        let lambdaPolicyPath = resolve(__dirname, "policies/lambda.json");
        let iamPolicyParams = {
            PolicyName: `derp-${derpConfigData.appName}-lambda`,
            PolicyDocument: JSON.stringify(require(lambdaPolicyPath)),
            RoleName: derpConfigData['lambda-role'].roleName
        }

        iam.putRolePolicy(iamPolicyParams, (err, data) => {
            if (err) console.log(err, err.stack); // an error occurred
            else {
                this.showLog(`Created Inline Policy For Lambda Role`);
                this.showLog('Waiting for Role to update...');
                //Note: There is an issue with iam.putRolePolicy that prevents it
                //from being immediately available after the callback.
                //It usually takes 5-10 seconds to be queryable.
                //TODO: Poll to check if the rolepolicy attached, or use some kind of wait
                setTimeout(() => cb(derpConfigData), 20000);
            }
        });
    },

    /* deprec */
    createLambdaPolicy: function(derpConfigData, cb) {
        if (derpConfigData['lambda-role']) {
            if (derpConfigData['lambda-role'].policyArn)
                return cb(derpConfigData);
        }

        let iam = new aws.IAM({ region: derpConfigData.region });
        let iamPolicyParams = {
            PolicyName: `derp-${derpConfigData.appName}-lambda`,
            PolicyDocument: JSON.stringify(require('./policies/lambda.json'))
        }

        iam.createPolicy(iamPolicyParams, (poErr, poData) => {
            if (poErr) console.log(poErr, poErr.stack); // an error occurred
            else {
                derpConfigData['lambda-role'] = derpConfigData['lambda-role'] || {};
                derpConfigData['lambda-role'].policyArn = poData.Policy.Arn;
                this.updateDerpConfigFileData(derpConfigData);
                this.showLog(`Created Policy For Lambda`);
                cb(derpConfigData);
            }
        });
    },

    /* deprec */
    attachLambdaPolicyToRole: function(derpConfigData, cb) {
        let iam = new aws.IAM({ region: derpConfigData.region });
        let iamAttRoleParams = {
            PolicyArn: derpConfigData['lambda-role'].policyArn,
            RoleName: derpConfigData['lambda-role'].roleName
        };

        iam.attachRolePolicy(iamAttRoleParams, (arErr, arDone) => {
            if (arErr) console.log(arErr, arErr.stack); // an error occurred
            else {
                this.showLog(`Attached Lambda Policy to Lambda Role`);
                //possible timing issue here with a delay in the attachment?
                setTimeout(() => cb(derpConfigData), 15000);
            }
        });
    },

    createLambdaS3: function(derpConfigData, routeName, cb) {
        if (derpConfigData.routes[routeName].lambda) {
            if (derpConfigData.routes[routeName].lambda.s3Location)
                return cb(derpConfigData);
        }

        let s3 = new aws.S3({ region: derpConfigData.region });
        let s3params = {
            Bucket: `derp-routes-${derpConfigData.appName}`
        }

        s3.createBucket(s3params, (err, data) => {
            if (err) console.log(err, err.stack); // an error occurred
            else {
                derpConfigData.routes[routeName].lambda =
                    derpConfigData.routes[routeName].lambda || {};
                derpConfigData.routes[routeName].lambda.s3Location = data.Location;
                this.updateDerpConfigFileData(derpConfigData);
                this.showLog('S3 bucket configured for Lambda.');
                cb(derpConfigData);
            }
        });
    },

    setupUpdateLambdaParams: function(derpConfigData, routeName) {
        let AdmZip = require('adm-zip');
        let zip = new AdmZip();
        zip.addLocalFolder(`${derpConfigData.routes[routeName].path}`);
        let s3ZipBuffer = zip.toBuffer();

        let lambdaParams = {
            ZipFile: s3ZipBuffer,
            FunctionName: `derp-${derpConfigData.appName}-${routeName}`,
        }

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
        }

        return lambdaParams;
    },

    updateLambdaFunction: function(derpConfigData, routeName, cb) {
        let lambda = new aws.Lambda({ region: derpConfigData.region });
        lambda.updateFunctionCode(this.setupUpdateLambdaParams(derpConfigData, routeName), (err, data) => {
            if (err) console.log(err, err.stack); // an error occurred
            else {
                this.showLog('Lambda function updated.');
                cb(derpConfigData);
            }
        });
    },

    createLambdaFunction: function(derpConfigData, routeName, cb) {
        if (derpConfigData.routes[routeName].lambda &&
            derpConfigData.routes[routeName].lambda.functionArn) {
            //lambda already exists, update function
            this.showLog(`Found deployed lambda for ${routeName}, updating...`);
            this.updateLambdaFunction(derpConfigData, routeName, cb);
        } else {
            //lambda not found, create function
            let lambda = new aws.Lambda({ region: derpConfigData.region });
            lambda.createFunction(this.setupNewLambdaParams(derpConfigData, routeName), (err, data) => {
                if (err) console.log(err, err.stack); // an error occurred
                else {
                    this.showLog('Lambda function created.');
                    derpConfigData.routes[routeName].lambda.functionArn = data.FunctionArn;
                    derpConfigData.routes[routeName].lambda.functionName = data.FunctionName;
                    this.updateDerpConfigFileData(derpConfigData);
                    cb(derpConfigData);
                }
            });
        }
    },

    createOrUpdateLambda: function(derpConfigData, route, routeName, cb) {
        this.showLog(`Deploying Lambda for ${routeName}...`);

        this.createLambdaS3(derpConfigData, routeName,
            (derpConfigData) => this.createLambdaRole(derpConfigData,
                (derpConfigData) => this.createLambdaRoleInlinePolicy(derpConfigData,
                    (derpConfigData) => this.createLambdaFunction(derpConfigData, routeName, cb)
                )));
    },

    showLog: function(text) {
        //simple 1-param logger that adds prefix information
        let dt = new Date();
        let lts = dt.toLocaleString();
        console.log(`${lts}: ${text}`);
    }
}