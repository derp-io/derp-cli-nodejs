let aws = require('aws-sdk');
let resolve = require('path').resolve;
let util = require('../utilities');
let apig = require('./apig');
let lambda = require('./lambda');
let iam = require('./iam');

let handleCreateRestApi = async(derpConfigData, data) => {
    //update config data with apig id
    derpConfigData.gateway = {
        id: data.id
    };
    util.updateDerpConfigFileData(derpConfigData);

    //get resources of the new APIG.
    let params = {
        restApiId: derpConfigData.gateway.id
    };

    //this is necessary to know the ID of the root resource used to attach
    // any other new resources to this apig.
    await apig.getRestApiResources(derpConfigData, params)
        .then(handleGetRestApiResources.bind(this, derpConfigData, data))
        .catch(catchPromiseError.bind(this));
}

let handleGetRestApiResources = (derpConfigData, data, apiResources) => {
    //update config data with root resource ID of new apig
    derpConfigData.gateway.rootResourceId = apiResources.items[0].id;
    util.updateDerpConfigFileData(derpConfigData);

    util.showLog(`Deployed API Gateway for ${derpConfigData.appName} (${data.id}).`);
}

let handleCreateRestApiResource = async(derpConfigData, route, routeName, resource) => {
    //update config data with new resource
    derpConfigData.routes[routeName].gateway = {
        resource: resource
    };
    util.updateDerpConfigFileData(derpConfigData);

    util.showLog(`Deployed Route for ${routeName} (${resource.id}).`);

    //setup params for apig put method for this new resource
    let params = {
        authorizationType: 'NONE',
        httpMethod: route.type,
        resourceId: resource.id,
        restApiId: derpConfigData.gateway.id
    };

    await apig.createResourceMethod(derpConfigData, params)
        .then(handleCreateResourceMethod.bind(this, derpConfigData, route, routeName))
        .catch(catchPromiseError.bind(this));
}

let handleCreateResourceMethod = async(derpConfigData, route, routeName, method) => {
    //update config data with route's method type
    derpConfigData.routes[routeName].gateway.method = method;
    util.updateDerpConfigFileData(derpConfigData);

    util.showLog(`Deployed ${route.type} method for ${routeName} API Gateway.`);

    //setup params for resource integration with lambda function
    let params = {
        httpMethod: route.type,
        resourceId: route.gateway.resource.id,
        restApiId: derpConfigData.gateway.id,
        type: 'AWS_PROXY',
        integrationHttpMethod: 'POST',
        uri: `arn:aws:apigateway:${derpConfigData.region}:lambda:path//2015-03-31/functions/${derpConfigData.routes[routeName].lambda.functionArn}/invocations`
    };

    await apig.createResourceLambdaIntegration(derpConfigData, params)
        .then(handleCreateResourceLambdaIntegration.bind(this, derpConfigData, routeName))
        .catch(catchPromiseError.bind(this));
}

let handleCreateResourceLambdaIntegration = async(derpConfigData, routeName, response) => {
    util.showLog(`Integrated Lambda function with API Gateway.`);

    let params = {
        Action: "lambda:InvokeFunction",
        FunctionName: derpConfigData.routes[routeName].lambda.functionName,
        Principal: "apigateway.amazonaws.com",
        StatementId: "ID-1"
    };

    await lambda.addApigPermission(derpConfigData, params)
        .then(handleAddApigPermission.bind(this, derpConfigData, routeName))
        .catch(catchPromiseError.bind(this));
}

let handleAddApigPermission = async(derpConfigData, routeName, response) => {
    util.showLog(`Added permission to Lambda function for API Gateway invocation.`);

    let params = {
        restApiId: derpConfigData.gateway.id,
        stageName: 'api'
    };

    await apig.createResourceDeployment(derpConfigData, params)
        .then(handleCreateResourceDeployment.bind(this, derpConfigData, routeName))
        .catch(catchPromiseError.bind(this));
}

let handleCreateResourceDeployment = (derpConfigData, routeName, response) => {
    util.showLog(`API Gateway Deployed to API stage.`);
    util.showLog(`Route fully deployed!`);

    //update config data with the URL of this deployed api
    derpConfigData.routes[routeName].url = `https://${derpConfigData.gateway.id}.execute-api.${derpConfigData.region}.amazonaws.com/api/${derpConfigData.routes[routeName].apiPath}`;
    util.updateDerpConfigFileData(derpConfigData);

    util.showLog(`View route at https://${derpConfigData.gateway.id}.execute-api.${derpConfigData.region}.amazonaws.com/api/${derpConfigData.routes[routeName].apiPath}`);
}

