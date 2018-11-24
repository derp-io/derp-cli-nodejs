let apigatewaySvc = require('aws-sdk/clients/apigateway');
let apig = null;

module.exports = {
    createRestApi: (derpConfigData, params) => {
        return getApig(derpConfigData).createRestApi(params).promise();
    },

    getRestApiResources: (derpConfigData, params) => {
        return getApig(derpConfigData).getResources(params).promise();
    },

    createRestApiResource: (derpConfigData, params) => {
        return getApig(derpConfigData).createResource(params).promise();
    },

    createResourceMethod: (derpConfigData, params) => {
        return getApig(derpConfigData).putMethod(params).promise();
    },

    createResourceLambdaIntegration: (derpConfigData, params) => {
        return getApig(derpConfigData).putIntegration(params).promise();
    },

    createResourceDeployment: (derpConfigData, params) => {
        return getApig(derpConfigData).createDeployment(params).promise();
    }
}

let getApig = (derpConfigData) => {
    return apig || new apigatewaySvc({
        region: derpConfigData.region
    });
}