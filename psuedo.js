
		Generate Tickets
			Create Steps
			Create Steps
				Choose Emitter

		// Create Context
			function createContext(expiry_dt, ticket_id, user_id, data_id){
				createContextwithFirstStep();
			};
		// Create Emitter
			function createEmitter(slug, desc, method, endpoint){};
		// Create Ticket
			function createTicket(type){};
		// Create Steps
			function createSteps(ticket_id, emitter_id){};
		// Create Data
			function createData(type, obj){
				new Data({
					type: type
				}).save(function(err,data){
					if(obj){
						for (var key in obj){
							new Meta({
								key : key,
								value : obj[key],
								data_id : data._id
							}).save();
						}
					}
				});
			}
			function addPropertiesToOneData(data_id, obj){
				for (var key in obj){
					new Meta({
						key : key,
						value : obj[key],
						data_id : data_id
					}).save();
				}					
			}
			function findAllDataByType(type){
				var arr = [];
				function createResponseArray(arg,count){
					arr.push(arg);
				}
				function returnArray(){
					arr = arr.filter(function(el) {
					    return typeof el != "object" || Array.isArray(el) || Object.keys(el).length > 0;
					})
					res.send(arr); //<<<<get this array!
				};
				Data.find({"type": type}, function(err, response){
					if(response == ""){
						res.status(404);
					}
					for (var i = response.length - 1; i >= 0; i--) {
						var count = 0;	
						Meta.find({"data_id" : response[i]._id}, function(err, responses){	
							var meta = new Object();
							if (responses[0] != undefined) {
								// console.log(responses);
								meta._id = responses[0].data_id;
								console.log(responses.length);
								for (var i = responses.length - 1; i >= 0; i--) {
									meta[responses[i].key] = responses[i].value[0];
								}
							}
							count += 1;
							createResponseArray(meta,count);
							if (count == response.length) {
								returnArray();
							}
						})
					}
				})
			}
			function findOneDataByType(type, data_id){
				Data.find({"type": type}, function(err, response){
					if (response != "") {
						res.status(200);
						Meta.find({"data_id": data_id},function(err, response){
							var metas = []
							var id = new Object();
							id['_id'] = data_id;
							metas.push(id);
							var type = new Object();
							type.type = type;
							metas.push(type);
							for (var i = response.length - 1; i >= 0; i--) {
								var meta = new Object();
								meta[response[i].key] = response[i].value[0]; 
								metas.push(meta);
							}
							var metas = metas.reduce(function(acc, x) {
							    for (var key in x) acc[key] = x[key];
							    return acc;
							}, {});
							res.send(metas);
						})
					}else{
						res.status(404);
					}
				})	
			}
			function updateOneDataById(data_id){
				Meta.find({data_id: data_id}, function(err, meta){
					var obj = new Object();
					for (key in req.body){
						obj[key] = req.body[key]
					}
					for (var i = 0; i < meta.length; i++) {
						if (obj[meta[i].key] !== undefined) {
							meta[i].value = obj[meta[i].key];
						}
					}
					for (var i = 0; i < meta.length; i++) {
						var m = new Meta(meta[i]);
						m.isNew = false;
						m.save();
					}
					res.status(200).send(meta);
				})				
			}
			function deleteOneDataById(data_id){
				Data.remove({_id: req.params.id}, function(err, response){
					if (err) {
						res.status(200);
						res.send({response: "fail to delete"});
					}else{
						res.status(200);
						res.send({response: "deleted"});
						Meta.remove({data_id: req.params.id}, function(err, response){
							if (err) {
								res.status(200);
								res.send({response: "fail to delete metas"});
							}
						})
					}
				})				
			}
			function sendMail(){

			};
			function sendSms(){

			};
			intent, context, actions, 
			twitter api
			google book api
			ocr to upload syllabus
			kairos facial detection of identity, emotion, segment 
			Watson personality insight


		TWILIO listening for ticket_id
			if (!has_context(user_id(phone_number))){
			  createContext(ticket_id, data);
			}else{
			  exit();
			}

		Validate Compare
		function validate(test,against){
			if(test == against){
				return true
			}else{
				false
			}
		}

		Context loop
			client-server generates a unique ticket
				user send ticket_id via text to create context
				-- auth ticket id and sms.msg -> emit (data-independant)
				server check if user has a context with same ticket_id, 
					if yes and not expired
						server updates context with data
						emit steps (data-dependant)
						increment steps

					if no or expired
						look at message if it matches ticket id
							if yes
								create user context and assign earliest step
							if no
								respond with static message

		context will expire - one to one to user
			context is an instance of a ticket that expires
				_id 
				expiry_dt
				ticket_id
				steps_id <- execute event emitter
				user_id
				context_data (data_id)

		ticket
			_id
			type

		steps (order important)
			_id <- determine order
			ticket_id
			emitter_id

		emitter
			description
			slug
			method
			endpoint localhost/v1/api/sms
				auth comparing values can be an emittor

		message-template stores text reply handlebar template

		api/v1/emitter?term=send-message
		api/v1/template POST data="template=&data_id"

		1. install handlebar js
		2. create a template message of sms
		3. handlebar endpoint? done



		sms/POST

		ai/:type POST
			get text

