const fs=require('fs')
const stat = fs.stat;
const formidable = require('formidable');
const uuid=require('node-uuid')
const date=require('silly-datetime')
const archiver =require('archiver')

const utils=require('../utils/utils.js')
const dataStoragePath=__dirname+'/../dataStorage' 
const path=require('path')
const instances=require('../model/instances.js');
const user=require('../model/user');
const workspace=require('../model/workSpace.js');

const { Console } = require('console');
const { query } = require('express');

var Instances=instances.instances;

var User=user.User;

var workSpace=workspace.workSpace;


//获取列表
exports.instances=function(req,res,next){

    if(!req.session.user){
        res.send({code:-2,message:'relogin'})
        return;
    }
    //依据会话判断用户
    let userToken=req.session.user.token
     let query={
        uid:req.query.uid,
        userToken:userToken,
        type:req.query.type
     }
     if(req.query.workSpace!=undefined){
        query['workSpace']=req.query.workSpace
     }
    Instances.findOne(query,(err,doc)=>{
        if(err){
            res.send({code:-1,message:'instances error'})
            return
        }
        //找不到列表时初始化列表
        if(!doc){
            //若是第一层则直接用uid=0,parentLevel=-1
            let initInstances={
                uid:req.query.uid,
                userToken:userToken,
                type:req.query.type,
                parentLevel:req.query.parentLevel,
                list:[]
            }
            //初始化workspace
            let updateDoc
            

            //从第二层起，由文件夹新建instances，则生成id
            if(req.query.subContConnect){
                var new_instance_uid=uuid.v4()
                initInstances.uid=new_instance_uid
                var subC=JSON.parse(req.query.subContConnect)//解析JSON字符串
                initInstances.parentLevel=subC.uid//关联父级列表id
            }

             // 初始化工作空间
             workSpace.findOne({'name':'initWorkspace'},(err,initWorkSpace)=>{
                    //Instance添加工作空间id描述
                    initInstances['workSpace']=initWorkSpace.uid

                    if(req.query.type=='Data'){
                       
                        initWorkSpace['dataRoot']=req.query.uid

                    }else if(req.query.type=='Processing'){
                       
                        initWorkSpace['pcsRoot']=req.query.uid

                    }else if(req.query.type=='Visualization'){
                       
                        initWorkSpace['visualRoot']=req.query.uid

                    }
                   
                    
                    
                    
                    Instances.create(initInstances,(err)=>{
                        if(err){
                            res.send({code:-1,message:'instances error'})
                            return
                        }

                            //工作空间添加根目录描述 
                            workSpace.updateOne({'name':'initWorkspace'},initWorkSpace,(err,rawData)=>{

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
                                    
                    })
            })
            
        }else{
            console.log('find instances')
             
            res.send({code:0,data:doc._doc})
            return
        }
    });



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
        		
        //将string 的meta转为json
        if(typeof(newFile.meta) === 'string'){
            newFile.meta = JSON.parse(newFile.meta);
        }
       
        newFile.meta.currentPath=path.normalize(dataStoragePath+'/'+newFile.id) //存到当前系统下的路径

        function operation() {
            return new Promise(function(resolve, reject) {
                fs.readdir(newFile.meta.dataPath,(err,filesItem)=>{
                    if(err){
                        res.send({code:-1,message:'file path is not exist!'})
                        return
                    }
                    let pathArr=[]
                    filesItem.forEach(v=>{
                        let obj={}
                        obj['name']=v
                        obj['path']=newFile.meta.currentPath+'/'+v
        
                        pathArr.push(obj) 
                    })
                    newFile['currentPathFiles']=pathArr;
                    resolve(filesItem);
                    
                })
            })
        }
        operation().then((data)=>{
            console.log(data);
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
                                if(filesItem == null || filesItem.length===0){
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
                                        res.send({code:0,message:'ok'})
                                        return
    
                                    })
                                    // good practice to catch this error explicitly 
                                    archive.on('error', function(err) {
                                        // throw err;
                                        res.send({code:-1,message:err})
                                        return
                                    });
                                    // pipe archive data to the file 
                                    archive.pipe(output);
                                    // append files from a directory 
                                    archive.directory(newFile.meta.dataPath,'/'); 
                                    // finalize the archive (ie we are done appending files but streams have to finish yet) 
                                    archive.finalize();
                                    
                                    
            
                                }
            
            
            
                            })
                        }
                    })
                }
            })
        })

        
        // fs.readdir(newFile.meta.dataPath,(err,filesItem)=>{
        //     if(err){
        //         res.send({code:-1,message:'new file error!'})
        //         return
        //     }
        //     let pathArr=[]
        //     filesItem.forEach(v=>{
        //         let obj={}
        //         obj['name']=v
        //         obj['path']=newFile.meta.currentPath+'/'+v

        //         pathArr.push(obj) 
        //     })
        //     newFile['currentPathFiles']=pathArr;
            
        // })




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
        type:req.query.instType
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
    
    Instances.findOne({'list.id':req.query.id},(err,doc)=>{

        if(err||!doc){
            res.send({code:-1,message:'error'})
            return
        }
        for(let item of doc.list){
            if(item.id==req.query.id){
                if(!item.authority){//数据权限,没有权限则不能直接下载
                    res.setHeader('fileName',"#") 
                    res.send({code:-1,message:'private'})
                    return
                }else{
    
                    let path=__dirname+'/../dataStorage/'+ item.id+'.zip'
                    res.setHeader('fileName',escape(item.name+'.zip')) 
                    res.attachment(item.name+'.zip') //告诉浏览器这是一个需要下载的文件，解决中文乱码问题
                    res.writeHead(200, {
                        'Content-Type': 'application/octet-stream;fileName='+escape(item.name+'.zip'),//告诉浏览器这是一个二进制文件
                        
                    });//设置响应头
                    var readStream = fs.createReadStream(path);//得到文件输入流
                
                    readStream.on('data', (chunk) => {
                        res.write(chunk, 'binary');//文档内容以二进制的格式写到response的输出流
                    });
                    readStream.on('end', () => {
                        res.end();
                        return;
                    })
                }

            }

        }

        

    })
}

 
//权限控制
exports.authority=function(req,res,next){
    var form=new formidable.IncomingForm()
    form.parse(req,function(err,fields,file){
            Instances.findOne({'list.id':fields.id},(err,doc)=>{
            if(err||!doc){
                res.send({code:-1,message:'error'})
                return
            }

            let item=myFindOne(doc.list,fields.id)//从数组中查到对应项

            if(item){    
                
                let ind=doc.list.indexOf(item)

                doc.list[ind].authority=Boolean(fields.authority)

                Instances.updateOne({'list.id':fields.id},doc,(err2)=>{
                    if(err2){
                        res.send({code:-1,message:'error'})
                        return
                    }
                    res.send({code:0,message:'ok'})
                    return


                })
            }
        })
    })

    
    


}



