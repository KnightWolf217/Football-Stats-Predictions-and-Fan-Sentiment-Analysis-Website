let ax = require('axios');
let AWSDetails = require("aws-sdk");
AWSDetails.config.region = 'us-east-1'; // Region
AWSDetails.config.credentials = new AWSDetails.CognitoIdentityCredentials({
    IdentityPoolId: 'us-east-1:8f47235d-86d6-40fc-adbd-cd9a13cbb8ca',
});

let teamCodes:Array<string> = ["ManCity", "ManUtd", "Liverpool", "Chelsea", "Arsenal"];

let teams:Array<string> = ["manchester_city", "manchester_united", "liverpool", "chelsea", "arsenal"]

//Create new DocumentClient
var dClient = new AWSDetails.DynamoDB.DocumentClient();

for (let x:number = 0; x < teamCodes.length; x++) {

    let teamCode = teamCodes[x];
    let teamName = teams[x];

    ax({
        method: 'GET',
        headers: { Authorization: `Bearer AAAAAAAAAAAAAAAAAAAAAKnsOAEAAAAAEHL9KwDTHOwNA32rxEOtscmpLgk%3D8TP4TamZU4wSYe4xLdJ9lgCPFYQpYaPvybAeLVFAVCWZrZUkVJ` },
        url: 'https://api.twitter.com/2/tweets/search/recent?query=' + teamName + '&max_results=100'
    }).then((response) => {
        for (let i:number = 0; i < response.data.data.length; i++) {
            let text = response.data.data[i].text

            // Table name and data for table
            var params = {
                TableName: "Tweets",
                Item: {
                    TeamName: teamCode,
                    TweetID: i.toString(),
                    Text: text
                }
            };
            //Store data in DynamoDB and handle errors
            dClient.put(params, function(err, data) {
                if (err) {
                    console.error("Unable to add item");
                    console.error("Error JSON:", JSON.stringify(err));
                } else {
                    console.log("Tweets added to table!");
                }
            });
        }
    }).catch((error) => {
        console.log(error)
    });
}