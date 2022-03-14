const express = require("express")
var sql = require("mssql");
const cron = require("node-cron");
const fs = require("fs");
require('dotenv').config();
const url = require("url");
const path = require("path");
const request = require("request");
const _cliProgress = require("cli-progress");

var app = express()
var port = process.env.PORT
var dbHost = process.env.DB_HOST
var dbUserId = process.env.DB_USER
var dbPass = process.env.DB_PASS
var db = process.env.DB_DATABASE

app.get("/", function (req, res) {

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
        // var querySQL = "SELECT TOP 100 * FROM Tbl_Ren_Paper_Post WHERE NULLIF(post_mime_type, ' ') IS NOT NULL ORDER BY id asc"
        var querySQL = "SELECT * FROM Tbl_Ren_Paper_Post WHERE NULLIF(post_mime_type, ' ') IS NOT NULL ORDER BY id asc"
        request.query(querySQL, function (err, result, fields) {
            
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            }

            const download = (url, filename, callback) => {

                const progressBar = new _cliProgress.SingleBar({
                    format: '{bar} {percentage}% | ETA: {eta}s'
                }, _cliProgress.Presets.shades_classic);
            
                const file = fs.createWriteStream(filename);
                let receivedBytes = 0
                
            
                request.get(url)
                .on('response', (response) => {
                    if (response.statusCode !== 200) {
                        return callback('Response status was ' + response.statusCode);
                    }
            
                    const totalBytes = response.headers['content-length'];
                    progressBar.start(totalBytes, 0);
                })
                .on('data', (chunk) => {
                    receivedBytes += chunk.length;
                    progressBar.update(receivedBytes);
                })
                .pipe(file)
                .on('error', (err) => {
                    fs.unlink(filename);
                    progressBar.stop();
                    return callback(err.message);
                });
            
                file.on('finish', () => {
                    progressBar.stop();
                    file.close(callback);
                });
            
                file.on('error', (err) => {
                    fs.unlink(filename); 
                    progressBar.stop();
                    return callback(err.message);
                });
            }

            // Creating a cron job which runs on every 10 minute
            cron.schedule("*/10 * * * *", function() {
                result.recordset.forEach(item => {
                    try {
                        (async () => {
                            console.log("'"+item.guid+"'");
                            const urlObject = new URL(item.guid);
                            const protocol = urlObject.protocol;
                            
                            var parsed = url.parse(item.guid);
                            const fileName = path.basename(parsed.pathname);
                            console.log(fileName);
                            const filePath = `${__dirname}/file/` + fileName; 
                            console.log(filePath);

                            // const fileUrl = `https://unsplash.com/photos/FHo4labMPSQ/download`;
                            download(item.guid, filePath, () => {});

                            // if (protocol.includes("http")) {
                            //     http.get(item.guid, (response) => {
                            //         const filePathCreate = fs.createWriteStream(filePath);
    
                            //         response.pipe(filePathCreate);
                            //         filePathCreate.on('finish',() => {
                            //             filePathCreate.close();
                            //             console.log('Download Completed'); 
                            //         })
                            //     })
                            // } else {
                            //     https.get(item.guid, (response) => {
                            //         const filePathCreate = fs.createWriteStream(filePath);
    
                            //         response.pipe(filePathCreate);
                            //         filePathCreate.on('finish',() => {
                            //             filePathCreate.close();
                            //             console.log('Download Completed'); 
                            //         })
                            //     })
                            // }

                        })();
                    } catch (e) {
                        console.log(e)
                    }
                });
                
                // Data to write on file
                let data = `${new Date().toUTCString()} : Server is working\n`;

                // Appending data to logs.txt file
                fs.appendFile("logs.txt", data, function(errFile) {

                    if (errFile){
                        console.log(errFile);
                        // throw errFile;  
                    } 

                    // console.log("running a task every 10 second");
                    console.log(data);
                });
            });

            res.status(200).json(result.recordset);
        });
    });
    
})

app.listen(port, function () {
    console.log("Started http://localhost:%d", port)
});