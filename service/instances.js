const fs = require('fs')
const stat = fs.stat;
const formidable = require('formidable');
const uuid = require('node-uuid')
const date = require('silly-datetime')
const archiver = require('archiver')

const utils = require('../utils/utils.js')
const dataStoragePath = __dirname + '/../dataStorage'
const path = require('path')
const instances = require('../model/instances.js');
const user = require('../model/user');
const workspace = require('../model/workSpace.js');

const {
    Console
} = require('console');
const {
    query
} = require('express');
const { Resolver } = require('dns');

var Instances = instances.instances;

var User = user.User;

var workSpace = workspace.workSpace;

function getWorkSpaceUid(req, query) {
    return new Promise((resolve, reject) => {
        if(req.query.workSpace) {
            query.workSpace = req.query.workSpace
        } else {
            workSpace.findOne({'name': 'initWorkspace'}, (err, doc) => {
                if(err) {
                    res.send({
                        code: -1,
                        message: 'workspace err'
                    })
                }
                query.workSpace = doc.uid
                resolve()
            })
        }
        resolve()
    })
}

// 这个应该是空目录的情况下
exports.instances = function (req, res, next) {

    if (!req.session.user) {
        res.send({
            code: -2,
            message: 'relogin'
        })
        return;
    }
    //依据会话判断用户
    let userToken = req.session.user.token
    let query = {
        uid: req.query.uid || '0',
        userToken: userToken,
        type: req.query.type,
    }
    getWorkSpaceUid(req, query).then(() => {
        let page = {}
        page.currentPage = req.query.currentPage? req.query.currentPage : 1
        page.pageSize = req.query.pageSize? req.query.pageSize : 10
        Instances.findOne(query, (err, doc) => {
            if (err) {
                res.send({
                    code: -1,
                    message: 'instances error'
                })
                return
            }
            //找不到列表时初始化列表
            if (!doc) {
                //若是第一层则直接用uid=0,parentLevel=-1
                let initInstances = {
                    uid: req.query.uid,
                    userToken: userToken,
                    type: req.query.type,
                    parentLevel: req.query.parentLevel,
                    list: []
                }
    
                //从第二层起，由文件夹新建instances，则生成id
                if (req.query.subContConnect) {
                    var new_instance_uid = uuid.v4()
                    initInstances.uid = new_instance_uid
                    var subC = JSON.parse(req.query.subContConnect) //解析JSON字符串
                    initInstances.parentLevel = subC.uid //关联父级列表id
                }
    
                // 初始化工作空间
                workSpace.findOne({
                    'uid': query.workSpace
                }, (err, initWorkSpace) => {
                    //Instance添加工作空间id描述
                    initInstances['workSpace'] = initWorkSpace.uid
    
                    if (req.query.type == 'Data') {
    
                        initWorkSpace['dataRoot'] = req.query.uid
    
                    } else if (req.query.type == 'Processing') {
    
                        initWorkSpace['pcsRoot'] = req.query.uid
    
                    } else if (req.query.type == 'Visualization') {
    
                        initWorkSpace['visualRoot'] = req.query.uid
    
                    }
    
    
    
    
                    Instances.create(initInstances, (err) => {
                        if (err) {
                            res.send({
                                code: -1,
                                message: 'instances error'
                            })
                            return
                        }
    
                        //工作空间添加根目录描述 
                        workSpace.updateOne({
                            'uid': query.workSpace
                        }, initWorkSpace, (err, rawData) => {
    
                            if (req.query.subContConnect) { //在进入文件夹时，关联文件夹与新的instances
                                Instances.findOne({
                                    uid: subC.uid,
                                    type: req.query.type
                                }, (err, con_inst_doc) => {
                                    if (!con_inst_doc || err) {
                                        res.send({
                                            code: -1,
                                            message: 'instances error'
                                        })
                                        return
                                    } else {
    
    
                                        for (let i = 0; i < con_inst_doc.list.length; i++) {
                                            if (con_inst_doc.list[i].id === subC.id) {
                                                con_inst_doc.list[i].subContentId = new_instance_uid; //关联文件指向子instance
                                                Instances.update({
                                                    uid: subC.uid,
                                                    type: req.query.type
                                                }, con_inst_doc, (err) => {
                                                    if (err) {
                                                        res.send({
                                                            code: -1,
                                                            message: 'instances error'
                                                        })
                                                        return
                                                    }
                                                    console.log('update folder subinstance id')
    
    
                                                    res.send({
                                                        code: 0,
                                                        data: initInstances
                                                    });
                                                    return;
                                                });
                                            }
                                        }
    
                                    }
                                })
                            } else {
                                console.log('create instances')
                                res.send({
                                    code: 0,
                                    data: initInstances
                                });
                                return
                            }
                        })
                    })
                    
                })
    
            } else {
                console.log('find instances')
                let total = doc.list.length
    
                doc.list = doc.list.slice(page.pageSize * (page.currentPage - 1), page.pageSize * page.currentPage)
    
                res.send({
                    code: 0,
                    data: doc._doc,
                    total: total
                })
                return
            }
        });
    })
}
//新文件夹
exports.newInstance = function (req, res, next) {

    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, file) {
        let query = {
            uid: fields.uid || '0',
            userToken: fields.userToken,
            type: fields.type,

        }
        if(fields.workSpace) {
            query.workSpace = fields.workSpace
        }
        Instances.findOne(query, (err, doc) => {
            if(!doc && fields.workSpace) {      // 没有查到且有 workspace 的情况代表这里应该有表的
                query.parentLevel = '-1'
                Instances.create(query, (err, createDoc) => {
                    createDoc.list.unshift(fields.data)
                    Instances.update(query, createDoc, (err) => {
                        if (err) {
                            res.send({
                                code: -1,
                                message: 'error'
                            })
                            return;
                        } else {
                            res.send({
                                code: 0,
                                data: fields.data
                            })
                            return
                        }
        
        
                    })
                })
            } else {
                let tempData = {}
                let id = uuid.v4()
                fields.data.subContentId = id
                tempData.uid = id
                tempData.list = []
                tempData.userToken = fields.userToken 
                tempData.type = fields.type 
                tempData.parentLevel = parseInt(fields.parentLevel) + 1 + ''
                tempData.workSpace = fields.workSpace
                Instances.create(tempData, (createErr, createDoc) => {
                    if(createErr) {
                        res.end({code: -1})
                        return
                    }
                    doc.list.unshift(fields.data)
                    Instances.update(query, doc, (err) => {
                        if (err) {
                            res.send({
                                code: -1,
                                message: 'error'
                            })
                            return;
                        } else {
                            res.send({
                                code: 0,
                                data: fields.data
                            })
                            return
                        }
        
        
                    })
                })
            }
        })



    })
}
//新文件
exports.newFile = function (req, res, next) {

    var form = new formidable.IncomingForm()
    form.parse(req, (form_err, fields, file) => {

        if (form_err) {
            res.send({
                code: -1,
                message: 'new file error!'
            })
            return
        }

        let query = {
            uid: fields.uid,
            type: fields.instype,
            userToken: fields.userToken,
        }
        if(fields.workSpace) {
            query.workSpace = req.query.workSpace
        }
        let newFile = {
            id: fields.id,
            oid: fields.oid,
            name: fields.name,
            date: fields.date,
            type: fields.type,
            authority: fields.authority,
            meta: fields.meta
        }

        //将string 的meta转为json
        if (typeof (newFile.meta) === 'string') {
            newFile.meta = JSON.parse(newFile.meta);
        }

        newFile.meta.currentPath = path.normalize(dataStoragePath + '/' + newFile.id) //存到当前系统下的路径

        function operation() {
            return new Promise(function (resolve, reject) {
                fs.readdir(newFile.meta.dataPath, (err, filesItem) => {
                    if (err) {
                        res.send({
                            code: -1,
                            message: 'file path is not exist!'
                        })
                        return
                    }
                    let pathArr = []
                    filesItem.forEach(v => {
                        let obj = {}
                        obj['name'] = v
                        obj['path'] = newFile.meta.currentPath + '/' + v

                        pathArr.push(obj)
                    })
                    newFile['currentPathFiles'] = pathArr;
                    resolve(filesItem);

                })
            })
        }
        operation().then((data) => {
            console.log(data);
            Instances.findOne(query, (find_err, doc) => {
                if (find_err) {
                    res.send({
                        code: -1,
                        message: 'new file error!'
                    })
                    return
                } else {
                    doc.list.unshift(newFile)
                    Instances.update(query, doc, (update_err) => {
                        if (update_err) {
                            res.send({
                                code: -1,
                                message: 'new file error!'
                            })
                            return
                        } else {
                            fs.readdir(newFile.meta.dataPath, (err, filesItem) => {
                                if (filesItem == null || filesItem.length === 0) {
                                    res.send({
                                        code: -1,
                                        message: 'new file error!'
                                    })
                                    return
                                } else {

                                    //单文件直接拷贝到指定目录下
                                    console.log("s")
                                    exists(newFile.meta.dataPath, newFile.meta.currentPath, copy)

                                    var output = fs.createWriteStream(__dirname + '/../dataStorage/' + newFile.id + '.zip');

                                    var archive = archiver('zip', {
                                        store: false // Sets the compression method to STORE. 
                                    });

                                    // listen for all archive data to be written 
                                    output.on('close', function () {
                                        console.log(archive.pointer() + ' total bytes');
                                        console.log('archiver has been finalized and the output file descriptor has closed.');

                                    });
                                    archive.on('end', (err) => {
                                        console.log(newFile.name, " zip original zip data without config data success")
                                        res.send({
                                            code: 0,
                                            message: 'ok'
                                        })
                                        return

                                    })
                                    // good practice to catch this error explicitly 
                                    archive.on('error', function (err) {
                                        // throw err;
                                        res.send({
                                            code: -1,
                                            message: err
                                        })
                                        return
                                    });
                                    // pipe archive data to the file 
                                    archive.pipe(output);
                                    // append files from a directory 
                                    archive.directory(newFile.meta.dataPath, '/');
                                    // finalize the archive (ie we are done appending files but streams have to finish yet) 
                                    archive.finalize();



                                }



                            })
                        }
                    })
                }
            })
        })


        // fs.readdir(newFile.meta.dataPath,(err,filesItem)=>{
        //     if(err){
        //         res.send({code:-1,message:'new file error!'})
        //         return
        //     }
        //     let pathArr=[]
        //     filesItem.forEach(v=>{
        //         let obj={}
        //         obj['name']=v
        //         obj['path']=newFile.meta.currentPath+'/'+v

        //         pathArr.push(obj) 
        //     })
        //     newFile['currentPathFiles']=pathArr;

        // })




    })



}

