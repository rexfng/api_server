process.env.NODE_ENV = process.env.NODE_ENV || 'development';

if (process.env.NODE_ENV !== "production") {
	var config = require('./env/' + process.env.NODE_ENV);
}else{
	var config = require('./env/_config');
}

const express = require('express'),
	  device = require('express-device'),
	  ua = require('express-useragent');
const bodyParser = require('body-parser'),
	  cookieParser = require('cookie-parser'),
	  app = express();
const port = process.env.PORT || config.app.port;
const server = app.listen(port, function(){
	console.log('listening on port %s', server.address().port);
});	
const ObjectID = require("bson-objectid");
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const io = require('socket.io')(server);
const uid = require('uid-safe')
const jwt = require('express-jwt');
const jwks = require('jwks-rsa');
const crypto = require("crypto");
const shortid = require('shortid');
const assert = require('assert-callback');
const logger = require('morgan');
const _ = require('lodash');
const DB = require('./db').DB;

	// dbQuery.readAll("chat", callback());
	// dbQuery.update("WVFPDgS7HcPCF4WRAAAC", {first_name: "John", last_name: "Wall"});
	// dbQuery.create(req.params.type, {title: "The World's Greatest Book", content: "jakdpfoaiofj alif ialsjfliasjfsfj."});
	// dbQuery.readOne("WU72WAXyLcPCF3czAAAC",callback());
	// dbQuery.delete(req.params.id, callback);

const jwtCheck = jwt({
	//https://devcenter.heroku.com/articles/config-vars
    secret: jwks.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: process.env.jwksUri || config.app.jwk.jwksUri
    }),
    audience: process.env.root_url + process.env.audience || config.app.root_url + config.app.jwk.audience,
    issuer: process.env.issuer || config.app.jwk.issuer,
    algorithms: ['RS256']
}), is_jwk = process.env.is_jwk || config.app.jwk.is_jwk;

app.use('/', express.static('doc'));
app.use(device.capture({parseUserAgent: true}));
app.use(ua.express())
app.use(bodyParser());
app.use(cookieParser());
app.use(logger("default"));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
if (is_jwk == 'true') {
	app.use(jwtCheck);	
}else{
	console.log('jwkCheck is disable, api endpoint is not secured');
}
var which_DB = process.env.which_DB || config.db.which_DB;
if (which_DB == "mongodb") {
	var dbQuery = new DB.query.mongodb;
}else if (which_DB == "dynamodb") {
    var dbQuery = new DB.query.dynamodb;
}

