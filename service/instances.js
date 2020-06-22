const fs=require('fs')
const stat = fs.stat;
const formidable = require('formidable');
const uuid=require('node-uuid')
const date=require('silly-datetime')
const archiver =require('archiver')

const utils=require('../utils/utils.js')
const dataStoragePath=__dirname+'/../dataStorage' 

const instances=require('../model/instances.js');
const { Console } = require('console');
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
                }else{
                   res.send({code:0,data:fields.data})
                    return 
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
            userToken:fields.userToken,
           
        }
        let newFile={
            id:fields.id,
            oid:fields.oid,
            name:fields.name,
            date:fields.date,
            type:fields.type,
            authority:fields.authority,
            meta:fields.meta
        }
        newFile.meta.currentPath=dataStoragePath+'/'+newFile.id//存到当前系统下的路径
        console.log('path',newFile.meta.currentPath)
        Instances.findOne(query,(find_err,doc)=>{
            if(find_err){
                res.send({code:-1,message:'new file error!'})
                return
            }else{
                doc.list.unshift(newFile)
                Instances.update(query,doc,(update_err)=>{
                    if(update_err){
                        res.send({code:-1,message:'new file error!'})
                        return
                    }else{
                        fs.readdir(newFile.meta.dataPath,(err,filesItem)=>{
                            if(filesItem.length===0){
                                res.send({code:-1,message:'new file error!'})
                                return
                            }else {
                                //单文件直接拷贝到指定目录下
                                console.log("s")
                                exists(newFile.meta.dataPath,newFile.meta.currentPath,copy)

                                var output = fs.createWriteStream(__dirname+'/../dataStorage/'+newFile.id+'.zip');

                                var archive = archiver('zip', {
                                    store: false // Sets the compression method to STORE. 
                                });
                                        
                                // listen for all archive data to be written 
                                output.on('close', function() {
                                    console.log(archive.pointer() + ' total bytes');
                                    console.log('archiver has been finalized and the output file descriptor has closed.');
                                
                                });
                                archive.on('end',(err)=>{
                                    console.log(newFile.name," zip original zip data without config data success")
                                })
                                // good practice to catch this error explicitly 
                                archive.on('error', function(err) {
                                    throw err;
                                });
                                // pipe archive data to the file 
                                archive.pipe(output);
                                // append files from a directory 
                                archive.directory(newFile.meta.dataPath,'/'); 
                                // finalize the archive (ie we are done appending files but streams have to finish yet) 
                                archive.finalize();
                                
                                res.send({code:0,message:'ok'})
                                return
        
                            }
        
        
        
                        })
                    }
                })
            }
        })
    })
  
    

}

var copy = function( src, dst ){
    // 读取目录中的所有文件/目录
    fs.readdir( src, function( err, paths ){
        if( err ){
            throw err;
        }
  
        paths.forEach(function( path ){
            var _src = src + '/' + path,
                _dst = dst + '/' + path,
                readable, writable;      
  
            stat( _src, function( err, st ){
                if( err ){
                    throw err;
                }
  
                // 判断是否为文件
                if( st.isFile() ){
                    // 创建读取流
                    readable = fs.createReadStream( _src );
                    // 创建写入流
                    writable = fs.createWriteStream( _dst ); 
                    // 通过管道来传输流
                    readable.pipe( writable );
                }
                // 如果是目录则递归调用自身
                else if( st.isDirectory() ){
                    exists( _src, _dst, copy );
                }
            });
        });
    });
};
// 在复制目录前需要判断该目录是否存在，不存在需要先创建目录
var exists = function( src, dst, callback ){
    fs.exists( dst, function( exists ){
        // 已存在
        if( exists ){
            callback( src, dst );
        }
        // 不存在
        else{
            fs.mkdir( dst, function(){
                callback( src, dst );
            });
        }
    });
};


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
                        var sub=doc.list[i].subContentId
                        var theId=doc.list[i].id
                        var delFilePath=doc.list[i]
                        doc.list.splice(i,1)
                        Instances.update(query,doc,(err2)=>{
                            if(err){
                                res.send({code:-1,message:"error"})
                                return
                            }else{
                                if(delFilePath.type==='file'){
                                     utils.delDir(delFilePath.meta.currentPath)
                                     fs.unlinkSync(__filename+'/../../dataStorage/'+theId+'.zip')
                                }
                               
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

//数据下载
//uid id 
exports.inSituDownload=function(req,res,next){
    
    Instances.findOne({uid:req.query.uid},(err,doc)=>{

        if(err){
            res.send({code:-1,message:'error'})
            return
        }
        let item=myFindOne(doc.list,req.query.id)//从数组中查到对应项
        if(item!=null){
            let path=item.meta.path
            fs.readdir(path,(err,filesItem)=>{




            })
        }

    })
}

function myFindOne(list,el){
    for(let i=0;i<list.length;i++){
        if(list[i].id===req.query.id){
            return list[i]
        }
    }
    return null
}

function rightElement(el,ind){
    // if(el.id)
}
