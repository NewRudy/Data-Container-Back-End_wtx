const fs = require('fs')
const stat = fs.stat;
const formidable = require('formidable');
const uuid = require('node-uuid')
const date = require('silly-datetime')
const path = require('path')
const archiver = require('archiver')
const dataStoragePath = __dirname + '/../../dataStorage'
const utils=require('../../utils/utils.js')


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
            folder: fields.folder,
            xmlFolder: fields.xmlFolder,
            isMerge: fields.isMerge
        }

        if (!fs.existsSync(newFolder.folder)) {
            console.log('数据文件夹路径不对')
            res.send({
                code: -1,
                message: '数据文件夹路径不对'
            })
            return
        }
        if (newFolder.xmlFolder != '' && !fs.existsSync(newFolder.xmlFolder)) {
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
            let readme = path.normalize(newFolder.folder + '/' + readMeArr[i])
            if(fs.existsSync(readme)) {
                newFolder.readme = readme
            }
        }

        if (newFolder.isMerge) { // merge 就直接全部创建成一个 instance
            getFilesPath(newFolder.folder, res).then((pathArr) => {
                newFolder['currentPathFiles'] = pathArr;
                updateFilesInstance(query, [newFolder], res)
                res.send({code: 0})
            })
        } else {
            updateFolderInstance(query, newFolder, res)
            res.send({code: 0, message: 'success'})
        }
    })
}

function getFilesPath(folderPath, res) {
    return new Promise(function (resolve, reject) {
        console.log('get file path')
        fs.readdir(folderPath, (err, files) => {
            if (err) {
                res.send({
                    code: -1,
                    message: 'file path is not exist!'
                })
                return
            }
            let pathArr = []
            files.forEach(v => {
                let obj = {}
                obj['name'] = v
                obj['path'] = path.normalize(folderPath + '/' + v)
                pathArr.push(obj)
            })
            resolve(pathArr);
        })
    })
}

// 添加一个文件夹实例, 文件下的所有文件添加为这个文件夹目录下的实例
function updateFolderInstance(query, folder, res) {
    console.log('update a folder instance')
    Instances.findOne(query, (find_err, doc) => {
    let newInstanceUid = uuid.v4()
    folder.subContentId = newInstanceUid
    doc.list.unshift(folder)
    let result = Instances.update(query,doc,(err)=>{
        if(err){
            res.send({code:-1,message:'error'})
            return;
        }else{
            console.log('添加完文件夹')
            return 
        } 
    })
    
    let newInstance = {
        uid: newInstanceUid,
        userToken: query.userToken,
        type: query.type,
        parentLevel: parseInt(result._update.parentLevel) + 1 + '',
        list: []
    }
    let _query = {}
    _query.type = query.type
    _query.userToken = query.userToken
    _query.uid = newInstanceUid

    Instances.create(newInstance, (err) => {
        if(err) {
            res.send({code: -1})
            return
        }
    })

    getFilesPath(folder.folder, res).then((pathArr) => {
        let fileArr = []
        for(let i = 0; i < pathArr.length; ++i) {
            let file = pathArr[i]
            // stat(pathArr[i].path, function(err, st) {
            //     if(err) {
            //         throw err
            //     }
            //     let temp = {}
            //     temp.id = uuid.v4()
            //     temp.oid = folder.oid
            //     temp.name = file.name
            //     temp.date = utils.formatDate(new Date())
            //     temp.authority = folder.authority
            //     temp.folder = file.path
            //     temp.isMerge = false 
            //     temp.meta = {}
            //     temp.meta.currentPath = path.normalize(dataStoragePath + '/' + temp.id)
            //     if(st.isFile()) {
            //         temp.type = 'file'
            //         fileArr.push(temp)
            //     } 
            //     else if (st.isDirectory()) {
            //         temp.subContentId = ''
            //         temp.type = 'folder'
            //         updateFolderInstance(_query, temp, res)
            //     }
            // })
            // 这里需要采用同步的写法
            let st = fs.statSync(file.path)
            let temp = {}
            temp.id = uuid.v4()
            temp.oid = folder.oid
            temp.name = file.name
            temp.date = utils.formatDate(new Date())
            temp.authority = folder.authority
            temp.folder = file.path
            temp.isMerge = false 
            temp.meta = {}
            temp.meta.currentPath = path.normalize(dataStoragePath + '/' + temp.id)
            if(st.isFile()) {
                temp.type = 'file'
            } 
            else if (st.isDirectory()) {
                temp.type = 'folder'
                updateFolderInstance(_query, temp, res)
            }
            fileArr.push(temp)
        }
        if(fileArr.length != 0) {
            updateFilesInstance(_query, fileArr, res)
        }
    })
    })
}

