'use strict';

const PromiseDB 	= require('bluebird');

// const should 		= require('chai').should();
const expect 		= require('chai').expect;
// const supertest	= require('supertest');

const Beanstalkd 	= require('../beanstalkd.js');
const FixerRate  	= require('../fixer_io.js');
const Mongoose	= require('../mongoose.js');

const JobHandler 	= require('../job_handler.js');

describe('Consumer', function () {
	let bs_client;
	let mongo_client;
	let fixer_rate;
	let job_handler;
	let job_id;
	before(function () {
		bs_client 		= PromiseDB.promisifyAll(new Beanstalkd());
		mongo_client	= PromiseDB.promisifyAll(new Mongoose());
		fixer_rate		= new FixerRate('HKD', 'USD');
		job_handler 	= new JobHandler(bs_client, mongo_client);
	});

	/* Checking for connections*/
	describe('Initiating', function () {
		// start connections
		it('...connecting to beanstalk server', function (done) {
			bs_client.initiate(function (err, response) {
				expect(err).to.be.equal(null);
				expect(response).to.not.be.equal(null);
				expect(response).to.be.a('string');
				done();
			});
		});

		it('...connecting to mongodb server', function (done) {
			mongo_client.initiate(function (err, response) {
				expect(err).to.be.equal(null);
				expect(response).to.not.be.equal(null);
				expect(response).to.be.a('string');
				done();
			});
		});

		it('...connecting to fixer.io API', function (done) {
			fixer_rate.getExchangeRate(function (err, response) {
				expect(err).to.be.equal(null);
				expect(JSON.parse(response)).to.be.an('object');
				done();
			});
		});
	});

	/* Starting a Consumer worker */
	describe('Starting the job consumer', function () {
		// Listening
		it('...listening to a tube', function (done) {
			let watch_tube = bs_client.watchTube();
			expect(watch_tube).to.not.equal(null);
			expect(watch_tube).to.not.equal('');
			done();
		});
	});

	describe('Working on sample data', function () {
		// generating sample job
		it('...generate a sample job (USD -> HKD)', function (done) {
			const payload = {
				'from': 'USD',
				'to': 'HKD'
			};
			bs_client.useTube(function (err) {});
			bs_client.createJob(payload, function (err, res_job_id) {
				expect(err).to.be.equal(null);
				expect(res_job_id).to.be.a('string');
				done();
			});
		});

		it('...Reserving the sample job', function (done) {
			bs_client.reserveAsync(function (err, job_data) {
				expect(err).to.be.equal(null);
				expect(job_data[0]).to.be.a('string');
				expect(job_data[1]).to.be.a('string');
				job_id = job_data[0];
				done();
			});
		});

		it('...Getting Exchange Rate for the sample job', function (done) {
			job_handler.getExchangeRate('USD', 'HKD', function (err, response) {
				expect(err).to.be.equal(null);
				expect(response).to.be.a('string');
				done();
			});
		});

		it('...Saving record into mongodb', function (done) {
			// insert record into mongodb
			const rate_json = JSON.parse('{"base":"AUD","date":"2016-03-24","rates":{"HKD":5.825}}');
			const record = {
				'from': 'USD',
				'to': 'HKD',
				'rate': (rate_json.rates.HKD.toFixed(2)).toString()
			};
			mongo_client.insertRecordAsync(record, function (err) {
				expect(err).to.be.equal(null);
				done();
			});
		});

		it('...Requeue the job', function (done) {
			bs_client.release(job_id, 5, function (err, response) {
				expect(err).to.be.equal(null);
				expect(response).to.be.equal(true);
				done();
			});
		});

		it('...Burying the job', function (done) {
			bs_client.reserveAsync(function (error, job_data) {
				bs_client.buryJob(job_data[0], function (err, res_job_id) {
					expect(err).to.be.equal(null);
					expect(res_job_id).to.be.a('string');
					done();
				});
			});
		});
	});
});
