let util = require('./utilities');
let table = require('table').table;

exports.inspectRoute = function(routeName, property) {
    let derpConfigData = util.getDerpConfigFileData();
    if (derpConfigData) {
        if (derpConfigData.routes) {
            if (derpConfigData.routes[routeName]) {
                if (property) {
                    let formattedProperty = property.toString();
                    if (derpConfigData.routes[routeName][formattedProperty]) {
                        return console.log(derpConfigData.routes[routeName][formattedProperty]);
                    } else {
                        return console.log('Invalid Property.');
                    }
                } else {
                    console.log(derpConfigData.routes[routeName]);
                }
            } else {
                return console.log(`No route found named ${routeName} in this app.`)
            }
        } else {
            return console.log('No routes found in this app.')
        }
    } else {
        return console.log('No derp configuration found. Use `derp init` to start.');
    }
}

exports.showRoutesTable = function() {
    let data,
        output;
    data = [];
    data.push(["NAME", "API PATH", "FILE PATH", "TYPE", "DEPLOYED"]);

    let derpConfigData = util.getDerpConfigFileData();
    if (derpConfigData) {
        if (derpConfigData.routes) {
            for (var routeName in derpConfigData.routes) {
                let routeObject = derpConfigData.routes[routeName];
                let deployed = routeObject.url ? true : false;
                data.push([routeName, routeObject.apiPath, routeObject.path, routeObject.type, deployed]);
            }
        } else {
            return console.log(`No routes defined for ${derpConfigData.appName}.`)
        }
    } else {
        return console.log('No derp configuration found. Use `derp init` to start.');
    }

    let options = {
        drawHorizontalLine: (index, size) => {
            return index === 0 || index === 1 || index === size;
        }
    };

    output = table(data, options);
    console.log(output);
}

exports.deploy = function() {
    return util.showLog('Deployed your App to the cloud!');
}

exports.deployRoute = function(routeName) {
    let derpConfigData = util.getDerpConfigFileData();
    let route = derpConfigData.routes[routeName];
    util.showLog(`Using route found at ${route.path}.`)
    util.showLog(`Deploying ${routeName}...`);

    //cfn to deploy
    util.createOrUpdateLambda(derpConfigData, route, routeName,
        (derpConfigData) => {
            util.createOrUpdateAPIGW(derpConfigData, route, routeName);
        });
}

exports.route = function(routeName, routeDefinition, routeType) {
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
        let routeDirName = routeName.toString();
        routeDirName = routeDirName.split(':').join('_');
        routeDirName = `${util.routesFolderPath}/${routeDirName}`;
        derpConfigData.routes[routeName].path = routeDirName;

        //create route folder `./routes/routeName`
        util.createRouteFolder(routeName);

        //save config
        util.updateDerpConfigFileData(derpConfigData);
        util.showLog(`derp configuration updated with ${routeName}.`);
        util.showLog(`See the code at ${routeDirName} and deploy with 'derp-cli deploy-route ${routeName}'`)
    }
}

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
        util.showLog('Try running `derp-cli new-route` to create an endpoint.')
    }
}