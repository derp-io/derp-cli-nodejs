let util = require('./utilities');

exports.deploy = function() {
    return console.log('Deployed your App to the cloud!');
}

exports.deployRoute = function(routeName) {
    let derpConfigData = util.getDerpConfigFileData();
    let route = derpConfigData.routes[routeName];
    console.log(`Using route found at ${route.path}.`)
    console.log(`Deploying ${routeName}...`);

    //cfn to deploy
    util.createOrUpdateLambda(derpConfigData, route, routeName,
        (derpConfigData) => {
            util.createOrUpdateAPIGW(derpConfigData, route, routeName);
        });
}

exports.route = function(routeName, routeDefinition, routeType) {
    if (!util.isDerpConfigCreated()) {
        return console.log('No derp config found, try running `derp init`.');
    } else {
        //check if exists, add to config, setup folder
        let derpConfigData = util.getDerpConfigFileData();
        derpConfigData.routes = derpConfigData.routes || {};

        //ensure this endpoint doesn't already exist, warn if so?
        if (derpConfigData.routes[routeName]) {
            console.log(`${routeName} already exists, updating your route.`);
        }
        derpConfigData.routes[routeName] = derpConfigData.routes[routeName] || {};


        derpConfigData.routes[routeName].type = routeType;
        derpConfigData.routes[routeName].url = `<undeployed-site>/${routeDefinition}`;
        derpConfigData.routes[routeName].apiPath = routeDefinition;

        //parse directory structure from routeName
        let routeDirName = routeName.toString();
        routeDirName = routeDirName.split(':').join('_');
        routeDirName = `${util.routesFolderPath}/${routeDirName}`;
        derpConfigData.routes[routeName].path = routeDirName;

        //create route folder `./routes/routeName`
        util.createRouteFolder(routeName);

        //save config
        util.updateDerpConfigFileData(derpConfigData);
        console.log(`derp configuration updated with ${routeName}.`);
        console.log(`See the code at ${routeDirName} and deploy with 'derp deploy-route ${routeName}'`)
    }
}

exports.init = function(appName, region) {
    //use fs to create .derp file
    if (util.isDerpConfigCreated()) {
        return console.log(`derp.json configuration file already exists.`);
    } else {
        let derpConfig = {};
        derpConfig.appName = appName || null;
        derpConfig.region = region;
        util.updateDerpConfigFileData(derpConfig);
        util.createRoutesFolder();

        console.log(`derp.json configuration file created.`);
        console.log('Your derp project is ready!');
        console.log('Try running `derp new` to create an endpoint.')
    }
}