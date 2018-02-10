*mongodb's function is not up to date. Use dynamodb for now.

# Introduction
The repo has 2 major purpose. 1) it works as a RESTful endpoint powered by node and express serving either [mongodb](https://mlab.com/) (mongoose) or [aws dynamodb](https://aws.amazon.com/dynamodb/). 2) perform server sides duty such as sending email/sms, hosting websocket connection, and generate server-side cookie-session. For more detail please see api [documentation](https://reach-api-server.herokuapp.com/) from root of the project.

## Securing the Endpoint
To secure the endpoint, set `is_jwk` to true and apply credentials from [Auth0](https://auth0.com/) or other similar services/

## Setup Instructions
1. rename `env/_config.json` to `env/{environment}.json` or setup the following environment variables. development.json is used by default
    - NODE_ENV  
    - root_url
    - port
    - jwksUri (optional)
    - audience (optional)
    - issuer (optional)
    - is_jwk
    - mailer_user (optional)
    - mailer_pass (optional)
    - twilio_accountSid (optional)
    - twilio_authToken (optional)
    - twilio_number (optional)
    - aws_accessKeyId
    - aws_secretAccessKey
    - aws_dynamodb_region
    - dynamodb_data_table_name
    - dynamodb_meta_table_name
    - mongodb_database_url
    - which_DB 
2. `npm install`
3. `npm run api` create doc directory and files. Visit project root to see api documentation
4. `nodemon app`

### To-Do
1. Mongodb's dbquery function is not up-to-date to dynamodb, use dynamodb for now.
2. a separate project to create a cms that utilizes this repo

### Discussion
1. rethink about auth endpoint, maybe use jwt or other security mechnaism instead.
2. without the websocket service, this repo can be stateless which makes this project very scalable. For serious project, you might want to consider host websocket elsewhere. For small project it's convenient to keep websocket here.

### Dev Log
1.0.0 Create basic functionality for the api_server endpoint
