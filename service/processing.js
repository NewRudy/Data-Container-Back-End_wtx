const cp = require('child_process');//引入包
const formidable = require('formidable');
const uuid=require('node-uuid')
const fs=require('fs')
const fsPromises = fs.promises;
const { instances } = require('../model/instances')
const utils=require('../utils/utils.js')

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
                authority:fields.authority,
                meta:fields.meta,
                fileList:fields.fileList.split(','),
                storagePath: form.uploadDir,
                relatedData:fields.relatedData
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
                                
                            })
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
