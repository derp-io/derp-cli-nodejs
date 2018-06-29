let fs = require('fs');
let cliVersionId = `DERP CLI ${require("../package.json").version}`;


exports.displayVersion = function() {
    return console.log(cliVersionId);
}

exports.deploy = function() {
    return console.log('Deployed your App to the cloud!');
}

exports.new = function(endpointName, httpMethod) {
    if (!isDerpConfigCreated()) {
        return console.log('No derp config found, try running `derp init`.');
    } else {
        //check if exists, add to config, setup folder
        let derpConfigData = getDerpConfigFileData();
        derpConfigData.endPoints = derpConfigData.endPoints || {};
        derpConfigData.endPoints[endpointName] = derpConfigData.endPoints[endpointName] || {};
        derpConfigData.endPoints[endpointName][httpMethod] = `http://example.com/${endpointName}`
        updateDerpConfigFileData(derpConfigData);
        console.log(`Added ${endpointName} to your derp configuration.`)
    }
}

exports.init = function(appName) {
    //use fs to create .derp file
    if (isDerpConfigCreated()) {
        return console.log(`derp.json configuration file already exists.`);
    } else {
        let derpConfig = {};
        derpConfig.appName = appName || null;
        updateDerpConfigFileData(derpConfig);

        console.log(`derp.json configuration file created.`);
        console.log('Your derp project is ready!');
        console.log('Try running `derp new` to create an endpoint.')
    }
}

let derpConfigFilePath = './derp.json';

let getDerpConfigFileData = function() {
    return JSON.parse(fs.readFileSync(derpConfigFilePath, 'utf8'));
}

let updateDerpConfigFileData = function(data) {
    fs.writeFileSync(derpConfigFilePath, JSON.stringify(data, null, 4));
}

let isDerpConfigCreated = function() {
    return fs.existsSync('./derp.json');
}