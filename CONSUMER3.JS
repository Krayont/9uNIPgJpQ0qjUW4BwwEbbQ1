var fivebeans   = require('fivebeans');

bs_client     = new fivebeans.client('127.0.0.1', 11300);
bs_tube_name  = '9uNIPgJpQ0qjUW4BwwEbbQ1';

	bs_client.on('connect', function() {
        // client can now be used
        console.log( "connected ");
        //return callback( null, "Connected to Beanstalkd Server" );

    }).on('error', function(err) {
        // connection failure
        //return callback( err, null );

    }).on('close', function() {
        // underlying connection has closed
        //return callback( false, "Connection Closed");

    }).connect();

    bs_client.watch( bs_tube_name, function(err, num_watched) {
    	//console.log( num_watched );
    });

    bs_client.use( bs_tube_name, function(err, num_watched) {
        //console.log( num_watched );
    });

    bs_client.stats_tube( bs_tube_name, function(err, response) { 
        console.log(response); 
    });


	