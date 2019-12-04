const mongoose=require('../lib/mongodb')

var Mixed = mongoose.Schema.Types.Mixed;

//定义schema,相当于定义表结构
var dataSChema = new mongoose.Schema({
     uid:String,
     path:  String,
     date: String,
     path:String,
     size:String,
     originalName:String,
     type:String,
     //自描述属性
     fileId:String,
     info:Mixed,
     userId:String
});

//创建model
var DataSet=mongoose.model('dataset',dataSChema,'datalist')

exports.DataSet=DataSet;


