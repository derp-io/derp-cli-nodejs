let cliVersionId = 'DERP CLI 1.0.0'

exports.displayVersion = function() {
    return console.log(cliVersionId);
}

exports.start = function() {
    return console.log('Deployed your App');
}

exports.deploy = function(endpointName) {
    return console.log(`Deployed endpoint ${endpointName}`);
}