const mongoose=require('../lib/mongodb')
const DB=require('../lib/mongodb')
const uuid=require('node-uuid')
const utils=require('../utils/utils.js')

var Mixed = mongoose.mongoose.Schema.Types.Mixed;

//定义schema,相当于定义表结构
var dataSChema= new mongoose.mongoose.Schema({
            recordId:String,
            serviceId:String,
            inputArrString: String,
            paramsArrString: String,
            outputArrString: String,
            status: String,
            date:String,
            
            dataoutId: String,
            input:Object,
            params:Object,
            output:Object,
            downloadUrl: Object,

            inputPath: String,
            outputPath: String,
            serviceName: String,
},{
    versionKey: false,
    collection: "record",
    autoCreate: true
});

//创建model
 
var record=DB.DB1.model('record',dataSChema)

// workSpace.find({},(err,doc)=>{
//     if(doc.length===0){
//         workSpace.create({
//             "uid":uuid.v4(),
//             'date':utils.formatDate(new Date()),
//             "name" : "initWorkspace",
//             "description":"initWorkspace",
//             "dataRoot":"",
//             "pcsRoot":"",
//             "visualRoot":""
//         },(err,doc)=>{
//             if(err){
//                 console.log(err)
//             }else{
//                 console.log('init workspace')
//             }
//         })
//     }
// })


exports.record=record;