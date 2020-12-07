
const { workSpace } = require('../model/workSpace.js')


exports.initWorkSpace=function(req,res,next){

    workSpace.find({'name':'initWorkspace'},(err,doc)=>{
        if(err||!doc){
            res.send({code:-1,data:'err'})
            return
        }

        res.send({code:0,data:doc[0]})
        return
    })

}

exports.workspaceGet=function(req,res,next){
    workSpace.find({},(err,doc)=>{
        if(err||!doc){
            res.send({code:-1,data:'err'})
            return
        }

        res.send({code:0,data:doc})
        return
    })
}

exports.workspacePost=function(req,res,next){
    workSpace.findOne({name:req.body.name},(err,doc)=>{
        if(doc!=null){
            res.send({code:-2})
            return
        }else{
            workSpace.create(req.body,(err,doc)=>{
                if(err||!doc){
                    res.send({code:-1,data:'err'})
                    return
                }
        
                res.send({code:0,data:'ok'})
                return
            })

        }
    })
    
}

exports.workspaceDel=function(req,res,next){
    workSpace.deleteOne({uid:req.query.uid},(err,doc)=>{
        if(err||!doc){
            res.send({code:-1,data:'err'})
            return
        }

        res.send({code:0,data:'ok'})
        return
    })
}

exports.workspacePut=function(req,res,next){
    
}