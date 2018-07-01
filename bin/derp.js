#!/usr/bin/env node

var derp = require('../lib/index');
const yargs = require('yargs');

yargs
    .command(['new-route <routeName> <routeDefinition> <routeType>'], 'Create a new route', (yargs) => {
        return yargs.positional('routeName', {
                describe: 'Name used for your routed route',
                type: 'string'
            }).positional('routeDefinition', {
                describe: 'Definition of route as it should be exposed in a url, e.g. `api/getUserById/:id`',
                type: 'string'
            }).positional('routeType', {
                describe: 'Type of HTTP Method for this route: GET|POST|PUT|DELETE',
                type: 'string'
            })
            .option('provider', {
                alias: 'p',
                default: 'aws-lambda'
            })
    }, (argv) => {
        derp.route(argv.routeName, argv.routeDefinition, argv.routeType);
    })
    .command(['deploy-route <routeName>'], 'Deploy a route', (yargs) => {
        return yargs.positional('routeName', {
            describe: 'Name used for your routed route',
            type: 'string'
        })
    }, (argv) => {
        derp.deployRoute(argv.routeName);
    })
    .command(['init <appName>'],
        'Initialize derp project.',
        (yargs) => {
            return yargs
                .option('region', {
                    alias: 'r',
                    default: 'us-east-1'
                })
        }, (argv) => {
            console.log(argv)
            derp.init(argv.appName, argv.region);
        })
    .help()
    .argv