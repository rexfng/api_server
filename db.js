process.env.NODE_ENV = process.env.NODE_ENV || 'development';
if (process.env.NODE_ENV !== "production") {
	var config = require('./env/' + process.env.NODE_ENV);
}else{
	var config = require('./env/_config');
}
const _ = require('lodash');
const AWS = require("aws-sdk");
      AWS.config.update({
          accessKeyId: process.env.aws_accessKeyId || config.api.aws.aws_accessKeyId, 
          secretAccessKey: process.env.aws_secretAccessKey || config.api.aws.aws_secretAccessKey,
          region: process.env.aws_dynamodb_region || config.db.dynamodb.aws_dynamodb_region,
          endpoint: 
          	"https://dynamodb." + (process.env.aws_dynamodb_region || config.db.dynamodb.aws_dynamodb_region) + ".amazonaws.com"
      });

var which_DB = process.env.which_DB || config.db.which_DB;

if (which_DB == "mongodb") {
	const mongoose = require('mongoose');
		  mongoose.connect(process.env.mongodb_database_url || config.db.mongodb.database_url);
	const connection = mongoose.connection;
	const Schema = mongoose.Schema;
	const ObjectID = require("bson-objectid");
	const DataSchema = new Schema({
			id          : Schema.ObjectId,
			type		: String,
	})
	const MetaSchema = new Schema({
			id          : Schema.ObjectId,
			data_id		: Schema.ObjectId,
			key			: String,
			value		: { type: [String], index: true }
	})
	var Data = mongoose.model("Data", DataSchema );
	var Meta = mongoose.model("Meta", MetaSchema );
}

uniqueCommons = function(arr){
	if(_.isEmpty(_(arr).groupBy().pickBy(x => x.length > 1).keys().value())){
		return arr
	}else{
		return _(arr).groupBy().pickBy(x => x.length > 1).keys().value()
	}
}
arrayPick = function(arr,arg){
	return mapped = _.map(arr, _.partialRight(_.pick, arg));
}
arrayObjectToString = function(arr, key){
	return arr.map(function(item) {
	    return item[key];
	});
}
scanDB = function(target, param, results, callback) {
	target.scan(param, function(err, data){
		if(err){
			console.log(err)
		}
		results = results.concat(data.Items)
		if(!_.isEmpty(data.LastEvaluatedKey)){
			lastEvaluatedKey = data.LastEvaluatedKey;
			param.ExclusiveStartKey = data.LastEvaluatedKey;
			scanDB(target, param, results, callback)
		} else {
			callback(results);
		}
	})	
}
checKeyEmpty = function(obj){
	for (var k in obj ){
		if(obj[k].length == 0){
			return true;
		}else{
			return false
		}
	}
}