let handleCreateLambdaIAMRole = (derpConfigData, role) => {
    //update config data with this iam role
    derpConfigData['lambda-role'] = derpConfigData['lambda-role'] || {};
    derpConfigData['lambda-role'].roleName = role.Role.RoleName;
    derpConfigData['lambda-role'].roleArn = role.Role.Arn;
    util.updateDerpConfigFileData(derpConfigData);

    util.showLog(`Created Service Role For Lambda.`);
}

let handleCreateLambdaPolicy = (derpConfigData, policy) => {
    //update config data with lambda role policy
    derpConfigData['lambda-role'].policy = 'inline';
    util.updateDerpConfigFileData(derpConfigData);

    util.showLog(`Added Inline Policy For Lambda Role`);
}

let catchPromiseError = (error) => {
    console.log(error, error.stack); // an error occurred
}

module.exports = {
    createAPIG: async function(derpConfigData) {
        util.showLog(`Deploying API Gateway for ${derpConfigData.appName}...`);

        let params = {
            name: `derp-apigw-${derpConfigData.appName}`,
            description: `API Gateway for DERP App ${derpConfigData.appName}`,
            endpointConfiguration: {
                types: ["REGIONAL"]
            }
        };

        //create a new apig
        await apig.createRestApi(derpConfigData, params)
            .then(handleCreateRestApi.bind(this, derpConfigData))
            .catch(catchPromiseError.bind(this));
    },

    updateAPIG: async function(derpConfigData, route, routeName) {
        //TODO: complex routes:
        // 1) hierarchical resources: /api/users
        // e.g. /api/users
        // 2) params: /api/users/<{pathPartName}>
        // e.g. /api/users/{id} = /api/users/1 

        let routeDefParts = util.getRoutePathParts(route.apiPath);

        util.showLog(`Updating API Gateway ${derpConfigData.gateway.id} with ${routeName} route...`);

        //setup params to create rest api resource
        let params = {
            parentId: derpConfigData.gateway.rootResourceId,
            restApiId: derpConfigData.gateway.id,
            pathPart: route.apiPath
        };

        await apig.createRestApiResource(derpConfigData, params)
            .then(handleCreateRestApiResource.bind(this, derpConfigData, route, routeName))
            .catch(catchPromiseError.bind(this));
    },

    createOrUpdateAPIG: async function(derpConfigData, route, routeName) {
        if (!derpConfigData.gateway) {
            //no gateway configured, create
            await this.createAPIG(derpConfigData);
            await this.updateAPIG(derpConfigData, route, routeName);
        } else {
            if (!derpConfigData.routes[routeName].gateway) {
                //update app's gw
                await this.updateAPIG(derpConfigData, route, routeName);
            } else {
                //apigw already exists, only updated lambda function
                util.showLog(`Route fully deployed!`);
                util.showLog(`View route at https://${derpConfigData.gateway.id}.execute-api.${derpConfigData.region}.amazonaws.com/api/${derpConfigData.routes[routeName].apiPath}`);
            }
        }
    },

    createLambdaRole: async function(derpConfigData) {
        if (derpConfigData['lambda-role']) {
            if (derpConfigData['lambda-role'].roleArn && derpConfigData['lambda-role'].roleName)
                return true;
        }

        let lambdaTrustPath = resolve(__dirname, "policies/lambda-trust.json");
        let params = {
            AssumeRolePolicyDocument: JSON.stringify(require(lambdaTrustPath)),
            RoleName: `derp-${derpConfigData.appName}-lambda`
        };

        await iam.createIAMRole(derpConfigData, params)
            .then(handleCreateLambdaIAMRole.bind(this, derpConfigData))
            .catch(catchPromiseError.bind(this));
    },

    createLambdaRoleInlinePolicy: async function(derpConfigData) {
        if (derpConfigData['lambda-role'] && derpConfigData['lambda-role'].policy) {
            return true;
        }

        let lambdaPolicyPath = resolve(__dirname, "policies/lambda.json");
        let params = {
            PolicyName: `derp-${derpConfigData.appName}-lambda`,
            PolicyDocument: JSON.stringify(require(lambdaPolicyPath)),
            RoleName: derpConfigData['lambda-role'].roleName
        };

        //this may not work without a retry, there is some slowness in the
        // policy availability for ~10 seconds after put.
        await iam.createIAMPolicy(derpConfigData, params)
            .then(handleCreateLambdaPolicy.bind(this, derpConfigData))
            .catch(catchPromiseError.bind(this));

        util.showLog(`Waiting for inline policy to bind to Lambda Role...`);
        await util.timeout(10000);
    },

    setupUpdateLambdaParams: function(derpConfigData, routeName) {
        let s3ZipBuffer = util.getBufferZip(derpConfigData.routes[routeName].path);

        let lambdaParams = {
            ZipFile: s3ZipBuffer,
            FunctionName: `derp-${derpConfigData.appName}-${routeName}`,
        };

        return lambdaParams;
    },

    setupNewLambdaParams: function(derpConfigData, routeName) {
        let s3ZipBuffer = util.getBufferZip(derpConfigData.routes[routeName].path);

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

    updateLambdaFunction: async function(derpConfigData, routeName) {
        let lambda = new aws.Lambda({
            region: derpConfigData.region
        });

        await lambda.updateFunctionCode(this.setupUpdateLambdaParams(derpConfigData, routeName), (err, data) => {
            if (err) console.log(err, err.stack); // an error occurred
            else {
                util.showLog('Lambda function updated.');
            }
        });
    },

    createLambdaFunction: async function(derpConfigData, routeName) {
        if (derpConfigData.routes[routeName].lambda &&
            derpConfigData.routes[routeName].lambda.functionArn) {
            //lambda already exists, update function
            util.showLog(`Found deployed lambda for ${routeName}, updating...`);
            await this.updateLambdaFunction(derpConfigData, routeName);
        } else {
            //lambda not found, create function
            let lambda = new aws.Lambda({
                region: derpConfigData.region
            });

            await lambda.createFunction(this.setupNewLambdaParams(derpConfigData, routeName)).promise()
                .then(function(response) {
                    let data = response;
                    derpConfigData.routes[routeName].lambda =
                        derpConfigData.routes[routeName].lambda || {};
                    derpConfigData.routes[routeName].lambda.functionArn = data.FunctionArn;
                    derpConfigData.routes[routeName].lambda.functionName = data.FunctionName;
                    util.updateDerpConfigFileData(derpConfigData);
                    util.showLog('Lambda function created.');
                }, function(err) {
                    console.log(err, err.stack);
                });

            // lambda.createFunction(this.setupNewLambdaParams(derpConfigData, routeName))
            //     .on('retry', (response) => {
            //         if (response.error) {
            //             util.showLog('Waiting for Lambda role to associate new policy...');
            //             response.error.retryable = true; // retry this error
            //             response.error.retryDelay = 5000; // wait 5 seconds
            //         }
            //     })
            //     .on('error', (err) => {
            //         console.log(err, err.stack);
            //     })
            //     .on('success', (response) => {
            //         let data = response.data;
            //         derpConfigData.routes[routeName].lambda =
            //             derpConfigData.routes[routeName].lambda || {};
            //         derpConfigData.routes[routeName].lambda.functionArn = data.FunctionArn;
            //         derpConfigData.routes[routeName].lambda.functionName = data.FunctionName;
            //         util.updateDerpConfigFileData(derpConfigData);
            //         util.showLog('Lambda function created.');
            //         //cb(derpConfigData);
            //     })
            //     .send();
        }
    },

    createOrUpdateLambda: async function(derpConfigData, routeName) {
        util.showLog(`Deploying Lambda for ${routeName}...`);

        await this.createLambdaRole(derpConfigData);
        await this.createLambdaRoleInlinePolicy(derpConfigData);
        await this.createLambdaFunction(derpConfigData, routeName);

        // this.createLambdaRole(derpConfigData,
        //     (derpConfigData) => this.createLambdaRoleInlinePolicy(derpConfigData,
        //         (derpConfigData) => this.createLambdaFunction(derpConfigData, routeName, cb)
        //     ));
    }
};