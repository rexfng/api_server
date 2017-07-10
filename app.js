const express = require('express'),
	  device = require('express-device'),
	  ua = require('express-useragent');
const bodyParser = require('body-parser'),
	  cookieParser = require('cookie-parser'),
	  app = express();
const server = app.listen(3000, function(){
	console.log('listening on port %s', server.address().port);
});	
const config = require('./config');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const io = require('socket.io')(server);
const uid = require('uid-safe')
const ObjectID = require("bson-objectid");
const jwt = require('express-jwt');
const jwks = require('jwks-rsa');
const crypto = require("crypto");
const assert = require('assert-callback');
const logger = require('morgan');
const _ = require('lodash');

const Meta = require('./db').model.Meta;
const Data = require('./db').model.Data;
const mongoose = require('./db').model.mongoose;

const jwtCheck = jwt({
	//https://devcenter.heroku.com/articles/config-vars
    secret: jwks.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: process.env.jwksUri || config.app.jwk.jwksUri
    }),
    audience: process.env.audience || config.app.jwk.audience,
    issuer: process.env.issuer || config.app.jwk.issuer,
    algorithms: ['RS256']
}), is_jwk = process.env.is_jwk || config.app.jwk.is_jwk;
const AWS = require("aws-sdk");
      AWS.config.update({
          accessKeyId: process.env.aws_accessKeyId || config.api.aws.aws_accessKeyId, 
          secretAccessKey: process.env.aws_secretAccessKey || config.api.aws.aws_secretAccessKey,
          region: process.env.aws_dynamodb_region || config.db.dynamodb.aws_dynamodb_region,
          endpoint: config.app.root_url
      });

