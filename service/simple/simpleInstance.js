// 数据实例的存储
const fs = require('fs')
const stat = fs.stat;
const formidable = require('formidable');
const uuid = require('node-uuid')
const date = require('silly-datetime')
const path = require('path')
const archiver = require('archiver')
const dataStoragePath = __dirname + '/../../dataStorage'
const utils=require('../../utils/utils.js')
const BagPipe = require('bagpipe');

const Instances = require('../../model/instances.js').instances;

// 接收参数
exports.simpleNewFolder = function (req, res, next) {
    let form = new formidable.IncomingForm()
    form.parse(req, (form_err, fields) => {
        if (form_err) {
            res.send({
                code: -1,
                message: 'new folder error!'
            })
            return
        }

        let query = {
            uid: fields.uid,
            type: fields.instype,
        }
        if(fields.userToken) query.userToken = fields.userToken
        if(fields.workSpace) query.workSpace = fields.workSpace
        let newFolder = {
            id: fields.id,
            oid: fields.oid,
            name: fields.name,
            type: fields.type,
            date: fields.date,
            authority: fields.authority,
            path: path.normalize(fields.path),
            isCopy: fields.isCopy,
            isMerge: fields.isMerge,
            keywords: fields.keywords,
            workSpace: fields.workSpace,
        }
        if(fields.xmlPath && fields.xmlPath != '') {
            newFolder['xmlPath'] = path.normalize(fields.xmlPath)
        }
        if (!fs.existsSync(newFolder.path)) {
            console.log('数据文件夹路径不对')
            res.send({
                code: -1,
                message: '数据文件夹路径不对'
            })
            return
        }
        if (newFolder.xmlPath && !fs.existsSync(newFolder.xmlPath)) {
            console.log('元数据文件夹路径不对')
            res.send({
                code: -1,
                message: '元数据文件夹路径不对'
            })
            return
        } else if(newFolder.xmlPath) {
            newFolder['xmlName'] = newFolder['xmlPath'].substr(newFolder['xmlPath'].lastIndexOf('\\') + 1)
        }
        newFolder.meta = {}     // 为了和老版适应，因为老版的 currentPath 是从 meta 里面取的
        newFolder.meta.currentPath = path.normalize(dataStoragePath + '/' + newFolder.id)
        // let readMeArr = ['readme.md', '简介.txt']
        // for(let i = 0; i< readMeArr.length; ++i) {    
        //     let readme = path.normalize(newFolder.path + '/' + readMeArr[i])
        //     if(fs.existsSync(readme)) {
        //         newFolder.readme = readme
        //     }
        // }

        stat(newFolder.path, (error, stats) => {
            if(error) {
                res.send({code: -1, messag: error})
                return 
            }
            if(stats.isDirectory()) {
                createFolderInstance(query, newFolder).then(() => {
                    res.send({code: 0, data:{'dataId': newFolder.id}})
                }).catch(err => {
                    res.send({code: -1, message: err})
                })
            } else if(stats.isFile()) {
                createFileInstance(query, newFolder).then(() => {
                    res.send({code: 0, data:{'dataId': newFolder.id}})
                }).catch(err => {
                    res.send({code: -1, message: err})
                })
            } else {
                res.send({code: -1})
            }
        })

        
        // if (newFolder.isMerge) { // merge 就直接全部创建成一个 instance
        //     updateInstance(query, [newFolder]).then(() => {
        //         res.send({code: 0})
        //         if(newFolder.isCopy) {
        //             copyInstance(newFolder.path, newFolder.meta.currentPath)
        //             addZipFile(newFolder.path, newFolder.meta.currentPath + '.zip')
        //         }
        //     })
        // } else {
        //     let subContentId = uuid.v4()
        //     newFolder.subContentId = subContentId
        //     updateInstance(query, [newFolder]).then((result) => {
        //         res.send({code: 0})
        //         let newInstance = {
        //             uid: subContentId,
        //             userToken: result.userToken,
        //             type: result.type,
        //             parentLevel: parseInt(result.parentLevel) + 1 + '',
        //             list: [],
        //             workSpace: result.workSpace,
        //         }
        //         let _query = {
        //             type: result.type,
        //             userToken: result.userToken,
        //             uid: subContentId,
        //             workSpace: result.workSpace
        //         }
        //         createInstance(newInstance).then(() => {
        //             getFilesPath(newFolder, res).then((pathArr) => {
        //                 addInstances(_query, pathArr).then(() => {
        //                 }).catch(() => {
        //                     res.send({code: -1})
        //                 })
                        
        //             }).catch(err => {
        //                 console.log(err)
        //                 res.send({code: -1})
        //                 throw err;
        //             })
        //         })
        //     })
        // }
    })
}