var copy = function (src, dst) {
    // 读取目录中的所有文件/目录
    fs.readdir(src, function (err, paths) {
        if (err) {
            throw err;
        }

        paths.forEach(function (path) {
            var _src = src + '/' + path,
                _dst = dst + '/' + path,
                readable, writable;

            stat(_src, function (err, st) {
                if (err) {
                    throw err;
                }

                // 判断是否为文件
                if (st.isFile()) {
                    // 创建读取流
                    readable = fs.createReadStream(_src);
                    // 创建写入流
                    writable = fs.createWriteStream(_dst);
                    // 通过管道来传输流
                    readable.pipe(writable);
                }
                // 如果是目录则递归调用自身
                else if (st.isDirectory()) {
                    exists(_src, _dst, copy);
                }
            });
        });
    });
};
// 在复制目录前需要判断该目录是否存在，不存在需要先创建目录
var exists = function (src, dst, callback) {
    fs.exists(dst, function (exists) {
        // 已存在
        if (exists) {
            callback(src, dst);
        }
        // 不存在
        else {
            fs.mkdir(dst, function () {
                callback(src, dst);
            });
        }
    });
};


//删除条目  老实说，写的感觉并不好，重点是有个bug: 删除文件夹的目录的时候，其子目录条目都未删除
// exports.delInst=function(req,res,next){
//     let query={
//         uid:req.query.uid,
//         type:req.query.instType
//     }
//     Instances.findOne(query,(err,doc)=>{
//         if(err){
//             res.send({code:-1,message:"error"})
//             return
//         }else{

