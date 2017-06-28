const express = require('express'),
	  device = require('express-device'),
	  ua = require('express-useragent');
const bodyParser = require('body-parser'),
	  cookieParser = require('cookie-parser');	app = express();
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
const cryptico = require("cryptico");
const assert = require('assert-callback');
const mustache = require('mustache');
const logger = require('morgan');
const _ = require('lodash');
const OpenTok = require('opentok'),
	  opentok = new OpenTok('45880412', 'df80c4fe2dd96213a23dc5b10437982865b40d56');
const Meta = require('./db').model.Meta;
const Data = require('./db').model.Data;
const mongoose = require('./db').model.mongoose;
const jwtCheck = jwt({
	//https://devcenter.heroku.com/articles/config-vars
    secret: jwks.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: process.env.jwksUri || config.jwksUri
    }),
    audience: process.env.audience || config.audience,
    issuer: process.env.issuer || config.issuer,
    algorithms: ['RS256']
}), is_jwk = process.env.is_jwk || config.is_jwk;
const AWS = require("aws-sdk");
      AWS.config.update({
          accessKeyId: process.env.aws_accessKeyId || config.aws_accessKeyId, 
          secretAccessKey: process.env.aws_secretAccessKey || config.aws_secretAccessKey,
          region: process.env.aws_dynamodb_region || config.aws_dynamodb_region,
          endpoint: config.root_rul
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
						"id": ObjectID.generate(),
				        "type": type,
				    }
				};
				tableData.put(dataParams, function(err, data) {
				    if (!err){
						for (var key in json){					
							var tableMeta = new AWS.DynamoDB.DocumentClient();
							var metaParams = {
							    TableName:"reach-meta",
							    Item:{
							        "id": ObjectID.generate(),
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
						console.log(key);
						console.log(json[key])	
						console.log(id)			
						var tableMeta = new AWS.DynamoDB.DocumentClient();
						var metaParams = {
						    TableName:"reach-meta",
						    Item:{
						        "id": ObjectID.generate(),
						        "data_id": id,
						        "k": key,
						        "v": json[key]
						    }
						};
						tableMeta.put(metaParams, function(err, data) {
							console.log(data)
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
						            "id": data.Items[i].id,
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
			            "id": id,
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
			this.update = function(){
				return {method: "update", first_name: "Rex", last_name: "Fong"};				
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

if (config.which_DB == "mongodb") {
	var dbQuery = new DB.query.mongodb;
}else if (config.which_DB == "dynamodb") {
    var dbQuery = new DB.query.dynamodb;
}
	// dbQuery.readAll("chat", callback());
	// dbQuery.update("WVFPDgS7HcPCF4WRAAAC", {first_name: "John", last_name: "Wall"});
	// dbQuery.create(req.params.type, {title: "Christy", content: "jakdpfoaiofj alif ialsjfliasjfsfj."});
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
// app.get('/api/v1/ws', function(req,res){
// 	// test endpoint for client socket
// 	res.status(200).sendFile(__dirname + '/test.html');
// });

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
app.post('/api/v1/tpl', function(req, res){
	res.status(200);
	if (req.body.data_id) {
		Meta.find({"data_id": req.body.data_id},function(err, response){
			var metas = []
			var id = new Object();
			id['_id'] = req.params.id;
			metas.push(id);
			for (var i = response.length - 1; i >= 0; i--) {
				var meta = new Object();
				meta[response[i].key] = response[i].value[0]; 
				metas.push(meta);
			}
			var metas = metas.reduce(function(acc, x) {
			    for (var key in x) acc[key] = x[key];
			    return acc;
			}, {});

			var source = eval(decodeURIComponent(req.body.template));
			var template = mustache.render(source, metas);

			res.send(template);		
			res.end();

		})				
	}else{
		var reqClone = JSON.parse(JSON.stringify(req.body));
		reqClone.template = undefined;
		var source = eval(decodeURIComponent(req.body.template));
		var template = mustache.render(source, reqClone);
		res.send(template);		
		res.end();
	}
})
app.post('/api/v1/mailer', function(req, res){
	// create reusable transporter object using the default SMTP transport
	let transporter = nodemailer.createTransport({
	    service: 'gmail',
	    auth: {
	        user: process.env.mailer_user || config.mailer_user,
	        pass: process.env.mailer_pass || config.mailer_pass
	    }
	});
	// setup email data with unicode symbols
	let mailOptions = {
	    from: process.env.mailer_user || config.mailer_user, // sender address
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
		process.env.twilio_accountSid || config.twilio_accountSid, 
		process.env.twilio_authToken || config.twilio_authToken
	);

	client.messages.create({
	    body: req.body.body,
	    to: req.body.number,  // Text this number
	    from: process.env.twilio_number || config.twilio_number // From a valid Twilio number
	})
	.then((message) => console.log(message.sid));
})
app.post('/api/v1/auth', function(req, res){
	function sha256(data) {
	    return crypto.createHash("sha256").update(data).digest("base64");
	}
	var sha = sha256('46b055a3116c7b800a05fa03d35d41e0' + 'password');
	var hashPassword = "sT0vJEjkf8UP/pzs2XOHKjeeOggDixb14ewOtGOwDXU=";
	const password = "password";
	console.log(crypto.randomBytes(16).toString('hex'));
	privateKey = cryptico.generateRSAKey(password, 2048);
	const publicKey = cryptico.publicKeyString(privateKey);
	// console.log(publicKey);
	let message = "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Commodi deserunt, maiores ratione? Molestias facilis natus, dolore accusantium eaque, ullam a similique sint. Tempore, aut aliquam eveniet modi, numquam at dolorum.";
	var result = cryptico.encrypt(message, publicKey);
	// console.log(result);
	let cipherText = "vqb4FB0cONcY/fKMCeNc3/a663CTuChFi/OFuY6L08dmf/D4l2lgH3ry71EYaW825+shKxclZdjqr/aP9FyvnUb4WMbz3C4MXYKwX1GohI0Lz330c7yxOqmSiDckgpTr0KzG6R0Q9wkk+crJTymHHLmTjU0dOSKCPW2G/RbOObbifyAwvEUfsP6E5lfbRlCVkMvpdvZZtSTWLzQP4tozR8/kWrRBCFr0zM0rlNHtywjxX7seY4XO0l8T9VnWK5+LpeFpghSJuzpPe4o6g+TYowyDrjg1PvrC3RyfnZg0afCQOzxP88lgjofC4Z64yZfaA1Rqyqz4aol+QWOsQKQHzA==?OoUG8uZG452GqP83yZ6HbEWWyMxpycGNHxuwDlf41OKxdQFlb0/pNDagy0SRzA3sR7ZkD++m/EGl1L5TuCHWGWa5SOQufLnJcQP3xzEd/Xat9m1Jhl7rOvEMuXK3SiUzwPgeSm5pd/DpguNVLbZv3h61mpVt5SQw/zUvUiRF/D+XkXYHIei9eASCcZ41nLnwf7Ki67h7wfadfSz2qeV/0yMw0pyZLDAf10QJ7f/ToMYdb57mG9m1MIPgq92A0WyhsSxg/yExGaSbGg8hKpcCSmCgedMZgdXOBaOUGRHKWk9gCbxmDpBhyv7UXMjvcmKNW4S4HpeuqXiokPxu724aMtMAsxQUiVRugNr19VD4FgvwbyS2i22MfYaI5rwCRTthb3QmtFCzAHhI5surT6FawjU2GmEd94zPI6j6oJSC6vm7G4t4LbKI2RA47ckeqGcQFK+qo5/DrA0RPUT1PD3ltrvfbcNZGlKBGXG6YaaXQlKUkjNlQS/3N0b5JA/cdDDjD7zgkm6N0011Etm1vSNFz+FzGuPrsODBZVq9wcWvI/WvgWcZCEcOAmBv+WQWZoCEgncX8dkMHxZIrw8uRLSsTYxGN1El4eFVc27kEtC3uJenQ86u+AQEFxs80JebfoUJqpSUBwg1gDP2AvhlwCD0aLd4AhQ6o4/yj4/PCGinBK8ik31YrxRf0av10P1M1jDUBin4lU69Ii+S/6UG1Sz4wOAbToX6MHeOBLQDWo00oyrRAdkBq6n6rp7UuHFoyKqfC/5yFho0b8dRbmJD7CYX9iURaow6EzDLtt+ejkjEq9/M+7ZfpdnAFPqOoN7dbGolmizPf9Sh+hUr/VNkvXYElHDGkDPQ60TFNmd3ZDSDO8mdntPF3AyT9vggQBcazlRaXgyBb7SgbAKDVJe1NdMyX4VMA7pL3agk0oSy6/eC8st5aJmF0r2bt7N8QvSUh+h6aiMYloQdeBKQCsn7WdiF5DREst6gHBEdcyzEfwhzwjoWkmD1OoKUUrAQo+aLpHe0BqXchs/HftV/7KZuDBfKgulLxWZlzaFmbVkFxNOdiN8B+d7AiGtpwDyVwuZmGX7HUsIWUTk3m91gyiG4TyPFIp5EBrUyJRpFGFIpRffZZCtUfebou17D+gFbpPQmjTS2UCI1lszwl52+Fm92vkKnn7nTr9tZk/7/edmwnwGSI3DrzrKuc2h8vatJ0Vg0jkSHB6HL6QoSkThXluYiLq97PtbDo/p0Ote5oPWOwElFcJtypvrvhM2w8BPzIfnsLrwRXDqH+ti/VTtTmeuGD70P6Tx36TmbbS63kS/F6JICakU+q7zsb11V/M8kV3tWWike"
	let decrypt = cryptico.decrypt(cipherText, privateKey);

	// console.log(decrypt);
	var ip;
	if (req.headers['x-forwarded-for']) {
	    ip = req.headers['x-forwarded-for'].split(",")[0];
	} else if (req.connection && req.connection.remoteAddress) {
	    ip = req.connection.remoteAddress;
	} else {
	    ip = req.ip;
	};
	Meta.find({"key": "ssid", "value" : req.cookies.ssid}, function(err, response){
		console.log(response[0]);
		console.log(response[0] == undefined);
		if (response[0] == undefined) {
			//if ssid returns [], look for email and password, assign session if matches, deny if not
			Meta.find({"key":"email", "value": req.query.email},function(err, response){
				var user_id = response[0].data_id;
				Meta.find({"data_id": user_id},function(err, response){
					for (var i = 0; i < response.length; i++) {
						if(response[i].key == "password" ){
							if(response[i].value[0] == req.query.password){
					  			uid(18).then(function(uid){
					  				//create session data object and store in database
									new Data({
										type: 'session'
									}).save(function(err,data){
										args = {
											'ssid': uid, 
											'user': JSON.stringify({
												'id': user_id,
												'_self': config.root_url + '/api/v1' + '/user/' + user_id 
											}),
											'ip_address': req.ip,
											'useragent': JSON.stringify(req.useragent),
											'timestamp': mongoose.Types.ObjectId(data._id).getTimestamp()
										};
										// console.log(args);
										for (var key in args){
											new Meta({
												key : key,
												value : args[key],
												data_id : data._id
											}).save();
										}
									});
									res.cookie('ssid', uid);
									res.status(200).send({is_authenticated: true});				
								});		
							}else{
								res.status(200).send({is_authenticated: false});
							}
						}
					}
				})
			})
		}else{
			// if ssid is found, find user and return user
			Data.find({"_id": response[0].data_id}, function(err, response){
				Meta.find({"data_id": response[0]._id}, function(err,response){
					for (var i = 0; i < response.length; i++) {
						if(response[i].key == "user"){
							res.status(200).send({
								is_authenticated: true,
								user: JSON.parse(response[i].value)

							});
						}
					}
				});
			})					
		}

	})	
})
app.post('/api/v1/:type', function(req, res){
	dbQuery.create(req.params.type, req.query);
	res.status(200).end();
})
app.post('/api/v1/:type/:id', function(req,res){
	dbQuery.update(req.params.id, req.query);
	res.status(200).end();
	// for (var key in req.body){
	// 	new Meta({
	// 		key : key,
	// 		value : req.body[key],
	// 		data_id : req.params.id
	// 	}).save();
	// }	
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
app.delete('/api/v1/session/:id', function(req,res){
	//delete session by ssid
	console.log(req.params.id);
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



