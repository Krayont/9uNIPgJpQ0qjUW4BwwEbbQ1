'use strict';
/**
	@Job Handler
	@param {String} job_payload_json - a json object of the payload from Beanstalk
	@param {Object} fixer_rate
 **/
const PromiseDB 	= require('bluebird');
const co 			= require('co');
const FixerRate  	= require('./fixer_io.js');

let bs_client;
let mongo_client;

const SUCCEED_LIMIT	= 3;
const FAILURE_LIMIT	= 3;

const RETRY_ON_FAILURE = 3;
const DELAY_ON_SUCCESS = 5;


class JobHandler {
	// constrcutor class
	constructor(beanstalkd_client, mongodb_client) {
		bs_client 		= beanstalkd_client;
		mongo_client	= mongodb_client;
	}

	checkAndBuryJob(job_status, job_id, callback) {
		if (job_status.succeed >= SUCCEED_LIMIT || job_status.failure >= FAILURE_LIMIT) {
			// Bury the Job
			bs_client.buryJob(job_id, function (err) {
				console.log('Bury : Job ID ' + job_id);
				callback(null, true);
			});
		} else {
			callback(null, false);
		}
	}

	getExchangeRate(from, to, callback) {
		// send request to get the exchange rate
		co(function* () {
			let fixer_rate = PromiseDB.promisifyAll(new FixerRate(from, to));
			return yield fixer_rate.getExchangeRateAsync();
		}).then(function (current_rate) {
			callback(null, current_rate);
		}, function (err) {
			callback(err);
		});
	}

	startWorker() {
		let self = this;
		let job_payload;
		let job_status;

		co(function* () {
			// Try to reserve a job
			job_payload = yield bs_client.reserveAsync();
			// Get the reserve job status
			job_status = yield mongo_client.findJobStatusAsync(job_payload[0]);

			if (job_payload !== null && job_status !== null) {
				let check = yield PromiseDB.promisify(self.checkAndBuryJob)(job_status, job_payload[0]);
				return check;
			} else {
				return false;
			}
		}).then(function (result) {
			if (result === true) {
				console.log('Waiting for job');
				self.startWorker();
			} else {
				// console.log(job_payload[1]);
				const job_payload_json = JSON.parse(job_payload[1]);
				// get exchange rate
				co(function* () {
					return yield PromiseDB.promisify(self.getExchangeRate)(job_payload_json.from, job_payload_json.to);
				}).then(function (current_rate) {
					// get the exchange rate successfully
					co(function* () {
						// update job status count
						yield mongo_client.updateJobStatusAsync(job_payload[0], 'succeed');
						// requeue the job : success
						yield bs_client.releaseAsync(job_payload[0], DELAY_ON_SUCCESS);
						// insert record into mongodb
						const rate_json = JSON.parse(current_rate);
						const record = {
							'from': job_payload_json.from,
							'to': job_payload_json.to,
							'rate': (rate_json.rates[job_payload_json.to].toFixed(2)).toString()
						};
						yield mongo_client.insertRecordAsync(record);
						return job_payload[0];
					}).then(function (job_id) {
						console.log('Job Requeue on get rate success with job id : ' + job_id);
						// start the worker again
						self.startWorker();
					}, function (err) {
						// start the worker again
						console.log('Job Requeue on get rate success(with err) with job id : ' + job_payload[0]);
						self.startWorker();
					});
				}, function (err) {
					// Failed to get exchange rate
					co(function* () {
						// update job status count
						yield mongo_client.updateJobStatusAsync(job_payload[0], 'failure');
						// requeue the job : success
						yield bs_client.releaseAsync(job_payload[0], RETRY_ON_FAILURE);
						return job_payload[0];
					}).then(function (job_id) {
						// start the worker again
						console.log('Job Requeue on get rate failure with job id : ' + job_payload[0]);
						self.startWorker();
					}, function (err_rate_failure) {
						// start the worker again
						console.log('Job Requeue on get rate failure(with err) with job id : ' + job_payload[0]);
						self.startWorker();
					});
				});
			}
		}, function (err) {
			console.error(err.stack);
		});
	}

	Exception(err) {
		console.error(err.stack);
	}
}

module.exports = JobHandler;
