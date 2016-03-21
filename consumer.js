
//Import Libraries
var Promise 	= require("bluebird");
var co 			= require('co');

//Import helpers
var Beanstalkd 	= require('./beanstalkd.js');
var FixerRate  	= require('./fixer_io.js');
var Mongoose	= require('./mongoose.js');

var bs_client 		= Promise.promisifyAll( new Beanstalkd() );
var mongo_client	= Promise.promisifyAll( new Mongoose() ); 


//Initiate require connections
co( function* () {

  	var bs_conn 	= yield bs_client.initiateAsync();
  	var mongo_conn 	= yield mongo_client.initiateAsync();

  	//Watch the Tube for new Job
  	var watch_tube 	= bs_client.watchTubeAsync( null );
 	//Use the Tube to release the job to the correct tube
  	var use_tube 	= bs_client.useTubeAsync();

  	yield[ watch_tube, use_tube ];

  	console.log( bs_conn + " \n" + mongo_conn );

  	return true;

}).then( function( result ) {

	//Start the job handler
	JobHandler();

}).catch( Exception );

/**
	@Job Handler
	@param {String} json - a json object of the payload from Beanstalk
	@param {Object} fixer_rate  
**/

function JobHandler() {

	co(function* () {
		//Try to reserve a job
	  	var payload 	= yield bs_client.reserveAsync();
	  	var job_status 	= yield mongo_client.findJobStatusAsync( payload[0] );

	  	if( job_status != null ) {

			if( job_status['succeed'] >= 10 || job_status['failure'] >= 3 ) {
				//Bury the Job				
				bs_client.buryJob( payload[0], function( err ) { 
					console.log( "Bury : Job ID " + payload[0] );
					return;
				});

				
			} else {
				return payload;
			}

		} else {
			return payload;

		}

	}).then( function( payload ) {
		
		if( payload == "listen" || typeof payload == 'undefined' ) {
			JobHandler();

		} else {

			var json = JSON.parse( payload[1] );

			//send request to get the exchange rate
			var fixer_rate = new FixerRate( json['from'], json['to'] );
			//Get the exchange rate
			fixer_rate.getExchangeRate( function( err, exchange_rate ) {

				co( function* () {

					if( err ) {
						//Requeue the job with a delay of 3 secs
						var release = yield bs_client.releaseAsync( payload[0], 3 );
						return 'failure';
	
					} else {
						//Insert Rates into mongodb
						var rate_json = JSON.parse( exchange_rate );
						var record = {
							'from' 	: json['from'],
							'to' 	: json['to'],
							'rate' 	: (rate_json['rates'][json['to']].toFixed(2)).toString()
						}
						var insertRecord 	= yield mongo_client.insertRecordAsync( record );
						//Requeue the job with a delay of 60 secs
						var release = yield bs_client.releaseAsync( payload[0], 60 );
						return 'succeed';
					}

				}).then( function( job_status_type ) {

					mongo_client.updateJobStatus( payload[0], job_status_type, function( err, update_res) {
						console.log( "ReRoute on " + job_status_type + " : Job ID " + payload[0] );
						JobHandler();
					});


				}).catch( Exception );

			});

		}
		
	}).catch( Exception );

}


function Exception( err ) {
  // log any uncaught errors
  // co will not throw any errors you do not handle!!!
  // HANDLE ALL YOUR ERRORS!!!
  console.error( err.stack );
}


 
