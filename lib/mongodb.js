const config=require("../config/config")
const mongoose=require("mongoose");
// const mongoose1=require("mongoose");

 
//连接 本地数据库
//连接 门户数据库
let dbname1="local db"
let dbname2="portal db"

let db1  = mongoose.createConnection(config.db,{useNewUrlParser: true});
db1.on('error', () => {
  console.log("\r\n数据库[" + dbname1 + "]连接错误!" + error);
}).on('connected', () => {
  console.log("\r\n数据库[" + dbname1 + "]连接成功!");
});


let db2  = mongoose.createConnection(config.portalUserDb,{useNewUrlParser: true});
db2.on('error', () => {
  console.log("\r\n数据库[" + dbname2 + "]连接错误!" + error);
}).on('connected', () => {
  console.log("\r\n数据库[" + dbname2 + "]连接成功!");
});



// mongoose.connect(config.db,{useNewUrlParser: true})
// mongoose.connect(config.portalUserDb,{useNewUrlParser: true})

// var db = mongoose.connection;
// var portalUserDb = mongoose.connection;


//连接异常报错
// db.on('error', console.error.bind(console, 'local db connection error:'));
// portalUserDb.on('error', console.error.bind(console, 'Portal db connection error:'));


//能打开表示连接成功了
// db.once('open', function() {
//   // we're connected!
//   console.log("db connected");
  
// });
// portalUserDb.once('open', function() {
//   // we're connected!
//   console.log("portalUserDb connected");
  
// });
 

 
  
exports.mongoose=mongoose
exports.DB1=db1
exports.DB2=db2
