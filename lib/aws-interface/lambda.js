let lambdaSvc = require('aws-sdk/clients/lambda');
let lambda = null;

module.exports = {
    addApigPermission: (derpConfigData, params) => {
        return getLambda(derpConfigData).addPermission(params).promise();
    },

    deleteFunction: (derpConfigData, params) => {
        return getLambda(derpConfigData).deleteFunction(params).promise();
    }
}

let getLambda = (derpConfigData) => {
    return lambda || new lambdaSvc({
        region: derpConfigData.region
    });
}