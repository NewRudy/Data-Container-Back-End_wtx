const mongoose=require('../lib/mongodb')
const DB=require('../lib/mongodb')
var Mixed = mongoose.mongoose.Schema.Types.Mixed;

//定义schema,相当于定义表结构
var dataSChema= new mongoose.mongoose.Schema({
            uid:String,
            type:String,
            userToken:String,
            list:Array,
            parentLevel:String
            
},{
    versionKey: false,
    collection: "instances"
});

//创建model
// var insituuser=mongoose.model('insituuser',dataSChema,'user')
var instances=DB.DB1.model('instances',dataSChema)

exports.instances=instances;