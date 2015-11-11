'use strict';
var commonTools = require('./common-tools');
var configJson = require('./config.json');
var htmlencode = require('htmlencode');
var xml2js = require('xml2js');

module.exports = {
	
	getXml2js: function (){
		return xml2js;
	}
	, //next function
	getCommonTools: function (){
		return commonTools;
	}
	, //next function
	
	systemEventDefaultSettings: function (){
		return {
			'Most recent lookup message' : 'n/a',
			'Most recent lookup error' : 'n/a',
			'Most recent lookup status' : 'n/a',
			'Most recent createOrUpdate message' : 'n/a',  
			'Most recent createOrUpdate error' : 'n/a',
			'Most recent createOrUpdate status' : 'n/a'
		};
	}
	, //next function
	
	/**
	* Process the lookup and return an xml response
	* @returns {String} The generated xml.
	*/
	lookupMapping: function (req, res) {
		
		try {
			var inputXmlText = req.rawBody;
			commonTools.consoleDumpText('debug', 'lookupMapping.inputXmlText', commonTools.removeLineBreaksAndDoubleSpaces(inputXmlText));
			commonTools.systemEvent('Most recent lookup message');

			redisUtils.pushMessageHistoryItem('lookupMapping-start', commonTools.removeLineBreaksAndDoubleSpaces(inputXmlText), commonTools.simpleErrorHandler('lookupMapping.pushMessageHistoryItem.start'));
			xml2js.parseString(inputXmlText, onLookupParserFinish);
		} catch (err) {
			generalError('lookupMapping', 'unexpected error', err);
			return;
		}
		
		function onLookupParserFinish(err, parseResult) {
			if (err) { 
				generalError('onLookupParserFinish', 'xml parser', err);
				return;
			}
			var requestDataMap = module.exports.lookupMappingRequestDataMap(parseResult);
			redisUtils.lookupMappingDataResult(requestDataMap, res, module.exports.onRedisLookupFinishWithXmlResponse); 
		}
		
		function generalError(methodName, errorPrefix, errorObject){
			var errorMessage = 'Error in ' + methodName + ': '+  errorPrefix + ': ' + commonTools.prettyPrintError(errorObject); 
			commonTools.systemEvent('Most recent lookup error');
			commonTools.systemEventData('Most recent lookup status', errorMessage); 
			commonTools.consoleDumpError('error', methodName + '.err', errorObject);
			var errorDescription = { resultStatus : 'Error', resultMessage : errorMessage};
			var errorResponseXml = module.exports.generateLookupMappingReturnXml(commonTools.errorCaseDataMap(), commonTools.errorCaseDataMap(), errorDescription);
			redisUtils.pushMessageHistoryItem('lookupMapping-end', commonTools.removeLineBreaksAndDoubleSpaces(errorResponseXml), commonTools.simpleErrorHandler('lookupMapping.onLookupParserFinish'));
			res.statusCode = 500;
			res.setHeader('Access-Control-Allow-Origin', '*');			
			res.setHeader('Content-Type', 'application/xml');
			res.send(errorResponseXml);
		}
	}
	, //next function
	
	, //next function
	
	/**
	* Generates the return xml message string.
	* @returns {String} The generated xml.  
	*/
	generateLookupMappingReturnXml: function (sourceXmlValuesMap, lookupInRedisResultMap, redisOperationResultMap) {

		var responseXml = '<?xml version="1.0" encoding="UTF-8" ?>'
			+ '<cip:citizenIdentity xmlns:cip="http://tbd">'
			+ '<cip:senderDetails>'
			+ '<cip:requestMessageIdentifier>' + sourceXmlValuesMap.requestMessageIdentifier + '</cip:requestMessageIdentifier>'
			+ '<cip:requestDateAndTime>' + sourceXmlValuesMap.requestDateAndTime + '</cip:requestDateAndTime>'
			+ '</cip:senderDetails>'
			+ '<cip:responderDetails>'
			+ '<cip:responseMessageIdentifier>' + commonTools.generateGuid() + '</cip:responseMessageIdentifier>'
			+ '<cip:responseDateAndTime>' + commonTools.nowAsXsDateTimeFormat() + '</cip:responseDateAndTime>'
			+ '</cip:responderDetails>'
			+ '<cip:lookupMappingResponse>'
			+ '<cip:hashedReferenceIdentifier>' + sourceXmlValuesMap.hashedReferenceIdentifier + '</cip:hashedReferenceIdentifier>'
			+ '<cip:resultStatus>' + redisOperationResultMap.resultStatus + '</cip:resultStatus>'
			+ '<cip:resultMessage>' + redisOperationResultMap.resultMessage + '</cip:resultMessage>'
			+ '<cip:nhsNumber>' + lookupInRedisResultMap.nhsNumber + '</cip:nhsNumber>'
			+ '<cip:practiceCode>' + lookupInRedisResultMap.practiceCode + '</cip:practiceCode>'
			+ '</cip:lookupMappingResponse>'
			+ '</cip:citizenIdentity>';
		commonTools.consoleDumpText('info', 'generateLookupMappingReturnXml.responseXml', responseXml);
		
		return responseXml;
	}
	, //next function

	createOrUpdateMapping: function (req, res) {
		try {
			var inputXmlText = req.rawBody;
			commonTools.consoleDumpText('debug', 'createOrUpdateMapping.inputXmlText', commonTools.removeLineBreaksAndDoubleSpaces(inputXmlText));
			commonTools.systemEvent('Most recent createOrUpdate message');
			
			redisUtils.pushMessageHistoryItem('createOrUpdateMapping-start', inputXmlText, commonTools.simpleErrorHandler('createOrUpdateMapping.pushMessageHistoryItem.start'));
			xml2js.parseString(inputXmlText, onCreateOrUpdateParserFinish);			
		} catch (err) {
			generalError('createOrUpdateMapping', 'unexpected error', err);
			return;
		}
		
		function onCreateOrUpdateParserFinish(err, parserResult) {
			commonTools.consoleDumpObject('debug', 'createOrUpdateMapping.parserResult', parserResult);
			if (err) {
				generalError('onCreateOrUpdateParserFinish', 'xml parser', err);
				return
			}
			
			var requestDataMap = module.exports.createOrUpdateRequestDataMap(parserResult);
			redisUtils.createOrUpdateDataResult(requestDataMap, res, module.exports.onRedisSaveFinishWithXmlResponse);
		}		
		
		function generalError(methodName, errorPrefix, errorObject){	
			var errorMessage = 'Error in ' + methodName + ': '+  errorPrefix + ': ' + commonTools.prettyPrintError(errorObject); 
			commonTools.systemEvent('Most recent createOrUpdate error');
			commonTools.systemEventData('Most recent createOrUpdate status', errorMessage);
			commonTools.consoleDumpError('error', methodName + '.err', errorObject);
			var errorDescription = { resultStatus : 'Error', resultMessage : errorMessage };
			var errorResponseXml = module.exports.generateCreateOrUpdateReturnXml(commonTools.errorCaseDataMap(), errorDescription);
			redisUtils.pushMessageHistoryItem('createOrUpdateMapping-end', commonTools.removeLineBreaksAndDoubleSpaces(errorResponseXml), commonTools.simpleErrorHandler('createOrUpdateMapping.pushMessageHistoryItem.end'));
			res.statusCode = 500;
			res.setHeader('Access-Control-Allow-Origin', '*');	
			res.setHeader('Content-Type', 'application/xml');
			res.send(errorResponseXml);
		}
		
	}
	, //next function
	
	/**
	* Generates the return xml message string.
	* @returns {String} The generated xml.  
	*/
	generateCreateOrUpdateReturnXml: function (sourceXmlValuesMap, redisOperationResultMap) {
		//sample output
		//<?xml version="1.0" encoding="UTF-8" ?>
		//<cip:citizenIdentity xmlns:cip="http://tbd">
		//	<cip:senderDetails>
		//		<cip:requestMessageIdentifier>6789</cip:requestMessageIdentifier>
		//		<cip:requestDateAndTime>1971-06-02T12:34:56</cip:requestDateAndTime>
		//	</cip:senderDetails>
		//	<cip:responderDetails>
		//		<cip:responseMessageIdentifier>8765432</cip:responseMessageIdentifier>
		//		<cip:responseDateAndTime>1971-06-02T12:34:56</cip:responseDateAndTime>
		//	</cip:responderDetails>
		//	<cip:createOrUpdateMappingResponse> 
		//		<cip:hashedReferenceIdentifier>{HashedPID}</cip:hashedReferenceIdentifier>
		//		<cip:resultStatus>Success</cip:resultStatus>
		//		<cip:resultMessage>Saved was ok</cip:resultMessage>
		//	</cip:createOrUpdateMappingResponse> 
		//</cip:citizenIdentity>
		var responseXml = '<?xml version="1.0" encoding="UTF-8" ?>'
			+ '<cip:citizenIdentity xmlns:cip="http://tbd">'
			+ '<cip:senderDetails>'
			+ '<cip:requestMessageIdentifier>' + sourceXmlValuesMap.requestMessageIdentifier + '</cip:requestMessageIdentifier>'
			+ '<cip:requestDateAndTime>' + sourceXmlValuesMap.requestDateAndTime + '</cip:requestDateAndTime>'
			+ '</cip:senderDetails>'
			+ '<cip:responderDetails>'
			+ '<cip:responseMessageIdentifier>' + commonTools.generateGuid() + '</cip:responseMessageIdentifier>'
			+ '<cip:responseDateAndTime>' + commonTools.nowAsXsDateTimeFormat() + '</cip:responseDateAndTime>'
			+ '</cip:responderDetails>'
			+ '<cip:createOrUpdateMappingResponse>'
			+ '<cip:hashedReferenceIdentifier>' + sourceXmlValuesMap.hashedReferenceIdentifier + '</cip:hashedReferenceIdentifier>'
			+ '<cip:resultStatus>' + redisOperationResultMap.resultStatus + '</cip:resultStatus>'
			+ '<cip:resultMessage>' + redisOperationResultMap.resultMessage + '</cip:resultMessage>'
			+ '</cip:createOrUpdateMappingResponse>'
			+ '</cip:citizenIdentity>';
		commonTools.consoleDumpText('info', 'generateCreateOrUpdateReturnXml.responseXml', responseXml);
		
		return responseXml;
	}
	
}; //end exported methods

//private methods go here
//...
