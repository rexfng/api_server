*mongodb's function is not up to date. Use dynamodb for now.

# Introduction
The project provides a RESTful wrapper for mongo database with dynamic schema.

## Securing the Endpoint
To secure the endpoint, set `is_jwk` to true and apply credentials from [Auth0](https://auth0.com/) or other similar services/

## Setup Environment
I recommend mlab for mongo hosting, and redis labs for redis setup

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
1. Dynamodb UPDATE function needs update for now.

### Discussion

### Dev Log
1.0.1 Removed Auth, Graph, S3, Socket functions to keep this strictly for database wrapper. I encourage using firebase or cognito for auth. 
1.0.0 Create basic functionality for the api_server endpoint
