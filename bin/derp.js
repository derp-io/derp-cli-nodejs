#!/usr/bin/env node

var derp = require('../lib/index');
let yargs = require('yargs');

var argv = require('yargs').argv;

if (argv.v) {
    derp.displayVersion();
}