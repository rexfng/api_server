const request = require("request");
const assert = require("assert");
var base_url = "http://localhost:3000";
var api_url = "http://localhost:3000/api/v1"

var promise = require('request-promise');
var option = {
    uri: 'http://localhost:3000/api/v1/sermon',
    headers: {
        'User-Agent' : 'API-server',
        'Authorization' : 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6Ik5UWXlSak5EUlRrM016STRSRVpETmpKRU9FTkZSamM0T0RrMVJUZzRPRGhDT1VaRE1rRXpOQSJ9.eyJpc3MiOiJodHRwczovL3JleGZuZy5hdXRoMC5jb20vIiwic3ViIjoiQzQyc1dTRlVBSXc5aFdMWUVXUXFTTFJuNmhpcHIzbDZAY2xpZW50cyIsImF1ZCI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9hcGkiLCJleHAiOjE0OTQ0NDQwNDksImlhdCI6MTQ5NDM1NzY0OSwic2NvcGUiOiIifQ.UlzxfUxZRsC2Ld7nqmbwBz_HTOc_H5bC9bXPqI8meduDst_R4BkS1Sj8JGwNuelrps12M-1-UX3Abgv1Z4Wtnx6cXB16QzIVRf5DFjqHA9Ho9Gsv8QGPUR_C5V1E6ccSsV2ODgizzQaxNWcgV9B3TPcSTX3hOIaoPXfCxkmUo75ViwbVBwLTKYdF-dsGHG83xCFtm41A81d3NAgEG8AjR3TmKx3M1IPXuSzxEw04PyT2L-A3AjVRhoZ9qW7o1y45PXfQI6Lt0YDvvmpicft1x_vUfY2ynYQsUmSU_9Toc1n4Ne525Ki54JVZunYKTGpKbCtA6ZtvmBE5K3zMguKrQQ'
    },
    json: true // Automatically parses the JSON string in the response 
};

promise(option)
	.then(function(res){
		console.log(res);
	})
	.catch(function(err){
		console.log(err);
	})


request(
	{ method: 'POST',
	  url: 'https://rexfng.auth0.com/oauth/token',
	  headers: { 'content-type': 'application/json' },
	  body: '{"client_id":"C42sWSFUAIw9hWLYEWQqSLRn6hipr3l6","client_secret":"Gggww9LCRg-LvSEn_iAHRiBmOTAcknUmpDZoKFihKTD6anJRk8cinyMKhRUkYAuI","audience":"http://localhost:3000/api","grant_type":"client_credentials"}' 
	}
	, function (error, response, body) {
  if (error) throw new Error(error);
 	 var access_token = JSON.parse(body).access_token;
	 var option = {
	 	method: 'GET',
	 	url: 'http://localhost:3000/api',
	 	headers: { authorization: 'Bearer ' +  access_token } 
	 };  
	 request.get(option, function(error, response, body){
		 console.log(error); 	
	 })
});

// describe("API Test", function(){
// 	describe("GET / ", function(){
// 		it("GET request yields status 200", function(done){
// 			request(option, function (error, response, body) {
// 				assert.equal(200,response.statusCode);
// 				assert.equal('GET' , response.req.method);
// 				done();
// 			});
// 		});
// 		it("Returns Hello World", function(done){
// 			request(base_url, function (error, response, body) {
// 				assert.equal("hello",body);
// 				done();
// 			});
// 		})
// 	});
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
// });

/**
 * @api {get} /api/v1/sermon GET All
 * @apiName GetSermon
 * @apiGroup Sermon Service
 * @apiDescription The description of the Sermon api
 * @apiVersion 0.9.0
 *
 * @api

**
 * @apiHeaderExample {json} curl example:
 * $  curl --header "authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6Ik5UWXlSak5EUlRrM016STRSRVpETmpKRU9FTkZSamM0T0RrMVJUZzRPRGhDT1VaRE1rRXpOQSJ9.eyJpc3MiOiJodHRwczovL3JleGZuZy5hdXRoMC5jb20vIiwic3ViIjoiQzQyc1dTRlVBSXc5aFdMWUVXUXFTTFJuNmhpcHIzbDZAY2xpZW50cyIsImF1ZCI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9hcGkiLCJleHAiOjE0OTU5MjE1MTksImlhdCI6MTQ5NTgzNTExOSwic2NvcGUiOiIifQ.h1gJHoGXWLq2zKpImbJJJlDLgYRtoYtq3-zsfhUYWR4q1-v6QKFpJe9CNzDJm6_vrmfjYCFPymgPXF9s4UB9Ren8ctCbZm4IOzUJiCiFaYDNbYZYU3_q8Frs02eiceXV-x_NlLV54n5tVC2fQhYuEdcwQ57HnCLM-GWN5SXqDmhCwzOh8WAY8KxqHGXWNs0SFdPWhy5KULrKmLdGiqU_647F-yM6-3F825_20fXhbZ6IAqdCj44Xef-dmkjZC392aeZ11YvkgODlvzse5NpiEVzz4XPVu8qLTlqcfMlidMk2MOOS1_xziJc-mjEPwG0Tj-b1vFv_5wHXpo5MqQOF8Q" --url http://localhost:3000/api/v1/
 *     
 *
 * @apiParam {Integer} [id]  The unique id of the sermon.
 * @apiParam {String} [title]  The title of the sermon.
 * @apiParam {String} [description]  The description of the sermon.
 * @apiParam {Date}   [date]  The upload date of the sermon.
 * @apiParam {String} [url]  The video url of the sermon.
 * @apiParamExample {json} Return example:
 *     {[{
 *       "id": 5910dd5df5306e9b11ab4aef,
 		 "author": "Daniel Yu",
 		 "title" : "The Gospel of John",
 		 "description" : "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the ...",
 		 "date" : 01/02/2013,
		 "url"  : "http://s3.video.something/link/id/blahblahblah"
 *     },{
 *       "id": 5910dd5df5306e9b11ab4aef,
 		 "author": "Daniel Yu",
 		 "title" : "The Gospel of John",
 		 "description" : "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the ...",
 		 "date" : 01/02/2013,
		 "url"  : "http://s3.video.something/link/id/blahblahblah"
 *     }]
 */
 /**
 * @api {get} /api/v1/sermon GET All
 * @apiName GetSermon
 * @apiGroup Sermon Service
 * @apiDescription The description of the Sermon api
 * @apiVersion 1.0.0
 *
 * @apiParam {Integer} [id]  The unique id of the sermon.
 * @apiParam {String} [author]  The author of the sermon.
 * @apiParam {String} [title]  The title of the sermon.
 * @apiParam {String} [description]  The description of the sermon.
 * @apiParam {Date}   [date]  The upload date of the sermon.
 * @apiParam {String} [url]  The video url of the sermon.
 * @apiParamExample {json} Return example:
 *     {[{
 *       "id": 5910dd5df5306e9b11ab4aef,
 		 "author": "Daniel Yu",
 		 "title" : "The Gospel of John",
 		 "description" : "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the ...",
 		 "date" : 01/02/2013,
		 "url"  : "http://s3.video.something/link/id/blahblahblah"
 *     },{
 *       "id": 5910dd5df5306e9b11ab4aef,
 		 "author": "Daniel Yu",
 		 "title" : "The Gospel of John",
 		 "description" : "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the ...",
 		 "date" : 01/02/2013,
		 "url"  : "http://s3.video.something/link/id/blahblahblah"
 *     }]
 */