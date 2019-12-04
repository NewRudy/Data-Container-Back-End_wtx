var storageData=require('../service/dataStorage.js');

//上传数据到服务器
exports.storageData=storageData.storage;
//数据描述
exports.storageDesc=storageData.storageDesc;

//获得数据
exports.datasource=storageData.download;

//数据列表
exports.datalist=storageData.datalist;
//更新数据描述
exports.update=storageData.update;
//删除数据
exports.delete=storageData.del;
