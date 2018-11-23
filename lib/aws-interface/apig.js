let aws = require('aws-sdk');
let util = require('../utilities');
let apig = null;

module.exports = {
    createRestApi: (derpConfigData, params) => {
        return getApig(derpConfigData).createRestApi(params).promise();
    },

    getRestApiResources: (derpConfigData, params) => {
        return getApig(derpConfigData).getResources(params).promise();
    }
}

let getApig = (derpConfigData) => {
    return apig || new aws.APIGateway({
        region: derpConfigData.region
    });
}