const formidable = require('formidable');
const uuid=require('node-uuid')
const date=require('silly-datetime')
const fs=require('fs')
const unzip=require('unzip')
const xml2js =require('xml2js')
const archiver =require('archiver')

const dataModel=require('../model/dataList.js')


const standZip=require('../model/standZip.js')
const random=require('../model/random.js')
const srcZip=require('../model/srcZip.js')
const udxZip=require('../model/udxZip.js')


var path="E:\/CONTAINER_DATASET\/"

var DataSet=dataModel.DataSet;

var StandZip=standZip.StandZip;
var Random=random.Random;
var SrcZip=srcZip.SrcZip;
var UdxZip=udxZip.UdxZip;


const compressing = require('compressing');
const zlib = require( 'zlib' );


const delDir=require('../utils/utils')
//上传符合要求的zip数据,接口1
exports.storage=function(req,res,next){

    var form =new formidable.IncomingForm();
    let uid=uuid.v4()
    let dirPath=__dirname+'/../upload_stand_zip/'+uid
    var parser = new xml2js.Parser();
    
    fs.mkdir(dirPath,(err)=>{

        if(err) throw err

        form.uploadDir=dirPath
        form.keepExtensions=true
        
        form.parse(req,function(err,fields,file){
        //    fs.rename(file.filename.path,dirPath+"/"+uid+'.zip',(err)=>{
        //        console.log(err)
        //    })
           let doc={
                uid:uid,
                name:fields.name,
                origination:fields.origination,
                serverNode:fields.serverNode,
                userId:fields.userId,

                // access:fields.access,
                date: date.format(new Date(), 'YYYY-MM-DD HH:mm'),
                // info:JSON.parse(fields.info)
            };

            //必要参数的检验
            if(!fields.name||!fields.origination||!fields.serverNode||!fields.userId){
                res.send("without name , userId ,origination, serverNode")
                return
            } 

            if("access" in fields){
                doc["access"]=fields.access
            }

            if("info" in fields){
                doc["info"]=fields.info
            }
            
            //解压压缩包
            compressing.zip.uncompress(file.filename.path, dirPath+'/unzipdata')
            .then(() => {
                console.log('unzip original zip data success');
                fs.readFile(dirPath+'/unzipdata'+'/config.udxcfg',(err,data)=>{
                    //解析配置文件
                    parser.parseString(data, function (err, result) {
                        let filesItem = fs.readdirSync(dirPath+'/unzipdata');



                        //数据校验成功
                        if(filesItem.length-1===result.UDXZip["Name"][0].add.length){
                            console.log("data check succcess!")


                            //检查模板id是否正确
                            let dataTemplateId=result.UDXZip["DataTemplateId"]
                            if(!dataTemplateId){
                                res.send("data template id empty!")
                                return
                            }

                        
                            //将除了配置文件外的数据压缩，为调用准备
                            var output = fs.createWriteStream( dirPath+'/'+uid+'.zip');
                            var archive = archiver('zip', {
                                gzip: true,
                                zlib: { level: 9 } // Sets the compression level.
                            });

                            archive.on('error', function(err) {
                            throw err;
                            });
                            archive.on('end',(err)=>{
                                console.log("zip original zip data without config data success")
                            })

                            // pipe archive data to the output file
                            archive.pipe(output);

                            // append files
                            let na=file.filename.path.split('\\')
                            for(item of filesItem){
                                if(item==="config.udxcfg"||item===na[na.length-1]){
                                    continue;
                                }
                                archive.file(dirPath+'/unzipdata/'+item, {name: item});
                            }
                             
                            //
                            archive.finalize();


                    

                            doc["dataTemplateId"]=dataTemplateId[0]

                            let ret={source_store_id:uid,file_name:fields.name}

                            //库存数据信息记录
                            // savedb(StandZip,doc,ret,res)

                            StandZip.create(doc,function(err1,small){
                                if(err1){
                                    console.log(err1);
                                    res.send(err1);
                                    return
                                }
                                console.log("upload file")
                                res.send(ret);
                                return
                            })
                            
                            console.log("add zip data-"+uid)


                        }else{
                            res.send("data check error!")
                             
                        }
                    });
    
                })

            })
            .catch(err => {
                console.error(err);
            });
    
        
        })
    })
   
}