const DB = {
	query:{
		dynamodb: function(){
			this.create = function(type, json, callback){
				var tableData = new AWS.DynamoDB.DocumentClient();
				var dataParams = {
				    TableName:process.env.dynamodb_data_table_name || config.db.dynamodb.data_table_name,
				    Item:{
						"_id": ObjectID.generate(),
				        "type": type,
				    }
				};
				returnRead = function(){
					var tableMetaRead = new AWS.DynamoDB.DocumentClient();
					var metaParamsRead = {
				        TableName: process.env.dynamodb_meta_table_name || config.db.dynamodb.meta_table_name,
					    ExpressionAttributeNames: {
					        "#data_id": "data_id"
					    },
	   				 	ExpressionAttributeValues: {
	   				 		":id": dataParams.Item._id
	   				 	},
	    				FilterExpression: "#data_id = :id"
				    };	
			    	results = []
			    	scanDB(tableMetaRead, metaParamsRead, results, function(results){
			    		if(!_.isEmpty(results)){
							var build = {};
							build.id = dataParams.Item._id;
							build.type = type
		    				_.each(results, function(result){
		    					build[result.k] = result.v
	    					})
	    					callback(build)
				    	}else{
				    		callback({})
				    	}
			    	})
				}
				tableData.put(dataParams, function(err, data) {
				    if (!err){
				    	lastLoop = Object.keys(json).length;
				    	loopCounter = 0;
						for (var key in json){	
							var tableMeta = new AWS.DynamoDB.DocumentClient();
							var metaParams = {
							    TableName:process.env.dynamodb_meta_table_name || config.db.dynamodb.meta_table_name,
							    Item:{
							        "_id": ObjectID.generate(),
							        "data_id": dataParams.Item._id,
							        "k": key,
							        "v": json[key]
							    }
							};
							tableMeta.put(metaParams, function(err, data) {
								loopCounter += 1;		
								if(loopCounter == lastLoop){
									returnRead();
								}		
							});
						}
				    }
				});							
			};
			this.update = function(id, json){	
				var tableMeta = new AWS.DynamoDB.DocumentClient();
			    var metaParams = {
			        TableName: process.env.dynamodb_meta_table_name || config.db.dynamodb.meta_table_name,
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
			    		var filter = _.filter(data.Items, {data_id: id});
			    		if( data.Items[i].data_id == id){
			    			if(_.includes(jsonKeys, data.Items[i].k)){
								var tableMeta = new AWS.DynamoDB.DocumentClient();
							    var metaParams = {
							        TableName: process.env.dynamodb_meta_table_name || config.db.dynamodb.meta_table_name,
							        Key:{
							            "_id": data.Items[i]._id,
							        }
							    };
							    tableMeta.delete(metaParams, function(err, data) {
							    	console.log(err)
							    })
			    			}
			    		}
			    	}
					for (var key in json){			
						var tableMeta = new AWS.DynamoDB.DocumentClient();
						var metaParams = {
						    TableName:process.env.dynamodb_meta_table_name || config.db.dynamodb.meta_table_name,
						    Item:{
						        "_id": ObjectID.generate(),
						        "data_id": id,
						        "k": key,
						        "v": json[key]
						    }
						};
						tableMeta.put(metaParams, function(err, data) {
							console.log(err)
						});
					}	
			    })		    	
			}
			this.readAll = function(type, callback, query){
				var tableData = new AWS.DynamoDB.DocumentClient();
				if(_.isEmpty(query) || checKeyEmpty(query)){
					var params = { 
						TableName: process.env.dynamodb_data_table_name || config.db.dynamodb.data_table_name,
					    ExpressionAttributeNames: {
					        "#type": "type"
					    },
	   				 	ExpressionAttributeValues: {
	   				 		":type": type
	   				 	},
	    				FilterExpression: "#type = :type"
					};
					var data = []
				    // tableData.scan(params, function(err, data){
				    scanDB(tableData, params, data, function(data){
				    	if(!_.isEmpty(data)){
					    	typeFilter = _.filter(data, {type: type});
				    		for (var i = 0; i < data.length; i++) {
			    				var dataIdArr = [];
			    				var responseArr = [];
			    				var results = []
			    				for (var i = 0; i < data.length; i++) {
			    					var data_id = data[i]._id;
			    					dataIdArr.push(data_id);
			    				}
			    				typeFilter = _.map(typeFilter, '_id');

								var metaParams = {
							        TableName: process.env.dynamodb_meta_table_name || config.db.dynamodb.meta_table_name,
							    };	
						    	results = []
						    	var tableMeta = new AWS.DynamoDB.DocumentClient();
						    	scanDB(tableMeta, metaParams, results, function(results){
			    					_.each(typeFilter, function(id){
				    					var row = _.filter(results, { data_id: id });
				    					var build = {};
				    					build.id = id;
				    					build.type = type
				    					_.each(row, function(record){
				    						build[record.k] = record.v
				    					})
				    					responseArr.push(build);
			    					})
			    					callback(responseArr);
						    	})
					    	}				    	
				    	} else {
				    		callback({})
				    	}
				    })

				}else{
					let FilterExpression = ["#type = :type"]
					let ExpressionAttributeNames = {'#k': 'k', '#v': 'v', '#type': 'type'}
					let ExpressionAttributeValues = {":type": type }
					var i = 0; 
					for ( var k in query ){
						i++
						Object.assign(ExpressionAttributeValues,{[":k" + i]: k, [":v" + i]: query[k]})
						FilterExpression.push("(#k = :" + "k" + i + " and " + "#v = :v" + i + ")")
					}
					FilterExpression = FilterExpression.join( ' or ' )

					var tableMeta = new AWS.DynamoDB.DocumentClient();
					var metaParams = {
				        TableName: process.env.dynamodb_meta_table_name || config.db.dynamodb.meta_table_name,
					    ExpressionAttributeNames: ExpressionAttributeNames,
	   				 	ExpressionAttributeValues: ExpressionAttributeValues,
	    				FilterExpression: FilterExpression
				    };	
				    results = []
				    scanDB(tableMeta, metaParams, results, function(results){
						var results = arrayObjectToString(arrayPick(results,['data_id']),'data_id') // extract meta ids from scan
    					    results = uniqueCommons(results)
    					var responseArr = []
	    				var metaParams = {
					        TableName: process.env.dynamodb_meta_table_name || config.db.dynamodb.meta_table_name,
					    };	
					    var items = []
				   		scanDB(tableMeta, metaParams, items, function(data){
	    					_.each(results, function(id){
		    					var row = _.filter(data, { data_id: id });
		    					var build = {};
		    					build.id = id;
		    					build.type = type
		    					_.each(row, function(record){
		    						build[record.k] = record.v
		    					})
		    					responseArr.push(build);
	    					})
    					callback(_.filter(responseArr, query))
 				   		})
				    })
				}
			}
			this.readOne = function(id, type, callback){
				var tableMeta = new AWS.DynamoDB.DocumentClient();
				var metaParams = {
			        TableName: process.env.dynamodb_meta_table_name || config.db.dynamodb.meta_table_name,
				    ExpressionAttributeNames: {
				        "#data_id": "data_id"
				    },
   				 	ExpressionAttributeValues: {
   				 		":id": id
   				 	},
    				FilterExpression: "#data_id = :id"
			    };	
		    	results = []
		    	scanDB(tableMeta, metaParams, results, function(results){
		    		if(!_.isEmpty(results)){
						var build = {};
						build.id = id;
						build.type = type
	    				_.each(results, function(result){
	    					build[result.k] = result.v
    					})
    					callback(build)
			    	}else{
			    		callback({})
			    	}
		    	})
			}
			this.delete = function(id, type, status){
				var tableMeta = new AWS.DynamoDB.DocumentClient();
				var metaParams = {
			        TableName: process.env.dynamodb_meta_table_name || config.db.dynamodb.meta_table_name,
				    ExpressionAttributeNames: {
				        "#data_id": "data_id"
				    },
   				 	ExpressionAttributeValues: {
   				 		":id": id
   				 	},
    				FilterExpression: "#data_id = :id"
			    };	
		    	results = []
		    	scanDB(tableMeta, metaParams, results, function(results){
		    		if(!_.isEmpty(results)){
			    		_.each(results, function(item){
							var tableMeta = new AWS.DynamoDB.DocumentClient();
						    var metaParams = {
						        TableName: process.env.dynamodb_meta_table_name || config.db.dynamodb.meta_table_name,
						        Key:{
						            "_id": item._id
						        }
						    };
						    tableMeta.delete(metaParams, function(err, data) {
						    	if (err) {
						    		console.log(err)
						    	} else {
						    		status(data)
						    	}
						    })	
			    		})
			    	}
		    	})

				var tableData = new AWS.DynamoDB.DocumentClient();
			    var dataParams = {
			        TableName: process.env.dynamodb_data_table_name || config.db.dynamodb.data_table_name,
			        Key:{
			            "_id": id,
			           	"type": type
			        }
			    };
			    tableData.delete(dataParams, function(err, data) {
			    	if (err){
			    		console.log(err)
			    	} else {
			    		console.log(data)
			    	}
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
			this.readAll = function(type, callback, query){
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
			this.readOne = function(id, type, callback){
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
			this.delete = function(id, type, status){
				Data.remove({_id: id}, function(err, response){
					if (err) {
						status({is_deleted: false});
					}else{
						Meta.remove({data_id: id}, function(err, response){
							if (!err) {
								status({is_deleted: true});
							}
						})
					}
				})	
			}
		}
	}
}

exports.DB = DB;
