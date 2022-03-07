const express = require("express")
var sql = require("mssql");
const downloader = require('download');
const cron = require("node-cron");
const fs = require("fs");
require('dotenv').config();

var app = express()
var port = process.env.PORT
var dbHost = process.env.DB_HOST
var dbUserId = process.env.DB_USER
var dbPass = process.env.DB_PASS
var db = process.env.DB_DATABASE

app.get("/", function (req, res) {
    // response.send("Hello World!")

    // config for your database
    var config = {
        user: dbUserId,
        password: dbPass,
        server: dbHost, 
        database: db,
        synchronize: true,
        trustServerCertificate: true,
    };

    // connect to your database
    sql.connect(config, function (err) {
    
        if (err) console.log(err);

        // create Request object
        var request = new sql.Request();
           
        // query to the database and get the records
        var querySQL = "SELECT * FROM Tbl_Ren_Paper_Post WHERE NULLIF(post_mime_type, ' ') IS NOT NULL"
        request.query(querySQL, function (err, result, fields) {
            
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            }

            // send records as a response
            // res.send(recordset);
            // res.send(result.recordset.guid);

            // Object.keys(result.recordsets).forEach(function(key) {
            //     var row = result.recordsets[key];
            //     console.log(row.guid)
            // });

            // get an array of all
            result.recordset.map(function (item) {
                try {
                    console.log(item.guid);
                    (async () => {
                        // await downloader(url, './file');
                        await Promise.all([
                            item.guid,
                        ].map(url => downloader(url, './file')));
                    })();
                } catch (e) {
                    console.log(e)
                }
                
            });

            // Creating a cron job which runs on every 10 second
            // cron.schedule("*/10 * * * * *", function() {
            // Creating a cron job which runs on every minute
            cron.schedule("* * * * *", function() {

                result.recordset.map(function (item) {
                    try {
                        console.log(item.guid);
                        (async () => {
                            // await downloader(url, './file');
                            await Promise.all([
                                item.guid,
                            ].map(url => downloader(url, './file')));
                        })();
                    } catch (e) {
                        console.log(e)
                    }
                    
                });
                
                // Data to write on file
                let data = `${new Date().toUTCString()} : Server is working\n`;

                // Appending data to logs.txt file
                fs.appendFile("logs.txt", data, function(err) {

                    if (err) throw err;

                    // console.log("running a task every 10 second");
                    console.log(data);
                });
            });

            // // do sth with every item:
            // result.recordset.forEach(function(item) {
            //     console.log(item.guid);
            // });

            // const url = `https://acquirebase.com/img/logo.png`;
            // const url = 'http://africau.edu/images/default/sample.pdf';
            // (async () => {
            //     // await downloader(url, './file');
            //     await Promise.all([
            //         `https://acquirebase.com/img/logo.png`,
            //         `https://acquirebase.com/img/icon.png`,
            //         'http://africau.edu/images/default/sample.pdf',
            //     ].map(url => downloader(url, './file')));
            // })();

            res.status(200).json(result.recordset);
            // res.status(200);
        });
    });
    
})

app.listen(port, function () {
    console.log("Started http://localhost:%d", port)
});