//                 for(let i=0;i<doc.list.length;i++){
//                     if(doc.list[i].id===req.query.id){
//                         var sub=doc.list[i].subContentId
//                         var theId=doc.list[i].id
//                         var delFilePath=doc.list[i]
//                         doc.list.splice(i,1)
//                         Instances.update(query,doc,(err2)=>{
//                             if(err){
//                                 res.send({code:-1,message:"error"})
//                                 return
//                             }else{
//                                 if(delFilePath.type==='file'){
//                                      utils.delDir(delFilePath.meta.currentPath)
//                                      fs.unlinkSync(__filename+'/../../dataStorage/'+theId+'.zip')

//                                 }
//                                 console.log('DEL File',theId)
//                                 res.send({code:0,data:{
//                                     id:theId
//                                 }})
//                                 return

//                             }

//                         })
//                     }
//                 }

//         }

//     })

// }

// 改进版本: 有两种删除，一种是删除一个document， 一种是升级document.list, 两种删除组合一下就能满足删除要求了
exports.delInst = (req, res, next) => {
    let query = {
        uid: req.query.uid,
        type: req.query.instType
    }
    if(req.query.workSpace) {
        query.workSpace = req.query.workSpace
    }
    Instances.findOne(query, (err, doc) => {
        if (err) {
            res.send({
                code: -1
            })
            return
        }
        let index; // 用index是为了不嵌套多了
        for (index = 0; index < doc.list.length; ++index) {
            if (doc.list[index].id === req.query.id) break
        }
        if (index >= doc.list.length) {
            res.send({
                code: -1
            })
            return
        }
        updateInstanceList(query, [doc.list[index].id], res)
        res.send({code: 0, data: {
            id: doc.list[index].id
        }})
    })
}

