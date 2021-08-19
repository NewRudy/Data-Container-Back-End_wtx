const fs = require('fs');
const stat = fs.stat;

const {DataSet} = require('../model/dataList')
const {instances} = require('../model/instances')
const {PUser} = require('../model/PortalUsr')
const {Random }= require('../model/random')
const {record} = require('../model/runRecord')
const {SrcZip} = require('../model/srcZip')
const {StandZip} = require('../model/standZip')
const {UdxZip} = require('../model/udxZip')
const {User} = require('../model/user')
const {VisualLog} = require('../model/visualLog')
const {workSpace} = require('../model/workSpace')

/**
 * 
 * @param {*} modelName model名字
 * @returns model
 */
function returnModel(modelName) {
    switch (modelName) {
        case 'DataSet':
            return DataSet
            break;
        case 'instances':
            return instances
            break;
        case 'portalUsr':
            return PUser
            break;
        case 'random':
            return Random
            break;
        case 'record':
            return record
            break;
        case 'srcZip':
            return SrcZip
            break;
        case 'standZip':
            return StandZip
            break;
        case 'udxZip':
            return UdxZip
            break;
        case 'user':
            return User
            break;
        case 'visualLog':
            return VisualLog
            break;
        case 'workSpace':
            return workSpace
            break;
        default:
            break;
    }
}
/**
 * 
 * @param {*} modelName 模型的名字
 * @param {*} searchCont 查询内容
 * @returns 返回查询一个的结果
 */
function isFindOne(modelName, searchCont) {
    return new Promise((resolve, reject) => {
        const model = returnModel(modelName)
        if(!model) {
            console.log('model name is wrong.')
            return
        } 
        model.findOne(searchCont, (err, res) =>{
            if(err) {
                console.log('findOne err: ', err)
                reject(err)
            }
            resolve(res)
        })
    })
}



//删除文件夹
function delDir(path){
    let files = [];
    if(fs.existsSync(path)){
        files = fs.readdirSync(path);
        files.forEach((file, index) => {
            let curPath = path + "/" + file;
            if(fs.statSync(curPath).isDirectory()){
                delDir(curPath); //递归删除文件夹
            } else {
                fs.unlinkSync(curPath); //删除文件
            }
        });
        fs.rmdirSync(path);
    }
}

//


/*
05
 * 复制目录中的所有文件包括子目录
06
 * @param{ String } 需要复制的目录
07
 * @param{ String } 复制到指定的目录
08
 */
var copy = function( src, dst ){
    // 读取目录中的所有文件/目录
    fs.readdir( src, function( err, paths ){
        if( err ){
            throw err;
        }
  
        paths.forEach(function( path ){
            var _src = src + '/' + path,
                _dst = dst + '/' + path,
                readable, writable;      
  
            stat( _src, function( err, st ){
                if( err ){
                    throw err;
                }
  
                // 判断是否为文件
                if( st.isFile() ){
                    // 创建读取流
                    readable = fs.createReadStream( _src );
                    // 创建写入流
                    writable = fs.createWriteStream( _dst ); 
                    // 通过管道来传输流
                    readable.pipe( writable );
                }
                // 如果是目录则递归调用自身
                else if( st.isDirectory() ){
                    exists( _src, _dst, copy );
                }
            });
        });
    });
};
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
 // 获取内网ip
function getIPAdress() {
    var interfaces = os.networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];
        
        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
}
// 复制目录
// exists( './login', './haha', copy );
var formatDate=function(d){
    let curr_date = d.getDate();
    let curr_month = d.getMonth() + 1; 
    let curr_year = d.getFullYear();
    let curr_minute=d.getMinutes();
    let curr_hours=d.getHours();

    String(curr_month).length < 2 ? (curr_month = "0" + curr_month): curr_month;
    String(curr_date).length < 2 ? (curr_date = "0" + curr_date): curr_date;
    String(curr_minute).length < 2 ? (curr_minute = "0" + curr_minute): curr_minute;
    String(curr_hours).length < 2 ? (curr_hours = "0" + curr_hours): curr_hours;


    var time = curr_year + "-" + curr_month +"-"+ curr_date+' '+curr_hours+':' +curr_minute;
    return time;
}

const CryptoJS = require('crypto-js'); // 引用AES源码js
const { reject } = require('async');
// import CryptoJS from 'crypto-js'
const key = CryptoJS.enc.Utf8.parse('1234567812345678') // 十六位十六进制数作为密钥
const iv = CryptoJS.enc.Utf8.parse("1234567812345678");//十六位十六进制数作为密钥偏移量

// 解密方法
var Decrypt = function Decrypt(word) {
    let decrypt = CryptoJS.AES.decrypt(word, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    })
    let decryptedStr = decrypt.toString(CryptoJS.enc.Utf8)
    return decryptedStr.toString()
}
 
// 加密方法
var Encrypt= function Encrypt(word) {
    let encrypted = CryptoJS.AES.encrypt(word, key, { 
        mode: CryptoJS.mode.ECB, 
        padding: CryptoJS.pad.Pkcs7 
    });
    return encrypted.toString()
}

 
exports.formatDate=formatDate
exports.copy = copy;
exports.delDir = delDir;
exports.exists = exists;


exports.Decrypt=Decrypt;
exports.Encrypt=Encrypt;

exports.isFindOne = isFindOne





 