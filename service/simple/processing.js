/*
 * @Author: wutian 
 * @Date: 2021-08-10 09:52:45 
 * @运行服务的js，原来的不敢改，初始目的事运行不复制的批量的文件
 * @Last Modified by: wutian
 * @Last Modified time: 2021-08-26 09:30:08
 */
const uuid = require('node-uuid')
const fs = require('fs')
const path = require('path')
const cp = require('child_process')
const formidable = require('formidable')
const request = require("request");
const archiver = require("archiver")

const utils = require('../../utils/utils')
const {createFolderInstance} = require('./simpleInstance')

const {record} = require('../../model/runRecord')
const {dataContainer} = require('../../config/config')
const { resolve } = require('path')
const { reject } = require('async')



function createDataOut(query, recordData) {
    let query = {
        uid: '0',
        type: 'DataOut',
        userToken: token,
        workSpace: workSpace
    }
    let newFolder = {
        id: recordData.resultId,
        oid: '',
        name: recordData.serviceName + '_result',
        type: 'folder',
        date: utils.formatDate(new Date()),
        authority: 'public',
        path: recordData.outputPath,
        isCopy: false,
        isMerge: false,
        workSpace: workSpace
    }
    createFolderInstance(query, newFolder)
}

/**
 * 
 * @param {*} pcsId 处理方法id
 * @param {*} dataId 数据id，data 的instance（一个文件夹）
 * @param {*} paramsArr 参数数组（按照 xml 的顺序的参数数组）（设计不合理，应该是 key-value的键值对）
 * @returns record 的一个记录
 */
async function invoke(pcsId, dataId, paramsArr) {
    return new Promise(async(resolve, reject) => {
        const prsInstance = await utils.isFindOne('instances',{type: 'ProcessingMethod', list:{$elemMatch: {id: pcsId}}})
        const dataInstance = await utils.isFindOne('instances', {type: 'Data', list: {$elemMatch: {id: dataId}}})
        const user = await utils.isFindOne('user', {name: 'admin'})
        if(!prsInstance || !dataInstance || !user) {
            reject('prsInstance || data || user is wrong')
            return 
        }
    
        // python 环境
        let pythonEnv = user.pythonEnv
    
        // 脚本
        let processMethod, pyFile
        for(let i = 0; i < prsInstance.list.length; ++i) {
            if(pcsId === prsInstance.list[i].id) {
                processMethod = prsInstance.list[i]
                break 
            }
        }
        if(paramsArr && paramsArr.length != processMethod.metaDetailJSON.Parameter.length){
            reject('paramsArr is not right')
            return
        }
        pyFile = path.join(processMethod.storagePath, processMethod.fileList[0].split('.')[1] == 'py'? processMethod.fileList[0]: processMethod.fileList[1])
    
        // 输入路径
        let input
        for(let i = 0; i < dataInstance.list.length; ++i) {
            if(dataId === dataInstance.list[i].id) {
                if(dataInstance.list[i].type != 'folder') {
                    if('isCopy' in dataInstance.list[i]) {         // 不复制的运行
                        if(!dataInstance.list[i].isCopy) {
                            let fileName = dataInstance.list[i].path.split('\\')[dataInstance.list[i].path.split('\\').length - 1]
                            let temp = dataInstance.list[i].path.lastIndexOf(fileName)
                            input = dataInstance.list[i].path.substring(0, temp)
                        } else {
                            input = __dirname + '/../dataStorage/' + dataInstance.list[i].id 
                        }
                    } else {
                        input = __dirname + '/../dataStorage/' + dataInstance.dataId
                    }
                } else {
                    if('isCopy' in dataInstance.list[i]) {
                        if(!dataInstance.list[i].isCopy) {
                            input = dataInstance.list[i].path
                        } else {
                            input = __dirname + '/../dataStorage/' + dataInstance.dataId
                        }
                    }
                }
                break
            }
        }
        
        // 输出路径
        let outId = uuid.v4()
        let output = path.normalize(__dirname+'/../../processing_result/' + outId)
        fs.mkdirSync(output)    
    
        // 参数设置
        let par = [path.normalize(pyFile), path.normalize(input), path.normalize(output)]
        if(paramsArr && paramsArr.length>0){
            par = par.concat(paramsArr)
        }

        // 创建方法
        let recordInstance = {
            'recordId': uuid.v4(),
            'status': 'run',
            'serviceId': pcsId,
            'dataId': dataId,
            'resultId': uuid.v4(),
            'paramsArr': paramsArr,
            'date': utils.formatDate(new Date()),
            'inputPath': input,
            'outputPath': output,
            'serviceName': processMethod.name
        }
        record.create(recordInstance, (err, doc) => {
            if(err) {
                reject()
                return
            }
            resolve(doc._doc)
        })
            
        // 调用方法
        console.log('par: ', par)
        const ls = cp.spawn(pythonEnv, par);
        ls.on('exit', async(code) => {
            console.log(`子进程使用代码${code}退出`)
            result = await utils.isFindOne('record', {'recordId': recordInstance.recordId})
            let recordData = result._doc
            let status
            if(code === 0) {
                status = 'success'
                createDataOut(query, recordData)
            }else{
                status = 'fail'
            }
            record.updateOne({'recordId': recordData.recordId}, {$set: {status: status}},(err) => {
                if(err){
                    console.error('update record err: ', err)
                    return 
                }
                console.log('update record success.')
            })
        }) 
    })
}