// 删除一个或多个条目, 删除 list 中含有的 idArr， 简单做法是暴力，但是想写一下哈希, 注意 splice 的方法会改变原始数组,所以从后往前删
function updateInstanceList(query, idArr, res) {
    Instances.findOne(query, (err, doc) => {
        if (err) {
            res.send({
                code: -1
            })
            return
        }

        let map = new Map()
        for (let i = 0; i < doc.list.length; ++i) { // 记录下标用来删除
            map.set(doc.list[i].id, i)
        }
        for (let i = 0; i < idArr.length; ++i) { // -1 标记要删除的元素
            if (map.has(idArr[i])) map.set(idArr[i], -1)
        }
        let delFileArr = []
        let delFolderArr = []
        for (let i = doc.list.length-1; i >= 0; --i) { // 从后往前删不会改变未删值的下标值
            if (map.get(doc.list[i].id) == -1) {
                let temp = doc.list.splice(i, 1)
                if (temp[0].type === 'file') {
                    delFileArr = [...delFileArr, ...temp]
                } else if (temp[0].type === 'folder') {
                    delFolderArr = [...delFolderArr, ...temp]
                }
            }
        }

        Instances.update(query, doc, (update_err) => {
            if (update_err) {
                res.send({
                    code: -1
                })
                return
            }

            if(delFileArr.length != 0) delInstanceFile(delFileArr, res)
            if(delFolderArr.length!= 0) delFolderInstance(delFolderArr, res)
        })
    })
}
// 删除数据容器 instance 对应的文件
function delInstanceFile(delFileArr, res) {
    for (let i = 0; i < delFileArr.length; ++i) {
        //utils.delDir(delFileArr[i].meta.currentPath)
        stat(delFileArr[i].meta.currentPath, (err, st) => {
            if(err) {
                throw err;
            }
            if(st.isDirectory()) {
                utils.delDir(delFileArr[i].meta.currentPage)
            }
        })
        let dataStoragePath = __filename + '/../../dataStorage/' + delFileArr[i].id + '.zip'
        stat(dataStoragePath, (err, st) => {
            if(err) {
                throw err;
            }
            fs.unlinkSync(dataStoragePath)  
        })
        console.log('DEL File', delFileArr[i].id)
    }
}
// 删除一个或多个 instnce, 删除的时候需要删除所有子目录
function delFolderInstance(delFolderArr, res) {
    for (let i = 0; i < delFolderArr.length; ++i) {
        Instances.findOne({
            uid: delFolderArr[i].subContentId
        }, (err, doc) => {
            if (err) {
                res.send({
                    code: -1
                })
                return
            }
            let _delFileArr = []
            let _delFolderArr = []
            for (let i = doc.list.length - 1; i >= 0; --i) { 
                let temp = doc.list[i]
                if(temp.type === 'file'){
                    _delFileArr.push(temp)
                } else if(temp.type === 'folder') {
                    _delFolderArr.push(temp)
                }
            }
            
            if(_delFileArr.length != 0) delInstanceFile(_delFileArr, res)
            if(_delFolderArr.length != 0) delFolderInstance(_delFolderArr, res)
            Instances.findOneAndDelete({uid: delFolderArr[i].subContentId, type: 'Data'}).then( result => {
                console.log('del instance: ', result.uid)
            })
        })
    }
}