// 添加一个或多个文件实例
function updateFilesInstance(query, files, res) {
    console.log('update a file instance')
    Instances.findOne(query, (find_err, doc) => {
        if (find_err) {
            res.send({
                code: -1,
                message: 'new file error!'
            })
            return
        }
        for(let i = 0; i < files.length; ++i) {
            doc.list.unshift(files[i])
        }
        Instances.update(query, doc, (update_err) => {
            if (update_err) {
                res.send({
                    code: -1,
                    message: 'new file error!'
                })
                return
            }
            // 复制文件
            // fs.access(file.currentPath, fs.constants.F_OK | fs.constants.W_OK, (err, file) => {
            //     if (err) {
            //       console.error(
            //         `${file} ${err.code === 'ENOENT' ? '不存在' : '只可读'}`);
            //       fs.mkdirSync(file.currentPath)
            //     }
            //     if (file.type === 'merge') {
            //         copyDirectory(file.folder, file.currentPath)
            //     } else {
            //         fs.copyFile(file.srcPath, file.currentpath)
            //     }
            //   });
            for(let i = 0; i < files.length; ++i) {
                if(files[i].type === 'folder' && !files[i].isMerge) continue
                fs.mkdirSync(files[i].meta.currentPath)      
                stat(files[i].folder, (err, st) => {
                    if(err) {
                        throw err
                    }
                    if(st.isFile()) {
                        readable = fs.createReadStream(files[i].folder);
                        writable = fs.createWriteStream(files[i].meta.currentPath + '/' + files[i].name);
                        // 通过管道来传输流
                        readable.pipe(writable);
                    } else if (st.isDirectory()) {
                        copyDirectory(files[i].folder, files[i].meta.currentPath)
                    }
                    addZipFile(files[i].id, files[i].folder, res)
                })
            }
        })
    })
}



function addZipFile(id, folderPath, res) {
    console.log('add zip file')
    var output = fs.createWriteStream(__dirname + '/../../dataStorage/' + id + '.zip');

    var archive = archiver('zip', {
        store: false // Sets the compression method to STORE. 
    });

    // listen for all archive data to be written 
    output.on('close', function () {

    });
    archive.on('end', (err) => {
        console.log(newFile.name, " zip original zip data without config data success")
        // res.send({code: 0})
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
    // archive.pipe(output);
    // // append files or directory 
    stat(folderPath, (err, st) => {
        archive.pipe(output);
        if(err) {
            throw err
        }
        if(st.isFile()) {
            archive.file(folderPath)
        } else if (st.isDirectory()) {
            archive.directory(folderPath, '/')
        }
        archive.finalize();
    })
    // archive.directory(folderPath, '/');
    // // finalize the archive (ie we are done appending files but streams have to finish yet) 
    // archive.finalize();
}

function copyDirectory(src, dest) {
    // 读取目录中的所有文件/目录
    fs.readdir(src, function (err, paths) {
        if (err) {
            throw err;
        }

        paths.forEach(function (path) {
            var _src = src + '/' + path,
                _dst = dest + '/' + path,
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
                    exists(_src, _dst, copyDirectory);
                }
            });
        });
    });
}

// 在复制目录前需要判断该目录是否存在，不存在需要先创建目录
var exists = function( src, dst, callback ){
    fs.exists( dst, function( exists ){
        // 已存在
        if( exists ){
            callback( src, dst );
        }
        // 不存在
        else{
            fs.mkdir( dst, function(){
                callback( src, dst );
            });
        }
    });
};