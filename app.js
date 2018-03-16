process.env.NODE_ENV = process.env.NODE_ENV || 'development';
var config = process.env.NODE_ENV !== "production" ? require('./env/' + process.env.NODE_ENV) : require('./env/_config');

const express = require('express'),
	  device = require('express-device'),
	  ua = require('express-useragent'),
      throttle = require("express-throttle");

const bodyParser = require('body-parser'),
	  app = express();
const port = process.env.PORT || config.app.port;
const server = app.listen(port, function(){
	console.log('listening on port %s', server.address().port);
});	
const ObjectID = require("bson-objectid");
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const jwt = require('express-jwt');
const jwks = require('jwks-rsa');
const assert = require('assert-callback');
const logger = require('morgan');
const _ = require('lodash');
const DB = require('./db').DB;
var which_DB = process.env.which_DB || config.db.which_DB;
if (which_DB == "mongodb") {
	var dbQuery = new DB.query.mongodb;
}else if (which_DB == "dynamodb") {
    var dbQuery = new DB.query.dynamodb;
}

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

const redis = require('redis'),
	  cache = 	redis.createClient()
	cache.on("error", function(err) {
	  console.log("Error " + err);
	})

var redisDel = function(arr){
	_.each(arr, function(str){
		cache.get(str, function(err, getResponse){
			if(!_.isEmpty(getResponse)){
				cache.del(str, function(err, response) {
				   if (response == 1) {
				      console.log("Deleted " + str  + "from Redis Successfully!")
				   } else{
				    console.log("Cannot delete " + str + " from redis")
				   }
				})
			}
		})
	})
}

app.get('/api/v1/_meta', throttle({ "rate": "300/s" }), function(req,res){
	dbQuery.listCollections(function(data){
		res.status(200).send(data).end()
	})
})
app.post('/api/v1/_s3signature', throttle({ "rate": "300/s" }), function(req,res){
	let requiredKeys = ['ttl', 'bucket', 'filename', 'filetype']
	let submittedKeys = Object.keys(req.body)
	let keyDiffs = _.difference(requiredKeys, submittedKeys)
	if (_.isEmpty(keyDiffs)) {
		const AWS = require("aws-sdk");
		      AWS.config.update({
		          accessKeyId: process.env.aws_accessKeyId || config.api.aws.aws_accessKeyId, 
		          secretAccessKey: process.env.aws_secretAccessKey || config.api.aws.aws_secretAccessKey,
		      });
		        var s3 = new AWS.S3();

		var params = {
		    Bucket: req.body.bucket,
		    Key: req.body.filename,
		    Expires: req.body.ttl,
		    ContentType: req.body.filetype
		};

	    s3.getSignedUrl('putObject', params, function(err, data) {
	        if (err) {
	            console.log(err);
	        } else {
				res.status(200).send({"presigned-endpoint": data}).end()
	        }
	    });
	} else {
		res.status(422).send({"msg": "Missing key '" + keyDiffs.join(', ') + "' which is required for generating a presigned S3 endpoint."}).end()
	}
})

app.get('/api/v1/:type', throttle({ "rate": "300/s" }), function(req,res){
	var query = _.omit(req.query, ['_expect', '_limit', '_page', '_sortorder', '_sortby', '_sortas'])
	var ttl = _.isEmpty(req.get('X-REDIS-TTL')) ? 86400 : parseInt(req.get('X-REDIS-TTL'))

	function queryFilter(data, callback){
		var _expect = _.isEmpty(req.query._expect) ? null : req.query._expect.split(" ")
		var _limit = _.isEmpty(req.query._limit) ? 0 : parseInt(req.query._limit)
		var _page = _.isEmpty(req.query._page) ? 0 : parseInt(req.query._page)
		var _sortby = _.isEmpty(req.query._sortby) ? null : req.query._sortby
		var _sortorder = _.isEmpty(req.query._sortorder) ? "desc" : req.query._sortorder
		var _sortas = _.isEmpty(req.query._sortas) ? "string" : req.query._sortas
		res.header('X-TOTAL-SIZE' , data.length );
		var sortasData = []
		if (_sortby) {
			if (_sortby == "id") {
				_.each(data, function(obj){
					obj._time = (ObjectID(obj[_sortby]).getTimestamp())
					sortasData.push(obj)
				})
				data = sortasData
			}else if (_sortas == "int") {
				_.each(data, function(obj){
					if(!isNaN(obj[_sortby])){
						obj[_sortby] = parseInt(obj[_sortby])
						sortasData.push(obj)
					}
				})
				data = sortasData
			}
			if (_sortby == "id") {
				data = _.orderBy(data, "_time", _sortorder)
			}else{
				data = _.orderBy(data, _sortby, _sortorder)
			}
		}
		var expectFilteredData = []
		if (!_.isEmpty(_expect)) {
			_.each(data, function(obj){
				obj = _.pick(obj, _expect)
				expectFilteredData.push(obj)
			})
			data = expectFilteredData
		}
		var data = (_page == 0) && (_limit == 0) ? data : data.slice( ((_page - 1) * _limit), ((_page - 1) * _limit) + _limit )		
		callback(data)			
	}
	cache.get(req.params.type, (err, redisData) => {
		if(!_.isEmpty(redisData)){
			queryFilter(JSON.parse(redisData), function(filteredData){
				res.status(200).send(_.filter(filteredData, query));				
			})
		}else{
			dbQuery.readAll(req.params.type, function(data){
				cache.set(req.params.type,JSON.stringify(data), 'EX', ttl)
				queryFilter(data, function(filteredData){
					console.log(filteredData)
					res.status(200).send(filteredData);				
				})
			}, query);
		}
	})
})
app.get('/api/v1/:type/:id', throttle({ "rate": "300/s" }), function(req,res){
	var ttl = _.isEmpty(req.get('X-REDIS-TTL')) ? 86400 : parseInt(req.get('X-REDIS-TTL'))
	cache.get(req.params.id, (err, data) => {
		if(!_.isEmpty(data)){
			res.status(200).send(JSON.parse(data));				
		}else{
			dbQuery.readOne(req.params.id, req.params.type, function(readData){
				if(_.isEmpty(readData)){
					res.status(504).end()
				}else{
					cache.set(req.params.id,JSON.stringify(readData), "EX", ttl)
					res.status(200).send(readData).end();		
				}		
			});	
		}
	})
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
app.post('/api/v1/:type', throttle({ "rate": "100/s" }), function(req, res){
	redisDel([req.params.type])
	dbQuery.create(req.params.type, req.body, function(dataCreated){
		res.status(201).end()
	});
})
app.post('/api/v1/:type/:id', throttle({ "rate": "100/s" }), function(req,res){
	redisDel([req.params.type, req.params.id])
	dbQuery.update(req.params.id, req.body);
	res.status(201).end()
});


app.delete('/api/v1/:type/', throttle({ "rate": "100/s" }), function(req,res){
	redisDel([req.params.type])
	dbQuery.readAll(req.params.type, function(data){
		_.each(data, function(item){
			redisDel([item.id])
			dbQuery.delete(item.id, req.params.type, function(status){
			});
		})
		res.status(204).end();	
	}, req.query)
});

app.delete('/api/v1/:type/:id', throttle({ "rate": "100/s" }), function(req,res){
	redisDel([req.params.type, req.params.id])
	dbQuery.delete(req.params.id, req.params.type, function(data){
		// console.log(data)
	});
	res.status(204).end();	
});