// 没有复制的事currentPath， 复制的是dataStoragePath  暂时弃用
function getDownloadPath(item) {
    return new Promise((resolve, reject) => {
        let dataStoragePath = path.normalize(__dirname + '/../upload/'+item.id+'.zip');
        // fs.stat(dataStoragePath, (err, st) => {
        //     if(err) {
        //         fs.stat(item.path, (err2, st2) => {
        //             if(err2) {
        //                 reject(err2)
        //             }
        //             resolve(item.path)
        //         })
        //     }
        //     resolve(dataStoragePath)
        // })
        if(fs.existsSync(dataStoragePath)) {
            resolve(dataStoragePath)
        } else {
            if(fs.existsSync(item.path)) {
                let srcPath = item.path 
                let pathArr = item.path.split('.')
                let destPath = pathArr[0] + '.zip'
                addZipFile(srcPath, destPath, item.name).then(
                    resolve(destPath)
                ).catch(err => reject(err))
            } else {
                reject('both path is none.')
            }
        }
    })
}

function addZipFile(srcPath, destPath, fileName) {
    return new Promise((resolve, reject) => {
        var output = fs.createWriteStream(destPath);
        var archive = archiver('zip', {
            zlib: { level: 9 }
        });
        output.on('close', function () {
    
        });
        archive.on('end', (err) => {
            resolve()
            return
        })
        archive.on('error', function (err) {
            reject(err)
            throw err
            return
        });
        stat(srcPath, (err, st) => {
            archive.pipe(output);
            if(err) {
                reject(err)
                throw err
            }
            if(st.isFile()) {
                archive.file(srcPath, {name: fileName})
            } else if (st.isDirectory()) {
                archive.directory(srcPath, '/')
            }
            archive.finalize();
        })

        // try {
        //     let st = fs.statSync(srcPath);
        //     archive.pipe(output)
        //     if(st.isFile()) {
        //         archive.file(srcPath, {name: fileName})
        //     } else if(st.isDirectory()) {
        //         archive.directory(srcpath, '/')
        //     } else {
        //         console.log('add zip wrong.')
        //     }
        //     archive.finalize()
        // }catch(err) {
        //     console.log('add zip err: ', err)
        //     reject(err)
        // }
    })
}

//数据下载
//uid id 
exports.inSituDownload = function (req, res, next) {

    Instances.findOne({
        'list.id': req.query.id
    }, (err, doc) => {

        if (err || !doc) {
            res.send({
                code: -1,
                message: 'error'
            })
            return
        }
        for (let item of doc.list) {
            if (item.id == req.query.id) {
                if (!item.authority) { //数据权限,没有权限则不能直接下载
                    res.setHeader('fileName', "#")
                    res.send({
                        code: -1,
                        message: 'private'
                    })
                    return
                } else {
                    // getDownloadPath(item).then((resPath) => {
                    //     // 不是压缩文件就在该目录下压缩一个，上传后将压缩文件删除
                    //     let name = item.name.split('.')[0]
                    //     res.setHeader('fileName', escape(name + '.zip'))
                    //     res.attachment(name + '.zip') //告诉浏览器这是一个需要下载的文件，解决中文乱码问题
                    //     res.writeHead(200, {
                    //         'Content-Type': 'application/octet-stream;fileName=' + escape(name + '.zip'), //告诉浏览器这是一个二进制文件
    
                    //     }); //设置响应头
                    //     var readStream = fs.createReadStream(resPath); //得到文件输入流
    
                    //     readStream.on('data', (chunk) => {
                    //         res.write(chunk, 'binary'); //文档内容以二进制的格式写到response的输出流
                    //     });
                    //     readStream.on('end', () => {
                    //         res.end();
                    //         let dataStoragePath = path.normalize(__dirname + '/../upload/'+item.id+'.zip');
                    //         if(!fs.existsSync(dataStoragePath)) {
                    //             fs.unlink(path, (err) => {
                    //                 if(err) {
                    //                     console.log('删除压缩文件失败：', err)
                    //                 }
                    //             })
                    //         }
                    //         return;
                    //     })
                    // }).catch(err => {
                    //     console.log(err)
                    //     res.end({code:-1})
                    // })
                    let dataStoragePath = path.normalize(__dirname + '/../upload/'+item.id+'.zip');
                    let name = item.name.split('.')[0]
                    let srcPath, resPath;

                    res.setHeader('fileName', escape(name + '.zip'))
                    res.attachment(name + '.zip') //告诉浏览器这是一个需要下载的文件，解决中文乱码问题
                    res.writeHead(200, {'Content-Type': 'application/octet-stream;fileName=' + escape(name + '.zip'), //告诉浏览器这是一个二进制文件
                    }); //设置响应头
                    if(fs.existsSync(dataStoragePath)) {
                        resPath = dataStoragePath
                        let readStream = fs.createReadStream(resPath); //得到文件输入流
                        readStream.on('data', (chunk) => {
                            res.write(chunk, 'binary'); //文档内容以二进制的格式写到response的输出流
                        });
                        readStream.on('end', () => {
                            res.end();
                        })
                    } else {
                        if(fs.existsSync(item.path)) {
                            srcPath = item.path 
                            resPath = item.path.split('.')[0] + '.zip'
                            let archive = archiver('zip',{zlib: {level: 9}});
                            archive.on('error',(err) => {res.end({code: -1})})
                            archive.on('end',() => {
                                    let readStream = fs.createReadStream(resPath); //得到文件输入流
                                    readStream.on('data', (chunk) => {
                                        res.write(chunk, 'binary'); //文档内容以二进制的格式写到response的输出流
                                    });
                                    readStream.on('end', () => {
                                        res.end();
                                        fs.unlink(resPath, (err) => {
                                            if(err) console.log('delete zip file err: ', err)
                                        })
                                    })
                            })
                            stat(srcPath, (statErr, st) => {
                                if(statErr) {
                                    throw statErr
                                }
                                archive.pipe(fs.createWriteStream(resPath))
                                if(st.isFile()) {
                                    archive.file(srcPath, {name: item.name})
                                } else if(st.isDirectory()) {
                                    archive.directory(srcPath, '/')
                                }
                                archive.finalize()
                            })
                        } else {
                            reject('both path is none.')
                        }
                    }
                    
                }

            }

        }



    })
}