// 从外网创建一个Instance，未完成
exports.createInstFromUrl = (req, res, next) => {
    console.log('req: ', req)
    // let data = JSON.parse(req.body)
    res.send({code: 0})
    return
}

/**
 * 
 * @param {*} query 查询条件
 * @param {*} newFolder 创建实例的文件夹
 * @returns 返回 newInstance instance里面的一条新的纪录
 */
function createFolderInstance(query, newFolder) {
    return new Promise((resolve, reject) => {
        if (newFolder.isMerge) { // merge 就直接全部创建成一个 instance
            updateInstance(query, [newFolder]).then(() => {
                resolve(newFolder)
                if(newFolder.isCopy) {
                    copyInstance(newFolder.path, newFolder.meta.currentPath)
                    addZipFile(newFolder.path, newFolder.meta.currentPath + '.zip')
                }
            })
        } else {
            let subContentId = uuid.v4()
            newFolder.subContentId = subContentId
            updateInstance(query, [newFolder]).then((result) => {
                
                let newInstance = {
                    uid: subContentId,
                    type: result.type,
                    parentLevel: parseInt(result.parentLevel) + 1 + '',
                    list: [],
                }
                if(result.userToken) newInstance.userToken = result.userToken
                if(result.workSpace) newInstance.workSpace = result.workSpace
                let _query = {
                    type: result.type,
                    uid: subContentId,
                }
                if(result.userToken) _query.userToken = result.userToken
                if(result.workSpace) _query.workSpace = result.workSpace
                createInstance(newInstance).then(() => {
                    resolve()
                    getFilesPath(newFolder).then((pathArr) => {
                        addInstances(_query, pathArr).then(result => {
                        }).catch((err) => {
                            console.log(err)
                            throw err;
                        })
                        
                    }).catch(err => {
                        console.log(err)
                        throw err;
                    })
                })
            })
        }
    })
}

function createFileInstance(query, newFolder) {
    return new Promise((resolve, reject) => {
        if(newFolder.type === 'folder') newFolder.type = 'file'
        newFolder.meta = {}
        if(newFolder.isCopy) {
            newFolder.meta.currentPath = path.normalize(dataStoragePath + '/' + uuid.v4())
            copyInstance(newFolder.path, newFolder.meta.currentPath)
        } else {
            newFolder.meta.currentPath = newFolder.path
        }
        updateInstance(query, newFolder).then(() => {
            resolve()
        }).catch(err => reject(err))
    })
}

function getFilesPath(folder) {        // 得到文件夹数组和文件数组
    return new Promise(function (resolve, reject) {
        console.log('get file path')
        fs.readdir(folder.path, (err, files) => {
            if (err) {
                throw err
                return
            }
            let pathArr = []
            if(files.length < 30000) {
                files.forEach(file => {
                    let tempV4 = uuid.v4()
                    let obj = {
                        id: tempV4,
                        oid: folder.oid,
                        name: file,
                        date: utils.formatDate(new Date()),
                        authority: folder.authority,
                        path: path.normalize(folder.path + '/' + file),
                        meta: {},
                        isCopy: folder.isCopy
                    }
                    if(folder.workSpace) {
                        obj.workSpace = folder.workSpace
                    }
                    if(folder.xmlName) {
                        obj[xmlName] = folder.xmlName
                    }
                    if(folder.isCopy)
                        obj.meta.currentPath = path.normalize(dataStoragePath + '/' + tempV4)
                    else
                        obj.meta.currentPath = obj.path
                    let st = fs.statSync(obj.path)
                    if(st.isFile()){
                        obj.type = 'file'
                    } else {
                        obj.type = 'folder'
                        obj.subContentId = tempV4
                    }
                    pathArr.push(obj)
                }) 
            } else {
                files.forEach(file => {
                    let tempV4 = uuid.v4()
                    let obj = {
                        id: tempV4,
                        name: file,
                        type: 'file',
                        isCopy: folder.isCopy
                    }
                    pathArr.push(obj)
                })
            }

            resolve(pathArr);
        })
    })
}

function createInstance(newInstance) {
    return new Promise((resolve, reject) => {
        Instances.create(newInstance, (err) => {
            if(err) {
                throw err
            }
            console.log('create instance')
            resolve()
        })

    })
}

function updateInstance(query, pathArr) {
    return new Promise((resolve, reject) => {
        Instances.findOne(query, (find_err, doc)=> {
            if(find_err) {
                reject(find_err)
                return
            }
            doc.list = doc.list.concat(pathArr)
            let result = Instances.update(query, doc, (err) => {
                if(err){
                    reject(err)
                    return;
                }else{
                    console.log('update instances')
                    return 
                } 
            })
            resolve(result._update)
        })
    })
}

