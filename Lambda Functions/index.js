let AWS = require("aws-sdk");

//table name
let params = {
    TableName: "Matches"
};

//Create client for accessing DynamoDB
let documentClient = new AWS.DynamoDB.DocumentClient();

/* Returns all data from Table */
exports.handler = (event, context, callback) => {
    //Scan table to retrieve all data
    documentClient.scan(params, (err, data) => {
        if (err) {
            console.log("\nERROR:\n" + err + "\n");

            //Generate an error without sending back to client.
            callback(err);
        } else {
            console.log("\nDATA:\n" + JSON.stringify(data) + "\n");

            //Create object to set status code and hold error
            let response = {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*", // Required for CORS support to work
                    "Access-Control-Allow-Credentials": true // Required for cookies, authorization headers with HTTPS 
                },
                body: JSON.stringify(data)

            }
            callback(null, response);
        }
    });
};