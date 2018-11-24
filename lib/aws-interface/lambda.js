let lambdaSvc = require('aws-sdk/clients/lambda');
let lambda = null;

module.exports = {
    addApigPermission: (derpConfigData, params) => {
        return getLambda(derpConfigData).addPermission(params).promise();
    }
}

let getLambda = (derpConfigData) => {
    return lambda || new lambdaSvc({
        region: derpConfigData.region
    });
}