app.use('/', express.static('doc'));
app.use(device.capture({parseUserAgent: true}));
app.use(ua.express())
app.use(bodyParser());
app.use(cookieParser());
app.use(logger("default"));
if (is_jwk == 'true') {
	app.use(jwtCheck);	
}else{
	console.log('jwkCheck is disable, api endpoint is not secured');
}
var DB = {
	query:{
		dynamodb: function(){
			this.create = function(type, json){
				var tableData = new AWS.DynamoDB.DocumentClient();
				var dataParams = {
				    TableName:"reach-data",
				    Item:{
						"_id": ObjectID.generate(),
				        "type": type,
				    }
				};
				tableData.put(dataParams, function(err, data) {
					console.log(err)
				    if (!err){
						for (var key in json){					
							var tableMeta = new AWS.DynamoDB.DocumentClient();
							var metaParams = {
							    TableName:"reach-meta",
							    Item:{
							        "_id": ObjectID.generate(),
							        "data_id": dataParams.Item.id,
							        "k": key,
							        "v": json[key]
							    }
							};
							tableMeta.put(metaParams, function(err, data) {
							});
						}
				    }
				});			
			};
			this.update = function(id, json){	
				var tableMeta = new AWS.DynamoDB.DocumentClient();
			    var metaParams = {
			        TableName: "reach-meta",
			        Key:{
			            "data_id": id,
			        }
			    };
			    jsonKeys = [];
			    for (key in json){
			    	jsonKeys.push(key);
			    }

			    tableMeta.scan(metaParams, function(err, data){
			    	for (var i = 0; i < data.Items.length; i++) {
			    		if( data.Items[i].data_id == id){
			    			if(_.includes(jsonKeys, data.Items[i].k)){
								var tableMeta = new AWS.DynamoDB.DocumentClient();
							    var metaParams = {
							        TableName: "reach-meta",
							        Key:{
							            "id": data.Items[i].id,
							        }
							    };
							    tableMeta.delete(metaParams, function(err, data) {
							    })
			    			}
			    		}
			    	}
					for (var key in json){			
						var tableMeta = new AWS.DynamoDB.DocumentClient();
						var metaParams = {
						    TableName:"reach-meta",
						    Item:{
						        "_id": ObjectID.generate(),
						        "data_id": id,
						        "k": key,
						        "v": json[key]
						    }
						};
						tableMeta.put(metaParams, function(err, data) {
						});
					}	
			    })		    	
			}
			this.readAll = function(type, callback){
				var tableData = new AWS.DynamoDB.DocumentClient();
				var params = { TableName: "reach-data" };
			    tableData.scan(params, function(err, data){
			    	if (!err) {
			    		for (var i = 0; i < data.Items.length; i++) {
			    			if (data.Items[i].type == type) {
								var tableMeta = new AWS.DynamoDB.DocumentClient();
			    				var dataIdArr = [];
			    				var responseArr = [];
								var metaParams = {
							        TableName: "reach-meta",
							    };	
			    				for (var i = 0; i < data.Items.length; i++) {
			    					var data_id = data.Items[i].id;
			    					dataIdArr.push(data_id);
			    				}
			    				tableMeta.scan(metaParams, function(err, data){
			    					_.each(dataIdArr, function(id){
				    					var row = _.filter(data.Items, { data_id: id });
				    					var build = {};
				    					build.id = id;
				    					_.each(row, function(record){
				    						build[record.k] = record.v
				    					})
				    					responseArr.push(build);
			    					})
			    					callback(responseArr);
			    				})	
			    			}
			    		}
			    	}
			    })
			}
			this.readOne = function(id, callback){
				var tableData = new AWS.DynamoDB.DocumentClient();
				var params = { TableName: "reach-data" };
			    tableData.scan(params, function(err, data){
			    	if (!err) {
			    		for (var i = 0; i < data.Items.length; i++) {
			    			if (data.Items[i].id == id) {
								var tableMeta = new AWS.DynamoDB.DocumentClient();
								var type = data.Items[i].type;
								var metaParams = {
							        TableName: "reach-meta",
							        Key:{
							            "data_id": data.Items[i].id
							        }
							    };	

			    				var build = new Object();
			    				tableMeta.scan(metaParams, function(err, data){
			    					build.id = metaParams.Key.data_id;
			    					build.type = type;
			    					for (var i = 0; i < data.Items.length; i++) {
			    						if (data.Items[i].data_id == metaParams.Key.data_id) {
			    							build[data.Items[i].k] = data.Items[i].v			    							
			    						}
			    					}
			    					callback(build);
			    				})	
			    			}
			    		}
			    	}
			    })
			}
			this.delete = function(id, status){
				var tableMeta = new AWS.DynamoDB.DocumentClient();
				var metaParams = {
			        TableName: "reach-meta",
			        Key:{
			            "data_id": id
			        }
			    };	
				tableMeta.scan(metaParams, function(err, data){	
    				for (var i = 0; i < data.Items.length; i++) {
    					if (data.Items[i].data_id == id){
							var tableMeta = new AWS.DynamoDB.DocumentClient();
						    var metaParams = {
						        TableName: "reach-meta",
						        Key:{
						            "_id": data.Items[i].id,
						        }
						    };
						    tableMeta.delete(metaParams, function(err, data) {
						    })		    						
    					}
    				}
				})
				var tableData = new AWS.DynamoDB.DocumentClient();
			    var dataParams = {
			        TableName: "reach-data",
			        Key:{
			            "_id": id,
			        }
			    };

			    tableData.delete(dataParams, function(err, data) {
			    })
			}
		},
		mongodb: function(){
			this.create = function(type, json){
				new Data({
					type: type
				}).save(function(err,data){
					for (var key in json){
						new Meta({
							key : key,
							value : json[key],
							data_id : data._id
						}).save();
					}
				});
			};
			this.update = function(id, json){	
				var keys = [];
				for (key in json){
					keys.push(key);
				}
				Meta.find({"data_id": id}, function(err, datas){
					_.each(datas, function(data){
			   			if(_.includes(keys, data.key)){
			   				Meta.remove({_id: data._id}, function(err, response){		
			   				})
						}
					});
					for (var key in json){
	   					new Meta({
							key : key,
							value : json[key],
							data_id: id
						}).save();	
					}
				})
			}
			this.readAll = function(type, callback){
				Data.find({"type": type}, function(err, data){
					var datas = [];
					var dataIdArr = [];
					var responseArr = [];
					for (var i = 0; i < data.length; i++) {
						dataIdArr.push(data[i]._id)
					}
					Meta.find({}, function(err, objs){	
						_.each(dataIdArr, function(id){
						    var row = _.filter(objs, { data_id: id });
							var meta = {};
							meta._id = id;
							_.each(row, function(obj){
								meta[obj.key] = obj.value[0];
							})
							responseArr.push(meta);
						})
						callback(responseArr);
					})
				})
			}
			this.readOne = function(id, callback){
				Data.find({"_id": id}, function(err, data){
					Meta.find({"data_id" : data[0]._id}, function(err, objs){	
						var meta = {};
						meta._id = data[0]._id;
						_.each(objs, function(obj){
							meta[obj.key] = obj.value[0];
						})
						callback(meta);
					})
				})
			}
			this.delete = function(id, callback){
				Data.remove({_id: id}, function(err, response){
					if (err) {
						callback({is_deleted: false});
					}else{
						Meta.remove({data_id: id}, function(err, response){
							if (!err) {
								callback({is_deleted: true});
							}
						})
					}
				})	
			}
		}
	}
}

