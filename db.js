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
const ObjectID = require("bson-objectid");


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
objectIdFromDate = function (date) {
	return Math.floor(date.getTime() / 1000).toString(16) + "0000000000000000";
};

dateFromObjectId = function (objectId) {
	return new Date(parseInt(objectId.substring(0, 8), 16) * 1000);
};

// if (process.env.db_which_DB == "mongodb"|| config.db.which_DB == "mongodb") {
	const mongoose = require('mongoose');
	const Transaction = require('mongoose-transaction')(mongoose);
		  mongoose.connect(process.env.mongodb_database_url || config.db.mongodb.database_url);
	const connection = mongoose.connection;
	const Schema = mongoose.Schema;
	const DataSchema = new Schema({
			id          : Schema.ObjectId,
	})
	const MetaSchema = new Schema({
			id          : Schema.ObjectId,
			data_id		: Schema.ObjectId,
			key			: String,
			value		: { type: [String], index: true }
	})
// }
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
				    					// build.type = type
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
		    					// build.type = type
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
						// build.type = type
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
						    		console.log(data)
						    	}
						    })	
			    		})
			    	}
		    	})

				var tableData = new AWS.DynamoDB.DocumentClient();
			    var dataParams = {
			        TableName: process.env.dynamodb_data_table_name || config.db.dynamodb.data_table_name,
			        Key:{
			            "_id": id
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
			this.listCollections = function(callback){
				var tableData = new AWS.DynamoDB.DocumentClient();
				var params = { 
					TableName: process.env.dynamodb_data_table_name || config.db.dynamodb.data_table_name
				};
				var data = []	
				scanDB(tableData, params, data, function(data){
					var unique = _.uniqBy(data, 'type');
					var metas = []
					_.each(unique, function(e){
						var meta = {
							"collection": e.type,
							"count": _.filter(data, {type: e.type}).length
						}	
						metas.push(meta)					
					})
					callback(metas)
				})
			}
		},
		mongodb: function(){
			this.instanciateModel = function(type, callback){
				//dynamically creating mongodb models
				var dbModel = {}
				dbModel[type + "_data"] = mongoose.model(type + "_data", DataSchema );
				dbModel[type + "_meta"] = mongoose.model(type + "_meta", MetaSchema );
				callback(dbModel[type + "_data"], dbModel[type + "_meta"])			
			}
			this.create = function(type, json, callback){
				this.instanciateModel(type, function(Data, Meta){
					new Data().save(function(err,data){
						var keysCount = 0
						for (var key in json){
							new Meta({
								key : key,
								value : json[key],
								data_id : data._id
							}).save(function(){
								keysCount += 1
								console.log(keysCount)
								if(_.size(json) == keysCount){
									callback(true, data._id)									
								}
							});
						}
					});
				})
			};
			this.update = function(id, type, json, callback){	
				this.instanciateModel(type, function(Data, Meta){
					var keys = [];
					for (key in json){
						keys.push(key);
					}
					//finding all meta that under the same id
					Meta.find({data_id: id}, function(err, data){
						_.each(data, function(item){
							//if old key and if value is different
							if(_.includes(keys, item.key[0]) && item.value[0] !== json[item.key]){
								Meta.remove({id: item._id}, function(err, done){
									new Meta({
										key : item.key,
										value : json[item.key],
										data_id : id
									}).save(function(){
										// console.log("updated " + item.value[0] + " to " + json[item.key])
										callback({status: "updated"})
									})
								})	
							}else{							
								//if new key, add meta
								for (key in json){
									new Meta({
										key : key,
										value : json[key],
										data_id : id
									}).save(function(){
										callback({status: "updated"})
									})										
								}
							}
						})
					})
				})
			}
			this.readAll = function(type, callback, query){
				console.log(query)
				this.instanciateModel(type, function(Data, Meta){
					var results = []
					Data.find(function(err, items){
						_.each(items,function(item){
							var result = {}
							Meta.find({data_id: item._id}, function(err, metas){
								_.each(metas, function(meta){
									result._id = item._id
									result[meta.key] = meta.value[0]
								})
								var latestUpdatedTime = (_.orderBy(metas, ['_id'],['desc'])[0]._id);
								Object.assign(result, {
									created_at: dateFromObjectId(item._id.toString()),
									updated_at: dateFromObjectId(latestUpdatedTime.toString())
								})
								results.push(result)
								if(_.size(results) == _.size(items)){
									callback(results)
								}
							})
						})
					})
				})	
			}
			this.readOne = function(id, type, callback){
				this.instanciateModel(type, function(Data, Meta){
					Data.find({_id: id}, function(err, items){
						var result = {}
						Meta.find({data_id: items[0]._id}, function(err, metas){
							_.each(metas, function(meta){
								result[meta.key] = meta.value[0]
							})
							var latestUpdatedTime = (_.orderBy(metas, ['_id'],['desc'])[0]._id);
							Object.assign(result, {
								_id: id,
								created_at: dateFromObjectId(id.toString()),
								updated_at: dateFromObjectId(latestUpdatedTime.toString())
							})
							callback(result)
						})
					})
				})	
			}
			this.delete = function(id, type, status){
				this.instanciateModel(type, function(Data, Meta){				
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
				})
			}
			this.listCollections = function(callback){
				connection.on('open', function () {
				    connection.db.listCollections().toArray(function (err, collections) {
				    	var arr = []
				    	_.each(collections, function(collection){
				    		if (collection.name !== 'objectlabs-system' && collection.name !== 'system.indexes') {
				    			arr.push(collection.name.slice(0,-6))
				    		}
				    	})
				    	callback(_.uniq(arr))
				    });
				});
			}
		}
	}
}

exports.DB = DB;
