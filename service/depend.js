const fs=require('fs')
const formidable = require('formidable');
const uuid=require('node-uuid')
const user = require('../model/user')

const User = user.User;

exports.changePythonEnv = function changePythonEnv(req,res,next) {
    let form = new formidable.IncomingForm();
    form.parse(req,(err,fields,file)=>{
        let pythonEnv = fields.nPythonEnv;

        fs.exists(pythonEnv,(exists)=>{
            if(exists){
                User.updateOne({name:'admin'},{pythonEnv:pythonEnv},(err,raw)=>{
                    if(err){
                        res.send({code:-1,message:'Update Python Environment Failed!'})
                        return;
                    }else{
                        res.send({code:0,message:'python environment is exist'})
                        return
                    }
                })
            }else{
                res.send({code:-2,message:'python environment is not exist!'});
                return
            }
        })

    })
}