if (config.db.which_DB == "mongodb") {
	var dbQuery = new DB.query.mongodb;
}else if (config.db.which_DB == "dynamodb") {
    var dbQuery = new DB.query.dynamodb;
}
	// dbQuery.readAll("chat", callback());
	// dbQuery.update("WVFPDgS7HcPCF4WRAAAC", {first_name: "John", last_name: "Wall"});
	// dbQuery.create(req.params.type, {title: "The World's Greatest Book", content: "jakdpfoaiofj alif ialsjfliasjfsfj."});
	// dbQuery.readOne("WU72WAXyLcPCF3czAAAC",callback());
	// dbQuery.delete(req.params.id, callback);

io.on('connection', function (socket) {			
	socket.on('emit', function(data){
		var currentRoom = socket.rooms[Object.keys(socket.rooms)[0]];
		if (currentRoom !== data.room) {
			socket.join(data.room);
			console.log('joined room!');
		}
		console.log(data);
		if (data.method == "broadcast") {
			io.broadcast.to(data.room).emit(data.on, data.data);
			console.log("broadcast");
			console.log(socket);
		} else {
			io.to(data.room).emit(data.on, data.data);
			console.log("emit");
			console.log(socket);
		}
		if (data.is_save) {
			new Data({
				type: data.type
			}).save(function(err,db){
				for (var key in data.data){
					var value = "";
					if (typeof data.data[key] !== 'string') {
						var value = JSON.stringify(data.data[key]);
					}else{
						var value = data.data[key];
					}
					new Meta({
						key : key,
						value : value,
						data_id : db._id
					}).save();
				}
			});				
		}
	})
	socket.once('disconnect', function(data){
	    io.emit('count', {
	        number: io.engine.clientsCount,
	        disconnect: "1"
	    });		
	})
});
app.all('/', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

app.get('/api/v1/:type', function(req,res){
	dbQuery.readAll(req.params.type, function(data){
		res.status(200).send(data);
	});
})

app.get('/api/v1/auth/:id', function(req, res){
	Meta.find({"key":"email", "value": decodeURI(req.params.id)},function(err, response){
		if (response[0] !== undefined){
			var user_id = response[0].data_id;
			Meta.find({"data_id": user_id},function(err, response){
				for (var i = 0; i < response.length; i++) {
					if(response[i].key == "salt" ){	
						res.status(200);
						res.send({is_salt: true, salt: response[i].value[0]});							
					}
				}
			})	
		}else{
			res.status(200);
			res.send({is_salt: false});
		}
	})	
})
app.get('/api/v1/:type/:id', function(req,res){
	dbQuery.readOne(req.params.id, function(data){
		res.status(200).send(data);				
	});	
})

app.post('/api/v1/mailer', function(req, res){
	// create reusable transporter object using the default SMTP transport
	let transporter = nodemailer.createTransport({
	    service: 'gmail',
	    auth: {
	        user: process.env.mailer_user || config.api.mailer.mailer_user,
	        pass: process.env.mailer_pass || config.api.mailer.mailer_pass
	    }
	});
	// setup email data with unicode symbols
	let mailOptions = {
	    from: process.env.mailer_user || config.api.mailer.mailer_user, // sender address
	    to: req.body.to, // list of receivers
	    subject: req.body.subject, // Subject line
	    text: req.body.text, // plain text body
	    html: req.body.html // html body
	};
	// send mail with defined transport object
	transporter.sendMail(mailOptions, (error, info) => {
	    if (error) {
	        console.log(error);
	    }else{
	   		console.log('Message %s sent: %s', info.messageId, info.response);
	    }
	});
})
app.post('/api/v1/sms', function(req, res){
	var client = new twilio(
		process.env.twilio_accountSid || config.api.twilio.twilio_accountSid, 
		process.env.twilio_authToken || config.api.twilio.twilio_authToken
	);

	client.messages.create({
	    body: req.body.body,
	    to: req.body.number,  // Text this number
	    from: process.env.twilio_number || config.api.twilio.twilio_number // From a valid Twilio number
	})
	.then((message) => console.log(message.sid));
})
app.post('/api/v1/user', function(req, res){
	var user = req.query;
	var randomSalt = crypto.randomBytes(16).toString('hex');
		user.salt = randomSalt;
	var hash = crypto.createHash("sha256").update(randomSalt + user.password).digest("base64");
		user.password = hash;
		console.log(user);
	dbQuery.create("user", req.query);
	res.status(200).end();	
})
app.post('/api/v1/auth', function(req, res){
	var ip;
	if (req.headers['x-forwarded-for']) {
	    ip = req.headers['x-forwarded-for'].split(",")[0];
	} else if (req.connection && req.connection.remoteAddress) {
	    ip = req.connection.remoteAddress;
	} else {
	    ip = req.ip;
	};
	dbQuery.readAll("user", function(data){
		function generateSession(user_id, callback){
			uid(18).then(function(uid){
				session = {
					'ssid': uid, 
					'user': JSON.stringify({
						'id': user_id,
						'_self': config.app.root_url + '/api/v1' + '/user/' + user_id 
					}),
					'ip_address': req.ip,
					'useragent': JSON.stringify(req.useragent),
					'timestamp': mongoose.Types.ObjectId(data._id).getTimestamp()	
				}
				callback(session);			
			})
		}
		var filter = _.filter(data, {email: req.query.email});
		var password = crypto.createHash("sha256").update(filter[0].salt + req.query.password).digest("base64");
		if (filter[0].password == password) {
			generateSession(filter[0]._id, function(json){
				dbQuery.create('session',json);
				res.cookie('ssid', json.ssid);
				res.status(200).send({is_authenticated: true});	
			});
		} else {
			res.status(200).send({is_authenticated: false});
		}
	});
})
app.post('/api/v1/:type', function(req, res){
	dbQuery.create(req.params.type, req.query);
	res.status(200).end();
})
app.post('/api/v1/:type/:id', function(req,res){
	dbQuery.update(req.params.id, req.query);
	res.status(200).end();	
});
app.delete('/api/v1/session/:id', function(req,res){
	//delete session by ssid
	Meta.remove({"key":"ssid", "value": req.params.id}, function(err, response){
		if (err) {
			res.status(200);
			res.send({ssid_destroyed: false});
		}else{
			res.status(200);
			res.clearCookie("ssid");
			res.send({ssid_destroyed: true});
		}				
	})
})
app.delete('/api/v1/:type/:id', function(req,res){
	dbQuery.delete(req.params.id, function(status){
		res.status(200).send(status);
	});
});