io.on('connection', function (socket) {		
	console.log( socket.rooms[Object.keys(socket.rooms)[0]])
	socket.on('join', function(data){
		socket.join(data.data.room);
		console.log('joined ' + data.data.room) 
		console.log(data)		
	})	
	socket.on('leave', function(data){
		socket.leave(data.room);
		console.log('left ' + data.room)
		console.log(data)	
	})
	socket.on('broadcast', function(data){
		io.broadcast.to(data.data.room).emit(data.on, data.data);
		console.log(data)
		console.log("broadcast");
	})

	socket.on('emit', function(data){
		io.to(data.data.room).emit(data.on, data.data);
		console.log(data)
		console.log("emitted " + data.on);	
		if (data.is_save) {
			dbQuery.create(data.type, data.data, function(data){
				//callback
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

app.get('/api/v1/shortid', function(req,res){
	res.status(200).send(
		{ uuid: shortid.generate() }
	);
})

app.get('/api/v1/:type', function(req,res){
	// console.log(req.params.type);
	dbQuery.readAll(req.params.type, function(data){
		res.status(200).send(data);
	}, req.query);
})
app.get('/api/v1/:type/:id', function(req,res){
	dbQuery.readOne(req.params.id, req.params.type, function(data){
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
	transporter.sendMail(mailOptions, function(error, info){
	    // if (error) {
	    //     console.log(error);
	    // }else{
	   	// 	console.log('Message %s sent: %s', info.messageId, info.response);
	    // }
		res.status(200).send({email: req.body});	
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
	res.status(200).send({sms: req.body});	
})
app.post('/api/v1/user', function(req, res){
	if (!_.isEmpty(req.body.password)) {
		var user = Object.assign({},req.body);
		var randomSalt = crypto.randomBytes(16).toString('hex');
			user.salt = randomSalt;
		var hash = crypto.createHash("sha256").update(randomSalt + user.password).digest("base64");
			user.password = hash;
		dbQuery.create("user", user, function(data){
			res.status(200).send(data);
		});		
	}else{
		res.status(200).send({msg: "user must contain a password key."})
	}

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

	if(!_.isEmpty(req.body.ssid)){
		//CHECKing with session
		dbQuery.readAll('auth', function(data){
			if(_.isEmpty(data)){
				res.status(200).send({is_authenticated: false})
			}else{
				res.status(200).send({
					is_authenticated: true,
					ssid: req.body.ssid
				});				
			}
		},{ssid: req.body.ssid})		
	}else{
		//CHECKING with password user_id pair
		if (!_.isEmpty(req.body.user_id) && !_.isEmpty(req.body.password) ) {
			dbQuery.readOne(req.body.user_id, 'user', function(user){
				var password = crypto.createHash("sha256").update(user.salt + req.body.password).digest("base64");
				if(user.password == password){
					function generateSession(user_id, callback){
						uid(18).then(function(uid){
							session = {
								'ssid': uid, 
								'user': JSON.stringify({
									'id': user_id,
									'_self': config.app.root_url + ':' + config.app.port + '/api/v1' + '/user/' + user_id 
								}),
								'ip_address': req.ip,
								'useragent': req.useragent,
								'timestamp': new Date().getTime()
							}
							callback(session);			
						})
					}
					generateSession(user.id, function(json){
						dbQuery.create('auth',json, function(data){
						res.cookie('ssid', json.ssid, { httpOnly: false });
						res.status(200).send(
							{
								is_authenticated: true,
								ssid: json.ssid,
								user_id: user.id
							});	
						});
					});					
				}else{
					res.status(200).send({is_authenticated: false, msg: 'the password or the user_id is incorrect.'})
				}
			})
		}else{
			res.status(200).send({is_authenticated: false, msg: 'you must provide 1) an ssid or 2) user_id and password to authenticate this user.'})
		}
	}
})
app.post('/api/v1/:type', function(req, res){

	if (req.params.type !== 'auth') {
		dbQuery.create(req.params.type, req.body, function(dataCreated){
			dbQuery.readAll(req.params.type, function(data){
				var lastID = _.maxBy(data, function(o) { return o.id } );
				res.status(200).send(
					{[req.params.type]: Object.assign(req.body, { id: lastID.id })}
				)
			}, req.body)
		});
	}
})

app.post('/api/v1/user/:id', function(req,res){
	if(!_.isEmpty(req.body.password)){
		dbQuery.readOne(req.params.id, req.params.type, function(item){
			req.body.password = crypto.createHash("sha256").update(item.salt + req.body.password).digest("base64");
			dbQuery.update(req.params.id, req.body);
			res.status(200).send(
				{ 
					user: Object.assign(item, req.body),
				 }
			);			
		})
	}else{
		dbQuery.readOne(req.params.id, req.params.type, function(item){
			dbQuery.update(req.params.id, req.body);
			res.status(200).send(
				{ 
					user: Object.assign(item, req.body),
				 }
			);			
		})
	}
})

app.post('/api/v1/:type/:id', function(req,res){
	dbQuery.update(req.params.id, req.body);
	dbQuery.readOne(req.params.id, req.params.type, function(item){
		res.status(200).send(
			{ 
				[req.params.type]: Object.assign(item, req.body),
			 }
		);
	})
});

app.delete('/api/v1/auth/:id', function(req,res){
	dbQuery.readAll('auth', function(data){
		console.log(data[0].id)
		// console.log(JSON.parse(data[0]).id)
		dbQuery.update(data[0].id, 
			{ 
				'ssid': '-',
				'ssid_destroyed_timestamp' : new Date().getTime()
			}
		);
		res.status(200);
		res.clearCookie("ssid");
		res.send({ssid_destroyed: true, ssid: req.params.id, user_id: JSON.parse(data[0].user).id});
	},{ssid: req.params.id})		
});

app.delete('/api/v1/:type/', function(req,res){
	dbQuery.readAll(req.params.type, function(data){
		_.each(data, function(item){
			dbQuery.delete(item.id, req.params.type, function(status){
			});
		})
		res.status(200).send(
			{ 
				msg: "all data from type /" + req.params.type + " has been removed from the database successfully.",
				is_deleted: true
			}
		);	
	}, req.query)
});

app.delete('/api/v1/:type/:id', function(req,res){
	dbQuery.readOne(req.params.id, req.params.type, function(data){
		dbQuery.delete(req.params.id, req.params.type ,function(status){
			res.status(200).send(
				{ 
					[req.params.type]: data,
					is_deleted: true
				}
			);				
		});
	})
});



