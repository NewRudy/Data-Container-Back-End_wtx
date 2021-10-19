/*
 * @Author: wutian 
 * @Date: 2021-08-10 09:52:45 
 * @运行服务的js，原来的不敢改，初始目的事运行不复制的批量的文件
 * @Last Modified by: wutian
 * @Last Modified time: 2021-10-19 16:39:21
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
const tempPath = path.normalize(__dirname + '../../tempFile')


function judgeRecordStatus(recordId) {
    return new Promise(async(resolve, reject) => {
        try {
            let record = await utils.isFindOne('record', {recordId: recordId});
            if(!record || !record.status || record.status === 'fail') {
                resolve({
                    code: -1,
                    data: 'service is failed.'
                })
                return 
            }
            // if(record.status === 'run') {
            //     resolve({
            //         code: 1,
            //         data: record
            //     })
            // } else if(record.status === 'success') {
                resolve({
                    code: 0,
                    data: record
                })
            // }
        } catch (error) {
            reject(error)
        }
    })
}

function findRecord(req, res, next) {
    console.log('findRecord')
    let form = new formidable.IncomingForm()
    form.parse(req, async(form_err, fields) => {
        if(form_err || !fields.recordId) {
            res.send({code: -1, message: 'param err'})
        }
        let result = await judgeRecordStatus(fields.recordId)
        res.send(result)
    })
}


/**
 * 
 * @param {*} url 
 * @param {*} tempId 
 * @param {*} fileName 
 * 将指定url 的内容下载到   ../tempId/fileName
 * @returns 
 */
function download(url, tempId, fileName) {
    return new Promise((resolve, reject) => {
        let destPath = path.normalize(tempPath + '/' + tempId + '/' + fileName)
        if(fs.existsSync(destPath)) {
            fs.rmdir(destPath)
        }
        let stream = fs.createWriteStream(destPath)
        try {
            request(encodeURI(url), (err, response, body) => {
                if(err) {
                    reject(err)
                    return 
                }
                console.log(response.headers['content-disposition']);
                var arr = response.headers['content-disposition'].split('.');
                fileType = arr[arr.length-1];
                arr = response.headers['content-disposition'].split('=');
                fileName = arr[arr.length-1];
                console.log("fileType: " + fileType + " fileName: " + fileName);
    
            }).pipe(stream).on('close', ()=> {
                console.log(fileName + 'download ok')
                resolve(destPath)
            }) 
        } catch (error) {
            reject(error)
        }

    })
}

/**
 * 
 * @param {} obj
 * object 的key的所有特殊字符进行编码
 */
function escapeObject(obj) {
    return new Promise(async (resolve, reject) => {
        try {
            let result = {}
            for(let i of Object.keys(obj)) {
                if(typeof i == 'string') {
                    if(typeof obj[i] != 'object')
                        result[escape(i)] = obj[i]
                    else
                        result[escape(i)] = await escapeObject(obj[i])
                }
            }
            resolve(result)
        } catch (error) {
            reject(error)
        }
    })

}

/**
 * 
 * @param {*} recordData 运行记录
 * @returns 返回一个object， 键值是instance下的每一个文件和文件夹的名字，值是 id
 */
function createDataOut(recordData) {
    return new Promise((resolve, reject) => {
        let query = {
            uid: '0',
            type: 'DataOut',
        }
        let newFolder = {
            id: recordData.dataoutId,
            oid: '',
            name: recordData.serviceName + '_result',
            type: 'folder',
            date: utils.formatDate(new Date()),
            authority: 'public',
            path: recordData.outputPath,
            isCopy: false,
            isMerge: false,
            workSpace: recordData.workSpace
        }
        createFolderInstance(query, newFolder).then(instance => {
            if(!instance || ! instance.list) reject('null')
            let result = {}
            for(let i = 0; i < instance.list.length; ++i) {
                result[instance.list[i].name] = instance.list[i].id 
            }
            resolve(result)
        }).catch(err => {
            reject(err)
        })
    })
}

// updateRecord('3c627324-e189-4564-9b09-46fc8b964af6', 0);    // 太笨了，还得我手动升级

