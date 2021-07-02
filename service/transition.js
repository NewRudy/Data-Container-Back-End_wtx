
const fs=require('fs')
const axios=require('axios')
const FormData=require('form-data')
const cfg=require('../config/config.js')

const Request=require('request')
const Jsdom=require('jsdom')
const { default: Axios } = require('axios')
const { instances } = require('../model/instances')
 
const {JSDOM} =Jsdom
const dom = new JSDOM(`<!DOCTYPE html><input type="file" id="file" multiple>`)

const config_path=__filename+'/../../config/config.udxcfg'
const data_path=__filename+'/../../dataStorage/'
const transitUrl=cfg.transitUrl

const path = require('path')
const formidable = require('formidable')

const my_dataContainer='http://221.226.60.2:8082/'
// const transitUrl='http://localhost:8899'

exports.transition=function(req,res,next){
   

    instances.findOne({'list.id':req.query.id},(err,doc)=>{
        if(err||!doc){
            res.send({code:-1,message:'db find err'})
            return
        }


        for(let i=0;i<doc.list.length;i++){
            if(doc.list[i].id===req.query.id){
                if(!doc.list[i].authority){
                    res.send({code:-1,message:'no authority'});
                    return

                }else{
                    let options
                    try{
                        let fileZip=fs.createReadStream(data_path+req.query.id+'.zip')
                    let upObj={
                        'name':req.query.token,
                        'userId':req.query.token,
                        'origination':'distributedContainer',
                        'serverNode':'china',
                        'ogmsdata':[fs.createReadStream(config_path),fileZip]        
                    }
                    
                    fileZip.on('error',()=>{
                        let msg={code:-2,id:req.query.id,stoutErr:'file invalid',reqUsr:req.query.reqUsrOid}
                        res.send(msg)
                        return
                    })

                    // TODO: 大文件数据上传
                     options = {
                        method : 'POST',
                        url : transitUrl+'/data',
                        headers : { 'Content-Type' : 'multipart/form-data' },
                        formData : upObj
                    };

                    }catch(err){
                        let msg={code:-2,id:req.query.id,stoutErr:'file invalid'}
                        res.send(msg)
                        return
                    }

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
                        console.log('insitudataid',req.query.id)
                        let r=JSON.parse(v.body)
                        res.send({uid:r.data.source_store_id})
                        return
                    },(err)=>{
                        res.send({code:-2,id:req.query.id,stoutErr:'file invalid'})
                        return

                    })
                    .catch(err=>{
                        res.send({code:-1,id:req.query.id,stoutErr:'file invalid'})
                        return
                    })

                    break
                }
                 
            }
        }
    })
}

// 多文件返回urls
exports.multiFiles=function(req,res,next){
    let pcsId=req.query.id;
    instances.findOne({'list.id':pcsId},(err,doc)=>{
        if(err||!doc){
            res.send({code:-1,message:'db find err'})
            return
        }
        try{
            for(let i=0;i<doc.list.length;i++){
                if(doc.list[i].id===pcsId){
                    if(!doc.list[i].authority){
                        res.send({code:-1,message:'no authority'});
                        return
    
                    }else{
    
                        // 解析xml，多个url
                        let inputFiles=doc.list[i].metaDetailJSON
                        let dataId=doc.list[i].relatedData[0]
                        instances.findOne({'list.id':dataId,type:'Data'},(err,doc)=>{
    
                            for(let i=0;i<doc.list.length;i++){
                                if(doc.list[i].id===dataId){
                                    if(!doc.list[i].authority){
                                        res.send({code:-1,message:'no authority'});
                                        return
                                    }else{
                                        let filePath=doc.list[i].meta.currentPath
                                        fs.readdir(filePath,(err,files)=>{
                                            let re=uploadFiles(filePath,files)
                                            re.then((v)=>{
                                                res.send({code:0,
                                                    data:v
                                                })
                                                return
                                            },(err)=>{
                                                res.send({code:-2,
                                                    stoutErr:err
                                                })
                                                return
                                            })
                                            
    
                                        })
                                    }
                                }
                            }
                        })
    
                                  
                        break
                    }
                     
                }
            }
        }catch(err){
            res.send({
                code:-2,
                stoutErr:'distributed node execute error'
            })
        }
       
    })

}

// 从url中下载文件到指定的localPath
function downloadFile(url, fileName) {
    return new Promise((resolve, reject) => {
        try {
            let localPath = path.normalize(__filename + '/../../tempFile/' + fileName)
            if(fs.existsSync(localPath)) {
                fs.unlinkSync(localPath)
            }
            let stream = fs.createWriteStream(localPath)
            Request(url).pipe(stream)
            stream.on('err', (streamErr) => {
                reject(streamErr)
            })
            stream.on('end', () => {
                resolve(localPath)
            })
        } catch (error) {
            reject(error)
        }

    })
}

// 接收websocket 发送过来的东西不知道哪个才是文件， 所以没有继续写了
exports.receiveFile = (req, res, next) => {
    console.log('receive file: ', req)
    res.send({code: 0})
}

exports.receiveUrl = (req, res, next) => {
    let form = formidable.IncomingForm()
    form.parse(req, (err, fields, files) => {
        if(err) {
            res.send({code: -1, message: err})
            return 
        }
        for(let i of Object.keys(fields)) {
            downloadFile(fields[i], i)
        }
        res.send({code: 0})
    })
}

async function uploadFiles(filePath,files){

    let arr=[]

    for(let file of files){
        let tp=filePath+'/'+file;
        let name=file.split('.')[0]
        let {data}=await uploadMultifiles(tp,name);
        
        data.file_name=file
        arr.push(data)
    }
    return arr
}

function uploadMultifiles(path,name){
    let options
    try{
        let upObj={
            'name':name,
            'datafile':fs.createReadStream(path)        
        }
        // TODO: 大文件数据上传
        options = {
            method : 'POST',
            url : my_dataContainer+'/data',
            formData : upObj
        };

        }catch(err){
            let msg={code:-2,id:req.query.id,stoutErr:'file invalid'}
            res.send(msg)
            return
        }
        //调用数据容器上传接口
        let promise= new Promise((resolve, reject) => {
            let readStream = Request(options, (error, response, body) => {
                if (!error) {
                    
                    resolve(JSON.parse(body))
                } else {
                    reject(error);
                }
            });
        });

        return promise
      

}

exports.downloadFile = downloadFile
exports.uploadFiles = uploadFiles
exports.uploadMultifiles = uploadMultifiles