//上传原始数据和template的数据，接口2，3
exports.noTemplate=function(req,res,next){

    var form =new formidable.IncomingForm();
    let uid=uuid.v4()
    let type=req.params.type,dirPath
    if(type==="tep"){
        dirPath=__dirname+'/../upload_template/'+uid
    }else if(type==="udx"){
        dirPath=__dirname+'/../upload_mdlschema/'+uid
    }
     
    fs.mkdir(dirPath,(err)=>{

        if(err) throw err

        form.uploadDir=dirPath
        form.keepExtensions=true
        
        form.parse(req,function(err,fields,file){

            //检验数据todo
           
                compressing.zip.compressDir(dirPath, dirPath+'.zip')
                .then(() => {

                    //存库记录
                    console.log('success');
                    delDir(dirPath)//递归删除文件夹内容
                })
                .catch(err => {
                    console.error(err);
                });
                
           
            //存库记录
            let doc={
                uid:uid,
                name:fields.name,
                dataTemplateId:fields.dataTemplateId,
                origination:fields.origination,
                serverNode:fields.serverNode,
                userId:fields.userId,
                access:fields.access,
                date: date.format(new Date(), 'YYYY-MM-DD HH:mm'),
                info:JSON.parse(fields.info)
            };

            if(!fields.name||!fields.dataTemplateId||!fields.origination||!fields.serverNode||!fields.userId){
                res.send("without name , dataFileId ,origination, serverNode or dataTemplateId")
                return
            } 

            let ret={source_store_id:uid,file_name:fields.name}
            console.log("")
            if(type="tep"){

                savedb(SrcZip,doc,ret)
                

            }else if(type="udx"){

                savedb(UdxZip,doc,ret)
               
            }
           
        })
    })
    
}

 

//上传任意数据
exports.randomSource=function randomSource(req,res,next){

    var form =new formidable.IncomingForm();
    form.uploadDir=__dirname+'/../upload_random'
    form.keepExtensions=true
    form.parse(req,function(err,fields,file){
        if(err){
            console.log(err)
        }
         
        //检验


        //存库记录
        let doc={
            uid:uid,
            name:fields.name,
            dataTemplateId:fields.dataTemplateId,
            origination:fields.origination,
            serverNode:fields.serverNode,
            userId:fields.userId,
            access:fields.access,
            date: date.format(new Date(), 'YYYY-MM-DD HH:mm'),
            info:JSON.parse(fields.info)
        };

        if(!fields.name||!fields.dataTemplateId||!fields.origination||!fields.serverNode||!fields.userId){
            res.send("without name , dataFileId ,origination, serverNode or dataTemplateId")
            return
        } 


        let ret={source_store_id:uid,file_name:fields.name}
        savedb(Random,doc,ret)
         
    })
}

function savedb(dbschema,doc,ret,res){

    dbschema.create(doc,function(err1,small){
        if(err1){
            console.log(err1);
            res.send(err1);
        }
        console.log("upload file")
        res.send(ret);
    })
    

}
exports.test=function test(req,res,next){
    
}

