const fs = require('fs')
const stat = fs.stat;
const formidable = require('formidable');
const uuid = require('node-uuid')
const date = require('silly-datetime')
const path = require('path')
const archiver = require('archiver')
const dataStoragePath = __dirname + '/../../dataStorage'
const utils=require('../../utils/utils.js')
const Bagpipe = require('bagpipe');

const Instances = require('../../model/instances.js').instances;
const instances = require('../instances')
let newFile = require('../instances').newFile;

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
            userToken: fields.userToken,
        }
        let newFolder = {
            id: fields.id,
            oid: fields.oid,
            name: fields.name,
            type: fields.type,
            date: fields.date,
            authority: fields.authority,
            path: fields.path,
            isMerge: fields.isMerge
        }
        if(fields.xmlFolder) {
            newFolder['xmlPath'] = fields.xmlPath
        }

        if (!fs.existsSync(newFolder.path)) {
            console.log('数据文件夹路径不对')
            res.send({
                code: -1,
                message: '数据文件夹路径不对'
            })
            return
        }
        if (newFolder.xmlPath && newFolder.xmlPath != '' && !fs.existsSync(newFolder.xmlPath)) {
            console.log('元数据文件夹路径不对')
            res.send({
                code: -1,
                message: '元数据文件夹路径不对'
            })
            return
        }
        newFolder.meta = {}     // 为了和老版适应，因为老版的 currentPath 是从 meta 里面取的
        newFolder.meta.currentPath = path.normalize(dataStoragePath + '/' + newFolder.id)
        let readMeArr = ['readme.md', '简介.txt']
        for(let i = 0; i< readMeArr.length; ++i) {       // 有一个就好
            let readme = path.normalize(newFolder.path + '/' + readMeArr[i])
            if(fs.existsSync(readme)) {
                newFolder.readme = readme
            }
        }

        if (newFolder.isMerge) { // merge 就直接全部创建成一个 instance
            updateInstance(query, [newFolder]).then(() => {
                copyInstance(newFolder.path, newFolder.meta.currentPath)
                addZipFile(newFolder.path, newFolder.meta.currentPath + '.zip')
                res.send({code: 0})
            })
        } else {
            getFilesPath(newFolder, res).then((pathArr) => {
                addInstances(query, pathArr)
            }).catch(err => {
                console.log(err)
                throw err;
            })
            res.send({code: 0})
        }
    })
}

function getFilesPath(folder, res) {        // 得到文件夹数组和文件数组
    return new Promise(function (resolve, reject) {
        console.log('get file path')
        fs.readdir(folder.path, (err, files) => {
            if (err) {
                res.send({
                    code: -1,
                    message: 'file path is not exist!'
                })
                return
            }
            let pathArr = []
            files.forEach(file => {
                let tempV4 = uuid.v4()
                let obj = {
                    id: tempV4,
                    oid: folder.oid,
                    name: file,
                    date: utils.formatDate(new Date()),
                    authority: folder.authority,
                    path: path.normalize(folder.path + '/' + file),
                    meta: {}
                }
                obj.meta.currentPath = path.normalize(dataStoragePath + '/' + tempV4)
                let st = fs.statSync(obj.path)
                if(st.isFile()){
                    obj.type = 'file'
                } else {
                    obj.type = 'folder'
                    obj.subContentId = tempV4
                }
                pathArr.push(obj)
            }) 
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
        })
        resolve()
    })
}

function updateInstance(query, pathArr) {
    return new Promise((resolve, reject) => {
        Instances.findOne(query, (find_err, doc)=> {
            if(find_err) {
                console.log('instance 还未创建')
                return
            }
            doc.list = doc.list.concat(pathArr)
            let result = Instances.update(query, doc, (err) => {
                if(err){
                    throw err
                    return;
                }else{
                    console.log('update instances')
                    return 
                } 
            })
            resolve(result._update.parentLevel)
        })
    })
}


// 添加合并的实例
function addInstances(query, pathArr) {
    updateInstance(query, pathArr).then((result) => {
        pathArr.forEach(path => {
            if(path.type === 'file'){
                copyInstance(path.path, path.meta.currentPath, path.name)
                addZipFile(path.path, path.meta.currentPath + '.zip')
                return
            }
            let newInstance = {
                uid: path.id,
                userToken: query.userToken,
                type: query.type,
                parentLevel: parseInt(result) + 1 + '',
                list: []
            }
            let _query = {
                type: query.type,
                userToken: query.userToken,
                uid: path.id
            }
            createInstance(newInstance).then(() => {
                getFilesPath(path).then((_pathArr) => {
                    addInstances(_query, _pathArr)
                })
            })
        })

    })
}

function copyInstance(srcPath, destPath, name) {
    fs.mkdir(destPath, (err) => {
        if(err) {
            throw err
            return
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

        let bagPipeCopyFile = new Bagpipe(500)
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
    console.log('add zip file')
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
