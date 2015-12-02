'use strict';
var commonTools = require('./common-tools');
var configJson = require('./config.json');
var htmlencode = require('htmlencode');

// ========================================================
// Verify To PDS Bridge Service
// A library of functions for the bridge.
// MM & IP, Sept 2015
// ========================================================

var simpleQueue = [];

module.exports = {

	getXml2js: function (){
		return xml2js;
	}
	, //next function
	getCommonTools: function (){
		return commonTools;
	}
	, //next function
	getSimpleQueueData: function (){
		return simpleQueue;
	}
	, //next function
	setSimpleQueueData: function (newData){
		simpleQueue = newData;
	}
	, //next function

	systemStatusPage: function (req, res) {
		res.setHeader('Content-Type', 'text/html');
		res.send("<html><head></head><body><p>Running</p></body></head>");
	}
	, //next function

	queryRoleAssertion: function(req, res) {
		try {
			var correlationId = commonTools.generateGuid();
			var tokenVal = req.query.token;
			
			commonTools.consoleDumpText('debug', 'Token' , tokenVal);
			
			var queueItem = {
				'correlationId': correlationId,
				'token' :  encodeURIComponent(tokenVal),
				'request': req,
				'response': res,
				'sent': false
				};
				
			commonTools.consoleDumpText('debug', 'queryRoleAssertion:Starting' , queueItem);
			
			simpleQueue.push( queueItem );
			
			commonTools.consoleDumpText('debug', 'queryRoleAssertion:QueueLength' , simpleQueue.length);
			
		} catch (err) {
			commonTools.consoleDumpError('error', 'queryRoleAssertion.error' , err);
			res.statusCode = 500;
			res.setHeader('Content-Type', 'application/xml');
			res.send( { 'error' : 'Error in queryRoleAssertion: ' + commonTools.prettyPrintError(err) } );
			return;
		}
	}
	, //next function

	dequeueFromBridgeToWorker: function(req, res) {
		
		var messagesForWorker = [];
		var itemsToGiveToWorker = simpleQueue.filter(function notSent(val) { return val.sent == false });

		itemsToGiveToWorker.forEach(function(val, index, array) {
			messagesForWorker.push( {
				'correlationId': val.correlationId,
				'token' : val.token
			});
			val.sent = true;
		});

		var textToSend = JSON.stringify(messagesForWorker);

		if (itemsToGiveToWorker && itemsToGiveToWorker.length > 0 ){
			commonTools.consoleDumpObject('debug', 'dequeueFromBridgeToWorker:messagesForWorker-object' , messagesForWorker);
		}

		res.setHeader('Content-Type', 'application/json');
		res.send(textToSend);
		
		commonTools.consoleDumpText('debug', 'dequeueFromBridgeToWorker:QueueLength' , messagesForWorker.length);
	}
	, //next function

	enqueueFromWorkerBackToBridge: function(req, res) {
		
		var inputText = req.rawBody;
		
		try {
			var parsedResponse = JSON.parse(inputText);
		} catch (err) {
			commonTools.systemEvent('Most recent Worker response error');
			commonTools.systemEventData('Most recent Worker response status', 'ERROR processing json: ' + commonTools.prettyPrintError(err));
			commonTools.consoleDumpError('error', 'enqueueFromWorkerBackToBridge' , err);
			res.statusCode = 500;
			res.setHeader('Content-Type', 'application/json');
			res.send( { 'error' : 'error processing input json' } );
			return;
		}

		commonTools.consoleDumpObject('debug', 'enqueueFromWorkerBackToBridge:Starting' , parsedResponse);

		var itemsBackFromWorker = simpleQueue.filter(function filterById(val) { return val.correlationId == parsedResponse.correlationId }); //TODO - should only ever be 0 or 1 returned

		if ( itemsBackFromWorker.length == 0) {
			commonTools.consoleDumpText('error', 'enqueueFromWorkerBackToBridge', 'ID not found: ' + parsedResponse.correlationId)
		} else if (itemsBackFromWorker.length > 1){
			commonTools.consoleDumpText('error', 'enqueueFromWorkerBackToBridge', 'Too many matches found for ID: ' + parsedResponse.correlationId)
		}

		commonTools.removeMatchingItems(simpleQueue, 'sent', true);
		commonTools.systemEventData('Stub GDS messages outstanding', '' + simpleQueue.length);

		var queueItem = itemsBackFromWorker[0];

		queueItem.response.setHeader('Content-Type', 'application/xml');
		queueItem.response.send(parsedResponse.payload); //back to GDS
		commonTools.systemEventData('Most recent Stub GDS status', 'OK');
		
		res.send(200); //back to worker servic
	}

}; //end exported methods