//添加描述信息
exports.storageDesc=function(req,res,next){

 
    const uid=uuid.v4();

    var form = new formidable.IncomingForm();
    //文件放在文件夹xia
    form.parse(req,function(err,fields,files){

        let DataSet=dataModel.DataSet;
        if(!fields.dataFileId||!fields.name||!fields.dataTemplateId||!fields.origination||!fields.serverNode||!fields.userId){
            res.send("without name , dataFileId ,origination, serverNode or dataTemplateId")
            return
        } 
        let obj={
            uid:uid,
            name:fields.name,
            fileId:fields.dataFileId,
            dataTemplateId:fields.dataTemplateId,
            origination:fields.origination,
            serverNode:fields.serverNode,
            userId:fields.userId,
            access:fields.access,
            date: date.format(new Date(), 'YYYY-MM-DD HH:mm'),
            info:JSON.parse(fields.info)
        };

        if(err){
            console.log(err);
            res.send(err);
            
        }
        console.log("add info")
        DataSet.create(obj,function(err1,small){
            if(err1){
                console.log(err1);
                res.send(err1);
            }
            res.send({source_store_id:uid,file_name:fields.name});
        })
    })
}


//下载数据
exports.download=function(req,res,next){
    let uid=req.query.uid;

    try{
        DataSet.find({uid:uid},function(err,doc){
            if(doc!=null){
                __dirname + '/../upload/'
                let filePath=__dirname + '/../upload/'+doc[0].fileId+'.zip';
                let filename=doc[0].name


                res.writeHead(200, {
                    'Content-Type': 'application/octet-stream',//告诉浏览器这是一个二进制文件
                    'Content-Disposition': 'attachment; filename=' + encodeURI(filename)+'.zip',//告诉浏览器这是一个需要下载的文件
                });//设置响应头
                var readStream = fs.createReadStream(filePath);//得到文件输入流

                readStream.on('data', (chunk) => {
                    res.write(chunk, 'binary');//文档内容以二进制的格式写到response的输出流
                });
                readStream.on('end', () => {
                    res.end();
                })
            
            }else{
                res.send("no data")
            }
        })

    }catch(err){
        console.log(err)
    }
    
}


//获取数据列表
exports.datalist=function(req,res,next){
    let page=req.query.page-1
   
    DataSet.count({},function(err,ct){
         
        DataSet.find({},null,{skip:10*page,limit:10},function(err,doc){
            let re=[]
            doc.forEach(_=>{
                let obj={}
                obj["info"]=_.info;
                obj["uid"]=_.uid;
                obj["date"]=_.date;
                obj["name"]=_.name;
                obj["dataTemplateId"]=_.dataTemplateId;
                obj["userId"]=_.userId;
                obj["access"]=_.access;
                re.push(obj)
            })
            console.log("get data list,total: ",ct)
            res.send({total:ct,list:re})
        })
    })
}

exports.filter=function(req,res,next){
    let cont=req.query.words
    let page=req.query.page-1

    let query={"info.name":new RegExp(cont)}

    DataSet.count(query,function(err,ct){
        DataSet.find(query,null,{skip:10*page,limit:10},function(err,doc){
            let re=[]
            doc.forEach(_=>{
                let obj={}
                obj["info"]=_.info;
                obj["uid"]=_.uid;
                obj["date"]=_.date
                re.push(obj)
            })
            console.log("get data list,total: ",ct)
            res.send({total:ct,list:re})
        })
    })



}






//更新数据描述信息
// TODO 这里先只是desc字段更新 
exports.update=function(req,res,next){
   
    const form = new formidable.IncomingForm()
    form.parse(req,function(err,fields,files){
        let uid=fields.uid
        let desc=fields.desc
        DataSet.updateOne({uid:uid},{desc: desc},null,function(err,re){
          if(re.nModified>0){
                res.send("update success")
            }else{
                res.send("fail: modify 0 data")
            }
          
        })
        
    })
    
}

//删除数据
exports.del=function(req,res,next){
    const form = new formidable.IncomingForm()
    form.parse(req,function(err,fields,files){
        let uid=fields.uid
        
        DataSet.findOne({uid:uid},function(err,doc){
            if(err){
                res.send(err)
            }else{
                fs.unlink(doc.path,function(err){
                    if(err){
                        res.send(err)
                    }else{
                        DataSet.deleteOne({uid:uid},function(err){
                            if(err){
                                  res.send(err)
                              }else{
                                  res.send("delete success")
                              }
                        })
                    }
                })
            }            
        })                                
    })
}
