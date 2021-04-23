const mongoose=require('../lib/mongodb')
const DB=require('../lib/mongodb')
const uuid=require('node-uuid')

var Mixed = mongoose.mongoose.Schema.Types.Mixed;

//定义schema,相当于定义表结构
var dataSChema= new mongoose.mongoose.Schema({
             uid:String,
            name:String,
             pwd:String,
       pythonEnv:String,
     relatedUser:Mixed
},{
    versionKey: false,
    collection: "user",
    autoCreate: true
});

//创建model
// var insituuser=mongoose.model('insituuser',dataSChema,'user')
var insituuser=DB.DB1.model('insituuser',dataSChema)

insituuser.find({name:'admin'},(err,doc)=>{
    if(doc.length===0){
        insituuser.create({
        "name" : "admin",
        "pwd" : "q7eZEivlY5ra7BUPzoF9vg==",
        'uid':uuid.v4(),
    
        },(err,doc)=>{
            if(err){
                console.log(err)
            }else{
                console.log('init usr')
            }
        })
    }
})


exports.User=insituuser;