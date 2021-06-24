const mongoose=require('../lib/mongodb')
const DB=require('../lib/mongodb')
const uuid=require('node-uuid')
const utils=require('../utils/utils.js')

var Mixed = mongoose.mongoose.Schema.Types.Mixed;

//定义schema,相当于定义表结构
var dataSChema= new mongoose.mongoose.Schema({
             uid:String,
            name:String,
            date:String,
     description:String,
     dataRoot:String,
     pcsRoot:String,
     visualRoot:String

     
},{
    versionKey: false,
    collection: "workSpace",
    autoCreate: true
});

//创建model
 
var workSpace=DB.DB1.model('workSpace',dataSChema)

workSpace.find({},(err,doc)=>{
    if(doc.length===0){
        workSpace.create({
            "uid":uuid.v4(),
            'date':utils.formatDate(new Date()),
            "name" : "initWorkspace",
            "description":"initWorkspace",
            "dataRoot":"",
            "pcsRoot":"",
            "visualRoot":""
        },(err,doc)=>{
            if(err){
                console.log(err)
            }else{
                console.log('init workspace')
            }
        })
    }
})

exports.workSpace=workSpace;