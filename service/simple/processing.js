/*
 * @Author: wutian 
 * @Date: 2021-08-10 09:52:45 
 * @运行服务的js，原来的不敢改，初始目的事运行不复制的批量的文件
 * @Last Modified by: wutian
 * @Last Modified time: 2021-08-10 21:58:05
 */
const uuid = require('node-uuid')
const fs = require('fs')
const path = require('path')
const cp = require('child_process')
const formidable = require('formidable')

const utils = require('../../utils/utils')
const {createFolderInstance} = require('./simpleInstance')

const {record} = require('../../model/runRecord')



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
    
        // 调用方法
        console.log('par: ', par)
        const ls = cp.spawn(pythonEnv, par);
    
        ls.on('exit', (code) => {
            console.log(`子进程使用代码${code}退出`)
            if(code != 0){
                reject('run error')
                return
            }
            record.create({
                'recordId': uuid.v4(),
                'serviceId': pcsId,
                'dataId': dataId,
                'date': utils.formatDate(new Date()),
                'inputPath': input,
                'outputPath': output,
                'serviceName': processMethod.name
            }, (err, doc) => {
                if(err) {
                    reject('create record err.')
                    return
                }
                resolve(doc._doc)
            })
        }) 
    })
}


function invokeMethodForBigData(req, res, next) {
    let form = new formidable.IncomingForm()
    form.parse(req, async function(form_err, fields){
        if(form_err) {
            res.send({code: -1})
            return 
        }

        let pcsId  = fields.pcsId;
        let dataId = fields.dataId;
        let paramsArr = fields.paramsArr
        let workSpace = fields.workSpace
        let token = fields.userToken
        if(!workSpace) {
            let temp = await utils.isFindOne('workSpace', {name: 'initWorkspace'})
            workSpace = temp.uid
        }
        if(!token) {
            let temp = await utils.isFindOne('user', {name: 'admin'})
            token = temp.uid
        }

        // let record = await utils.isFindOne('record', {'serviceId': pcsId, 'dataId': dataId})
        let record
        if(!record) {
            try {
                record = await invoke(pcsId, dataId, paramsArr)
            } catch (error) {
                res.send({code: -1})
            }
        }
        if(!record || typeof record === 'string') res.send({code: -1})
        
        let query = {
            uid: '0',
            type: 'DataOut',
            userToken: token,
            workSpace: workSpace
        }
        let newFolder = {
            id: uuid.v4(),
            oid: '',
            name: record.serviceName + '_result',
            type: 'folder',
            date: utils.formatDate(new Date()),
            authority: 'public',
            path: record.outputPath,
            isCopy: false,
            isMerge: false,
            workSpace: workSpace
        }
        createFolderInstance(query, newFolder, res)
        
    })
}

exports.invokeMethodForBigData = invokeMethodForBigData