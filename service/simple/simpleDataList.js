const formidable = require('formidable');
var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ObjectID = require("mongodb").ObjectID;

const Instances = require('../../model/instances.js').instances;
const dataSChema = require('../../model/instances').dataSChema

// 模糊查询：eg: db.user.find({state_arr:{$elemMatch:{$eq:"123"}}})
// 参考（接口）：https://www.cnblogs.com/lyt0207/p/13260055.html
// 参考（实例）： https://blog.csdn.net/u012946310/article/details/91430669
// 根据 query 查询到一个 document，然后返回   这个功能特别鸡肋，懒得删了
exports.queryCollection = (req, res, next) => {
    let form = new formidable.IncomingForm()
    form.parse(req, (form_err, fields) => {
        if(form_err) {
            res.send({code: -1, message: 'query failed'})
            throw form_err
        }

        // 查询条件总共只有这么几个
        let query = {}
        if(fields.id) {
            query.id = fields.id
        }
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

        Instances.findOne(query, (err, doc) => {
            if(err) {
                res.send({code: -1})
                return
            }
            if(doc) {
                res.send({code: 0, data: doc})
            }
        })
    })
}

// 根据 query 查询到所有符合的 document， 然后分页再返回
exports.querySomeCollection = (req, res, next) => {
    let form = new formidable.IncomingForm()
    form.parse(req, (form_err, fields) => {
        if(form_err) {
            res.send({code: -1, message: 'query failed'})
            throw form_err
        }

        // 查询条件总共只有这么几个
        let query = {}
        if(fields.id) {
            query.id = fields.id
        }
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
        let pageSize = fields.pageSize ? parseInt(fields.pageSize) : 10
        let currentPage = fields.currentPage ? parseInt(fields.currentPage) : 1

        Instances.find(query, (findErr, doc) => {
            if(findErr) {
                res.send({code: -1, message: '查询失败'})
                return
            }
            let total = doc.length
            Instances.find(query).skip((currentPage - 1) * pageSize).exec((err, data) => {
                if(err) {
                    res.send({code: -1, message: '分页查询失败'})
                    return
                }
                res.send({
                    code: 0,
                    message: 'successs',
                    total: total,
                    data: data
                })
            })
        })
    })
}

// 根据 query 查询到一个 document，再根据 name(模糊查询) listType(in) 筛选 list, 将 list 属性分页返回, 主要使用了 mongo 的 aggregate
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

        // list 筛选的时候主要用到 name, listType(列表传入)

        if(!fields.name && !fields.listType) {
            res.send({code: -1, messge: '条件不充分'})
            return
        }
        let name = new RegExp(fields.name)
        let listType = fields.listType.replace(/\s/g,"").split(',')

        let pageSize = fields.pageSize ? parseInt(fields.pageSize) : 10
        let currentPage = fields.currentPage ? parseInt(fields.currentPage) : 1

        Instances.aggregate([
            {"$match": query},
            {"$unwind": "$list"},
            {"$match": {
                "list.name": {$regex: name, $options: 'i'}, "list.type" : {$in: listType}
            }}
        ], (err, doc) => {
            if(err) {
                res.send({code: -1, message: '查询失败'})
                return
            }
            let total = doc.length

            let data = doc.slice(pageSize * (currentPage - 1), pageSize * currentPage)

            res.send({
                code: 0,
                data: data,
                total: total
            })
            return
        })
    })
}