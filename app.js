process.env.NODE_ENV = process.env.NODE_ENV || 'development';
const config = require('./env/' + process.env.NODE_ENV);
const express = require('express'),
	  device = require('express-device'),
	  ua = require('express-useragent');
const bodyParser = require('body-parser'),
	  cookieParser = require('cookie-parser'),
	  app = express();
const server = app.listen(config.app.port, function(){
	console.log('listening on port %s', server.address().port);
});	
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const io = require('socket.io')(server);
const uid = require('uid-safe')
const jwt = require('express-jwt');
const jwks = require('jwks-rsa');
const crypto = require("crypto");
const assert = require('assert-callback');
const logger = require('morgan');
const _ = require('lodash');
const DB = require('./db').DB;

console.log(process.env.NODE_ENV);
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
    audience: process.env.audience || config.app.jwk.audience,
    issuer: process.env.issuer || config.app.jwk.issuer,
    algorithms: ['RS256']
}), is_jwk = process.env.is_jwk || config.app.jwk.is_jwk;

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
if (config.db.which_DB == "mongodb") {
	var dbQuery = new DB.query.mongodb;
}else if (config.db.which_DB == "dynamodb") {
    var dbQuery = new DB.query.dynamodb;
}

io.on('connection', function (socket) {			
	socket.on('emit', function(data){
		var currentRoom = socket.rooms[Object.keys(socket.rooms)[0]];
		if (currentRoom !== data.room) {
			socket.join(data.room);
			console.log('joined room!');
		}
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
			dbQuery.create(data.type, data.data);		
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
	transporter.sendMail(mailOptions, (error, info), function(){
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
						'_self': config.app.root_url + ':' + config.app.port + '/api/v1' + '/user/' + user_id 
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
	dbQuery.update(req.params.id, 
		{ 
			'ssid': '',
			'ssid_destroyed_timestamp' : new Date().getTime()
		}
	);
	res.status(200);
	res.clearCookie("ssid");
	res.send({ssid_destroyed: true});

})
app.delete('/api/v1/:type/:id', function(req,res){
	dbQuery.delete(req.params.id, function(status){
		res.status(200).send(status);
	});
});



