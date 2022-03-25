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
        // var querySQL = "SELECT TOP 100 * FROM Tbl_Ren_Paper_Post WHERE NULLIF(post_mime_type, ' ') IS NOT NULL ORDER BY id asc"
        // var querySQL = "SELECT * FROM Tbl_Ren_Paper_Post WHERE NULLIF(post_mime_type, ' ') IS NOT NULL ORDER BY id asc"

        // var querySQL = "select a.post_date, a.post_title, a.[guid], b.name from tbl_ren_paper_post a join tbl_ren_paper_post_taxonomy b on a.post_id = b.post_id where b.taxonomy = 'category' order by a.post_date desc"
        var querySQL = "select top(10) a.post_date, a.post_title, a.[guid], b.name from tbl_ren_paper_post a join tbl_ren_paper_post_taxonomy b on a.post_id = b.post_id where b.taxonomy = 'category' order by a.post_date desc"
        sqlRequest.query(querySQL, function (err, result, fields) {
            
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            }

            // const download = (url, filename, callback) => {

            //     const progressBar = new _cliProgress.SingleBar({
            //         format: '{bar} {percentage}% | ETA: {eta}s'
            //     }, _cliProgress.Presets.shades_classic);
            
            //     const file = fs.createWriteStream(filename);
            //     let receivedBytes = 0
                
            
            //     request.get(url)
            //     .on('response', (response) => {
            //         if (response.statusCode !== 200) {
            //             return callback('Response status was ' + response.statusCode);
            //         }
            
            //         const totalBytes = response.headers['content-length'];
            //         progressBar.start(totalBytes, 0);
            //     })
            //     .on('data', (chunk) => {
            //         receivedBytes += chunk.length;
            //         progressBar.update(receivedBytes);
            //     })
            //     .pipe(file)
            //     .on('error', (err) => {
            //         fs.unlink(filename);
            //         progressBar.stop();
            //         return callback(err.message);
            //     });
            
            //     file.on('finish', () => {
            //         progressBar.stop();
            //         file.close(callback);
            //     });
            
            //     file.on('error', (err) => {
            //         fs.unlink(filename); 
            //         progressBar.stop();
            //         return callback(err.message);
            //     });
            // }

            async function downloadPDF(pdfURL, outputFilename) {
                let pdfBuffer = await request.get({uri: pdfURL, encoding: null});
                console.log("Writing downloaded PDF file to " + outputFilename + "...");
                // fs.writeFileSync(outputFilename, pdfBuffer);
                fs.writeFileSync(outputFilename, JSON.stringify(pdfBuffer));
            }
            // 'http://bniforum.bni.co.id/paper1/wp-content/uploads/2022/02/MARKETSHARE-DPK-NOVEMBER-2021.pdf'
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
                downloadPDF(uri, filePath);
                // if (protocol.includes("http")) {
                //     http.get(uri, (response) => {
                //         const filePathCreate = fs.createWriteStream(filePath);

                //         response.pipe(filePathCreate);
                //         filePathCreate.on('finish',() => {
                //             filePathCreate.close();
                //             console.log('Download Completed'); 
                //         })
                //     })
                // } else {
                //     https.get(uri, (response) => {
                //         const filePathCreate = fs.createWriteStream(filePath);

                //         response.pipe(filePathCreate);
                //         filePathCreate.on('finish',() => {
                //             filePathCreate.close();
                //             console.log('Download Completed'); 
                //         })
                //     })
                // }
            })

            // result.recordset.forEach(item => {
            //     try {
            //         var uri = 'http://bniforum.bni.co.id/paper1/wp-content/uploads/'+item.guid;
            //         console.log("'"+uri+"'");

            //         let encoded = encodeURI(uri);

            //         // console.log("'"+item.guid+"'");
            //         const urlObject = new URL(uri);
            //         const protocol = urlObject.protocol;
                    
            //         // var parsed = url.parse(item.guid);
            //         var parsed = url.parse(uri);
            //         const fileName = path.basename(parsed.pathname);
            //         console.log(fileName);
            //         const filePath = `${__dirname}/file/` + fileName; 
            //         console.log(filePath);

            //         // const fileUrl = `https://unsplash.com/photos/FHo4labMPSQ/download`;
            //         // download(uri, filePath, () => {});
                    
            //         // (async () => {
            //             var options = {
            //                 host: 'http://bniforum.bni.co.id',
            //                 path: '/paper1/wp-content/uploads/'+item.guid
            //             }

            //             if (protocol.includes("http")) {
            //                 http.get(options, (response) => {
            //                     const filePathCreate = fs.createWriteStream(filePath);

            //                     response.pipe(filePathCreate);
            //                     filePathCreate.on('finish',() => {
            //                         filePathCreate.close();
            //                         console.log('Download Completed'); 
            //                     })
            //                 })
            //             } else {
            //                 https.get(options, (response) => {
            //                     const filePathCreate = fs.createWriteStream(filePath);

            //                     response.pipe(filePathCreate);
            //                     filePathCreate.on('finish',() => {
            //                         filePathCreate.close();
            //                         console.log('Download Completed'); 
            //                     })
            //                 })
            //             }

            //         // })();
            //     } catch (e) {
            //         console.log(e)
            //     }
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

            res.status(200).json(result.recordset);
        });
    });
    
})

app.listen(port, function () {
    console.log("Started http://localhost:%d", port)
});