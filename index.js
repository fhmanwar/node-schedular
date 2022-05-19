const express = require("express")
var sql = require("mssql");
const cron = require("node-cron");
const fs = require("fs");
require('dotenv').config();
const downloader = require('download');
const url = require("url");
const path = require("path");
const uuid = require("uuid");

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

// connect to your database
sql.connect(config, function (err) {

    if (err) console.log(err);

    // create Request object
    var sqlRequest = new sql.Request();
    
    //Declare Variable
    var id = 0;
    var title, category, getUrl =null;
    var arrData =[];

    // Creating a cron job which runs on every 1 minute
    cron.schedule("*/2 * * * *", function() {

        (async () => {
            await new Promise(resolve => setTimeout(resolve, 60000));
        })();
        // new Promise(resolve => setTimeout(resolve, 1000));

        var queryLastId = `select value from Tbl_SystemParameter WHERE [Key] = 'lastReportId' `;
        sqlRequest.query(queryLastId, function (err, resultLastId, fields) {
            try {
                id = resultLastId.recordset[0].value;
                // console.log(categoryId);
            } catch (error) {
                console.log(error);
            }
        });
        console.log(id);

        // Check Data from Database 
        var queryCheck = `select * from tbl_ren_paper_FileDownloader where post_id=${id}`;
        sqlRequest.query(queryCheck, function (err, resultCheck, fieldCheck) {
            // console.log(resultCheck.recordset);

            var querySQL = null;
            // console.log(id);

            // check jika data dari database sudah ada
            if (resultCheck.recordset == null) {
            // if (id == 0) {
                querySQL = `select top(2) a.id, a.post_id, a.post_date, a.post_title, a.[guid], b.name 
                            from tbl_ren_paper_post a join tbl_ren_paper_post_taxonomy b on a.post_id = b.post_id 
                            where b.taxonomy = 'category' and guid not like '%http%'
                            order by a.post_id asc`;
            } else {
                querySQL = `select top(2) a.id, a.post_id, a.post_date, a.post_title, a.[guid], b.name 
                            from tbl_ren_paper_post a join tbl_ren_paper_post_taxonomy b on a.post_id = b.post_id 
                            where b.taxonomy = 'category' and guid not like '%http%' and a.post_id > ${id} 
                            order by a.post_id asc`;
            }

            sqlRequest.query(querySQL, function (err, result, fields) {
                if (err) {
                    console.log(err);
                    // res.sendStatus(500);
                    return;
                }
                
                // loop hasil data yang di dapatkan
                result.recordset.forEach(item => {
                    try {
                        // var uri = 'http://bniforum.bni.co.id/paper1/wp-content/uploads/'+item.guid;
                        var uri = '';
                        if (item.guid.includes('http') && item.guid.includes('.pdf')) {
                            uri = item.guid;
                        } else {
                            uri = 'http://bniforum.bni.co.id/paper1/wp-content/uploads/'+item.guid;
                        }
                        console.log(uri);
                        var parsed = url.parse(uri);
                        var fileName = path.basename(parsed.pathname);
                        // console.log(fileName);
                        var extFile = fileName.split('.');
                        var fileType = '.'+extFile[1];
                        // console.log(fileType);
                        // var pathFile = '\\file\\'+fileName;
    
                        // check categori Id dari database
                        var categoryId = 0;
                        var queryCatId = `select id from Tbl_Master_Category WHERE Name LIKE '%${item.name}%'`;
                        sqlRequest.query(queryCatId, function (err, resultCatId, fields) {
                            try {
                                categoryId = resultCatId.recordset[0].id;
                                // console.log(categoryId);
                            } catch (error) {
                                console.log(error);                            
                            }
                        });
    
                        var date_ob = new Date();
                        var categoryName = item.name.replace("'", "");
                        var uniqueId = uuid.v4();
                        var pathFile = 'bniforum/'+fileName;
                        var pool = sql.connect(config);

                        (async () => {
                            // Download File dari database
                            await downloader(uri, './file')
                            .then(() => {
                                console.log('Download Completed');
                                (async () => {
                                    (await pool).request()
                                        .input('title', sql.VarChar(150), item.post_title)
                                        .input('fileName', sql.VarChar(150), fileName)
                                        .input('fileType', sql.VarChar(150), fileType)
                                        .input('path', sql.VarChar(150), pathFile)
                                        .input('uploadDate', sql.DateTime, item.post_date)
                                        .input('categorySource', sql.Int, 1)
                                        .input('categoryId', sql.Int, categoryId)
                                        .input('categoryName', sql.VarChar(150), categoryName)
                                        .input('createdAt', sql.DateTime, date_ob)
                                        .input('isDeleted', sql.Bit, 0)
                                        .input('isActive', sql.Bit, 1)
                                        .input('sourceDownload', sql.Int, 2)
                                        .input('TotalchunkNumber', sql.Int, 0)
                                        // .input('UniqueId', sql.VarChar(150), uniqueId)
                                        .query('INSERT INTO Report ( Title, FileName, FileType, Path, UploadTime, CategorySourceId, CategoryId, CategoryName, CreatedTime, IsDeleted, IsActive, ChunkNumber, SourceDownloadId) VALUES ( @title, @fileName, @fileType, @path, @uploadDate, @categorySource, @categoryId, @categoryName, @createdAt, @isDeleted, @isActive, @TotalchunkNumber, @sourceDownload )');
                                                                                                                    
                                })();
                            })
                            .catch((error) => {
                                (async () => {
                                    console.log('Download not Completed');
                                    (await pool).request()
                                        .input('postId', sql.Int, item.post_id)
                                        .input('title', sql.VarChar(150), item.post_title)
                                        .input('category', sql.VarChar(150), categoryName)
                                        .input('url', sql.Text, uri)
                                        .input('createdAt', sql.DateTime, date_ob)
                                        .input('isDeleted', sql.Bit, 0)
                                        .input('msg', sql.VarChar(255), error.message)
                                        .query('INSERT INTO Report_LogFileDownloader ( post_id, post_title, category, url, created_at, isDeleted, msg) VALUES ( @postId, @title, @category, @url, @createdAt, @isDeleted, @msg )');
        
                                })();
                            });
                        })();
                    } catch (error) {
                        console.log(error);
                        (async () => {
                            console.log('Download not Completed');
                            var uri = 'http://bniforum.bni.co.id/paper1/wp-content/uploads/'+item.guid;
                            var categoryName = item.name.replace("'", "");
                            var date_ob = new Date();
                            (await pool).request()
                                .input('postId', sql.Int, item.post_id)
                                .input('title', sql.VarChar(150), item.post_title)
                                .input('category', sql.VarChar(150), categoryName)
                                .input('url', sql.Text, uri)
                                .input('createdAt', sql.DateTime, date_ob)
                                .input('isDeleted', sql.Bit, 0)
                                .input('msg', sql.VarChar(255), error.message)
                                .query('INSERT INTO Report_LogFileDownloader ( post_id, post_title, category, url, created_at, isDeleted, msg) VALUES ( @postId, @title, @category, @url, @createdAt, @isDeleted, @msg )');

                        })();
                    }
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
                // console.log(arrData);

                var pool = sql.connect(config);
                (async () => {
                    console.log('update Table System Parameter');
                    (await pool).request()
                        .input('Id', sql.Int, id)
                        .query(`UPDATE Tbl_SystemParameter set [Value] = @Id where [Key] = 'lastReportId'`);
                })();
            });

        });
           
        // log file untuk cron schedular
        let data = `${new Date().toString()} : Server is working\n`;

        // Appending data to logs.txt file
        fs.appendFile("logs.txt", data, function(errFile) {

            if (errFile){
                console.log(errFile);
            } 

            console.log(data);
        });

    }); //end cron

});