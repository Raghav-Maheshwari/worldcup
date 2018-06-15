const http = require('http');
var jsonQuery = require('json-query');

var knex = require('knex');

function connect() {
    let connection = knex({
        client: 'sqlite3',
        connection: {
            filename: './database.sqlite'
        }
    });

    return connection;

}

function getMatches(fn) {

    http.get('http://worldcup.sfg.io/matches/today', function(res) {
        var body = '';

        res.on('data', function(chunk) {
            body += chunk;
        });

        res.on('end', function() {
            var data = JSON.parse(body);
            
            var matches = []

            for (x in data) {
                var match = {
                    status: data[x].status,
                    winner: data[x].winner,
                    teamA: data[x].home_team.country,
                    teamB: data[x].away_team.country
                }
                matches.push(match);
            }

            fn(matches);
            
        });

    }).on('error', function(e) {
            console.log("Got an error: ", e);
    });

}

getMatches(function(matches){
    console.log(matches[0]);
});

















// let connection = connect();
//             connection.select().from('countries').where({
//                 Country_name: match.teamA
//             }).orWhere({
//                 Country_name: match.teamB
//             }).then(function(rows) {
                
//                 var teams_played = rows;

//                 console.log(teams_played);
//             });