//权限控制
exports.authority = function (req, res, next) {
    var form = new formidable.IncomingForm()
    form.parse(req, function (err, fields, file) {
        Instances.findOne({
            'list.id': fields.id
        }, (err, doc) => {
            if (err || !doc) {
                res.send({
                    code: -1,
                    message: 'error'
                })
                return
            }

            let item = myFindOne(doc.list, fields.id) //从数组中查到对应项

            if (item) {

                let ind = doc.list.indexOf(item)

                doc.list[ind].authority = Boolean(fields.authority)

                Instances.updateOne({
                    'list.id': fields.id
                }, doc, (err2) => {
                    if (err2) {
                        res.send({
                            code: -1,
                            message: 'error'
                        })
                        return
                    }
                    res.send({
                        code: 0,
                        message: 'ok'
                    })
                    return


                })
            }
        })
    })





}



// 元数据
exports.capability = function (req, res, next) {


    let id = req.query.id
    let type = req.query.type
    let obj = {}

    Instances.findOne({
        'list.id': id,
        type: type
    }, (err, doc) => {
        if (err || !doc) {
            res.send({
                code: -1,
                message: 'error'
            })
            return
        }

        for (let el of doc.list) {
            if (el.id == id) {
                if (type == 'Data') {
                    obj['name'] = el.name
                    obj['date'] = el.date
                    obj['meta'] = el.meta

                } else {
                    obj['name'] = el.name
                    obj['date'] = el.date
                    obj['description'] = el.description
                    obj['dataTemplateOid'] = el.dataTemplateOid != undefined ? el.dataTemplateOid : null
                    obj['paramsCount'] = el.paramsCount != undefined ? el.paramsCount : undefined
                    obj['metaDetail'] = el.metaDetail != undefined ? JSON.parse(el.metaDetail) : undefined

                }
                break
            }
        }

        User.findOne({
            'name': 'admin'
        }, (err, doc) => {
            if (err) {
                res.send({
                    code: -1,
                    data: err
                })
                return
            }
            obj['authorship'] = utils.Decrypt(doc['relatedUser']['email'])
            res.send({
                code: 0,
                data: obj
            })
            return
        })


    })
}

//获取处理方法输入数据项

exports.pcsInputFiles = function (req, res, next) {

    let dataId = req.query.dataId

    Instances.findOne({
        list: {
            $elemMatch: {
                id: dataId
            }
        }
    }, {
        list: {
            $elemMatch: {
                id: dataId
            }
        }
    }, (err, pcsDoc) => {
        if (err) {
            res.send({
                code: -1,
                message: err
            })
            return
        }
        res.send({
            code: 0,
            data: pcsDoc.list[0].currentPathFiles
        })
        return

    })

}