const path = require('path');
const express = require('express')
const router=require('./router/router.js')
const config=require('./config/config.js')
const session=require('express-session')
const MongoStore = require('connect-mongo')(session)
let server = require('http').createServer(app);
let io = require('socket.io')(server);

const os = require('os');
var bodyParser = require('body-parser');
var app = express()

//创建application/json解析
var jsonParser = bodyParser.json();

//创建application/x-www-form-urlencoded
var urlencodedParser = bodyParser.urlencoded({extended: false});



//CORS跨域设置
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



//接口不再用
//第一种接口，数据检验
app.post('/udxzip',router.storageData)
// app.post('/udxzipinfo',router.storageDesc)
//接口2和3
app.post('/source/:type',router.noTemplate)
//第四种接口
app.post('/randomsource',router.randomSource)
//数据可视化
app.get('/snapshot',router.snapShot)
//下载获得数据流
//第一种接口的下载
app.get('/zipsource',router.datasource)
app.get('/single',router.singleDatasource)

//批量下载
app.get('/datasources',)
//获取服务器数据列表
app.get('/datalist',router.datalist)
//检索
app.get('/onlinefilter',router.filter)
//更新数据描述
app.post('/update',router.update);


//********************************************************** */
//中转服务器接口

//数据上传一个接口
app.post('/data',router.ogmsDataUp)

//数据下载
app.get('/data',router.ogmsDataDown)

//删除数据
app.delete('/del',router.delete);

//可视化接口
app.get('/visual',router.dataVisual)
//强制生成
app.get('/visualnocache',router.dataVisualNoCache)


//********************************************************** */

//就地共享系统接口

app.use(session({
  name: "admin", // 设置 cookie 中保存 session id 的字段名称
  secret: 'insitushare', // 通过设置 secret 来计算 hash 值并放在 cookie 中，使产生的 signedCookie 防篡改
  resave: true, // 强制更新 session
  saveUninitialized: false, // 设置为 false，强制创建一个 session，即使用户未登录
  cookie: {
    maxAge: 2592000000// 过期时间，过期后 cookie 中的 session id 自动删除
  },
  store: new MongoStore({// 将 session 存储到 mongodb
    url: config.db// mongodb 地址
  })
}))


//test测试接口
app.get('/test',router.test)




//用户登录
app.post('/login',router.login)
//用户关联
app.put('/connectusr',router.connectPortalUsr)
//创建用户
app.post('/reg',router.reg)


//获取instances
app.get('/instances',router.instances)
//新文件夹项
app.put('/newInst',router.newInstance)
//新文件项
app.put('/newFile',router.newFile)

//删除条目
app.delete('/delInst',router.delInst)
//删除处理方法
app.delete('/delpro',router.delProcessing)

//下载
app.get('/insitudownload',router.inSituDownload)
//权限设置
app.put('/authority',router.authority)


//上传数据到中转服务器
app.get('/transition',router.transition)

//上传处理方法
app.post('/newprocess',router.newProcessing)

//关联处理方法
app.get('/bindprocessing',router.bindProcessing)

//执行处理方法
app.get('/executeprcs',router.executePrcs)

//添加dataitem路径
// app.get('/puturl',router.putUrl)


//注册到参与式平台GSP
app.post('/newDataIndexGSP',router.newDataIndexGSP)



// respond with "hello world" when a GET request is made to the homepage
app.get('/state', function (req, res) {

  res.send({code:0,state:'online',ip:getIPAdress()})
  console.log('state check')
})

function getIPAdress() {
    var interfaces = os.networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];
        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
}


//错误处理，使用自定义的中间件
app.use(function (err, req, res, next) {
  // console.error(err.stack)
  res.status(500).send('server error')
})


app.listen(config.port,()=>{
  console.log(config.port,process.pid)
  console.log("server online")
});





// process.on('uncaughtException', function (err) {
//   console.log('Caught Exception:' + err);//直接捕获method()未定义函数，Node进程未被退出。
// });