async function updateRecord(recordId, code) {
    console.log(`子进程使用代码${code}退出`)
    result = await utils.isFindOne('record', {'recordId': recordId})
    let recordData = result._doc
    let outputArr = JSON.parse(recordData.outputArrString)
    let status, downloadUrl = {}
    if(code === 0) {
        status = 'success'
        outputIdArr = await createDataOut(recordData)
        for(let i of Object.keys(outputArr)) {
            if(outputArr[i]) {      // true代表是需要上传的数据
                downloadUrl[i] = await uploadMultifiles(output + '/' + i, i)
            }
        }                            
    }else{
        status = 'fail'
        outputIdArr = {}
        downloadUrl = {}
    }
    record.updateOne({'recordId': recordData.recordId}, {$set: {status: status, outputIdString: JSON.stringify(outputIdArr), downloadUrlString: JSON.stringify(downloadUrl)}},(err) => {
        if(err){
            console.error('update record err: ', err)
            return 
        }
        console.log('update record success.')
    })
}

/**
 * 
 * @param {*} pcsId 处理方法id
 * @param {*} inputArr 输入的所有数据，其实是一个对象，键值是输入数据名，值是url或则本地instance的id
 * @param {*} paramsArr 参数数组（按照 xml 的顺序的参数数组）（设计不合理，应该是 key-value的键值对）
 * @returns record 的一个记录
 */
async function invoke(pcsId, inputArr, paramsArr, outputArr) {
    return new Promise(async(resolve, reject) => {
        try {
            // 脚本文件
            let prsInstance = await utils.isFindOne('instances',{type: 'Processing', list:{$elemMatch: {id: pcsId}}})
            let processMethod, pyFile
            for(let i = 0; i < prsInstance.list.length; ++i) {
                if(pcsId === prsInstance.list[i].id) {
                    processMethod = prsInstance.list[i]
                    break 
                }
            }
            if(paramsArr && Object.values(paramsArr).length != processMethod.metaDetailJSON.Parameter.length || Object.values(inputArr).length !=  processMethod.metaDetailJSON.Input.length || Object.values(outputArr).length != processMethod.metaDetailJSON.Output. length){
                reject('params is not right')
                return
            }
            pyFile = path.join(processMethod.storagePath, processMethod.fileList[0].split('.')[1] == 'py'? processMethod.fileList   [0]: processMethod.fileList[1])
            
            // 输入数据 y
            let input = {}
            let tempId = uuid.v4()
            for(let i of Object.keys(inputArr)) {
                if(inputArr[i].startsWith('http')) {
                    input[i] = await download(inputArr[i], tempId, i)
                } else {
                    let temp = await utils.isFindOne('instances', {type: 'Data', list: {$elemMatch: {id: inputArr[i]}}})
                    if(!temp) temp = await　utils.isFindOne('instances', {type: 'DataOut', list: {$elemMatch: {id: inputArr[i]}}})
                    for(let j = 0; j < temp.list.length; ++j) {
                        if(inputArr[i] === temp.list[j].id) {
                            if('isCopy' in temp.list[j]) {
                                if(!temp.list[j].isCopy) {
                                    input[i] = temp.list[j].path
                                } else {
                                    if(temp.dataId)
                                        input[i] = path.normalize(__dirname + '/../dataStorage/' + temp.dataId)
                                    else
                                        input[i] = path.normalize(__dirname + '/../../dataStorage/' + temp.list[j].id)
                                }
                            } else {
                                if(temp.dataId)
                                    input[i] = path.normalize(__dirname + '/../dataStorage/' + temp.dataId)
                                else
                                    input[i] = path.normalize(__dirname + '/../../dataStorage/' + temp.list[j].id)
                            }
                            break
                        }
                    }
                }
            }
        
            // 输出路径
            let outId = uuid.v4()
            let output = path.normalize(__dirname+'/../../processing_result/' + outId)
            fs.mkdirSync(output)    
        
            // 命令行设置 .py input params output
            let par = [path.normalize(pyFile)]
            for(let i = 0; i < processMethod.metaDetailJSON.Input.length; ++i) {
                par.push(input[processMethod.metaDetailJSON.Input[i].name])
            }
            for(let i = 0; i < processMethod.metaDetailJSON.Parameter.length; ++i) {
                par.push(paramsArr[processMethod.metaDetailJSON.Parameter[i].name])
            }
            par.push(output)

            resolve(par)
        } catch (error) {
            reject(error)
        }
        
        
    })
}

