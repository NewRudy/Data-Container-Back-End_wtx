/*
 * @Author: lan 
 * @Date: 2021-01-21 15:12:28 
 * @Last Modified by: mikey.zhaopeng
 * @Last Modified time: 2021-01-21 17:37:28
 */
const path = require("path");
const uuid = require("node-uuid");
const fs = require("fs");
const cp = require("child_process"); //引入包

const cfg = require("../config/config.js");
const utils = require("../utils/utils.js");


const { instances } = require("../model/instances");

const { record } = require("../model/runRecord");


/*
 * 
 *@params
 * pcsId:处理方法id
 * dataId:数据id
 * outId:输出Id
 * pathArr:输入文件数组
 * paramsArr:输入参数数组
 */

exports.invokeLocalMethod=function(req,res,next){
    let pcsId  = req.body.pcsId;
    let dataId = req.body.dataId;
    let outId  = req.body.outId;


    let pathArr = req.body.pathArray;

    let paramsArr=req.body.paramsArray!=undefined?req.body.paramsArray:undefined


    instances.findOne({list:{$elemMatch:{id:pcsId}}},{list:{$elemMatch:{id:pcsId}}},(pcsId_dbfind_err,pcsMethod)=>{

        if(pcsId_dbfind_err||!pcsMethod){
            let msg={code:-2,stoutErr:'find in node db error'}
            res.end(JSON.stringify(msg));
            return
        }

        if(pcsMethod.list.length<1){
            let msg={code:-2,stoutErr:'find in node db error'}
            res.end(JSON.stringify(msg));
            return
        }

        let pcs=pcsMethod.list[0];

        // 参数配置
        let pyPath=path.join(pcs.storagePath,pcs.fileList[0].split('.')[1]=='py'?pcs.fileList[0]:pcs.fileList[1])
        let output=__dirname+'/../processing_result/'+uuid.v4()
        fs.mkdirSync(output)
        let inputPath=[]
        for(let p in pathArr){
            inputPath.push(pathArr[p])
        }
        
        input=inputPath.join(",")

        // 执行记录
        let recordIdForThisRun=uuid.v4()
        record.create({
            "recordId":recordIdForThisRun,
            "serviceId":pcsId,
            "date":utils.formatDate(new Date()),
            "input":pathArr,
            "output":[]
          },(err,doc)=>{
            if(err){
              console.log(err)
            }
          })


        let par= [ pyPath,input,path.normalize(output)]

        // 如果有参数存在的情况
        if(paramsArr!=undefined&&paramsArr.length>0){
            par=par.concat(paramsArr)
        }

        // 封装的处理方法调用
        let pcs_stout=undefined
        const ls = cp.spawn(cfg.pythonExePath, par);//python安装路径，python脚本路径，shp路径，照片结果路径

        ls.on('exit', (code) => {
            console.log(`子进程使用代码 ${code} 退出`);
            if(code!=0){
                let msg={code:-2,message:'processing methods error'}
                res.send(msg);
                return
            }
            fs.readdir(output,(err,f_item)=>{

                if(f_item.length==0){
                    let msg={code:-2,message:'processing methods error'}
                    if( pcs_stout!=undefined){
                        msg.message=pcs_stout.toString('utf-8')
                    }
                    res.send(msg);
                    return
                }
            
                
                let outputDist=[]
                f_item.forEach((outfile,i)=>{
                  outputDist.push({'name':outfile,'path':path.join(output,outfile)})
                })
                
                record.updateOne({recordId:recordIdForThisRun},{$set:{output:outputDist}},(err,re=>{
                    if(err){
                      res.send({code:-2,message:err.toString('utf-8')});
                      return
                    }
                    if(pcs_stout==undefined){
                        pcs_stout="no print message"
                    }

                    instances.updateOne({'list.id':outId},{$set:{'list.$.dist':path.normalize(output)}},(outerr)=>{

                        let openExplorer='explorer.exe "'+ path.normalize(output)+'"' 
                        cp.exec(openExplorer)
                        if(outerr){
                            res.send({code:-2,message:outerr.toString('utf-8')});
                            return
                        }

                        res.send({code:0})
                        return

                    })
                }))
                
               
            })

          });

          ls.on('error',(err)=>{
            console.log(`错误 ${err}`);
            res.send({code:-2,message:(err).toString()});
            return;
          })
          ls.on('close', (code) => {//exit之后
              console.log(`子进程close，退出码 ${code}`);
              
          });
          ls.stdout.on('data', (data) => {
              console.log(`stdout: ${data}`);
              pcs_stout=data
                                  
          })
        










    });


}



exports.openExplorer=function(req,res,next){
    


    instances.findOne({list:{$elemMatch:{id:req.query.id}}},{list:{$elemMatch:{id:req.query.id}}},(err,doc)=>{

        if(err){
            res.send({
                code:-1,
            })
            return 
        }
       
        let openExplorer='explorer.exe "'+ path.normalize(doc.list[0].dist)+'"' 
        cp.exec(openExplorer)

        res.send({
            code:0,
        })
        return
    })
}