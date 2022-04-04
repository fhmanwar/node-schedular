const express = require("express")
var sql = require("mssql");
const cron = require("node-cron");
const fs = require("fs");
require('dotenv').config();
const downloader = require('download');
const url = require("url");
const path = require("path");
const https = require('https');
const http = require('http');
const _cliProgress = require("cli-progress");
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
            // console.log(id);
            if (resultCheck.recordset == null) {
            // if (id == 0) {
                querySQL = `select top(100) a.id, a.post_id, a.post_date, a.post_title, a.[guid], b.name 
                            from tbl_ren_paper_post a join tbl_ren_paper_post_taxonomy b on a.post_id = b.post_id 
                            where b.taxonomy = 'category' 
                            order by a.post_id asc`;
            } else {
                querySQL = `select top(100) a.id, a.post_id, a.post_date, a.post_title, a.[guid], b.name 
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
                    var parsed = url.parse(uri);
                    var fileName = path.basename(parsed.pathname);
                    // console.log(fileName);
                    var extFile = fileName.split('.');
                    var fileType = '.'+extFile[1];
                    // console.log(fileType);
                    // var pathFile = '\\file\\'+fileName;

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
                    var day = ("0" + date_ob.getDate()).slice(-2);
                    var month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
                    var year = date_ob.getFullYear();
                    
                    var date = year + "-" + month + "-" + day;
                    // console.log(date);
                    
                    let postYear = item.post_date.getFullYear();
                    let postMonth = item.post_date.getMonth();
                    let postDay = item.post_date.getDate();
                    // let postHour = item.post_date.getHours();
                    // let postMinute = item.post_date.getMinutes();
                    var datePost = postYear + "-" + postMonth + "-" + postDay;
                    
                    var categoryName = item.name.replace("'", "");
                    var pool = sql.connect(config);
                    try {
                        (async () => {
                            await downloader(uri, './file')
                            .then(() => {
                                console.log('Download Completed');
                                (async () => {
                                    (await pool).request()
                                        .input('title', sql.VarChar(150), item.post_title)
                                        .input('fileName', sql.VarChar(150), fileName)
                                        .input('fileType', sql.VarChar(150), fileType)
                                        .input('path', sql.VarChar(150), fileName)
                                        .input('uploadDate', sql.DateTime, item.post_date)
                                        .input('categorySource', sql.Int, 1)
                                        .input('categoryId', sql.Int, categoryId)
                                        .input('categoryName', sql.VarChar(150), categoryName)
                                        .input('createdAt', sql.DateTime, date_ob)
                                        .input('isDeleted', sql.Bit, 0)
                                        .input('isActive', sql.Bit, 1)
                                        .query('INSERT INTO Report ( Title, FileName, FileType, Path, UploadTime, CategorySourceId, CategoryId, CategoryName, CreatedTime, IsDeleted, IsActive) VALUES ( @title, @fileName, @fileType, @path, @uploadDate, @categorySource, @categoryId, @categoryName, @createdAt, @isDeleted, @isActive )');
                                })();
                            })
                            .catch((error) => {
                                (async () => {
                                    console.log('Download not Completed');
                                    (await pool).request()
                                        .input('postId', sql.Int, item.post_id)
                                        .input('title', sql.VarChar(150), item.post_title)
                                        .input('category', sql.VarChar(150), categoryName)
                                        .input('url', sql.VarChar(150), uri)
                                        .input('createdAt', sql.DateTime, date_ob)
                                        .input('isDeleted', sql.Bit, 0)
                                        .input('msg', sql.VarChar(255), error.message)
                                        .query('INSERT INTO Report_LogFileDownloader ( post_id, post_title, category, url, created_at, isDeleted, msg) VALUES ( @postId, @title, @category, @url, @createdAt, @isDeleted, @msg )');
        
                                })();
                            });                           
                            
                        })();
                    } catch (error) {
                        console.log(error);
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