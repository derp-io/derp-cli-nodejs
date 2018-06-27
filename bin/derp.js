#!/usr/bin/env node

var derp = require('../lib/index');

// Delete the 0 and 1 argument (node and script.js)
var args = process.argv.splice(process.execArgv.length + 2);

if (args.length > 0) {
    var arg1 = args[0];

    switch (arg1) {
        case '--version':
            {
                derp.displayVersion();
                break;
            }
        case 'start':
            {
                derp.start();
                break;
            }
        case 'deploy':
            {
                if (args[1]) {
                    let endpointName = args[1];
                    derp.deploy(endpointName);
                } else {
                    console.log('Deploy command requires an endpoint name');
                }
                break;
            }
        default:
            {
                console.log(`Unrecognized argument ${arg1}`);
                break;
            }
    }
} else {
    //display help commands
    console.log('Use --help to see a list of derp commands')
}