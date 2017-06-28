const mongoose = require('mongoose');
const config = require('./config');
mongoose.connect(config.database_url);
const connection = mongoose.connection;
const Schema = mongoose.Schema;

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
var Meta = mongoose.model("Meta", MetaSchema);

exports.model = {};
exports.model.mongoose = mongoose;
exports.model.Data = Data;
exports.model.Meta = Meta;