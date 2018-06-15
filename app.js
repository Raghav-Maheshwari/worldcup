var express = require('express');
var knex = require('knex');

//create new app:
var app = express();

var router = express.Router();
var request = require('request');

//GET request for users:
app.get('/api/users', function(request, response) {
    let connection = connect();

    let promise = connection.select().from('users');

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

//GET request for user_countries:
app.get('/api/user_countries', function(request, response) {
    let connection = connect();

    let promise = connection.select()
        .from('users').innerJoin('user_countries', 'users.UserID', '=', 'user_countries.UserID')
        .innerJoin('countries', 'user_countries.CountryID', '=', 'countries.CountryID');

    promise.then(function(users) {
        response.json(users);
    }, function() {
        response.json({
            error: 'something went wrong'
        });
    });
});

//GET request for countries:
app.get('/api/countries', function(request, response) {
    let connection = connect();

    let promise = connection.select().from('countries');

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