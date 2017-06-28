var AWS = require('aws-sdk'),
    fs = require('fs'),
    config = require('../config');

// For dev purposes only
AWS.config.update({ accessKeyId: config.aws_accessKeyId, secretAccessKey: config.aws_secretAccessKey });

// Read in the file, convert it to base64, store to S3
fs.readFile('./classic-new.jpg', function (err, data) {
  if (err) { throw err; }

  var base64data = new Buffer(data, 'binary');
  var s3 = new AWS.S3();
  s3.putObject({
    Bucket: 'api-template',
    Key: 'classic-new.jpg',
    Body: base64data,
    ACL: 'public-read'
  },function (resp) {
    console.log(arguments);
    console.log('Successfully uploaded package.');
  });

});


