let util = require('../utilities');
let awsInterface = require('../aws-interface');

exports.init = function(appName, region) {
    //use fs to create .derp file
    if (util.isDerpConfigCreated()) {
        return util.showLog(`derp.json configuration file already exists.`);
    } else {
        let derpConfig = {};
        derpConfig.appName = appName || null;
        derpConfig.region = region;
        util.updateDerpConfigFileData(derpConfig);
        util.createRoutesFolder();

        util.showLog(`derp.json configuration file created.`);
        util.showLog('Your derp project is ready!');
        util.showLog('Try running `derp-cli new-route` to create an endpoint.');
    }
};

exports.deployRoute = function(routeName) {
    let derpConfigData = util.getDerpConfigFileData();
    let route = derpConfigData.routes[routeName];
    util.showLog(`Using route found at ${route.path}.`);
    util.showLog(`Deploying ${routeName}...`);

    awsInterface.createOrUpdateLambda(derpConfigData, route, routeName,
        (derpConfigData) => {
            awsInterface.createOrUpdateAPIGW(derpConfigData, route, routeName);
        });
};

exports.newRoute = function(routeName, routeDefinition, routeType) {
    if (!util.isDerpConfigCreated()) {
        return util.showLog('No derp config found, try running `derp init`.');
    } else {
        //check if exists, add to config, setup folder
        let derpConfigData = util.getDerpConfigFileData();
        derpConfigData.routes = derpConfigData.routes || {};

        //ensure this endpoint doesn't already exist, warn if so?
        if (derpConfigData.routes[routeName]) {
            util.showLog(`${routeName} already exists, updating your route.`);
        }

        derpConfigData.routes[routeName] = derpConfigData.routes[routeName] || {};
        derpConfigData.routes[routeName].type = routeType;
        derpConfigData.routes[routeName].apiPath = routeDefinition;

        //parse directory structure from routeName
        //let routeDirName = routeName.toString();
        //routeDirName = routeDirName.split(':').join('_');
        //routeDirName = `${util.routesFolderPath}/${routeDirName}`;
        derpConfigData.routes[routeName].path = `${util.routesFolderPath}/${routeName}`;

        //create route folder `./routes/routeName`
        util.createRouteFolder(routeName);

        //save config
        util.updateDerpConfigFileData(derpConfigData);
        util.showLog(`derp configuration updated with ${routeName}.`);
        util.showLog(`See the code at ${util.routesFolderPath}/${routeName} and deploy with 'derp-cli deploy-route ${routeName}'`);
    }
};

let inspectModule = require('../inspect');
exports.inspectRoute = inspectModule.inspectRoute;
exports.inspectRoutes = inspectModule.inspectRoutes;