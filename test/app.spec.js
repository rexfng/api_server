const mocha = require("mocha");
const request = require("request");
const assert = require("assert");
const delay = require('delay');
const _ = require('lodash')
var base_url = "http://localhost:3000";
var api_url = "http://localhost:3000/api/v1"
var promise = require('request-promise');
var nba_data = require('./nba_data')

var option = {
    headers: {
        'User-Agent' : 'API-server',
        'Authorization' : 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6Ik5UWXlSak5EUlRrM016STRSRVpETmpKRU9FTkZSamM0T0RrMVJUZzRPRGhDT1VaRE1rRXpOQSJ9.eyJpc3MiOiJodHRwczovL3JleGZuZy5hdXRoMC5jb20vIiwic3ViIjoiQzQyc1dTRlVBSXc5aFdMWUVXUXFTTFJuNmhpcHIzbDZAY2xpZW50cyIsImF1ZCI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9hcGkiLCJleHAiOjE0OTQ0NDQwNDksImlhdCI6MTQ5NDM1NzY0OSwic2NvcGUiOiIifQ.UlzxfUxZRsC2Ld7nqmbwBz_HTOc_H5bC9bXPqI8meduDst_R4BkS1Sj8JGwNuelrps12M-1-UX3Abgv1Z4Wtnx6cXB16QzIVRf5DFjqHA9Ho9Gsv8QGPUR_C5V1E6ccSsV2ODgizzQaxNWcgV9B3TPcSTX3hOIaoPXfCxkmUo75ViwbVBwLTKYdF-dsGHG83xCFtm41A81d3NAgEG8AjR3TmKx3M1IPXuSzxEw04PyT2L-A3AjVRhoZ9qW7o1y45PXfQI6Lt0YDvvmpicft1x_vUfY2ynYQsUmSU_9Toc1n4Ne525Ki54JVZunYKTGpKbCtA6ZtvmBE5K3zMguKrQQ'
    },
    json: true // Automatically parses the JSON string in the response 
};
// promise(option)
// 	.then(function(res){
// 		console.log(res);
// 	})
// 	.catch(function(err){
// 		console.log(err);
// 	})


// request(
// 	{ method: 'POST',
// 	  url: 'https://rexfng.auth0.com/oauth/token',
// 	  headers: { 'content-type': 'application/json' },
// 	  body: '{"client_id":"C42sWSFUAIw9hWLYEWQqSLRn6hipr3l6","client_secret":"Gggww9LCRg-LvSEn_iAHRiBmOTAcknUmpDZoKFihKTD6anJRk8cinyMKhRUkYAuI","audience":"http://localhost:3000/api","grant_type":"client_credentials"}' 
// 	}
// 	, function (error, response, body) {
//   if (error) throw new Error(error);
//  	 var access_token = JSON.parse(body).access_token;
// 	 var option = {
// 	 	method: 'GET',
// 	 	url: 'http://localhost:3000/api',
// 	 	headers: { authorization: 'Bearer ' +  access_token } 
// 	 };  
// 	 request.get(option, function(error, response, body){
// 		 console.log(error); 	
// 	 })
// });

describe("API Test", function(){
	describe("GET / ", function(){
		it("GET returns 200", function(done){
			option = Object.assign(option, {uri: base_url})
			request(option, function (error, response, body) {
				assert.equal(200,response.statusCode);
				assert.equal('GET' , response.req.method);
				done();
			});
		});
	});
	describe("CRUD /api/v1/:collection", function(){
		this.timeout(15000);
		var test_id = ""
		it("POST returns 201 + successfully created test records.", function(done){
			_.each(nba_data, function(data){
				option = Object.assign(option, {
					uri: api_url + "/team",
					method: "POST",
	  				headers: { 'content-type': 'application/json' },
					form: data
				})
				request(option, function (error, response, body) {
					assert.equal(201,response.statusCode);
					assert.equal('POST' , response.req.method);
					done();
				});
			})
		})
		it("GET returns 200", function(done){
			option = Object.assign(option, {
				uri: api_url + "/test",
				method: "GET",
  				headers: { 'X-REDIS-TTL': 0 },
			})
			request(option, function (error, response, body) {
				assert.equal(200,response.statusCode);
				assert.equal('GET' , response.req.method);
				done();
			});
		})
		it("GET test record {first_name: 'Stephen'}", function(done){
			option = Object.assign(option, {
				uri: api_url + "/test",
				method: "GET",
  				headers: { 'X-REDIS-TTL': 0 },
			})
			request(option, function (error, response, body) {
				assert.equal(body[0].first_name, "Stephen")
				test_id = body[0].id
				done();
			});
		})
		it("UPDATE returns 201 test record {first_name: 'Stephen Wardell'}", function(done){
			option = Object.assign(option, {
				uri: api_url + "/test" + "/" + test_id,
				method: "POST",
  				headers: { 'X-REDIS-TTL': 0 },
  				form: {first_name: 'Stephen Wardell'}
			})
			request(option, function (error, response, body) {
				assert.equal(201,response.statusCode);
				done()
			});
		})
		it("UPDATE test record from {first_name: 'Stephen'} => {first_name: 'Stephen Wardell'}", function(done){
			option = Object.assign(option, {
				uri: api_url + "/test",
				method: "GET",
  				headers: { 'X-REDIS-TTL': 0 },
			})
			delay(1000) // offset network latency on update
			    .then(() => {
				request(option, function (error, response, body) {
					assert.equal(body[0].first_name, "Stephen Wardell")
					done();
				});
			});
		})	

		it("DELETE test record " + test_id, function(done){
			option = Object.assign(option, {
				uri: api_url + "/test" + "/" + test_id,
				method: "DELETE"
			})
			request(option, function (error, response, body) {
				assert.equal(204,response.statusCode);
				done();
			});
		})
	})
// 	describe("GET /api/v1", function(){
// 		it("GET request yields status 200", function(done){
// 			request(api_url, function (error, response, body) {
// 				assert.equal(200,response.statusCode);
// 				assert.equal('GET' , response.req.method);
// 				done();
// 			});	
// 		});
// 		describe("GET /api/v1/user", function(){
// 			it("GET request yields status 200", function(done){
// 				request(api_user_url, function (error, response, body) {
// 					assert.equal(200,response.statusCode);
// 					assert.equal('GET' , response.req.method);
// 				})
// 				done();
// 			})		
// 			it("return JSON with property of firstname", function(done){
// 				request(api_user_url, function (error, response, body) {
// 					assert.equal(typeof(''), typeof(JSON.parse(body)[0].firstname));
// 					done();
// 				});				
// 			})
// 			it("return JSON with property of lastname", function(done){
// 				request(api_user_url, function (error, response, body) {
// 					assert.equal(typeof(''), typeof(JSON.parse(body)[0].lastname));
// 					done();
// 				});				
// 			})
// 			it("return JSON with property of school", function(done){
// 				request(api_user_url, function (error, response, body) {
// 					assert.equal(typeof(''), typeof(JSON.parse(body)[0].school));
// 					done();
// 				});				
// 			})
// 		})
// 	});
});

