let fs = require('fs');
let resolve = require('path').resolve;
let AdmZip = require('adm-zip');

module.exports = {
    derpConfigFilePath: './derp.json',
    routesFolderPath: './routes',

    getDerpConfigFileData: function() {
        return JSON.parse(fs.readFileSync(this.derpConfigFilePath, 'utf8'));
    },

    updateDerpConfigFileData: function(data) {
        fs.writeFileSync(this.derpConfigFilePath, JSON.stringify(data, null, 4));
    },

    isDerpConfigCreated: function() {
        return fs.existsSync('./derp.json');
    },

    routesFolderExists: function() {
        return fs.existsSync(`${this.routesFolderPath}`);
    },

    createRoutesFolder: function() {
        if (!this.routesFolderExists()) {
            fs.mkdirSync(this.routesFolderPath);
        }
    },

    routeFolderExists: function(routeName) {
        if (this.routesFolderExists()) {
            return fs.existsSync(`${this.routesFolderPath}/${routeName}`);
        }
    },

    createRouteFolder: function(routeName) {
        if (!this.routeFolderExists(routeName)) {
            fs.mkdirSync(`${this.routesFolderPath}/${routeName}`);
            let routeStubNodePath = resolve(__dirname, "../routeStubs/routeStubNode.js");
            let packagejsonPath = resolve(__dirname, "../routeStubs/package.json");

            //NOTE: fs.copyFileSync does not exist in older Node versions
            //Check if exists and throw error or fallback
            fs.copyFileSync(routeStubNodePath, `${this.routesFolderPath}/${routeName}/index.js`);
            fs.copyFileSync(packagejsonPath, `${this.routesFolderPath}/${routeName}/package.json`);
        }
    },

    getRoutePathParts: function(routeDefinition) {
        let routeParts = routeDefinition.split('/');
        let routePath = [];
        routeParts.forEach(rp => {
            if (rp.indexOf(':') === 0) {
                routePath.push({
                    type: 'param',
                    value: rp.replace(':', '')
                });
            } else {
                routePath.push({
                    type: 'resource',
                    value: rp
                });
            }
        });

        return routePath;
    },

    isRouteDefinitionValid: function(routeDefinition) {
        return true;
    },

    showLog: function(text) {
        //simple 1-param logger that adds prefix information
        let dt = new Date();
        let lts = dt.toLocaleString();
        console.log(`${lts}: ${text}`);
    },

    getBufferZip: (folderPath) => {
        let zip = new AdmZip();
        zip.addLocalFolder(folderPath);
        return zip.toBuffer();
    },

    timeout: function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};