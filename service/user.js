const formidable = require('formidable');
const uuid=require('node-uuid')
const date=require('silly-datetime')
const fs=require('fs')
const dataModel=require('../model/dataList.js')

const Crypto=require('../lib/encode/encode.js')

const user=require('../model/user.js');
const portalUser=require('../model/PortalUsr.js');

var User=user.User;
var PortalUser=portalUser.PUser;


//登录
exports.login=function(req,res,next){

    var form=new formidable.IncomingForm();
    form.parse(req,function(err,fields,file){
        User.findOne({name:fields.name},(err,doc)=>{
            if(err){
                res.send({code:-1,message:'login error'})
                return;
            }
             
            if(fields.pwd===doc.pwd){
               let result= {token:doc.uid,account:doc.name,oid:doc.oid}

                //如果关联了用户则返回相关用户信息（加密的）
               if(doc.relatedUser&&doc.relatedUser.oid!=undefined){
                    result.relatedUser=doc.relatedUser
               }

               req.session.user = {token:doc.uid,account:doc.name}
               res.send({code:0,message:result}) 
               return
            } else{
                res.send({code:-1,message:'login failed!'})
                return
            }
        })
    })
}

//关联门户用户
exports.connectPortalUsr=function(req,res,next){
    var form=new formidable.IncomingForm();
    form.parse(req,function(err,fields,file){
        //首先检查python环境是否正确
        let pythonEnv = fields.pythonEnv;
        fs.exists(pythonEnv,(exists)=>{
            if(!exists){
                res.send({code:-2,message:'python environment is not exist!'})
                return
            }else{
                //依据email在门户库中找到用户   
                PortalUser.findOne({email:fields.email},(err,doc)=>{
                    //  console.log('portal usr',doc)
                    if(err){
                        res.send({code:-1,message:'error in portal usr info'})
                        return
                    }
                    if(!doc){
                        res.send({code:-1,message:'no usr in portal'})
                        return
                    }
                    //把门户用户关联到就地共享用户
                    let userName = doc.name;
                    let pu_info={oid:Crypto.Encrypt(doc.oid),email:Crypto.Encrypt(doc.email)}//门户用户信息
                    User.updateOne({name:'admin'},{relatedUser:pu_info,pythonEnv:pythonEnv},(err,raw)=>{
                        if(err){
                            res.send({code:-1,message:'connect error'})
                            return;
                        }
                        User.findOne({name:'admin'},(err,insitu_doc)=>{
                        
                            if(err){res.send({code:-1,message:'connect error'});return}
                            //把就地共享用户关联到门户
                                PortalUser.updateOne({email:fields.email},{insituUsr:insitu_doc.uid},(err,raw)=>{
                                    //关联成共后，将门户用户信息加密发给前端，存储下，便于各组件共享
                                    pu_info.name = userName;
                                    res.send({code:0,message:'connect success!',info:pu_info}) 
                                    return
                                })
                        })                
                    })
                }) 
            }
        })


    })
}

//注册用户
exports.reg=function(req,res,next){

    var form=new formidable.IncomingForm();
    form.parse(req,function(err,fields,file){
        console.log('name',fields.name)
        let usr={
            uid:uuid.v4(),
            name:fields.name,
            pwd:Crypto.Encrypt(fields.pwd)
        }
        console.log(usr)
        User.create(usr,(err)=>{
            if(err){
                res.send({code:-1,message:'error'})
                return;
            }

            res.send({code:0,message:'ok'})

             
        })
    })
}

exports.getUserInfo = function(req, res, next){
    if(!req.session.user){
      res.send({code:-2, message:'relogin'});
      return;
    }
    let uid = req.query.uid;
    PortalUser.findOne({oid:uid},(err,doc)=>{
      if(err){
        res.send({code:-1,message:'instances error'});
        return;
      }
      let userInfo = {};
      userInfo.name = doc.name;
      userInfo.oid = doc.oid;
      userInfo.email = doc.email;
      res.send({code:0,data:userInfo});
    })
  }