let AWS = require("aws-sdk");
var documentClient = new AWS.DynamoDB.DocumentClient();

exports.handler = (event) => {

    let team = "";
    let category = 0;
    let targetArray = [];

    for (let record of event.Records) {
        if (record.eventName === "MODIFY") { //when the latest 100 matches for each team are updated

            //Extract data
            team = record.dynamodb.NewImage.TeamName.S;

            let result = record.dynamodb.NewImage.Result.S;
            targetArray.push(result);
        }
    }

    let teamNames = ["ManCity", "ManUtd", "Liverpool", "Chelsea", "Arsenal"];

    //getting the category of machine learning for the particular team 
    for (let i = 0; i < teamNames.length; i++) {
        if (team == teamNames[i]) {
            category = i;
        }
    }

    //getting latest 50 matches to send to machine learning endpoint
    let finalTargetArray = targetArray.slice(Math.max(targetArray.length - 50, 1));

    //Data to send to endpoint
    let endpointData = {
        "instances": [{
            "start": "2020-04-28 05:00:00",
            "cat": category,
            "target": finalTargetArray
        }],
        "configuration": {
            "num_samples": 25,
            "output_types": ["mean"]
        }
    };

    //Name of endpoint
    const endpointName = "football-predictor";

    //Parameters for calling endpoint
    let params = {
        EndpointName: endpointName,
        Body: JSON.stringify(endpointData),
        ContentType: "application/json",
        Accept: "application/json"
    };

    //AWS class that will query endpoint
    let awsRuntime = new AWS.SageMakerRuntime({});

    //Call endpoint and handle response
    awsRuntime.invokeEndpoint(params, (err, data) => {
        if (err) { //An error occurred
            console.log(err, err.stack);

            //Return error response
            const response = {
                statusCode: 500,
                body: JSON.stringify('ERROR: ' + JSON.stringify(err)),
            };
            return response;
        } else { //Successful response
            //Convert response data to JSON
            let responseData = JSON.parse(Buffer.from(data.Body).toString('utf8'));

            //Storing data in predictions table
            for (let i = 0; i < responseData.predictions[0].mean.length; i++) {
                //Table name and data for table
                var params = {
                    TableName: "PredictedResults",
                    Item: {
                        TeamName: team,
                        TimeId: i,
                        Result: responseData.predictions[0].mean[i]
                    }
                };
                //Store data in DynamoDB and handle errors
                documentClient.put(params, function(err, data) {
                    if (err) {
                        console.error("Unable to add item");
                        console.error("Error JSON:", JSON.stringify(err));
                    } else {
                        console.log("Predictions Updated Successfully!");
                    }
                });
            }

            //Return successful response
            const response = {
                statusCode: 200,
                body: JSON.stringify('Predictions stored.'),
            };
            return response;
        }
    });
};