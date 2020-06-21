const formidable = require('formidable');
const uuid=require('node-uuid')
const date=require('silly-datetime')

const instances=require('../model/instances.js');
const e = require('express');
const { query } = require('express');
var Instances=instances.instances;


//获取列表
exports.instances=function(req,res,next){

    Instances.findOne({uid:req.query.uid,userToken:req.query.userToken,type:req.query.type},(err,doc)=>{
        if(err){
            res.send({code:-1,message:'instances error'})
            return
        }
        //找不到列表时初始化列表
        if(!doc){
            //若是第一层则直接用uid=0,parentLevel=-1
            let initInstances={
                uid:req.query.uid,
                userToken:req.query.userToken,
                type:req.query.type,
                parentLevel:req.query.parentLevel,
                list:[]
            }
            //从第二层起，由文件夹新建instances，则生成id
            if(req.query.subContConnect){
                var new_instance_uid=uuid.v4()
                initInstances.uid=new_instance_uid
                var subC=JSON.parse(req.query.subContConnect)//解析JSON字符串
                initInstances.parentLevel=subC.uid//关联父级列表id
            }
            Instances.create(initInstances,(err)=>{
                if(err){
                    res.send({code:-1,message:'instances error'})
                    return
                }
                if(req.query.subContConnect){//在进入文件夹时，关联文件夹与新的instances
                    Instances.findOne({uid:subC.uid,type:req.query.type},(err,con_inst_doc)=>{
                        if(!con_inst_doc||err){
                            res.send({code:-1,message:'instances error'})
                            return
                        }else{
                            for(let i=0;i<con_inst_doc.list.length;i++){
                                if(con_inst_doc.list[i].id===subC.id){
                                    con_inst_doc.list[i].subContentId=new_instance_uid;//关联文件指向子instance
                                    Instances.update({uid:subC.uid,type:req.query.type},con_inst_doc,(err)=>{
                                        if(err){
                                            res.send({code:-1,message:'instances error'})
                                            return
                                        }
                                        console.log('update folder subinstance id')
                                        res.send({code:0,data:initInstances});
                                        return;
                                    });
    
                                }
                            }

                        }
                    

                    })
                }else{
                    console.log('create instances')
                     res.send({code:0,data:initInstances});
                    return
                }
                

            })

            
        }else{
            console.log('find instances')
            res.send({code:0,data:doc})
            return
        }
    })
}
//新文件夹
exports.newInstance=function(req,res,next){

    var form=new formidable.IncomingForm();
    form.parse(req,function(err,fields,file){
        let query={
            uid:fields.uid,
            userToken:fields.userToken,
            type:fields.type,
            
        }
        Instances.findOne(query,(err,doc)=>{
            doc.list.unshift(fields.data)
            Instances.update(query,doc,(err)=>{
                if(err){
                    res.send({code:-1,message:'error'})
                    return;
                }

                res.send({code:0,data:fields.data})
                return
            })
        })
         


    })
}
//新文件
exports.newFile=function(req,res,next){
    
    var form=new formidable.IncomingForm()
    form.parse(req,(form_err,fields,file)=>{
        
        if(form_err){
            res.send({code:-1,message:'new file error!'})
            return
        }
        
        let query={
            uid:fields.uid,
            type:fields.instype,
            userToken:fields.userToken
        }
        let newFile={
            id:fields.id,
            name:fields.name,
            date:fields.date,
            type:fields.type,
            authority:fields.authority,
            meta:fields.meta
        }
        Instances.findOne(query,(find_err,doc)=>{
            if(find_err){
                res.send({code:-1,message:'new file error!'})
                return
            }
            doc.list.unshift(newFile)
            Instances.update(query,doc,(update_err)=>{
                if(update_err){
                    res.send({code:-1,message:'new file error!'})
                    return
                }

                fs.readdir(dirPath,(err,filesItem)=>{
                    if(filesItem.length===0){
                        res.send({code:-1,message:'new file error!'})
                    }else if(filesItem.length===1){
                        //单文件直接转移到指定目录下

                    }else if(filesItem.length>1){
                        //多文件打包转移至指定目录下
                        
                    }



                })


                res.send({code:0,data:newFile})
                return
            })
        })
    })
  
    

}
//删除条目
exports.delInst=function(req,res,next){
    let query={
        uid:req.query.uid,
    }
    Instances.findOne(query,(err,doc)=>{
        if(err){
            res.send({code:-1,message:"error"})
            return
        }else{
           
                for(let i=0;i<doc.list.length;i++){
                    if(doc.list[i].id===req.query.id){
                        if(req.query.type==='folder'){
                            var sub=doc.list[i].subContentId
                            var theId=doc.list[i].id
                        }
                        doc.list.splice(i,1)
                        Instances.update(query,doc,(err2)=>{
                            if(err){
                                res.send({code:-1,message:"error"})
                                return
                            }else{
                                
                                console.log('DEL File',theId)
                                res.send({code:0,data:{
                                    id:theId
                                }})
                                return
                                
                            }
                            
                        })
                    }
                }
             
        }
        
    })




}



