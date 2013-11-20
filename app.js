"use strict";

// Load configuration and initialize server
var cluestrProvider = require('cluestr-provider');
var serverConfig = require('./lib/provider-PROVIDER');

var server = cluestrProvider.createServer(serverConfig);

// Expose the server
module.exports = server;
