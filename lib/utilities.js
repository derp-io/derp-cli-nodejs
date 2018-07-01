let fs = require('fs');
let aws = require('aws-sdk');

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
            fs.copyFileSync('lib/routeStubs/routeStubNode.js', `${this.routesFolderPath}/${routeName}/index.js`);
            fs.copyFileSync('lib/routeStubs/package.json', `${this.routesFolderPath}/${routeName}/package.json`);
        }
    },

    createAPIGW: function(derpConfigData, cb) {
        console.log(`Deploying API Gateway for ${derpConfigData.appName}...`);

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
                    console.log(`Deployed API Gateway for ${derpConfigData.appName} (${data.id}).`);
                    cb(derpConfigData);
                });
            }
        });
    },

    updateAPIGW: function(derpConfigData, route, routeName) {
        console.log(`Updating API Gateway ${derpConfigData.gateway.id} with ${routeName} route...`);

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
                console.log(`Deployed Route for ${routeName} (${data.id}).`);

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
                        console.log(`Deployed ${route.type} method for ${routeName} API Gateway.`);

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
                                console.log(`Integrated Lambda function with API Gateway`);

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
                                        console.log(`Added permission to Lambda function for API Gateway invocation.`);

                                        let apigCDParams = {
                                            restApiId: derpConfigData.gateway.id,
                                            stageName: 'api'
                                        }
                                        apigw.createDeployment(apigCDParams, (cdErr, cdData) => {
                                            if (cdErr) console.log(cdErr, cdErr.stack); // an error occurred
                                            else {
                                                console.log(`API Gateway Deployed to API stage.`)
                                                console.log(`Route fully deployed!`);
                                                derpConfigData.routes[routeName].url = `https://${derpConfigData.gateway.id}.execute-api.${derpConfigData.region}.amazonaws.com/api/${routeName}`;
                                                this.updateDerpConfigFileData(derpConfigData);
                                                console.log(`View route at https://${derpConfigData.gateway.id}.execute-api.${derpConfigData.region}.amazonaws.com/api/${routeName}`);
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
            //update gw
            this.updateAPIGW(derpConfigData, route, routeName);
        }
    },

    createLambdaRole: function(derpConfigData, cb) {
        if (derpConfigData['lambda-role']) {
            if (derpConfigData['lambda-role'].roleArn && derpConfigData['lambda-role'].roleName)
                return cb(derpConfigData);
        }

        let iam = new aws.IAM({ region: derpConfigData.region });
        let iamRoleParams = {
            AssumeRolePolicyDocument: JSON.stringify(require('./policies/lambda-trust.json')),
            RoleName: `derp-${derpConfigData.appName}-lambda`
        }
        iam.createRole(iamRoleParams, (rErr, rData) => {
            if (rErr) console.log(rErr, rErr.stack); // an error occurred
            else {
                derpConfigData['lambda-role'] = derpConfigData['lambda-role'] || {};
                derpConfigData['lambda-role'].roleName = rData.Role.RoleName;
                derpConfigData['lambda-role'].roleArn = rData.Role.Arn;
                this.updateDerpConfigFileData(derpConfigData);
                console.log(`Created Service Role For Lambda`);
                cb(derpConfigData);
            }
        });
    },

    createLambdaRoleInlinePolicy: function(derpConfigData, cb) {
        let iam = new aws.IAM({ region: derpConfigData.region });
        let iamPolicyParams = {
            PolicyName: `derp-${derpConfigData.appName}-lambda`,
            PolicyDocument: JSON.stringify(require('./policies/lambda.json')),
            RoleName: derpConfigData['lambda-role'].roleName
        }

        iam.putRolePolicy(iamPolicyParams, (err, data) => {
            if (err) console.log(err, err.stack); // an error occurred
            else {
                console.log(`Created Inline Policy For Lambda Role`);
                console.log('Waiting for Role to update...');
                setTimeout(() => cb(derpConfigData), 20000);
            }
        });
    },

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
                console.log(`Created Policy For Lambda`);
                cb(derpConfigData);
            }
        });
    },

    attachLambdaPolicyToRole: function(derpConfigData, cb) {
        let iam = new aws.IAM({ region: derpConfigData.region });
        let iamAttRoleParams = {
            PolicyArn: derpConfigData['lambda-role'].policyArn,
            RoleName: derpConfigData['lambda-role'].roleName
        };

        iam.attachRolePolicy(iamAttRoleParams, (arErr, arDone) => {
            if (arErr) console.log(arErr, arErr.stack); // an error occurred
            else {
                console.log(`Attached Lambda Policy to Lambda Role`);
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
                console.log('S3 bucket configured for Lambda.');
                cb(derpConfigData);
            }
        });
    },

    createLambdaFunction: function(derpConfigData, routeName, cb) {
        if (derpConfigData.routes[routeName].lambda) {
            if (derpConfigData.routes[routeName].lambda.functionArn)
                return cb(derpConfigData);
        }

        let AdmZip = require('adm-zip');
        let zip = new AdmZip();
        zip.addLocalFolder(`${derpConfigData.routes[routeName].path}`);
        let s3ZipBuffer = zip.toBuffer();

        let lambda = new aws.Lambda({ region: derpConfigData.region });
        let lambdaParams = {
            Code: {
                // S3Bucket: `derp-routes-${derpConfigData.appName}`,
                // S3Key: `derp-route-${routeName}`,
                // S3ObjectVersion: `1`,
                ZipFile: s3ZipBuffer
            },
            FunctionName: `derp-${derpConfigData.appName}-${routeName}`,
            Handler: 'index.handler',
            Role: derpConfigData['lambda-role'].roleArn,
            Runtime: 'nodejs8.10'
        }

        lambda.createFunction(lambdaParams, (err, data) => {
            if (err) console.log(err, err.stack); // an error occurred
            else {
                console.log('Lambda function created.');
                derpConfigData.routes[routeName].lambda.functionArn = data.FunctionArn;
                derpConfigData.routes[routeName].lambda.functionName = data.FunctionName;
                this.updateDerpConfigFileData(derpConfigData);
                cb(derpConfigData);
            }
        })
    },

    createOrUpdateLambda: function(derpConfigData, route, routeName, cb) {
        console.log(`Deploying Lambda for ${routeName}...`);

        this.createLambdaS3(derpConfigData, routeName,
            (derpConfigData) => this.createLambdaRole(derpConfigData,
                (derpConfigData) => this.createLambdaRoleInlinePolicy(derpConfigData,
                    (derpConfigData) => this.createLambdaFunction(derpConfigData, routeName, cb)
                )));
    }
}