// 元数据
exports.capability=function(req,res,next){


    let id=req.query.id
    let type=req.query.type
    let obj={}

    Instances.findOne({'list.id':id,type:type},(err,doc)=>{
        if(err||!doc){
            res.send({code:-1,message:'error'})
            return
        }

        for(let el of doc.list){
            if(el.id==id){
                if(type=='Data'){
                    obj['name']=el.name
                    obj['date']=el.date
                    obj['meta']=el.meta
                    
                }else{
                    obj['name']=el.name
                    obj['date']=el.date
                    obj['description']=el.description
                    obj['dataTemplateOid']=el.dataTemplateOid!=undefined?el.dataTemplateOid:null
                    obj['paramsCount']=el.paramsCount!=undefined?el.paramsCount:undefined
                    obj['metaDetail']=el.metaDetail!=undefined?JSON.parse(el.metaDetail):undefined
                    
                }
                break
            }
        }

        User.findOne({'name':'admin'},(err,doc)=>{
            if(err){
                res.send({code:-1,data:err})
                return
            }
            obj['authorship']=utils.Decrypt(doc['relatedUser']['email']) 
            res.send({code:0,data:obj})
            return
        })
       

    })
}

//获取处理方法输入数据项

exports.pcsInputFiles=function(req,res,next){

    let dataId=req.query.dataId

    Instances.findOne({list:{$elemMatch:{id:dataId}}},{list:{$elemMatch:{id:dataId}}},(err,pcsDoc)=>{
        if(err){
            res.send({
                code:-1,
                message:err
            })
            return
        }
        res.send({
            code:0,
            data:pcsDoc.list[0].currentPathFiles
        })
        return

    })

}