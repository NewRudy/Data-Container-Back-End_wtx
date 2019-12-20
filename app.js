const path = require('path');
const express = require('express')
const router=require('./router/router.js')
const config=require('./config/config.js')

var bodyParser = require('body-parser');
var app = express()

//创建application/json解析
var jsonParser = bodyParser.json();

//创建application/x-www-form-urlencoded
var urlencodedParser = bodyParser.urlencoded({extended: false});



//跨域设置
app.all('*', function (req, res, next) {
    // res.header("Access-Control-Allow-Origin", "http://localhost:1708");
    res.header('Access-Control-Allow-Origin', '*') // 使用session时不能使用*，只能对具体的ip开放。
    res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length, Authorization, Accept,X-Requested-With");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Credentials", true);
    res.header("X-Powered-By", ' 3.2.1')
    if (req.method == "OPTIONS") res.send(200);/*让options请求快速返回*/
    else next();
});



//上传数据到中转服务器
//第一种接口，数据检验

/**
 * file
 * 
 */
app.post('/udxzip',router.storageData)

// app.post('/udxzipinfo',router.storageDesc)

//接口2和3
app.post('/source/:type',router.noTemplate)
 

//第四种接口
app.post('/randomsource',router.randomSource)


//下载获得数据流
//第一种接口的下载
app.get('/zipsource',router.datasource)

//数据流上传


//test

app.get('/test',router.test)

//批量下载
app.get('/datasources',)

//获取服务器数据列表
app.get('/datalist',router.datalist)
//检索
app.get('/onlinefilter',router.filter)


//更新数据描述
app.post('/update',router.update);

//删除数据
app.delete('/del',router.delete);



// respond with "hello world" when a GET request is made to the homepage
app.get('/', function (req, res) {
  console.log('hello world')
})


app.listen(config.port,()=>{
  console.log(process.pid)
  console.log("server online")
});