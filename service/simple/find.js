const formidable = require('formidable')

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