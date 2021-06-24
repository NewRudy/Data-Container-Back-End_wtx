
const { workSpace } = require('../model/workSpace.js')
const {instances} = require('../model/instances.js')
const formidable =require('formidable')

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
    //删除该workspace下的其他instance节点
    let uid = req.query.uid;
    instances.remove({workSpace:req.query.uid},{parentLevel:'-1'},(err,doc)=>{
        if(err||!doc){
            res.send({code:-1,data:'err'});
            return;
        }
    })

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

exports.findWorkSpace = (req, res, next) => {
    let form = new formidable.IncomingForm()
    form.parse(req, (form_err, fields) => {
        if(form_err) {
            res.send({code: -1, message: 'query failed'})
            throw form_err
        }
        let query
        if(fields.token) {
            let {token, ...temp} = fields
            query = temp
      } else {
            query = fields
        }
        workSpace.findOne(query, (err, doc) => {
            if(err) {
                res.send({code: -1, message: 'find err'})
                return
            }
            if(doc) {
                res.send({code: 0, data: doc})
            } else {
                res.send({code: 0, data: {}})
            }
        })
    })
}
