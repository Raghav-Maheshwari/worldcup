var express = require('express');
var knex = require('knex');

//create new app:
var app = express();

var router = express.Router();
var request = require('request');

var path = require('path');


// var CronJob = require('cron').CronJob;

// new CronJob('*****', function() {
//     var backend_logic = require('./logic');
//     backend_logic.logic;
//     console.log('logic has been run to update database');
// });


// var CronJob = require('cron').CronJob;
// new CronJob('0 0 */1 * * *', function() {
    
//     console.log(new Date(), 'Every 1 hours');
//         try {
//           // task to be executed
//           var backend_logic = require('./logic');
          
//           backend_logic.logic;
//         } catch (e) {
//             console.log(e);
//         }
//   }, function() {},
//   true
// );
// //app.use(express.static(__dirname + '/public'));
// app.get('/', function(request, response) {
//     response.sendFile(path.join(__dirname,'/index.html'));
// });

//GET request for homepage:
app.get('/',function(request, response) {
    var backend_logic = require('./logic');
    backend_logic.logic;
    response.sendFile(path.join(__dirname+ '/index.html'));
});


//GET request for users:
app.get('/api/users', function(request, response) {
    
    let connection = connect();
    let promise = connection.select().from('users').orderBy('Points', 'desc');

    promise.then(function(users) {
        //success:
        response.json(users);
    }, function() { 
        //error:
        response.json({
            error: 'Something went wrong when finding users'
        });
    });
});

//GET request for each  user's teams:
app.get('/api/users/:id', function(request, response) {
    //access url variable off of params:
    let id = request.params.id;

    let connection = connect();
    let promise = connection.select()
        .from('user_countries').where('user_countries.UserID', id).innerJoin('users', 'user_countries.UserID', '=', 'users.UserID')
        .innerJoin('countries', 'user_countries.CountryID', '=', 'countries.CountryID');

    promise.then(function(user) {
        console.log(user);

        user_picks = [];

        for (x in user) {
            var country = {
                country_name: user[x].Country_name,
                country_points: user[x].Country_points
            }
            user_picks.push(country);
        }
        response.json(user_picks);
    }, function() {
        response.json({
            error: 'Cannot find user' + id
        });
    });
});

//GET request for user_countries:
app.get('/api/user_countries', function(request, response) {
    let connection = connect();

    let promise = connection.select()
        .from('user_countries').innerJoin('users', 'user_countries.UserID', '=', 'users.UserID')
        .innerJoin('countries', 'user_countries.CountryID', '=', 'countries.CountryID');

    promise.then(function(users) {
        response.json(users);
    }, function(err) {
        response.json({
            error: err
        });
    });
});

//GET request for countries:
app.get('/api/countries', function(request, response) {
    let connection = connect();

    let promise = connection.select().from('countries').limit(10).orderBy('Country_points', 'desc');

    promise.then(function(countries) {
        //success:
        response.json(countries);
    }, function() {
        //error:
        response.json({
            error: 'Something went wrong when finding countries'
        });
    });
});


function connect() {
    let connection = knex({
        client: 'sqlite3',
        connection: {
            filename: './database.sqlite'
        }
    });

    return connection;

}

const port = process.env.PORT || 8000;

app.listen(port, function() {
    console.log(`Listening on port ${8000}`);

});