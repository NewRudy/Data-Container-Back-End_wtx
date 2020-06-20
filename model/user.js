const mongoose=require('../lib/mongodb')
const DB=require('../lib/mongodb')
var Mixed = mongoose.mongoose.Schema.Types.Mixed;

//定义schema,相当于定义表结构
var dataSChema= new mongoose.mongoose.Schema({
             uid:String,
            name:String,
             pwd:String,
     relatedUser:Mixed
},{
    versionKey: false,
    collection: "user"
});

//创建model
// var insituuser=mongoose.model('insituuser',dataSChema,'user')
var insituuser=DB.DB1.model('insituuser',dataSChema)

exports.User=insituuser;