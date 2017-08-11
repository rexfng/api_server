
 /**
 * @api {get} /api/v1/:type GET All
 * @apiName Data Get
 * @apiGroup Data Service
 * @apiDescription The Data Service is a dynamic api endpoint base on your data. By prior creating your own type by POST-ing to the same endpoint, you have access to the same type data 
 * @apiVersion 1.0.0
 *
 * @apiParam {Integer} _id  The mongodb id of the data.
 * @apiParam {String/Object} value  Your custom key-value pair of your data.

 * @apiParamExample {json} Return example:
 *     [{
 *       "_id": 5910dd5df5306e9b11ab4aef,
 		 "key": "value",
 		 "key": "value",
 		 "key": "value"
 *     },{
 *       "_id": 5910dd5df5306e9b11aef213,
 		 "key": "value",
  		 "key": "value",
   		 "key": "value"
 *     }]
 */



  /**
 * @api {get} /api/v1/:type? GET ALL - Filter
 * @apiName Data Get Filter
 * @apiGroup Data Service
 * @apiDescription Provide a query to filter results in a data type. ie. /api/v1/:type?first_name=Stephen&last_name=Curry&team=Golden+State
 * @apiVersion 1.0.0
 *
 * @apiParam {Integer} _id  The mongodb id of the data.
 * @apiParam {String/Object} value  Your custom key-value pair of your data.

 */



 /**
 * @api {get} /api/v1/:type/:id GET ONE
 * @apiName Data Id
 * @apiGroup Data Service
 * @apiDescription Get record by :id base on :type
 * @apiVersion 1.0.0
 *
 * @apiParam {String/Object} [value]  Your custom key-value pair of your data.

 * @apiParamExample {json} Return example:
 *     {{
 *       "_id": 5910dd5df5306e9b11ab4aef,
 		 "key": "value",
 		 "key": "value",
 		 "key": "value"
 *     }}
 */
 /**

 * @api {post} /api/v1/:type POST
 * @apiName Data Post
 * @apiGroup Data Service
 * @apiDescription Creating data object base on type
 * @apiVersion 1.0.0
 *
 * @apiParam {String} value  Your custom key-value pair of your data.
 * @apiParam {String} [value]  You can have multiple ones.

 */

  /**

 * @api {update} /api/v1/:type/:id UPDATE
 * @apiName Data Update
 * @apiGroup Data Service
 * @apiDescription Updating key-value of a data object base on type and id
 * @apiVersion 1.0.0
 *
 * @apiParam {String} value  Your custom key-value pair of your data.
 * @apiParam {String} [value]  You can have multiple ones.

 */

