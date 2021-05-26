const formidable = require('formidable');
const Instances = require('../../model/instances.js').instances;

// 根据 query分页查询
exports.queryDataList = (req, res, next) => {
    let form = new formidable.IncomingForm()
    form.parse(req, (form_err, fields) => {
        if(form_err) {
            res.send({code: -1, message: 'query failed'})
            throw form_err
        }
        let query = {}
        if(fields.uid) {
            query.uid = fields.uid
        }
        if(fields.userToken) {
            query.userToken = fields.userToken
        }
        if(fields.type) {
            query.type = fields.type
        }
        if(fields.parentLevel) {
            query.parentLevel = fields.parentLevel
        }
        if(fields.workSpace) {
            query.workSpace = fields.workSpace
        }
        
        let page
        if(fields.page) {
            page = fields.page
        } else {
            page = {}
            page.currentPage = 1
            page.pageSize = 10
        }

        Instances.find(query, (err, doc) => {
            if(err) {
                res.send({code: -1})
                return
            }
            page.total = doc.total
            let data = doc.slice(page.pageSize * (page.currentPage - 1), page.pageSize * page.currentPage -1)
            res.send({code: 0, data: data, total: data.length})
        })
    })
}