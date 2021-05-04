let axios = require("axios");
let date = new Date();
let dd = String(date.getDate()).padStart(2, '0');
let mm = String(date.getMonth() + 1).padStart(2, '0'); //January is 0
let yyyy = date.getFullYear();

//aws credentials 
let AWS = require("aws-sdk");
AWS.config.region = 'us-east-1'; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'us-east-1:8f47235d-86d6-40fc-adbd-cd9a13cbb8ca',
});

//team names and their api id
let teamNames:Array<string> = ["ManCity", "ManUtd", "Liverpool", "Chelsea", "Arsenal"]
let teamIds:Array<number> = [65, 66, 64, 61, 57];

let finalDate:string = yyyy + '-' + mm + '-' + dd;
let dateAppend:string = '-' + mm + '-' + dd;

//create new DocumentClient
var documentClient = new AWS.DynamoDB.DocumentClient();

//array to store matches and results
let matchesArray = []
let processedMatches = []

//id of the team to update. Change this number between 0 and 4 to update the respective results of that team. e.g. ManUtd is 1
let x:number = 0;

//urls for the api
let url:string = 'http://api.football-data.org/v2/teams/' + teamIds[x] + '/matches?competitions=2021&status=FINISHED&dateFrom=' + (yyyy - 3) + dateAppend + '&dateTo=' + (yyyy - 1) + dateAppend;
let url2:string = 'http://api.football-data.org/v2/teams/' + teamIds[x] + '/matches?competitions=2021&status=FINISHED&dateFrom=' + (yyyy - 1) + dateAppend + '&dateTo=' + finalDate;

axios.get(url, { responseType: 'json', headers: { 'X-Auth-Token': 'f830cab7316b4464bb59f7a9a6e30380' } })
    .then((response) => {
        for (let i = 0; i < response.data.matches.length; i++) {
            matchesArray.push(response.data.matches[i])
        }
        axios.get(url2, { dataType: 'json', headers: { 'X-Auth-Token': 'f830cab7316b4464bb59f7a9a6e30380' } })
            .then((response) => {
                for (let i:number = 0; i < response.data.matches.length; i++) {
                    matchesArray.push(response.data.matches[i])
                }
                //getting latest 100 matches
                let numToRemove:number = matchesArray.length - 100; //removing matching beyond 100
                for (let y:number = 0; y < numToRemove; y++) {
                    matchesArray.shift();
                }
                //getting match result by substracting the opposition score from the team score
                for (let i:number = 0; i < matchesArray.length; i++) {
                    if (matchesArray[i].homeTeam.id == teamIds[x]) //when the team is the home team
                        processedMatches.push(matchesArray[i].score.fullTime.homeTeam - matchesArray[i].score.fullTime.awayTeam);
                    else processedMatches.push(matchesArray[i].score.fullTime.awayTeam - matchesArray[i].score.fullTime.homeTeam); //when the team is away
                }
                //saving data to dynamodb
                for (let i:number = 0; i < processedMatches.length; i++) {
                    //Table name and data for table
                    var params = {
                        TableName: "Matches",
                        Item: {
                            TeamName: teamNames[x],
                            TimeId: i,
                            Result: processedMatches[i]
                        }
                    };
                    //Store data in DynamoDB and handle errors
                    documentClient.put(params, function(err, data) {
                        if (err) {
                            console.error("Unable to add item");
                            console.error("Error JSON:", JSON.stringify(err));
                        } else {
                            console.log("Match Details for " + teamNames[x] + " match no." + i + " added to table!");
                        }
                    });
                }
            })
    });