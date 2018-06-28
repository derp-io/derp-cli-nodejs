let cliVersionId = `DERP CLI ${require("../package.json").version}`;

exports.displayVersion = function() {
    return console.log(cliVersionId);
}

exports.start = function() {
    return console.log('Deployed your App');
}

exports.new = function(endpointName) {
    return console.log(`Deployed endpoint ${endpointName}`);
}