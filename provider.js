/**
	- Creating sample job/payload only
**/
var Beanstalkd = require('./beanstalkd.js');

var payload = {
  "from": "AUD",
  "to": "HKD"
};

var bs_client 		= new Beanstalkd();

bs_client.initiate( function(err, response) {

	if( !err ) {
		
		bs_client.useTube( function( err ) {} );

		bs_client.createJob( payload, function( err, data) {
			console.log( data );

		});

	} else {
		console.log( err );
	}


});
