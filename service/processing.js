const cp = require('child_process');//引入包
const formidable = require('formidable');
const uuid=require('node-uuid')
const fs=require('fs')
const fsPromises = fs.promises;
const FormData=require('form-data') 
var path = require("path")
const { instances } = require('../model/instances')
const request=require('request')
const Request=require('request')

const utils=require('../utils/utils.js')
const xml2js =require('xml2js')
var parser = new xml2js.Parser();
const cfg=require('../config/config.js')
const templateId=require('../lib/data/templateIdOfVisualSolution')
const transitUrl=cfg.transitUrl
const bindPcsUrl=cfg.bindPcsUrl

const processing_result=__dirname+'/../processing_result'
exports.newProcessing=function(req,res,next){
    let script_uid=uuid.v4()
    let path=__dirname+'/../upload_processing/'+script_uid
    
    let mkdirPromise=fsPromises.mkdir(path)

    mkdirPromise.then((v)=>{

        var form =new formidable.IncomingForm()
        form.uploadDir=path
        form.keepExtensions=true
    
        form.parse(req,(err,fields,files)=>{
            
            if(err){
                res.send({code:-1,message:'new processing error!'})
                return
            }
            
            let query={
                uid:fields.uid,
                type:fields.instype,
                userToken:fields.userToken,
            }
            let newFile={
                id:fields.id,
                oid:fields.oid,
                name:fields.name,
                date:fields.date,
                type:fields.type,
                description:fields.description,
                authority:fields.authority,
                meta:fields.meta,
                fileList:fields.fileList.split(','),
                storagePath: form.uploadDir,
                relatedData:fields.relatedData.split(','),
            }
            instances.findOne(query,(find_err,doc)=>{
                if(find_err){
                    res.send({code:-1,message:'db find error!'})
                    return
                }else{

                    doc.list.unshift(newFile)       
                    instances.update(query,doc,(update_err)=>{
                        if(update_err){
                            res.send({code:-1,message:'db update error!'})
                            return
                        }

                        fs.readdir( form.uploadDir,(err,filesItem)=>{
                            filesItem.forEach(v=>{
                                newFile.fileList.forEach(v2=>{
                                    if(v.split('.')[1]===v2.split('.')[1]){
                                        fs.renameSync(form.uploadDir+'/'+v,form.uploadDir+'/'+v2)
                                    }
                                })
                                
                            });
                        })
    
                        res.send({code:0,message:'create ok'})
                            return
    
                    })
                }   
            })        
    
    
    
        })



    })
    
  

}

exports.delProcessing=function(req,res,next){

    instances.findOne({uid:req.query.uid,type:req.query.instType},(err,doc)=>{
        if(err||!doc){
            res.send({code:-1,message:"error"})
            return
        }else{

            for(let it of doc.list){
                if(it.id===req.query.id){
                    let i=doc.list.indexOf(it)
                    utils.delDir(it.storagePath)
                    doc.list.splice(i,1)
                    instances.updateOne({uid:req.query.uid,type:req.query.instType},doc,(err)=>{
                        if(err){
                            res.send({code:-1,message:"error"})
                            return
                        }else{
                            res.send({code:0,data:{id:req.query.id}})
                            return
                        }
                    })

                }
            }
        }
    })

    

};


exports.bindProcessing=function(req,res,next){
    instances.findOne({'list.id':req.query.id},(err,doc)=>{
        let item
        for(let p of doc.list){
         if(p.id===req.query.id){
            item=p
            break;
         }     
        }
        
        let postData={
            'proName':item.name,
            'dataIds':item.relatedData.join(","),
            'proId':item.id,
            'proDescription':item.description,
            'token':req.query.token,
            'type':item.type
             
        }
        let form=new FormData()
        for(let it in postData){
            form.append(it,postData[it])
            
        }
        
        let xml_name=item.fileList[0].split('.')[1]==='xml'?item.fileList[0]:item.fileList[1]
        fs.readFile(item.storagePath+'/'+xml_name,(err,xmlContent)=>{
            // form.append('xml',xmlContent)
            postData['xml']=xmlContent

                
                let options = {
                    method : 'POST',
                    url : bindPcsUrl ,
                    headers : { 'Content-Type' : 'multipart/form-data' },
                    form : postData
                };
                request(options, function (error, response, body) {
                    if ( response.statusCode == 200) {
                        let re=JSON.parse(body)
                      if(re.code===0){
                        res.send({code:0,data:re.data})
                        return
                      }
                    }else {
                        res.send({code:-1,data:'error'})
                        return
                    }
                  });


            
        })
        





    })
}

