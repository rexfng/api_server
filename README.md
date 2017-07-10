# Introduction
The repo has 2 major purpose. 1) it works as a RESTful endpoint powered by node and express serving either mongodb (mongoose) or aws dynamodb. 2) perform server sides duty such as sending email/sms, hosting websocket connection, and generate server-side cookie-session. For more detail please see api documentation from root of the project.

## Setup Instructions
1. rename `env/_config.json` to `env/{environment}.json` or setup the following environment variables
    - NODE_ENV  
    - root_url
    - port
    - jwksUri
    - audience
    - issuer
    - is_jwk
    - mailer_user
    - mailer_pass
    - twilio_accountSid
    - twilio_authToken
    - twilio_number
    - aws_accessKeyId
    - aws_secretAccessKey
    - aws_dynamodb_region
    - dynamodb_data_table_name
    - dynamodb_meta_table_name
2. `npm install`
3. `npm run api` create doc directory and files. Visit project root to see api documentation
4. `nodemon app`

### To-Do
1. Adding Unit Test

### Dev Log
1.0.0 Create basic functionality for the api_server endpoint
