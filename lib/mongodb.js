const config=require("../config/config")
const mongoose=require("mongoose");
// const mongoose1=require("mongoose");

 
//连接 本地数据库
let db1  = mongoose.createConnection(config.db,{useNewUrlParser: true});
db1.on('error', console.error.bind(console, 'local db connection error:'));
db1.once('open', function() {
  // we're connected!
  console.log("local db connected");
  
});
 

//连接 门户数据库
let db2  = mongoose.createConnection(config.portalUserDb,{useNewUrlParser: true});
db2.on('error', console.error.bind(console, 'Portal db connection error:'));
db2.once('open', function() {
  // we're connected!
  console.log("portal db connected");
  
});
 


// 之有一个库的连接
// mongoose.connect(config.db,{useNewUrlParser: true})
// var db = mongoose.connection;

//连接异常报错
// db.on('error', console.error.bind(console, 'local db connection error:'));

//能打开表示连接成功了
// db.once('open', function() {
//   // we're connected!
//   console.log("db connected");
  
// });
  
exports.mongoose=mongoose
exports.DB1=db1
exports.DB2=db2
