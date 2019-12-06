const formidable = require('formidable');
const uuid=require('node-uuid')
const date=require('silly-datetime')
const fs=require('fs')
const dataModel=require('../model/dataList.js')

var path="E:\/CONTAINER_DATASET\/"
var DataSet=dataModel.DataSet;
//上传数据
exports.storage=function(req,res,next){

    const datetime = date.format(new Date(), 'YYYY-MM-DD HH:mm');
    const uid=uuid.v4();
    // form.uploadDir =__dirname + '/../upload/'
        try{   
            
          
            var dst = fs.createWriteStream(__dirname + '/../upload/'+uid+'.zip');
            req.pipe(dst);
            dst.on('drain', function() {
              console.log('drain', new Date());
              req.resume();
            });
            req.on('end', function () {
              res.send({uid:uid,datetime:datetime});
            });
           
        }catch(err){
            console.log(err)
        }
   

}
//添加描述信息
exports.storageDesc=function(req,res,next){

 
    const uid=uuid.v4();

    var form = new formidable.IncomingForm();
    //文件放在文件夹xia
    form.parse(req,function(err,fields,files){

        let DataSet=dataModel.DataSet;
        let obj={uid:uid,info:JSON.parse(fields.info),fileId:fields.dataFile_id};

        console.log(files)
        DataSet.create(obj,function(err,small){
            if(err){
                console.log(err);
                res.send(err);
            }
            res.send({id:uid,fileId:fields.dataFile_id});
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
                let filename=doc[0].info.name


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
