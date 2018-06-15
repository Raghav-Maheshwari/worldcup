var express = require('express');
var knex = require('knex');

//create new app:
var app = express();

//GET request for users:
app.get('/users', function(request, response) {
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