// 添加合并的实例
function addInstances(query, pathArr) {
    return new Promise((resolve, reject) => {
        try {
            updateInstance(query, pathArr).then((result) => {
                addFiles(pathArr)
                for(let i = 0; i < pathArr.length; ++i) {
                    let path = pathArr[i]
                    if(path.type === 'file'){
                        continue
                    }
                    let newInstance = {
                        uid: path.id,
                        type: query.type,
                        parentLevel: parseInt(result.parentLevel) + 1 + '',
                        list: [],
                    }
                    if(result.userToken) newInstance.userToken = result.userToken
                    if(result.workSpace) newInstance.workSpace = result.workSpace
                    let _query = {
                        type: query.type,
                        uid: path.id,
                    }
                    if(result.userToken) _query.userToken = result.userToken
                    if(result.workSpace) _query.workSpace = result.workSpace
                    createInstance(newInstance).then(() => {
                        getFilesPath(path).then((_pathArr) => {
                            addInstances(_query, _pathArr)
                            resolve(result)
                        })
                    })
                }
            })
        } catch (error) {
            reject(error)
        }
    } )

}

function addFiles(pathArr) {
    let bagPipeCopyFile  = new BagPipe(10)
    for(let i = 0; i < pathArr.length; ++i) {
        let path = pathArr[i]
        if(path.type === 'file' && path.isCopy){
            let srcPath = path.path,
                destPath = path.meta.currentPath,
                name = path.name
            bagPipeCopyFile.push(fs.mkdir, destPath, (err) => {
                if(err) throw err
                stat(srcPath, (err, st) => {
                if(err) {
                    throw err
                }
                if(st.isFile()) {
                    readable = fs.createReadStream(srcPath);
                    writable = fs.createWriteStream(destPath + '/' + name);
                    // 通过管道来传输流
                    readable.pipe(writable);
                } else if (st.isDirectory()) {
                    copyDirectory(srcPath, destPath)
                }
                })
                addZipFile(srcPath, destPath + '.zip')
            })
        }
    }
}

function copyInstance(srcPath, destPath, name) {
    fs.mkdir(destPath, (err) => {
        if(err) {
            throw err
        }
        stat(srcPath, (err, st) => {
            if(err) {
                throw err
            }
            if(st.isFile()) {
                readable = fs.createReadStream(srcPath);
                writable = fs.createWriteStream(destPath + '/' + name);
                // 通过管道来传输流
                readable.pipe(writable);
            } else if (st.isDirectory()) {
                copyDirectory(srcPath, destPath)
            }
        })
    })   
}

function copyDirectory(srcPath, destPath) {
    // 读取目录中的所有文件/目录
    fs.readdir(srcPath, function (err, paths) {
        if (err) {
            throw err;
        }

        let bagPipeCopyFile = new BagPipe(10)
        // 要用并发的写法
        for(let i = 0; i < paths.length; ++i) {
            let _srcPath = srcPath + '/' + paths[i],
                _destPath = destPath + '/' + paths[i],
                readable, writable;
            bagPipeCopyFile.push(stat, _srcPath, (err, st) => {
                if(err) {
                    throw err
                }
                // 判断是否为文件
                if (st.isFile()) {
                    // 创建读取流
                    readable = fs.createReadStream(_srcPath);
                    // 创建写入流
                    writable = fs.createWriteStream(_destPath);
                    // 通过管道来传输流
                    readable.pipe(writable);
                }
                // 如果是目录则递归调用自身
                else if (st.isDirectory()) {
                    fs.exists( _destPath, (exists) => {
                        if(exists) {
                            copyDirectory(_srcPath, _destPath)
                        } else {
                            fs.mkdir(_destPath, () => {
                                copyDirectory(_srcPath, _destPath)
                            })
                        }
                    })
                }
            })
        }
    });
}

function addZipFile(srcPath, destPath) {
    var output = fs.createWriteStream(destPath);
    
    var archive = archiver('zip', {
        store: false 
    });
    output.on('close', function () {

    });
    archive.on('end', (err) => {
        return
    })
    archive.on('error', function (err) {
        throw err
        return
    });
    stat(srcPath, (err, st) => {
        archive.pipe(output);
        if(err) {
            throw err
        }
        if(st.isFile()) {
            archive.file(srcPath)
        } else if (st.isDirectory()) {
            archive.directory(srcPath, '/')
        }
        archive.finalize();
    })
}

exports.createFolderInstance = createFolderInstance