record.find({'status': 'run'}).then(doc =>{      // 重启程序，删除还在 run 的记录
    if(!doc || doc.length === 0) return;
    record.deleteMany({'status': 'run'}).then(doc => {
        console.log('delete all running record: ', doc)
    })
})

/**
 * 本地方法运行本地的数据，结果也是一个实例，返回实例 id
 * @param {*} req 传递 json 数据， 数据内容：dataId, pcsId, paramsArr, userToken, [workSpace]
 * @param {*} res 返回 code, dataId(数据实例)
 * @param {*} next 
 */
function invokeLocally(req, res, next) {
    console.log('invokeLocally')
    let form = new formidable.IncomingForm()
    form.parse(req, async function(form_err, fields){
        if(form_err) {
            res.send({code: -1})
            return 
        }

        let pcsId  = fields.serviceId;
        let inputArr = fields.inputArr;
        let paramsArr = fields.paramsArr
        let outputArr = fields.outputArr
        let inputArrString = JSON.stringify(inputArr)
        let paramsArrString = JSON.stringify(paramsArr)
        let outputArrString = JSON.stringify(outputArr)

        
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

        record.find({'serviceId': pcsId, 'inputArrString': inputArrString, 'paramsArrString': paramsArrString, 'outputArrString': outputArrString}).then((doc) => {
            if(!doc) {
                res.send({code: -1})
                return 
            }
            try {
                if(doc.length > 0) {
                    for(let i = 0; i < doc.length; ++i) {
                        let recordInstance = doc[i]._doc
                        if(recordInstance.status != 'fail'){
                            res.send({code: 0, data: recordInstance})
                            return
                        }
                    }

                }
                invoke(pcsId, inputArr, paramsArr, outputArr).then(async par => {
                    if(!par) {
                        res.send({code: -1})
                        return
                    }
                    // python 环境
                    let user = await utils.isFindOne('user', {name: 'admin'})
                    let pythonEnv = user.pythonEnv

                    // 调用方法
                    console.log('par: ', par)
                    const ls = cp.spawn(pythonEnv, par);

                    // 创建方法
                    let recordInstance = {
                        'recordId': uuid.v4(),
                        'serviceId': pcsId,
                        'inputArrString': inputArrString,
                        'paramsArrString': paramsArrString,
                        'outputArrString': outputArrString,
                        'status': 'run',
                        'date': utils.formatDate(new Date()),

                        'dataoutId': uuid.v4(),
                        'commandLine': par.join(' '),
                        
                        'outputPath': par[par.length - 1],
                        'serviceName': path.basename(par[0]),
                        'workSpace': workSpace
                    }
                    res.send({code: 0, data: recordInstance})
                    record.create(recordInstance, (err, doc) => {
                        if(err) {
                            reject()
                            return
                        }
                        // let result = doc._doc
                        // if(!result || typeof result === 'string'){
                        //     res.send({code: -1})
                        //     return
                        // }
                        // res.send({code: 0, data: result})
                    })
                        

                    ls.on('exit', (code) => {
                        updateRecord(recordInstance.recordId, code)
                    }) 
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
 * @returns downloadUrl  下载的url
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
                let temp = JSON.parse(body)
                if(temp.code === 1) {
                    let downloadUrl = dataContainer+'/data/' + temp.data.id
                    resolve(downloadUrl)
                } else {
                    reject(temp)
                }

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
            res.send({code: 0, data: {'downloadUrl': result}})
        }).catch((err) =>
            res.send({code: -1})
        )

    })
}

exports.invokeLocally = invokeLocally
exports.uploadData = uploadData
exports.findRecord = findRecord