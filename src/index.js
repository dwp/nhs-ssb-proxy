'use strict';

//Dependancies
var express = require('express');
var configJson = require('./config.json');
var commonTools = require('./common-tools');
var bridgeService = require('./ssb-bridge-service.js');

// Constants & Settings
var PORT = (parseInt(configJson.port)) ? parseInt(configJson.port) : 9001;

// App and extensions
var app = express();

//API
app.get('/systemStatus', bridgeService.systemStatusPage);

app.post('/saml/RoleAssertion', bridgeService.queryRoleAssertion);

app.post('/dequeueFromBridgeToWorker', bridgeService.dequeueFromBridgeToWorker);

app.post('/enqueueFromWorkerBackToBridge', bridgeService.enqueueFromWorkerBackToBridge);

//Initialise
app.listen(PORT);
console.log(configJson.name + ": debugLevel=" + configJson.debugLevel)
console.log(configJson.name + ": Running on http://localhost:" + PORT + " ...")