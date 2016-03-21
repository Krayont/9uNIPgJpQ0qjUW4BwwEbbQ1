'use strict';

var mongoose 		= require('mongoose');

var Schema 			= mongoose.Schema;

var rateSchema = new Schema({
	from:  String,
	to: String,
	created_at: { type: Date, default: Date.now },
	rate: String
});

var countSchema = new Schema({
	job_id: Number,
	succeed: Number,
	failure: Number
});

var Rate  			= mongoose.model('Rate', rateSchema);
var Count 			= mongoose.model('Count', countSchema);

function Mongoose() {

	this.mongo_ip		= '192.168.10.11';
	this.mongo_port		= 27017;
	this.db_name		= 'currency_exchange';
	this.collection 	= 'rates';

}

Mongoose.prototype.initiate = function initiate( callback ) {

	mongoose.connect('mongodb://' + this.mongo_ip + ':' + this.mongo_port + '/' + this.db_name);
	this.connection = mongoose.connection;

	this.connection.on('error', function() {
		//console.error.bind( console, 'connection error:');
		return callback( 'Connection Error' );
		
	});

	this.connection.once('open', function() {
		return callback( null, 'Connected to MongoDB Server');
	});

}

Mongoose.prototype.insertRecord = function insertRecord( record, callback ) {

	var request = new Rate( record );

	request.save( function( err ) {
		if( err ) {
			return callback( err )
		} else {
			return callback( null );
		}	
	});
}

Mongoose.prototype.findJobStatus = function findJobStatus( job_id, callback ) {

	Count.findOne( { 'job_id' : job_id }, function(err, doc) {
		if (err) {
			return callback( err );
		} else {
			return callback( null, doc );
		}    	
	});

}

Mongoose.prototype.updateJobStatus = function updateJobStatus( job_id, job_status_type, callback ) {

	if( job_status_type == 'succeed' ) {
		Count.findOneAndUpdate(
				{ 'job_id' : job_id }, 
				{ $inc: { 'succeed': 1 } },
				{ upsert:true }, 
				function(err, doc) {
		    		if (err) {
		    			return callback( err );
		    		} else {
		    			return callback( null, "succesfully saved");
		    		}
			    	
		});

	} else {
		Count.findOneAndUpdate(
			{ 'job_id' : job_id }, 
			{ $inc: { 'failure': 1 } },
			{ upsert:true }, 
			function(err, doc) {
	    		if (err) {
	    			return callback( err );
	    		} else {
	    			return callback( null, "succesfully saved");
	    		}
		    	
	});

	}

}


module.exports = Mongoose;













