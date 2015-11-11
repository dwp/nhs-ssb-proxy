'use strict';
var configJson = require('./config.json');
var packageJson = require('./package.json');
var htmlEncode = require('htmlencode');

// ========================================================
// common-tools.js
// A library of functions to import
// MM & IP, Sept 2015
// ========================================================

// error (least logging) > info (medium logging) > debug (verbose logging)
var loggingLevels = { system : 0, error : 1, info : 2, debug : 3};

var startTime = 'n/a';
var systemEvents = {};

module.exports = {

	/**
	 * see http://stackoverflow.com/a/14794066
	*/
	isInt: function (value) {
		var x;
		if (isNaN(value)) {
			return false;
		}
		x = parseFloat(value);
		return (x | 0) === x;
	}	
	, //next function

	toggleDebugMode: function (req, res) {
		var inputText = '' + module.exports.removeLineBreaksAndDoubleSpaces('' + req.rawBody);
		module.exports.consoleDumpText('debug', 'toggleDebugMode.inputText', inputText);
		module.exports.setDebugLevel('' + inputText.toLowerCase());
		module.exports.consoleDumpText('system', 'toggleDebugMode.DebugLevel', '' + configJson.debugLevel);
		module.exports.forwardToSystemStatus(req, res);
	}
	, //next function

	initialise: function(){
		startTime = module.exports.dateForNow();
	}
	, //next function
	/**
	* Add a set of system records to the collection for reporting later
	*/
	systemEventDefaults : function(mapOfNamesToDefaults) {
		for (var keyText in mapOfNamesToDefaults) {
			var valueText = mapOfNamesToDefaults[keyText];
			systemEvents[keyText] = valueText;
		}
	}
	, //next function

	currentSystemEvents : function() {
		var dataCopy = {};
		for (var keyText in systemEvents) {
			var valueText = systemEvents[keyText];
			dataCopy[keyText] = valueText;
		}
		return dataCopy;
	}
	, //next function

	clearSystemEvents : function() {
		systemEvents = {};
	}
	, //next function

	/**
	* Record a system records in the collection for reporting later
	*/
	systemEventData : function(keyName, newValue){
		systemEvents[keyName] = newValue;
	}
	, //next function

	/**
	* Increment a system counter in the collection for reporting later
	*/
	systemEventPlusOne : function(keyName){
		var eventValue = parseInt(systemEvents[keyName]);
		eventValue++;
		systemEvents[keyName] = eventValue;
	}
	, //next function

	/**
	* Record a system records in the collection for reporting later
	*/
	systemEvent : function(keyName){
		module.exports.systemEventData(keyName, module.exports.nowAsXsDateTimeFormat());
	}
	, //next function

	renderSystemEvents: function() {
		return module.exports.renderKeyValueTable('Service System Events', 'Name', 'Value', systemEvents);
	}
	, //next function

	dataMapWithOverrides: function (defaultsMap, overridesMap){
		var resultsMap = {};
		for (var defaultKey in defaultsMap) {
			var defaultText = '' + defaultsMap[defaultKey];
			if ('true' === defaultText.toLowerCase() ) {
				resultsMap[defaultKey] = true;
			} else if ('false' === defaultText.toLowerCase() ) {
				resultsMap[defaultKey] = false;
			} else {
				resultsMap[defaultKey] = defaultText;
			}
		}
		if (overridesMap) {
			for (var overrideKey in overridesMap) {
				var overrideText = overridesMap[overrideKey];
				if (overrideText) {
					if ('true' === ('' + overrideText).toLowerCase() ) {
						resultsMap[overrideKey] = true;
					} else if ('false' === ('' + overrideText).toLowerCase() ) {
						resultsMap[overrideKey] = false;
					} else {
						resultsMap[overrideKey] = ('' + overrideText);
					}
				}
			}
		}
		return resultsMap;
	}
	, //next function
	
	queryParameters: function(requestQueryWithOverrides) {
		return module.exports.dataMapWithOverrides ({
				showServiceInfo : true,
				showSystemEvents : true,
				showExtraInfo : true,
				rawJsonOnly : false
			}, 
			requestQueryWithOverrides);
	}
	, //next function

	/**
	* generates the system uptime.
	* @returns {String} The generated xsDateTime.
	* @example 78 days and 12:34:56 since 2015-09-18T11:10:27
	*/
	uptimeWithDays: function (toDate){
		var upTime = toDate.valueOf() - startTime.valueOf();
		var ONE_DAY_IN_MILLIS = 24*60*60*1000;
		var absUpTime = Math.abs(upTime / ONE_DAY_IN_MILLIS);
		var daysDiff = Math.floor(absUpTime);
		var timeLeft = upTime - daysDiff;
		var daysText = '' + pad(daysDiff) + ' days and ';
		var timeText = module.exports.xsTimeFormat(new Date(timeLeft));
		var fromText = ' since ' + module.exports.xsDateTimeFormat(startTime);
		return daysText + timeText + fromText;
	}
	, //next function

	/**
	* generates the system uptime.
	* @returns {String} The generated xsDateTime.
	* @example 23 days and 12:34:56
	*/
	uptimeWithDaysToNow: function (){
		return module.exports.uptimeWithDays(module.exports.dateForNow());
	}
	, //next function

	/**
	* Generates a GUID string.
	* @returns {String} The generated GUID.
	* @example af8a8416-6e18-a307-bd9c-f2c947bbb3aa
	* @author Slavik Meltser (slavik@meltser.info).
	* @link http://slavik.meltser.info/?p=142
	*/
	generateGuid: function () {
		return _p8() + _p8(true) + _p8(true) + _p8();
	}
	, //next function

	/**
	* Generates a random string of 4 digits
	* @returns {String} The digits.
	* @example 1234
	*/
	generateRandomDigits: function () {
		return Math.random().toString().slice(2,6);
	}
	, //next function

	/**
	* Generates a String with all whitespce (tabs, returns, newlines, and double spaces) compressed
	* @returns {String} The flattended text.
	*/
	removeLineBreaksAndDoubleSpaces: function (inputText) {
		return ('' + inputText).replace(/(\r\n|\n|\r)/gm," ").replace(/\s+/g," ");
	}
	, //next function

	setDebugLevel: function (newValue){
		module.exports.silentSetDebugLevel(newValue);
		consoleLog(module.exports.nowAsXsDateTimeFormat(), 'system', 'common-tools.DebugLevel', configJson.debugLevel);
	}
	, //next function

	silentSetDebugLevel: function (newValue){
		configJson.debugLevel = newValue;
	}
	, //next function

	getDebugLevel: function (){
		return configJson.debugLevel;
	}
	, //next function

	/**
	* Conditionally dump an object with a text label to the console
	*/
	consoleDumpObject: function (DebugLevel, debugLabel, debugObject) {
		// error (least logging) > info (medium logging) > debug (verbose logging)
		//var loggingLevels = { system : 0, error : 1, info : 2, debug : 3};
		var doDebug = loggingLevels[configJson.debugLevel.toLowerCase()] >= loggingLevels[DebugLevel.toLowerCase()];
		if (doDebug){
			console.log('');
			consoleLog(module.exports.nowAsXsDateTimeFormat(), DebugLevel, debugLabel,  JSON.stringify(debugObject));
		}
	}
	, //next function

	/**
	* Conditionally dump text data with a label to the console
	*/
	consoleDumpText: function (DebugLevel, debugLabel, debugText) {
		// error (least logging) > info (medium logging) > debug (verbose logging)
		//var loggingLevels = { system : 0, error : 1, info : 2, debug : 3};
		var doDebug = loggingLevels[configJson.debugLevel.toLowerCase()] >= loggingLevels[DebugLevel.toLowerCase()];
		if (doDebug){
			console.log('');
			consoleLog(module.exports.nowAsXsDateTimeFormat(), DebugLevel, debugLabel, debugText);
		}

	}
	, //next function
	
	/**
	* Conditionally dump text data with a label to the console
	*/
	consoleDumpError: function (DebugLevel, debugLabel, errrorObject) {
		// error (least logging) > info (medium logging) > debug (verbose logging)
		//var loggingLevels = { system : 0, error : 1, info : 2, debug : 3};
		var doDebug = loggingLevels[configJson.debugLevel.toLowerCase()] >= loggingLevels[DebugLevel.toLowerCase()];
		if (doDebug){
			console.log('');
			var debugText = module.exports.prettyPrintError(errrorObject);
			consoleLog(module.exports.nowAsXsDateTimeFormat(), DebugLevel, debugLabel, debugText);
		}

	}
	, //next function
	
	/**
	* Pretty print an error
	*/
	prettyPrintError: function (errorObject) {
		if (errorObject) {
			return '<Response><ResponseFault description="nhs-ssb-proxy error - ' +  errorObject.name + '-' + errorObject.message + '" code="1002"/></Response>';
		} else {
			return '<Response><ResponseFault description="nhs-ssb-proxy error" code="1002"/></Response>'
		}
	}
	, //next function
	
	/**
	* Produces a default map of 'unknown' data for error scenarios where the xml or other data cannot be determined
	* @returns {Map} The error data with error status atttached.
	*/
	errorCaseDataMap: function () {
		var errorsMap  = {
			requestMessageIdentifier : 'unknown',
			requestDateAndTime : 'unknown',
			hashedReferenceIdentifier : 'unknown',
			nhsNumber : 'unknown',
			practiceCode : 'unknown'
		};
		return errorsMap;
	}
	, //next function

	/**
	* Remove all matching items from a list, where list[index].propertyName == targetValue
	*/
	removeMatchingItems: function(targetList, propertyName, targetValue){
		for(var i = 0; i < targetList.length; i++) {
			var candidate = targetList[i];
			if(candidate[propertyName] == targetValue) {
				targetList.splice(i, 1);
				i--;
			}
		}
	}
	, //next function

	/**
	* Returns s function that handles error callbacks with simple logging
	*/
	simpleErrorHandler: function (methodName) {
		return function(err){
			if (err) {
				module.exports.commonTools.consoleDumpError('error', methodName + '.err', err);
			}
		}
	}
	, //next function

	dateForNow: function (){
		return new Date();
	}
	,
		/**
	* Converts the given Date[time] onbject to an xs:dateTime format.
	* @returns {String} The generated xsDateTime.
	* @example 2015-12-31T15:26:57
	* @link http://forums.whirlpool.net.au/archive/1218957
	*/
	xsDateTimeFormat: function (sourceDate) {
		return module.exports.xsDateFormat(sourceDate) + 'T' + module.exports.xsTimeFormat(sourceDate);
	}
	, //next function

	/**
	* Converts the given Date[time] onbject to an xs:dateTime format.
	* @returns {String} The generated xsDateTime.
	* @example 2015-12-31T15:26:57
	* @link http://forums.whirlpool.net.au/archive/1218957
	*/
	xsDateFormat: function (sourceDate, onlyDays) {
		var yyyy = sourceDate.getFullYear();
		var mm1  = pad(sourceDate.getMonth()+1);
		var dd   = pad(sourceDate.getDate());
		return yyyy + '-' + mm1 + '-' + dd ;
	}
	, //next function

	/**
	* Converts the given Date[time] onbject to an xs:dateTime format.
	* @returns {String} The generated xsDateTime.
	* @example 2015-12-31T15:26:57
	* @link http://forums.whirlpool.net.au/archive/1218957
	*/
	xsTimeFormat: function (sourceDate) {
		var hh   = pad(sourceDate.getHours());
		var mm2  = pad(sourceDate.getMinutes());
		var ss   = pad(sourceDate.getSeconds());
		return hh + ':' + mm2 + ':' +ss;
	}
	, //next function

	/**
	* generates the system time in an xs:dateTime format.
	* @returns {String} The generated xsDateTime.
	* @example 2015-12-31T15:26:57
	*/
	nowAsXsDateTimeFormat: function (){
		return module.exports.xsDateTimeFormat(module.exports.dateForNow());
	}

}; //end exported methods

//initialisation goes here
module.exports.initialise();

//private methods go here

/**
* Dump text data with a label to the console
*/
function consoleLog(dateTime, DebugLevel, debugLabel, debugText) {
	console.log(dateTime + '|service=' + configJson.name + '|level=' + DebugLevel.toUpperCase() + '|operation=' + debugLabel + '|data=' + debugText);
}

/**
* Genrate a componenet of a guid
*/
function _p8(withSlash) {
	var p = (Math.random().toString(16)+"000000000").substr(2,8);
	return withSlash ? "-" + p.substr(0,4) + "-" + p.substr(4,4) : p ;
};

/**
* Pad a one digit string to 2
*/
function pad(n) {
	var s = n.toString();
	return s.length < 2 ? '0'+s : s;
};