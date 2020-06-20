const mongoose=require('../lib/mongodb')
const DB=require('../lib/mongodb')
var Mixed = mongoose.mongoose.Schema.Types.Mixed;

//定义schema,相当于定义表结构
var dataSChema = new mongoose.mongoose.Schema({
     uid:String,//snapshot id
     dataUid:String,//绑定的数据索引id
     generateDate:Date,//snapshot生成日期
     cached:Boolean //是否已缓存，已缓存为true，用来判断十分生成snapshot

});

//创建model
var VisualLog=DB.DB1.model('visualLog',dataSChema,'visualLog')

exports.VisualLog=VisualLog;