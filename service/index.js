const isu_process= require('./processing.js')


exports.indexServiceGet=function(req,res,next){

    if(req.query.service&&req.query.type&&req.query.request){
        //ids层Capabilities
        if(req.query.service=='ids'&&req.query.type=='sp'&&req.query.request=='Capabilities'){
            isu_process.sagaCapabilities(req,res);
             
        }
       
    }else{
        res.send({'err':'parameter or else err'});
        return;
    }


}

exports.indexServicePost=function(req,res,next){

    


}