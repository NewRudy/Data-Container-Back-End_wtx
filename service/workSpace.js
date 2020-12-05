
const { workSpace } = require('../model/workSpace.js')


exports.initWorkSpace=function(req,res,next){

    workSpace.find({'name':'initWorkspace'},(err,doc)=>{
        if(err||!doc){
            res.send({code:-1,message:'err'})
            return
        }

        res.send({code:0,message:doc})
        return
    })

}

exports.workspaceGet=function(req,res,next){
    workSpace.find({},(err,doc)=>{
        if(err||!doc){
            res.send({code:-1,message:'err'})
            return
        }

        res.send({code:0,message:doc})
        return
    })
}

exports.workspacePost=function(req,res,next){
    
    workSpace.create(req.body,(err,doc)=>{
        if(err||!doc){
            res.send({code:-1,message:'err'})
            return
        }

        res.send({code:0,message:'ok'})
        return
    })
}

exports.workspaceDel=function(req,res,next){
    workSpace.deleteOne({uid:req.query.uid},(err,doc)=>{
        if(err||!doc){
            res.send({code:-1,message:'err'})
            return
        }

        res.send({code:0,message:'ok'})
        return
    })
}

exports.workspacePut=function(req,res,next){
    
}