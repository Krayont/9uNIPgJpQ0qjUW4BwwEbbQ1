'use strict';

const request = require('request');

function Fixer(currency_from, currency_to) {
	this.uri = 'http://api.fixer.io/latest?base=' + currency_from + '&symbols=' + currency_to;
}

Fixer.prototype.getExchangeRate = function getExchangeRate(callback) {
	const options = {
		uri: this.uri
	};
    // default callback function from request module
	function request_callback(error, response, body) {
		if (!error && response.statusCode === 200) {
			return callback(null, body);
		} else {
			return callback(error);
		}
	}
	// Send request to 3rd party api to get the exchange rate
	request(options, request_callback);
};

module.exports = Fixer;
