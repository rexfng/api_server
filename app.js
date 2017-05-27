const express = require('express'),
			app = express();
const bodyParser = require('body-parser');
			app.use(bodyParser());
const io = require('socket.io');
const jwt = require('express-jwt');
const jwks = require('jwks-rsa');
const logger = require('morgan');
const model = require('./db').model;
const config = require('./config');
const server = app.listen(3000, function(){
	console.log('listening on port 3000');
});	
const Meta = model.Meta;
const Data = model.Data;
const jwtCheck = jwt({
    secret: jwks.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: process.env.jwksUri || config.jwksUri
    }),
    audience: process.env.audience || config.audience,
    issuer: process.env.issuer || config.issuer,
    algorithms: ['RS256']
});
	var is_jwk = process.env.is_jwk || config.is_jwk;
	app.use(logger("default"));
	if (is_jwk == 'true') {
		app.use(jwtCheck);	
	}else{
		console.log('jwkCheck is disable, api endpoint is not secured');
	}

	app.get('/', function(req,res){
		res.status(200);
		res.send();
	});

	app.get('/api/v1', function(req,res){
		res.status(200);
		res.send('<h1>version 1</h1>');
	});

	app.get('/api/v1/:type', function(req,res){
		if (req.params.type == "meta") {
			console.log(req.query);
			var filter = new Object();
			for(key in req.query){
				filter.key = key;
				filter.value = req.query[key][0];
			}
			console.log(filter);
			Meta.find(filter ,function(err, response){
				res.send(response);
			})
		}
		var arr = [];
		function createResponseArray(arg,count){
			arr.push(arg);
		}
		function returnArray(){
			arr = arr.filter(function(el) {
			    return typeof el != "object" || Array.isArray(el) || Object.keys(el).length > 0;
			})
			res.send(arr);
			res.status(200);
		};
		Data.find({"type": req.params.type}, function(err, response){
			if(response == ""){
				res.status(404);
			}
			for (var i = response.length - 1; i >= 0; i--) {
				var count = 0;	
				Meta.find({"data_id" : response[i]._id}, function(err, responses){	
					var meta = new Object();
					if (responses[0] != undefined) {
						// console.log(responses);
						meta._id = responses[0].data_id;
						console.log(responses.length);
						for (var i = responses.length - 1; i >= 0; i--) {
							meta[responses[i].key] = responses[i].value[0];
						}
					}
					count += 1;
					createResponseArray(meta,count);
					if (count == response.length) {
						returnArray();
					}
				})
			}
		})
	});

	app.post('/api/v1/:type', function(req, res){
		new Data({
			type: req.params.type
		}).save(function(err,data){
			for (var key in req.body){
				new Meta({
					key : key,
					value : req.body[key],
					data_id : data._id
				}).save();
			}
		});
	});

	app.get('/api/v1/:type/:id', function(req,res){
		if (req.params.type == "data"){
			Data.find({"_id": req.params.id}, function(err, response){
				var data_type = response[0].type;
				res.status(200);
				Meta.find({"data_id": req.params.id},function(err, response){
					var metas = []
					var id = new Object();
					id['_id'] = req.params.id;
					metas.push(id);
					var type = new Object();
					type.type = data_type;
					metas.push(type);
					for (var i = response.length - 1; i >= 0; i--) {
						var meta = new Object();
						meta[response[i].key] = response[i].value[0]; 
						metas.push(meta);
					}
					var metas = metas.reduce(function(acc, x) {
					    for (var key in x) acc[key] = x[key];
					    return acc;
					}, {});
					res.send(metas);
				})
			})
		}else{
			Data.find({"type": req.params.type}, function(err, response){
				if (response != "") {
					console.log(response);
					res.status(200);
					Meta.find({"data_id": req.params.id},function(err, response){
						var metas = []
						var id = new Object();
						id['_id'] = req.params.id;
						metas.push(id);
						var type = new Object();
						type.type = req.params.type;
						metas.push(type);
						for (var i = response.length - 1; i >= 0; i--) {
							var meta = new Object();
							meta[response[i].key] = response[i].value[0]; 
							metas.push(meta);
						}
						var metas = metas.reduce(function(acc, x) {
						    for (var key in x) acc[key] = x[key];
						    return acc;
						}, {});
						res.send(metas);
					})
				}else{
					res.status(404);
				}
			})			
		}

	});
	app.post('/api/v1/:type/:id', function(req,res){
		for (var key in req.body){
			new Meta({
				key : key,
				value : req.body[key],
				data_id : req.params.id
			}).save();
		}		
	});

	app.put('/api/v1/:type/:id', function(req, res) {
		Meta.find({data_id: req.params.id}, function(err, meta){
			var obj = new Object();
			for (key in req.body){
				obj[key] = req.body[key]
			}
			for (var i = 0; i < meta.length; i++) {
				if (obj[meta[i].key] !== undefined) {
					meta[i].value = obj[meta[i].key];
				}
			}
			for (var i = 0; i < meta.length; i++) {
				var m = new Meta(meta[i]);
				m.isNew = false;
				m.save();
			}
			res.status(200).send(meta);
		})
	});

	app.delete('/api/v1/:type/:id', function(req,res){
		Data.remove({_id: req.params.id}, function(err, response){
			if (err) {
				res.status(200);
				res.send({response: "fail to delete"});
			}else{
				res.status(200);
				res.send({response: "deleted"});
				Meta.remove({data_id: req.params.id}, function(err, response){
					if (err) {
						res.status(200);
						res.send({response: "fail to delete metas"});
					}
				})
			}
		})
	});

	// ws =  new wsConstructor({
	// 	httpServer :  app
	// })
	// ws.on('request',function(request){
	// 	var connection = request.accept(null, request.origin);
	// 	connection.on('message', function(message))
	// })

	/* api documentation route */
	app.use('/', express.static('/doc/api'));
