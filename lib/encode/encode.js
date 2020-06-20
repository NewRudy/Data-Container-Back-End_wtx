const CryptoJS = require('crypto-js') // 引用AES源码js
const key = CryptoJS.enc.Utf8.parse('1234567812345678') // 十六位十六进制数作为密钥
const iv = CryptoJS.enc.Utf8.parse("1234567812345678");//十六位十六进制数作为密钥偏移量
// 解密方法
function Decrypt(word) {
    let decrypt = CryptoJS.AES.decrypt(word, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    })
    let decryptedStr = decrypt.toString(CryptoJS.enc.Utf8)
    return decryptedStr.toString()
}
 
// 加密方法
function Encrypt(word) {
    let encrypted = CryptoJS.AES.encrypt(word, key, { 
        mode: CryptoJS.mode.ECB, 
        padding: CryptoJS.pad.Pkcs7 
    });
    return encrypted.toString()
}

module.exports={
    Decrypt,
    Encrypt
}