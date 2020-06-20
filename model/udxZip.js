const mongoose=require('../lib/mongodb')
const DB=require('../lib/mongodb')
var Mixed = mongoose.mongoose.Schema.Types.Mixed;

//定义schema,相当于定义表结构
var dataSChema = new mongoose.mongoose.Schema({
     uid:String,
     path:  String,
     date: String,
     path:String,
     size:String,
     originalName:String,
     type:String,
     fileList:Array,

     //自描述属性
     fileId:String,
     info:Mixed,
     name:String,
     dataTemplate:String,
     origination:String,
     serverNode:String,
     access:String,
     userId:String,
     date:Date
});

//创建model
var UdxZip=DB.DB1.model('udxZip',dataSChema,'udxZip')
exports.UdxZip=UdxZip;
