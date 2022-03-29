const express = require("express")
var sql = require("mssql");
const cron = require("node-cron");
const fs = require("fs");
require('dotenv').config();
const url = require("url");
const path = require("path");
const request = require("request");
const _cliProgress = require("cli-progress");
const downloader = require('download');
const https = require('https');
const http = require('http');

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
    var sqlRequest = new sql.Request();
       
    // query to the database and get the records
    var querySQL = "select a.id, a.post_id, a.post_date, a.post_title, a.[guid], b.name from tbl_ren_paper_post a join tbl_ren_paper_post_taxonomy b on a.post_id = b.post_id where b.taxonomy = 'category' order by a.post_date asc"
    sqlRequest.query(querySQL, function (err, result, fields) {
        
        if (err) {
            console.log(err);
            // res.sendStatus(500);
            return;
        }

        result.recordset.forEach(item => {
            var uri = 'http://bniforum.bni.co.id/paper1/wp-content/uploads/'+item.guid;
            const urlObject = new URL(uri);
            const protocol = urlObject.protocol;
            
            // var parsed = url.parse(item.guid);
            var parsed = url.parse(uri);
            const fileName = path.basename(parsed.pathname);
            console.log(fileName);
            const filePath = `${__dirname}/file/` + fileName; 
            console.log(filePath);
            if (protocol.includes("http")) {
                http.get(uri, (response) => {
                    const filePathCreate = fs.createWriteStream(filePath);

                    response.pipe(filePathCreate);
                    filePathCreate.on('finish',() => {
                        filePathCreate.close();
                        console.log('Download Completed'); 
                    })
                })
            } else {
                https.get(uri, (response) => {
                    const filePathCreate = fs.createWriteStream(filePath);

                    response.pipe(filePathCreate);
                    filePathCreate.on('finish',() => {
                        filePathCreate.close();
                        console.log('Download Completed'); 
                    })
                })
            }
        })
        // 'http://bniforum.bni.co.id/paper1/wp-content/uploads/2022/02/MARKETSHARE-DPK-NOVEMBER-2021.pdf'
        
        // result.recordset.forEach(item => {
        //     (async () => {
        //         var uri = 'http://bniforum.bni.co.id/paper1/wp-content/uploads/'+item.guid;
        //         await downloader(uri, './file');
        //     // await downloader(url, './file');
        //     // await Promise.all([
        //     //     // `https://acquirebase.com/img/logo.png`,
        //     //     // `https://acquirebase.com/img/icon.png`,
        //     //     // 'http://africau.edu/images/default/sample.pdf',
        //     // ].map(url => downloader(url, './file')));
        //     })();
        // });

        // Creating a cron job which runs on every 10 minute
        cron.schedule("* * * * *", function() {
            
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

        }); //end cron

        // res.status(200).json(result.recordset);
        console.log(result.recordset);
    });
});
    
})

app.listen(port, function () {
    console.log("Started http://localhost:%d", port)
});