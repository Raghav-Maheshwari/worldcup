const http = require('http');
var jsonQuery = require('json-query');
var knex = require('knex');
var async = require('async');

var series = require('async/series');


function connect() {
    let connection = knex({
        client: 'sqlite3',
        connection: {
            filename: './database.sqlite'
        }
    });

    return connection;
}

function logic() {

    let connection = connect();
    var matches = [];

    // async.series(tasks, callback) runs all the 'tasks' collection in series -
    // each running once the previous function has completed
    async.series([
        function(callback) {
            //Update scores to zero:
            connection('Countries').update({
                Country_points: 0
            }).then(function(rows) {
                console.log('Database cleared');
                callback(null);
            });
        },

        function(callback) {
            //close the database:
            connection.destroy();   

            const options = {
                hostname: 'worldcup.sfg.io',
                path: '/matches?by_date=asc'
            }


            http.get(options, function(res) {
                // function(res) called when connection is established
                var body = '';

                res.on('data', function(chunk) {
                    // on('data') called when there's a chunk of data (this will almost certainly be more than once)
                    // since we know data is coming in as a string anways, let's concatenate the chunks into one string
                    body += chunk;
                });

                // listening to the stream's 'end' event
                res.on('end', function() {
                    
                    // parse data string into json object
                    var data = JSON.parse(body);
                    
                    for (x in data) {
                        if (data[x].status == 'completed') {       
                            // extract relevant attributes from data and place into a 'match' object
                            var match = {
                                winner: data[x].winner,
                                teamA: data[x].home_team.country,
                                teamB: data[x].away_team.country,
                                date: data[x].datetime.slice(0,10),
                                status: data[x].status,
                            }
                            
                            matches.push(match);
                        }
                    }
                    //pass matches into callback results array
                    callback(null, matches);
                });
            });

        }
    ], function(err, results) {
        //results is now equal to matches[] array
        let connection = connect();

        // Applies the function(match,callback) for each item in 'matches', but in series (instead of parallel)
        // This ensures that the matches are parsed in order
        async.forEachSeries(matches, function(match, callback) {
            console.log('current match:', match);

            connection.select().from('countries').where({
                Country_name: match.teamA
            }).orWhere({
                Country_name: match.teamB
            }).then(function(rows) {
                // We have a single game to look at:
                var teams = rows;
                console.log('teams:', teams);


                //Getting the date of match and comparing it WC dates for rounds:
                var match_date = new Date(match.date);
                var round16begin = new Date("2018-06-30");
                var round16end = new Date("2018-07-03");
                var quarterbegin = new Date("2018-07-06");
                var quarterend = new Date("2018-07-07");
                var semibegin = new Date("2018-07-10");
                var semiend = new Date("2018-07-14");
                var final = new Date("2018-07-15");

                //console.log('date', match_date); 
                
                var winner, loser;
                var draw = true;
                if (match.winner != 'Draw') {
                    draw = false;

                    winner = match.winner;
                    
                    if (match.winner = match.teamA) {
                        loser = match.teamB;
                    } else {
                        loser = match.teamA;
                    }

                    var winner_cost, loser_cost, winner_points;

                    for (x in teams) {
                        let team = teams[x];
                        if (team.Country_name == winner) {
                            winner_cost = team.Cost;
                            winner_points = team.Country_points;
                        } else {
                            loser_cost = team.Cost;
                        }
                    }

                    //console.log('winner_cost:', winner_cost, 'loser_cost', loser_cost);

                    var base_points;
                    if (match_date.getTime() < round16begin.getTime()) {
                        base_points = 3;
                    } else if (round16begin.getTime() <= match_date.getTime() && match_date.getTime() <= round16end.getTime()) {
                        base_points = 6;
                    } else if (quarterbegin.getTime() <= match_date.getTime() && match_date.getTime() <= quarterend.getTime()) {
                        base_points = 9;
                    } else if (semibegin.getTime() <= match_date.getTime() && match_date.getTime() <= semiend.getTime()) {
                        base_points = 12;
                    } else if (match_date.getTime() == final.getTime()) {
                        base_points = 15;
                    }   

                    var upset, points_to_winner;

                    if (winner_cost < loser_cost) {
                        //we have an upset on our hands:
                        points_to_winner = ((loser_cost/winner_cost) * base_points);
                        points_to_winner = Math.round(points_to_winner * 100) / 100;
                    } else {
                        points_to_winner = base_points;
                    }
                }

                //Now update the database:
                if (!draw) {
                    console.log('Awarding points:', points_to_winner, 'to team:', winner);

                    connection('countries').where({
                        Country_name: winner
                    }).update({
                        Country_points: points_to_winner + winner_points
                    }).then(function(rows) {
                        //console.log('rows', rows);
                        console.log('database updated');
                    });
                } else {
                    // we had a draw, but need to figure out who the underdog was
                    var teamA = teams[0];
                    var teamB = teams[1];

                    var teamA_cost = teams[0].Cost;
                    var teamB_cost = teams[1].Cost;

                    if (teamA_cost < teamB_cost) {
                        connection('countries').where({
                            Country_name: teamA.Country_name
                        }).update({
                            Country_points: teamA.Country_points +  Math.round((1*(teamB_cost/teamA_cost)) * 100 ) / 100
                        }).then(function(rows) {
                            console.log('database updated draw:', teamA);
                        });

                        connection('countries').where({
                            Country_name: teamB.Country_name
                        }).update({
                            Country_points: teamB.Country_points + 1
                        }).then(function(rows) {
                            console.log('database updated draw:', teamB);
                        });

                    } else {
                        connection('countries').where({
                            Country_name: teamB.Country_name
                        }).update({
                            Country_points: teamB.Country_points + Math.round((1*(teamA_cost/teamB_cost)) * 100) / 100
                        }).then(function(rows) {
                            console.log('database updated draw:', teamB);
                        });

                        connection('countries').where({
                            Country_name: teamA.Country_name
                        }).update({
                            Country_points: teamA.Country_points + 1
                        }).then(function(rows) {
                            console.log('database updated draw:', teamA);
                        });
                    }
                }

                callback(null);
            });
        }, function(err) {
            //all matches have been looked at. Now update the points for each user
            var user_objects = [];
            
            connection.select()
            .from('user_countries').innerJoin('users', 'user_countries.UserID', '=', 'users.UserID')
            .innerJoin('countries', 'user_countries.CountryID', '=', 'countries.CountryID')
            .then(function(users) {

            //users object is a nested object for each user, we have a list of countries they chose for their bracket
                for (var i=1; i < 10; i++) {
                    var running_total = 0;
                    var country_list = [];
                    var Name = "";
                    for (j in users) {
                        if (users[j].UserID == i) {
                            running_total += users[j].Country_points;
                            country_list.push(users[j].Country_name);
                            Name = users[j].Name;
                        }

                    }
                    var user = {
                        user_id: i,
                        name: Name,
                        running_points: running_total,
                        countries: country_list
                    }

                    user_objects.push(user);
                }

                async.forEach(user_objects, function(user, callback) {
                    connection('users').where({
                        UserID: user.user_id
                    }).update({
                        Points: user.running_points
                    }).then(function(rows){
                        console.log('user updated');
                        callback(null);
                    });
                }, function(err) {
                    console.log('all users updated');
                    connection.destroy();
                });
            });
            console.log('All matches looked at sucessfully');
        });

    });
}

// enabling functiont to be called from external file
module.exports = {
    logic: logic()
}

