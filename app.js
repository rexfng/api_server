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
const jwt = require('express-jwt');
const jwks = require('jwks-rsa');
const assert = require('assert-callback');
const logger = require('morgan');
const _ = require('lodash');
const DB = require('./db').DB;
const dbQuery = new DB.query.mongodb;

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
const redisLab = process.env.redisLab || config.redis;
const redis = require('redis'),
	  cache = 	redis.createClient({
	  	host: redisLab.host,
	  	port: redisLab.port,
        no_ready_check: true,
        auth_pass: redisLab.auth_pass,  
	  })
	cache.on("error", function(err) {
	  console.log("Error " + err);
	})

var redisDel = function(arr){
	console.log(arr)
	_.each(arr, function(str){
		cache.get(str, function(err, getResponse){
			if(!_.isEmpty(getResponse)){
				cache.del(str, function(err, response) {
				   if (response == 1) {
				      console.log("Deleted " + str  + " from Redis Successfully!")
				   } else{
				    console.log("Cannot delete " + str + " from redis")
				   }
				})
			}
		})
	})
}
app.get('/api/v1/_meta', throttle({ "rate": "300/s" }), function(req,res){
	dbQuery.listCollections(function(source){
		res.status(200).send(source)
	})
})
app.get('/', throttle({ "rate": "300/s" }), function(req,res){
	dbQuery.readSource(req.query, function(err, items){
		if(!err){
			res.status(200).send(items)		
		}else{
			res.status(500)	
		}
	})
})
app.get('/api/v1/:type', throttle({ "rate": "300/s" }), function(req,res){
	var query = _.omit(req.query, ['_expect', '_limit', '_page', '_sortorder', '_sortby', '_sortas'])
	var ttl = _.isEmpty(req.get('X-REDIS-TTL')) ? 86400 : parseInt(req.get('X-REDIS-TTL'))

	function queryFilter(source, callback){
		var _expect = _.isEmpty(req.query._expect) ? null : req.query._expect.split(" ")
		var _limit = _.isEmpty(req.query._limit) ? 0 : parseInt(req.query._limit)
		var _page = _.isEmpty(req.query._page) ? 0 : parseInt(req.query._page)
		var _sortby = _.isEmpty(req.query._sortby) ? null : req.query._sortby
		var _sortorder = _.isEmpty(req.query._sortorder) ? "desc" : req.query._sortorder
		var _sortas = _.isEmpty(req.query._sortas) ? "string" : req.query._sortas
		res.header('X-TOTAL-SIZE' , source.length );
		var sortassource = []
		if (_sortby) {
			if (_sortby == "id") {
				_.each(source, function(obj){
					obj._time = (ObjectID(obj[_sortby]).getTimestamp())
					sortassource.push(obj)
				})
				source = sortassource
			}else if (_sortas == "int") {
				_.each(source, function(obj){
					if(!isNaN(obj[_sortby])){
						obj[_sortby] = parseInt(obj[_sortby])
						sortassource.push(obj)
					}
				})
				source = sortassource
			}
			if (_sortby == "id") {
				source = _.orderBy(source, "_time", _sortorder)
			}else{
				source = _.orderBy(source, _sortby, _sortorder)
			}
		}
		var expectFilteredsource = []
		if (!_.isEmpty(_expect)) {
			_.each(source, function(obj){
				obj = _.pick(obj, _expect)
				expectFilteredsource.push(obj)
			})
			source = expectFilteredsource
		}
		var source = (_page == 0) && (_limit == 0) ? source : source.slice( ((_page - 1) * _limit), ((_page - 1) * _limit) + _limit )		
		callback(source)			
	}
	cache.get(req.params.type, (err, redissource) => {
		if(!_.isEmpty(redissource)){
			queryFilter(JSON.parse(redissource), function(filteredsource){
				res.status(200).send(_.filter(filteredsource, query));				
			})
		}else{
			dbQuery.readAll(req.params.type, function(source){
				cache.set(req.params.type,JSON.stringify(source), 'EX', ttl)
				queryFilter(source, function(filteredsource){
					res.status(200).send(filteredsource);				
				})
			}, query);
		}
	})
})
app.get('/api/v1/:type/:id', throttle({ "rate": "300/s" }), function(req,res){
	var ttl = _.isEmpty(req.get('X-REDIS-TTL')) ? 86400 : parseInt(req.get('X-REDIS-TTL'))
	cache.get(req.params.id, (err, source) => {
		if(!_.isEmpty(source)){
			res.status(200).send(JSON.parse(source));				
		}else{
			dbQuery.readOne(req.params.id, req.params.type, function(readsource){
				if(_.isEmpty(readsource)){
					res.status(504).end()
				}else{
					cache.set(req.params.id,JSON.stringify(readsource), "EX", ttl)
					res.status(200).send(readsource);		
				}		
			});	
		}
	})
})
app.post('/api/v1/:type', throttle({ "rate": "100/s" }), function(req, res){
	redisDel([req.params.type])
	dbQuery.create(req.params.type, req.body, function(sourceCreated, id){
		if(sourceCreated){
			res.status(201).end()		
		}
	});
})
app.post('/api/v1/:type/:id', throttle({ "rate": "100/s" }), function(req,res){
	redisDel([req.params.type, req.params.id])
	dbQuery.update(req.params.id, req.params.type, req.body, function(message){
		res.status(201).end();
	});
});
app.delete('/api/v1/:type/', throttle({ "rate": "100/s" }), function(req,res){
	redisDel([req.params.type])
	dbQuery.readAll(req.params.type, function(source){
		_.each(source, function(item){
			redisDel([item.id])
			dbQuery.delete(item.id, req.params.type, function(status){
			});
		})
		res.status(204).end();	
	}, req.query)
});
app.delete('/api/v1/:type/:id', throttle({ "rate": "100/s" }), function(req,res){
	redisDel([req.params.type, req.params.id])
	dbQuery.delete(req.params.id, req.params.type, function(source){
		// console.log(source)
		dbQuery.deleteSource(req.params.id, function(status){
			console.log(status)
		})
	});
	res.status(204).end();	
});

