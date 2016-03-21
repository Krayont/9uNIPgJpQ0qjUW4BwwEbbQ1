'use strict';

// Declare imports
var fivebeans   = require('fivebeans');

function Beanstalkd() {
    this.client     = new fivebeans.client('127.0.0.1', 11300);
    this.tube_name  = '9uNIPgJpQ0qjUW4BwwEbbQ1';
}

Beanstalkd.prototype.initiate = function initiate( callback ) {

    this.client.on('connect', function() {
        // client can now be used
        //console.log( "connected ");
        return callback( null, "Connected to Beanstalkd Server" );

    }).on('error', function(err) {
        // connection failure
        return callback( err, null );

    }).on('close', function() {
        // underlying connection has closed
        return callback( false, "Connection Closed");

    }).connect();

}

Beanstalkd.prototype.watchTube = function watchTube( tube_name, callback ) {
    
    //Watch /Listen to a tube/queue
    if( tube_name != "" && tube_name != null ) {
        this.tube_name = tube_name;

    } 
        
    this.client.watch( this.tube_name, function(err, num_watched) {

        if( !err ) {
            return callback( null );
        } else {
            return callback( err );
        }
    });



}

Beanstalkd.prototype.useTube = function useTube( callback ) {

    this.client.use( this.tube_name, function( err ) { 
        if( !err ) {
            return callback( null );
        } else {
            return callback( err );
        }
        
    });

}

Beanstalkd.prototype.reserve = function reserve( callback ) {

    this.client.reserve( function(err, job_id, payload ) {

        if( err ) {
            return callback( err );
        
        } else {
            return callback( null, [job_id, payload.toString()] );

        }

    });

}

Beanstalkd.prototype.release = function release( job_id, delay, callback ) {

    this.client.release(job_id, 0, delay, function(err) {

        if( !err ) {
            return callback( null );
        } else {
            return callback( err );
        }

    });

}

Beanstalkd.prototype.jobStatus = function jobStatus( job_id, callback ) {

    this.client.stats_job( job_id, function(err, response) {
        if( !err ) {
            return callback( null, response );
        } else {
            return callback( err );
        }
    });
}

Beanstalkd.prototype.destroyJob = function destroyJob( job_id, callback ) {

    this.client.destroy(job_id, function( err ) {
        if( !err ) {
            return callback( null, "job " + job_id+  " destroy " );
        
        } else {
            return callback( err );
        }
        
    });

}

Beanstalkd.prototype.buryJob = function buryJob( job_id, callback ) {

    this.client.bury(job_id, 0, function(err) {
        if( !err ) {
            return callback( null );
        } else {
            return callback( err );
        }
    });

}

Beanstalkd.prototype.createJob = function createJob( payload, callback ) {

    this.client.peek_ready(function(err, jobid, payload) {

                console.log( jobid );
            });

    this.client.put(0, 0, 1, JSON.stringify(payload), function(err, job_id) {

        if( !err ) {

            return callback( null, "Job Created with ID : " + job_id);
        
        } else {
            return callback( err );
        }
        
    });

}


module.exports = Beanstalkd;