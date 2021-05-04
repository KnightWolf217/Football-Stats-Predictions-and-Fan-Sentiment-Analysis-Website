let AWS = require("aws-sdk");
let comprehend = new AWS.Comprehend();

exports.handler = (event) => {

    for (let record of event.Records) {
        console.log(record);
        if (record.eventName === "MODIFY") { //when the latest tweets for each team are updated
            //Extract data
            let team = record.dynamodb.NewImage.TeamName.S;
            let id = record.dynamodb.NewImage.TweetID.S;
            let text = record.dynamodb.NewImage.Text.S;

            // //Processing of sentiment
            let params = {
                "LanguageCode": "en",
                "Text": text
            };

            comprehend.detectSentiment(params, function(err, data) {
                if (err) console.log(err);
                else {

                    //Create new DocumentClient
                    var documentClient = new AWS.DynamoDB.DocumentClient();

                    // Table name and data for table
                    let params2 = {
                        TableName: "ProcessedTweets",
                        Item: {
                            TeamName: team,
                            TweetID: id,
                            OverallSentiment: data.Sentiment,
                            Sentiment: data.SentimentScore
                        }
                    };

                    //Store data to database
                    documentClient.put(params2, function(err, data) {
                        if (err) {
                            console.error(JSON.stringify(err));
                        } else {
                            console.log("Sentiment added to table!");
                        }
                    });
                }
            });
        }
    };
};