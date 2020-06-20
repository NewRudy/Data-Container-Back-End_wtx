const mongoose=require('../lib/mongodb')
const DB=require('../lib/mongodb')


var Mixed = mongoose.mongoose.Schema.Types.Mixed;

//定义schema,相当于定义表结构
var dataSChema= new mongoose.mongoose.Schema({
 id:Object,
 oid:String,
 email:String,
 userName:String,
 password:String,
 image:String,
 name:String,
 title:String,
 gender:String,
 country:String,
 city:String,
 description:String,
 phone:String,
 wiki:String,
 weChat:String,
 faceBook:String,
 twitter:String,
 weiBo:String,
 personPage:String,
 institution:String,
 introduction:Object,
organizations:Array,  
subjectAreas:Array,
researchInterests:Array,
articles:Array,
academicServices:Array,
awardsHonors:Array,
conferences:Array,
educationExperiences:Array,
lab:Object,
//    String lab;
projects:Array,
modelItems:Number,    
dataItems:Number,
conceptualModels:Number,
logicalModels:Number,
computableModels:Number,
concepts:Number,
spatials:Number,
templates:Number,
units:Number,
articlesCount:Number,
projectsCount:Number,
conferencesCount:Number,
affiliation:Object,
createTime:Date,
updateTime:Date,

insituUsr:String




},{
    versionKey: false,
    collection: "portalUser"
});

//创建model
var portalUser=DB.DB2.model('portalUser',dataSChema,'portalUser')
exports.PUser=portalUser;