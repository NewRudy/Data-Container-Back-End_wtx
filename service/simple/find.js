const formidable = require('formidable')
const {record} = require('../../model/runRecord')
const utils = require('../../utils/utils')

exports.findData = (req, res, next) => {
    let form = formidable.IncomingForm()
    form.parse(req, async(form_err, fields) => {
        if(form_err) {
            res.send({code: -1})
            return 
        }
        let modelName = fields.modelName
        let searchCont = fields.searchCont
        if(!modelName || !searchCont) {
            res.send({code: -1})
            return 
        }

        utils.findData(modelName, searchCont).then(data => {
            res.send({code: 0, data: data})
        }).catch(err => {
            console.error(err)
            res.send({code: -1})
        })
    })
}

exports.findRecord = (req, res, next) => {
    try {
        if(req.query.recordId) {
            record.findOne({recordId: req.query.recordId}).then(doc => {
                if(doc._doc) {
                    res.send({code: 0, data: doc._doc})
                } else {
                   res.send({code: 0, data: {}}) 
                }
            }).catch(error => {
                res.send({
                    code: -1,
                    message: error
                })
            })
        }
    } catch (error) {
        res.send({
            code: -1,
            message: error
        })
    }
}