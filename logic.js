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

    //Update scores to zero:
    let connection = connect();
    connection('Countries').update({
        Country_points: 0
    }).then(function(rows) {

    });


    http.get('http://worldcup.sfg.io/matches?by_date=asc', function(res) {
        var body = '';

        res.on('data', function(chunk) {
            body += chunk;
        });

        res.on('end', function() {
            var data = JSON.parse(body);
            
            var matches = []

            for (x in data) {
                if (data[x].status == 'completed') {
                    
                    var match = {
                    status: data[x].status,
                    winner: data[x].winner,
                    teamA: data[x].home_team.country,
                    teamB: data[x].away_team.country,
                    date: data[x].datetime.slice(0,10)
                    }
                    
                    matches.push(match);
                }
            }

            fn(matches);
            
        });

    }).on('error', function(e) {
            console.log("Got an error: ", e);
    });

}


var updateTable = function(object) {

    //console.log('test match', object);
    var testmatch = object;

    let connection = connect();
    connection.select().from('countries').where({
            Country_name: testmatch.teamA
        }).orWhere({
            Country_name: testmatch.teamB
        }).then(function(rows) {
        
            var teams_playing = rows;
            console.log(teams_playing);

            var draw = true;

            var winner, loser;

            if (testmatch.winner != 'Draw') {
                var draw = false;

                winner = testmatch.winner;
                
                if (testmatch.winner = testmatch.teamA) {
                    loser = testmatch.teamB;
                } else {
                    loser = testmatch.teamA;
                }

                var winner_cost, loser_cost, winner_points;

              
                
                for (x in teams_playing) {
                    let team = teams_playing[x];
                    //console.log('in for loop!:', team.Country_name);
                    
                    if (team.Country_name == winner) {
                        winner_cost = team.Cost;
                        winner_points = team.Country_points;
                    } else {
                        loser_cost = team.Cost;
                    }

                    // if (teams_playing[x].Country_name == winner) {
                    // } else {

                    // }

                    // if (teams_playing[x].Country_name == winner) {
                    //     winner_cost = teams_playing[x].Cost;
                    //     winner_points = teams_playing[x].Points;
                    // } else if (teams_playing[x].Country_name == loser) {
                    //     loser_cost = teams_playing[x].Cost; 
                    // }
                }

                console.log('winner_cost:', winner_cost, 'loser_cost', loser_cost);

                var upset, points_to_winner;

                if (winner_cost < loser_cost) {
                    //we have an upset on our hands:
                    points_to_winner = ((loser_cost/winner_cost) * 3)
                } else {
                    points_to_winner = 3;
                }

                //console.log('points to winner:', points_to_winner);

            } else {
                var points_given = 1;
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
                
                var teamA = teams_playing[0].Country_name;
                var teamB = teams_playing[1].Country_name;

                var teamA_cost = teams_playing[0].Cost;
                var teamB_cost = teams_playing[1].Cost;

                if (teamA_cost < teamB_cost) {
                    connection('countries').where({
                        Country_name: teamA
                    }).update({
                        Country_points: (1*(teamB_cost/teamA_cost))
                    }).then(function(rows) {
                        console.log('database updated draw:', teamA);
                    });

                    connection('countries').where({
                        Country_name: teamB
                    }).update({
                        Country_points: 1
                    }).then(function(rows) {
                        console.log('database updated draw:', teamB);
                    });

                } else {
                    connection('countries').where({
                        Country_name: teamB
                    }).update({
                        Country_points: (1*(teamA_cost/teamB_cost))
                    }).then(function(rows) {
                        console.log('database updated draw:', teamB);
                    });

                    connection('countries').where({
                        Country_name: teamA
                    }).update({
                        Country_points: 1
                    }).then(function(rows) {
                        console.log('database updated draw:', teamA);
                    });
                }
            }

        }, function() {
            console.log('error');
        });


}


function getUsers(fn) {
    let connection = connect();
    let promise = connection.select()
        .from('user_countries').innerJoin('users', 'user_countries.UserID', '=', 'users.UserID')
        .innerJoin('countries', 'user_countries.CountryID', '=', 'countries.CountryID');

    promise.then(function(users) {
    
        fn(users);
    });
}


function runLogic() {

    getMatches(function(matches) {

        //console.log(matches);
        for (i in matches) {
            updateTable(matches[i]);
        }

    });


    getUsers(function(users) {
    
        var user_objects = [];


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

        console.log(user_objects);

        let connection = connect();

        //update the database:
        for (x in user_objects) {
            connection('users').where({
                UserID: user_objects[x].user_id
            }).update({
                Points: user_objects[x].running_points
            }).then(function(rows){
                console.log('user table updated');
            });
        }
    });

}


runLogic();

module.exports = {
    logic: runLogic()
}
