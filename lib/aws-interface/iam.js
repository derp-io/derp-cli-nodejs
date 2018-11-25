let iamSvc = require('aws-sdk/clients/iam');
let iam = null;

module.exports = {
    createIAMRole: (derpConfigData, params) => {
        return getIAM(derpConfigData).createRole(params).promise();
    },

    createIAMPolicy: (derpConfigData, params) => {
        return getIAM(derpConfigData).putRolePolicy(params).promise();
    }
}

let getIAM = (derpConfigData) => {
    return iam || new iamSvc({
        region: derpConfigData.region
    });
}