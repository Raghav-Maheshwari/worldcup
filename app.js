var express = require('express');
var knex = require('knex');

//create new app:
var app = express();


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