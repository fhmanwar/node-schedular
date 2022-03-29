const express = require("express")
var sql = require("mssql");
const cron = require("node-cron");
const fs = require("fs");
require('dotenv').config();
const url = require("url");
const path = require("path");
const https = require('https');
const http = require('http');
const _cliProgress = require("cli-progress");
const downloader = require('download');
const request = require("request");

var app = express()
var port = process.env.PORT
var dbHost = process.env.DB_HOST
var dbUserId = process.env.DB_USER
var dbPass = process.env.DB_PASS
var db = process.env.DB_DATABASE

// config for your database
var config = {
    user: dbUserId,
    password: dbPass,
    server: dbHost, 
    database: db,
    synchronize: true,
    trustServerCertificate: true,
};

// var download = function(url, dest, callback){

//     request.get(url)
//     .on('error', function(err) {console.log(err)} )
//     .pipe(fs.createWriteStream(dest))
//     .on('close', callback);

// };

// connect to your database
sql.connect(config, function (err) {

    if (err) console.log(err);

    // create Request object
    var sqlRequest = new sql.Request();
    
    var id = 0;
    var title, category, getUrl =null;
    var arrData =[];
    // Creating a cron job which runs on every 10 minute
    cron.schedule("* * * * *", function() {

        var queryCheck = `select * from tbl_ren_paper_FileDownloader where post_id=${id}`;
        sqlRequest.query(queryCheck, function (err, resultCheck, fieldCheck) {
            console.log(resultCheck.recordset);

            // query to the database and get the records
            var querySQL = null;
            console.log(id);
            if (resultCheck.recordset == null) {
            // if (id == 0) {
                querySQL = `select top(10) a.id, a.post_id, a.post_date, a.post_title, a.[guid], b.name 
                            from tbl_ren_paper_post a join tbl_ren_paper_post_taxonomy b on a.post_id = b.post_id 
                            where b.taxonomy = 'category' 
                            order by a.post_id asc`;
            } else {
                querySQL = `select top(10) a.id, a.post_id, a.post_date, a.post_title, a.[guid], b.name 
                            from tbl_ren_paper_post a join tbl_ren_paper_post_taxonomy b on a.post_id = b.post_id 
                            where b.taxonomy = 'category' and a.post_id > ${id} 
                            order by a.post_id asc`;
            }

            sqlRequest.query(querySQL, function (err, result, fields) {
                if (err) {
                    console.log(err);
                    // res.sendStatus(500);
                    return;
                }

                // 'http://bniforum.bni.co.id/paper1/wp-content/uploads/2022/02/MARKETSHARE-DPK-NOVEMBER-2021.pdf'
                
                result.recordset.forEach(item => {
                    var uri = 'http://bniforum.bni.co.id/paper1/wp-content/uploads/'+item.guid;
                    (async () => {
                        await downloader(uri, './file');
                    })();
                    arrData.push(uri);
                    id = item.post_id;
                    title = item.post_title;
                    category = item.name;
                    getUrl = uri;
                });
                console.log(id);
                console.log(title);
                console.log(category);
                console.log(getUrl);
                console.log(arrData);  

                // res.status(200).json(result.recordset);
                // console.log(result.recordset);
            });

        });
            
        // Data to write on file
        // let data = `${new Date().toUTCString()} : Server is working\n`;
        // let data = `${new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })} : Server is working\n`;
        let data = `${new Date().toString()} : Server is working\n`;

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

});