exports.executePrcs=function(req,res,next){
    
    instances.findOne({'list.id':req.query.pcsId},(err,doc)=>{
        if(err||!doc){
            res.send({code:-1,message:'find error'})
            return
        }
        let pcs_item
        for (const it of doc.list) {
            if(it.id===req.query.pcsId){
                pcs_item=it
                break
            }
        }
        let pythonPath=pcs_item.fileList[0].split('.')[1]==="py"?pcs_item.fileList[0]:pcs_item.fileList[1]
        let py_script_path=pcs_item.storagePath+'/'+pythonPath//python脚本路径

        instances.findOne({'list.id':req.query.dataId},(err,data_doc)=>{
            if(err||!data_doc){
                res.send({code:-1,message:'find error'})
                return
            }
            let data_item
            for (const it of data_doc.list) {
                if(it.id===req.query.dataId){
                    data_item=it
                    break
                }
            }

            let input=data_item.meta.currentPath
            input=path.normalize(input)
            let forward=input.replace(/\\/g,'%5C')
            input=forward.replace(/%5C/g,'/')

            let pcs_re=uuid.v4()
            let output=processing_result+'/'+pcs_re
            let mkdirPromise=fsPromises.mkdir(output)
            output=path.normalize(output)
             forward=output.replace(/\\/g,'%5C')
            output=forward.replace(/%5C/g,'/')

            mkdirPromise.then((v)=>{
                let par= [ py_script_path,input,output]
                //将参数数组填入
                if(req.query.param!=''){
                    let r=req.query.param.split(',')
                    r.forEach(v=>{
                        par.push(v)
                    })
                }
                const ls = cp.spawn(cfg.pythonExePath, par);//python安装路径，python脚本路径，shp路径，照片结果路径
                ls.on('error',(err)=>{
                    console.log(`错误 ${err}`);
                })
                ls.on('close', (code) => {
                    console.log(`子进程退出，退出码 ${code}`);
                  });
                ls.stdout.on('data', (data) => {
                    console.log(`stdout: ${data}`);
                    let python_print=`${data}`.trim()
                    if(python_print==='ok'){


                        fs.readdir(output,(err,f_item)=>{

                            let upObj={
                                'name':req.query.name,
                                'userId':req.query.token,
                                'origination':'distributedContainer',
                                'serverNode':'china',
                                'ogmsdata':[]        
                            }
                            f_item.forEach(v=>{
                                upObj['ogmsdata'].push(fs.createReadStream(output+'/'+v))
                            })
                            let dataType=undefined
                            f_item.forEach(v=>{
                                if(v.split(".")[1]==="shp"){
                                    dataType='shp'
                                }else if(v.split(".")[1]==="tif"||v.split(".")[1]==="tiff"){
                                    dataType='tiff'
                                }

                            })
                            //拼接配置文件
                            let udxcfg=cfg.configUdxCfg[0]+'\n'+cfg.configUdxCfg[1]+'\n'
                            for(let i=0;i<f_item.length;i++){
                                udxcfg+=cfg.configUdxCfg[2]+'\n'
                            }
                            udxcfg+=cfg.configUdxCfg[3]+'\n'
                            udxcfg+=cfg.configUdxCfg[4]+'\n'
                            if(dataType==="shp"){
                                udxcfg+=templateId.shp[0]
                            }else if(dataType=="tiff"){
                                udxcfg+=templateId.tiff[0]
                            }else{
                                udxcfg+=templateId.shp[0]
                            }
                            udxcfg+=cfg.configUdxCfg[5]+'\n'
                            udxcfg+=cfg.configUdxCfg[6]+'\n'



                            fs.writeFileSync(output+'/config.udxcfg',udxcfg)

                            upObj['ogmsdata'].push(fs.createReadStream(output+'/config.udxcfg')) 

                            
                            let options = {
                                method : 'POST',
                                url : transitUrl+'/data',
                                headers : { 'Content-Type' : 'multipart/form-data' },
                                formData : upObj
                            };
                            //调用数据容器上传接口
                            let promise= new Promise((resolve, reject) => {
                                let readStream = Request(options, (error, response, body) => {
                                    if (!error) {
                                        
                                        resolve({response, body})
                                    } else {
                                        reject(error);
                                    }
                                });
                            });
                            //返回数据下载id
                            promise.then(function(v){
                                //删除配置文件
                                fs.unlinkSync(output+'/config.udxcfg',udxcfg)

                                console.log('insitu content data ',req.query.dataId,'process method',req.query.pcsId)
                                let r=JSON.parse(v.body)
                                res.send({code:0,uid:r.data.source_store_id})
                            })
                            


                        })
                    }
                })
            
            })
        })
    })
}