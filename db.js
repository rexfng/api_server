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
const DB = {
	query:{
		dynamodb: function(){
			this.create = function(type, json){
				var tableData = new AWS.DynamoDB.DocumentClient();
				var dataParams = {
				    TableName:process.env.dynamodb_data_table_name || config.db.dynamodb.data_table_name,
				    Item:{
						"_id": ObjectID.generate(),
				        "type": type,
				    }
				};
				tableData.put(dataParams, function(err, data) {
					// console.log(dataParams)
					// console.log(err)
					// console.log(json)
				    if (!err){
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
			    		if( data.Items[i].data_id == id){
			    			if(_.includes(jsonKeys, data.Items[i].k)){
								var tableMeta = new AWS.DynamoDB.DocumentClient();
							    var metaParams = {
							        TableName: process.env.dynamodb_meta_table_name || config.db.dynamodb.meta_table_name,
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
						    TableName:process.env.dynamodb_meta_table_name || config.db.dynamodb.meta_table_name,
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
				var params = { TableName: process.env.dynamodb_data_table_name || config.db.dynamodb.data_table_name };
			    tableData.scan(params, function(err, data){
			    	typeFilter = _.filter(data.Items, {type: type});
			    	if (!err) {
			    		for (var i = 0; i < data.Items.length; i++) {
			    			if (data.Items[i].type == type) {
								var tableMeta = new AWS.DynamoDB.DocumentClient();
			    				var dataIdArr = [];
			    				var responseArr = [];
								var metaParams = {
							        TableName: process.env.dynamodb_meta_table_name || config.db.dynamodb.meta_table_name,
							    };	
			    				for (var i = 0; i < data.Items.length; i++) {
			    					var data_id = data.Items[i]._id;
			    					dataIdArr.push(data_id);
			    				}
			    				typeFilter = _.map(typeFilter, '_id');
			    				tableMeta.scan(metaParams, function(err, data){
			    					_.each(typeFilter, function(id){
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
			    	}else{
			    		console.log(err);
			    	}
			    })
			}
			this.readOne = function(id, callback){
				var tableData = new AWS.DynamoDB.DocumentClient();
				var params = { TableName: process.env.dynamodb_data_table_name || config.db.dynamodb.data_table_name };
			    tableData.scan(params, function(err, data){
			    	if (!err) {
			    		for (var i = 0; i < data.Items.length; i++) {
			    			if (data.Items[i].id == id) {
								var tableMeta = new AWS.DynamoDB.DocumentClient();
								var type = data.Items[i].type;
								var metaParams = {
							        TableName: process.env.dynamodb_meta_table_name || config.db.dynamodb.meta_table_name,
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
			        TableName: process.env.dynamodb_meta_table_name || config.db.dynamodb.meta_table_name,
			        Key:{
			            "data_id": id
			        }
			    };	
				tableMeta.scan(metaParams, function(err, data){	
    				for (var i = 0; i < data.Items.length; i++) {
    					if (data.Items[i].data_id == id){
							var tableMeta = new AWS.DynamoDB.DocumentClient();
						    var metaParams = {
						        TableName: process.env.dynamodb_meta_table_name || config.db.dynamodb.meta_table_name,
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
			        TableName: process.env.dynamodb_data_table_name || config.db.dynamodb.data_table_name,
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

exports.DB = DB;