/**

 * @api {delete} /api/v1/:type DELETE All
 * @apiName Data Delete All
 * @apiGroup Data Service
 * @apiDescription Delete all data from a :type
 * @apiVersion 1.0.0
 *

 */

 /**

 * @api {delete} /api/v1/:type/:id DELETE One
 * @apiName Data Delete
 * @apiGroup Data Service
 * @apiDescription Delete and object based on its :type and :id
 * @apiVersion 1.0.0
 *

 */


 /**
 * @api {get} /api/v1/shortid GET ONE
 * @apiName Short ID Get
 * @apiGroup Short ID Gen
 * @apiDescription The Service generates a unique 7 characters string from A-Z, a-z, 0-9, _- Please note it does not contain time information and cannot be sorted. This endpoint is a wrapper of https://github.com/dylang/shortid
 * @apiVersion 1.0.0
 *
 * @apiParam {String} uuid  Contains the unique generated id.

 * @apiParamExample {json} Return example:
 *     {
 *       uuid: "rJPHBSzD-"
 *     }
 */




 /**
 * @api {post} /api/v1/mailer POST
 * @apiName Mailer
 * @apiGroup Mailer Service
 * @apiDescription Send an email via this endpoint. This endpoint is stateless and does not store the content of the information. Use x-www-form-urlencoded
 * @apiVersion 1.0.0
 *
 * @apiParam {String} to  the email address(es) you would like to send the email to. 
 * @apiParam {String} subject  The subject of the email.
 * @apiParam {String} [text]   The email message in plain text format.
 * @apiParam {String} [html]   The email message in html format
 *
 * @apiParamExample {json} Return example:
 *     {{
			"template": "< h1 >Hi {{first_name}}, thank you for signing up.< h1 >", 
			"data_id": "5910dd5df5306e9b11aef213", 
			"text": "Welcome Joe! Thank you for signing up. Please click this link ..." 
			"html": "html codes"
 *     }}
 */

 



  /**
 * @api {post} /api/v1/sms POST
 * @apiName SMS
 * @apiGroup SMS Service
 * @apiDescription Send an sms via this endpoint. This endpoint is stateless and does not store the content of the information.
 * @apiVersion 1.0.0
 *
 * @apiParam {String} to  SMS is delivered to this phone number.
 * @apiParam {String} body  Body of the SMS message.
 * @apiParamExample {json} Return example:
 *     {{
			"to": "+16041234567", 
			"body": "Welcome Joe! Thank you for signing up. Please text back the 4 digit verification code" 
 *     }}
 */

 /**
 * @api {post} /api/v1/user POST
 * @apiName User
 * @apiGroup User Service
 * @apiDescription Creating User Model.
 * @apiVersion 1.0.0
 *
 * @apiParam {String} password  takes any client side hashes mixing with server side salts and store them in the database along side with any other key-values provided along this POST request.
 * @apiParam {String} [key]  any other key-value pairs.
 */


 /**
 * @api {post} /api/v1/auth POST
 * @apiName Auth
 * @apiGroup Auth Service
 * @apiDescription Authenticate email and password pair and returning server side session. Also sets ssid to user cookie.
 * @apiVersion 1.0.0
 *
 * @apiParam {String} ssid  client can pass previously return ssid to authenticate, if abscent, it will evulate the password and user_id pair.
 * @apiParam {String} user_id  unique user_id that represents the user's identity.
 * @apiParam {String} password  composed of sha256 hashes of 16 bites of random salt + user choice of passphrase.
 * @apiParamExample {json} Return example:
 *{
    {
        "is_authenticated": true,
        "ssid": "f4HU44kitKcmJSxTUpmORkEB",
        "user_id": "5973b137d01c7c828ea824e4"
    }
 *}
  * @apiErrorExample {json} Error-Response:
 *     {
 *       "is_authenticated": false,
         "msg": "you must provide 1) an ssid or 2) user_id and password to authenticate this user."
 *     }
 */



 /**
 * @api {delete} /api/v1/auth/:ssid DELETE
 * @apiName Auth Destroy Session
 * @apiGroup Auth Service
 * @apiDescription Destroy server side session and clear SSID stores in cookies.
 * @apiVersion 1.0.0
 *
 * @apiParam {String} ssid  after user being authenticated, the unique ssid found in cookies.
 * @apiParamExample {json} Return example:
 *     {
          "ssid_destroyed": true,
          "ssid": "vni8WJ_iKvECEE1WtfHW9sHy",
          "user_id": "598e0a9d7869b616dc62f608"
 *     }
 */





/**
 * @api {websocket} /api/v1/ Websocket
 * @apiName Websocket
 * @apiGroup Websocket Service
 * @apiDescription Providing wrapper for API AI.
 * Websocket is setup to use socket.io 
 * 
 *
 * @apiVersion 1.0.0
 *
 * @apiParam {String} method  "join", "emit" or "broadcast" 
 * @apiParam {String} on listener name. 
 * @apiParam {String} room  socket io specific room name
 * @apiParam {boolean} is_save  Whether you would wish to save the websocket data to database. After being saved, you can access that data via the type end point using Data Service.
 * @apiParam {String} [type] the Data type you choose to save the if is_save equals to true.
 * @apiParam {String} data custom JSON Object you would like to send to socket.io.

 * @apiParamExample {json} example to pass to socket.emit function:

 * var socket = io.connect('http://localhost:3000/');
 * socket.on('connect', function(room){
 * 	console.log('CLIENT: connect');
 * })
 *	socket.emit('emit', 
 *		{
 *			method: "join",
 *			room: "1234567",
 *		}
 *	)
 * socket.emit('emit', 
 * 	{
 * 		method: "emit",
 * 		on: "Typing",
 * 		type: "conversation",
 * 		is_save: true,
 * 		data: {
 * 			message: message.value,
 * 			name: handle.value,
 * 			user: {
 * 				user_id: "592a0fbf3f6e3d3a9665037f",
 * 				_self: "http://localhost:3000/api/v1/user/592a0fbf3f6e3d3a9665037f"
 * 			},
 * 			room_id: "1234567"
 * 		}
 * 	}
 * )
 * socket.on('Typing', function(data){
 * 	conversation.innerHTML += '<li><strong>' + data.name +'</strong>' + data.message + '</li>';
 * })
 */





