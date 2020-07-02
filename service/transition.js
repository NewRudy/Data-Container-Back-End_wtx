
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
                    let upObj={
                        'name':req.query.name,
                        'userId':req.query.token,
                        'origination':'distributedContainer',
                        'serverNode':'china',
                        'ogmsdata':[fs.createReadStream(config_path),fs.createReadStream(data_path+req.query.id+'.zip')]        
                    }
                    
                
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
                        console.log('insitudataid',req.query.id)
                        let r=JSON.parse(v.body)
                        res.send({uid:r.data.source_store_id})
                    })

                    break
                }
                 
            }
        }


    })

   





}