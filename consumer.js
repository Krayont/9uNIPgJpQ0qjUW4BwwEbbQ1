'use strict';

// Import Libraries
const PromiseDB 	= require('bluebird');
const co 			= require('co');

// Import helpers
const Beanstalkd 	= require('./beanstalkd.js');
const Mongoose	= require('./mongoose.js');
const JobHandler 	= require('./job_handler.js');

let bs_client 		= PromiseDB.promisifyAll(new Beanstalkd());
let mongo_client	= PromiseDB.promisifyAll(new Mongoose());

// Initiate require connections

co(function* () {
	let bs_conn = yield bs_client.initiateAsync();
	let mongo_conn = yield mongo_client.initiateAsync();
    // Watch the Tube for new Job
	let watch_tube = bs_client.watchTubeAsync(null);
    // Use the Tube to release the job to the correct tube
	let use_tube = bs_client.useTubeAsync();
	yield[watch_tube, use_tube];
	console.log(bs_conn + ' \n' + mongo_conn);
	return true;
}).then(function () {
	let job_handler = new JobHandler(bs_client, mongo_client);
	job_handler.startWorker();
}, function (err) {
	console.error(err.stack);
});
