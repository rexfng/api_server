process.env.NODE_ENV = process.env.NODE_ENV || 'development';
if (process.env.NODE_ENV !== "production") {
	var config = require('./env/' + process.env.NODE_ENV);
}else{
	var config = require('./env/_config');
}
const _ = require('lodash');
const ObjectID = require("bson-objectid");

dateFromObjectId = function (objectId) {
	return new Date(parseInt(objectId.substring(0, 8), 16) * 1000);
};

const mongoose = require('mongoose');
	  mongoose.connect(process.env.mongodb_database_url || config.db.mongodb.database_url);
const connection = mongoose.connection;
const Schema = mongoose.Schema;
const DataSchema = new Schema({
		id          : Schema.ObjectId
}, { versionKey: false })
const SourceSchema = new Schema({
		id          : Schema.ObjectId,
		type        : { type: String, index: true }
}, { versionKey: false })
const MetaSchema = new Schema({
		id          : Schema.ObjectId,
		source_id		: Schema.ObjectId,
		key			: String,
		value		: { type: String, index: true }
}, { versionKey: false })
const GraphSchema = new Schema({
		id          : Schema.ObjectId,
		source_id          : Schema.ObjectId,
		target_id		: Schema.ObjectId,
		context		: { type: String, index: true, required: true},
		weight		: { type: Number, required: true}
}, { versionKey: false })

const DB = {
	query:{
		mongodb: function(){
			this.instanciateModel = function(type, callback){
				//dynamically creating mongodb models
				var dbModel = {}
				dbModel[type + "_source"] = mongoose.model(type + "_source", DataSchema );
				dbModel[type + "_meta"] = mongoose.model(type + "_meta", MetaSchema );
				callback(dbModel[type + "_source"], dbModel[type + "_meta"])			
			}
			this.create = function(type, json, callback){
				this.instanciateModel(type, function(Data, Meta){
					new Data().save(function(err,data){
						var Source = mongoose.model("source", SourceSchema );	
						new Source({
							type: type,
							_id: data._id
						}).save()	
						var keysCount = 0
						for (var key in json){
							new Meta({
								key : key,
								value : json[key],
								source_id : data._id
							}).save(function(){
								keysCount += 1
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
					Meta.find({source_id: id}, function(err, data){
						_.each(data, function(item){
							//if old key and if value is different
							if(_.includes(keys, item.key[0]) && item.value !== json[item.key]){
								Meta.remove({id: item._id}, function(err, done){
									new Meta({
										key : item.key,
										value : json[item.key],
										source_id : id
									}).save(function(){
										// console.log("updated " + item.value + " to " + json[item.key])
										callback({status: "updated"})
									})
								})	
							}else{							
								//if new key, add meta
								for (key in json){
									new Meta({
										key : key,
										value : json[key],
										source_id : id
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
							Meta.find({source_id: item._id}, function(err, metas){
								_.each(metas, function(meta){
									result._id = item._id
									result[meta.key] = meta.value
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
						Meta.find({source_id: items[0]._id}, function(err, metas){
							_.each(metas, function(meta){
								result[meta.key] = meta.value
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
							Meta.remove({source_id: id}, function(err, response){
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
				    	callback(collections)
				    });
				});
			}
			this.listSource = function(type, callback){
				var Source = mongoose.model("source", SourceSchema );
				Source.find(type,function(err, items){
					callback(err, items)
				})
			}
			this.deleteSource = function(id, callback){
				var Source = mongoose.model("source", SourceSchema );
				Source.remove(id, function(err, items){
					if (err) {
						callback({is_deleted: false})
					}else{
						callback({is_deleted: true})
					}
				})
			}
			this.createGraph = function(obj, callback){
				var Graph = mongoose.model("graph", GraphSchema );	
				new Graph(obj).save(function(err, item){
					callback(err, item)
				})
			}
			this.readGraph = function(params, callback){
				var Graph = mongoose.model("graph", GraphSchema );	
				Graph.find(params, function(err, item){
					callback(err, item)
				})				
			}
		}
	}
}

exports.DB = DB;
