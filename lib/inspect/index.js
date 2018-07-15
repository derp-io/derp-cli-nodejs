let util = require('../utilities');
let table = require('table').table;

exports.inspectRoute = function(routeName, property) {
    let derpConfigData = util.getDerpConfigFileData();
    if (derpConfigData) {
        if (derpConfigData.routes) {
            if (derpConfigData.routes[routeName]) {
                if (property) {
                    let formattedProperty = property.toString();
                    if (derpConfigData.routes[routeName][formattedProperty]) {
                        return util.showLog(`{'${formattedProperty}': '${derpConfigData.routes[routeName][formattedProperty]}'}`);
                    } else {
                        return util.showLog('Invalid Property.');
                    }
                } else {
                    util.showLog(derpConfigData.routes[routeName]);
                }
            } else {
                return util.showLog(`No route found named ${routeName} in this app.`);
            }
        } else {
            return util.showLog('No routes found in this app.');
        }
    } else {
        return util.showLog('No derp configuration found. Use `derp init` to start.');
    }
};

exports.inspectRoutes = function() {
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
            return util.showLog(`No routes defined for ${derpConfigData.appName}.`);
        }
    } else {
        return util.showLog('No derp configuration found. Use `derp init` to start.');
    }

    let options = {
        drawHorizontalLine: (index, size) => {
            return index === 0 || index === 1 || index === size;
        }
    };

    output = table(data, options);
    console.log(output);
};