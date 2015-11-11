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

	/* TO ADD BACK IN WHEN WE GET THE REAL GDS:
			'Most recent Real GDS message' : 'n/a',
			'Most recent Real GDS error' : 'n/a',
			'Most recent Real GDS status' : 'n/a',
			'Real GDS messages received' : 0,
			'Real GDS messages processed' : 0,
			'Real GDS messages outstanding' : 0,
	*/
	systemStatusPage: function (req, res) {
		res.setHeader('Content-Type', 'text/html');
		res.send("<html><head></head><body><p>Running</p></body></head>");
	}
	, //next function

	queryRoleAssertion: function(req, res) {
		try {
			var correlationId = commonTools.generateGuid();
			var tokenVal = "";
			
			var gdsQueueItem = {
				'correlationId': correlationId,
				'token' : tokenVal 
				};
				
			commonTools.consoleDumpObject('debug', 'matchIdentityFromGDS:Starting' , gdsQueueItem);
			gdsQueueItem.request = req;
			gdsQueueItem.response = res;
			
			simpleQueue.push( gdsQueueItem );
			
			commonTools.systemEventData('Stub GDS messages outstanding', '' + simpleQueue.length);
			
		} catch (err) {
			commonTools.systemEvent('Most recent Stub GDS error');
			commonTools.systemEventData('Most recent Stub GDS status', 'ERROR in matchIdentityFromGDS: ' + commonTools.prettyPrintError(err));
			commonTools.consoleDumpError('error', 'matchIdentityFromGDS.error' , err);
			res.statusCode = 500;
			res.setHeader('Content-Type', 'application/json');
			res.send( { 'error' : 'Error in matchIdentityFromGDS: ' + commonTools.prettyPrintError(err) } );
			return;
		}
	}
	, //next function

	dequeueFromBridgeToWorker: function(req, res) {
		commonTools.systemEvent('Most recent Worker poll');
		var messagesForWorker = [];
		var itemsToGiveToWorker = simpleQueue.filter(function notSent(val) { return val.sent == false });

		itemsToGiveToWorker.forEach(function(val, index, array) {
			messagesForWorker.push( {
				'correlationId': val.correlationId,
				'gdsPayload' : val.gdsPayload
			});
			val.sent = true;
		});

		var textToSend = JSON.stringify(messagesForWorker);

		if (itemsToGiveToWorker && itemsToGiveToWorker.length > 0 ){
			commonTools.consoleDumpObject('debug', 'dequeueFromBridgeToWorker:messagesForWorker-object' , messagesForWorker);
		}

		res.setHeader('Content-Type', 'application/json');
		res.send(textToSend);
		commonTools.systemEventData('Most recent Worker poll status', 'OK: Sent ' + messagesForWorker.length);
	}
	, //next function

	enqueueFromWorkerBackToBridge: function(req, res) {
		var inputText = req.rawBody;
		commonTools.systemEvent('Most recent Worker response');
		try {
			var parsedBodyWithPdsData = JSON.parse(inputText);
		} catch (err) {
			commonTools.systemEvent('Most recent Worker response error');
			commonTools.systemEventData('Most recent Worker response status', 'ERROR processing json: ' + commonTools.prettyPrintError(err));
			commonTools.consoleDumpError('error', 'enqueueFromWorkerBackToBridge' , err);
			res.statusCode = 500;
			res.setHeader('Content-Type', 'application/json');
			res.send( { 'error' : 'error processing input json' } );
			return;
		}

		commonTools.consoleDumpObject('debug', 'enqueueFromWorkerBackToBridge:Starting' , parsedBodyWithPdsData);

		var itemsBackFromWorker = simpleQueue.filter(function filterById(val) { return val.correlationId == parsedBodyWithPdsData.correlationId }); //TODO - should only ever be 0 or 1 returned

		if ( itemsBackFromWorker.length == 0) {
			commonTools.consoleDumpText('error', 'enqueueFromWorkerBackToBridge', 'ID not found: ' + parsedBodyWithPdsData.correlationId)
		} else if (itemsBackFromWorker.length > 1){
			commonTools.consoleDumpText('error', 'enqueueFromWorkerBackToBridge', 'Too many matches found for ID: ' + parsedBodyWithPdsData.correlationId)
		}

		commonTools.removeMatchingItems(simpleQueue, 'sent', true);
		commonTools.systemEventData('Stub GDS messages outstanding', '' + simpleQueue.length);

		var queueItem = itemsBackFromWorker[0];
		parsedBodyWithPdsData.requestDateAndTime = queueItem.requestDateAndTime;
		parsedBodyWithPdsData.requestMessageIdentifier = queueItem.correlationId;

		var pdsDataToSaveMap = {
				requestMessageIdentifier : parsedBodyWithPdsData.requestMessageIdentifier,
				requestDateAndTime : parsedBodyWithPdsData.requestDateAndTime,
				hashedReferenceIdentifier : parsedBodyWithPdsData.gdsPayload.hashedReferenceIdentifier,
				nhsNumber : parsedBodyWithPdsData.pdsData.nhsNumber,
				practiceCode : parsedBodyWithPdsData.pdsData.practiceCode
			};
		commonTools.consoleDumpObject('debug', 'enqueueFromWorkerBackToBridge.pdsDataToSaveMap', pdsDataToSaveMap);
		redisUtils.createOrUpdateDataResult(pdsDataToSaveMap, res, commonTools.simpleErrorHandler('matchIdentityFromGDS.enqueueFromWorkerBackToBridge.save'));

		var textOfDataSentBack = JSON.stringify(parsedBodyWithPdsData);
		redisUtils.pushMessageHistoryItem('matchIdentityFromGDS-end', textOfDataSentBack, commonTools.simpleErrorHandler('matchIdentityFromGDS.pushMessageHistoryItem.end'));

		queueItem.response.setHeader('Content-Type', 'application/json');
		queueItem.response.send(parsedBodyWithPdsData); //back to GDS
		commonTools.systemEventData('Most recent Stub GDS status', 'OK');

		commonTools.consoleDumpText('info', 'enqueueFromWorkerBackToBridge:Ending', queueItem.correlationId);
		res.send(200); //back to worker service
		commonTools.systemEventData('Most recent Worker response status', 'OK');
		commonTools.systemEventPlusOne('Stub GDS messages processed');
	}

}; //end exported methods

