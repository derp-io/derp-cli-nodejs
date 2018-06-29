#!/usr/bin/env node

var derp = require('../lib/index');
const yargs = require('yargs');

yargs
    .command(['new <endpointName> <httpMethod>'], 'Create a new endpoint', (yargs) => {
        return yargs.positional('endpointName', {
                describe: 'Name used for your routed endpoint',
                type: 'string'
            }).positional('httpMethod', {
                describe: 'Type of HTTP Method for this endpoint: GET|POST|PUT|DELETE',
                type: 'string'
            })
            .option('provider', {
                alias: 'p',
                default: 'aws-lambda'
            })

    }, (argv) => {
        derp.new(argv.endpointName, argv.httpMethod);
    })
    .command(['init [appName]'],
        'Initialize derp project.',
        (yargs) => {
            return yargs;
        }, (argv) => {
            derp.init(argv.appName);
        })
    .help()
    .argv