/**
 * 本地方法运行本地的数据，结果也是一个实例，返回实例 id
 * @param {*} req 传递 json 数据， 数据内容：dataId, pcsId, paramsArr, userToken, [workSpace]
 * @param {*} res 返回 code, dataId(数据实例)
 * @param {*} next 
 */
function invokeLocally(req, res, next) {
    let form = new formidable.IncomingForm()
    form.parse(req, async function(form_err, fields){
        if(form_err) {
            res.send({code: -1})
            return 
        }

        let pcsId  = fields.serviceId;
        let dataId = fields.dataId;
        let paramsArr = fields.paramsArr
        let workSpace = fields.workSpace
        let token = fields.userToken || fields.token
        if(!workSpace) {
            let temp = await utils.isFindOne('workSpace', {name: 'initWorkspace'})
            workSpace = temp.uid
        }
        if(!token) {
            let temp = await utils.isFindOne('user', {name: 'admin'})
            token = temp.uid
        }

        record.find({'serviceId': pcsId, 'dataId': dataId}).then((record) => {
            if(!record) {
                res.send({code: -1})
                return 
            }
            for(let i=0;i<record.length;++i) {      // 判断是否执行过
                let recordInstance = record[i]._doc
                if(paramsArr.join() === recordInstance.paramsArr.join() && recordInstance.status != 'fail'){
                    res.send({code: 0, data: recordInstance})
                    return
                }
            }

            try {
                invoke(pcsId, dataId, paramsArr).then(result => {
                    if(!result || typeof result === 'string'){
                        res.send({code: -1})
                        return
                    }
                    res.send({code: 0, data: result})
                }).catch((err) => {
                    res.send({code: -1})
                })
            } catch (error) {
                res.send({code: -1})
                return
            }
        })
    })
}

/**
 * 文件夹压缩成压缩包
 * @param {*} folder 
 */
function zipFolder(folder) {
    return new Promise((resolve, reject) => {
        let destPath = folder + '.zip'
        if(fs.existsSync(destPath)){
            resolve(destPath)
            return
        }
        let archive = archiver('zip',{store: false})
        archive.on('error', (err) => reject(err))
        archive.on('end', () => resolve(destPath))
        archive.pipe(fs.createWriteStream(destPath))
        archive.directory(folder, '/')
        archive.finalize()
    })

}

/**
 * 调用数据中转的接口，上传多文件, 本地就使用了单文件，数据大小限制为 10 GB
 * @param {*} path 文件路径数组
 * @param {*} name 字符串，本次上传文件名
 * @returns 
 */
function uploadMultifiles(path,name){
    return new Promise(async(resolve, reject) => {
        // let upObj={
        //     'name':name,
        //     'datafile':fs.createReadStream(path)        
        // }
        console.log('upload multifiles.')
        let upObj = {'name': name}
        for(let i = 0; i < path.length; ++i){
            let st = fs.statSync(path[i])
            let file
            if(st.isFile()){
                file = path[i]
            } else {
                file = await zipFolder(path[i])
            }
            upObj['datafile'] = fs.createReadStream(file)
        }
        // TODO: 大文件数据上传
        let options = {
            method : 'POST',
            url : dataContainer+'/data',
            formData : upObj
        };
        //调用数据容器上传接口
        request(options, (error, response, body) => {
                if (error) reject(error)
                resolve(JSON.parse(body))
            });  
    })
}

/**
 * 上传本地数据到兰德，返回兰德的结果
 * @param {*} req json数据，数据：dataId
 * @param {*} res 
 * @param {*} next 
 */
function uploadData(req, res, next) {
    let form = new formidable.IncomingForm()
    form.parse(req, async (form_err, fields) => {
        if(form_err) {
            res.send({code: -1})
            return 
        }
        let dataId = fields.dataId
        let path    // dataId 对应的 path
        const dataInstance = await utils.isFindOne('instances', {type: 'Data', list: {$elemMatch: {id: dataId}}})
        if(!dataInstance) {
            res.send({code: -1})
            return
        }
        for(let i = 0; i < dataInstance.list.length; ++i) {
            if(dataId === dataInstance.list[i].id) {
                if('isCopy' in dataInstance.list[i]) {
                    if(dataInstance.list[i].isCopy) {
                        path = dataInstance.list[i].meta.currentPath
                    } else {
                        path = dataInstance.list[i].path 
                    }
                } else {
                    path = dataInstance.list[i].meta.currentPath
                }
            }
        }
        if(!path || path === '') {
            res.send({code: -1})
            return 
        }

        let workSpace = fields.workSpace
        let token = fields.userToken || fields.token
        if(!workSpace) {
            let temp = await utils.isFindOne('workSpace', {name: 'initWorkspace'})
            workSpace = temp.uid
        }
        if(!token) {
            let temp = await utils.isFindOne('user', {name: 'admin'})
            token = temp.uid
        }
        
        uploadMultifiles([path], 'result').then((result) => {
            res.send({code: 0, data: {'downloadUrl': dataContainer+'/data/' + result.data.id}})
        }).catch((err) =>
            res.send({code: -1})
        )

    })
}

exports.invokeLocally = invokeLocally
exports.uploadData = uploadData