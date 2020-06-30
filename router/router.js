const storageData=require('../service/dataStorage.js');

const user=require('../service/user.js');

const instances=require('../service/instances.js');

const transition=require('../service/transition.js');


const processing=require('../service/processing.js')
//接口不可用
//第一种接口上传数据到服务器
exports.storageData=storageData.storage;
//数据描述
exports.storageDesc=storageData.storageDesc;
//第2,3种接口
exports.noTemplate=storageData.noTemplate;
//第四种接口
exports.randomSource=storageData.randomSource;
//获得数据
exports.datasource=storageData.download;
//获得单个数据
exports.singleDatasource=storageData.singleDatasource;
//数据可视化
exports.snapShot=storageData.snapShot;
//测试
exports.test=storageData.test;
//数据列表
exports.datalist=storageData.datalist;
//数据检索
exports.filter=storageData.filter;
//更新数据描述
exports.update=storageData.update;






//数据上传
exports.ogmsDataUp=storageData.ogmsDataUp;

//数据上传
exports.ogmsDataDown=storageData.ogmsDataDown;

//删除数据
exports.delete=storageData.del;

//可视化
exports.dataVisual=storageData.dataVisual;

//强制可视化生成
exports.dataVisualNoCache=storageData.dataVisualNoCache;

//用户角色
//登录
exports.login=user.login;
//关联
exports.connectPortalUsr=user.connectPortalUsr;
//创建用户
exports.reg=user.reg;


//条目
exports.instances=instances.instances

//新加项文件夹
exports.newInstance=instances.newInstance
//新加项文件
exports.newFile=instances.newFile
//删除
exports.delInst=instances.delInst
//下载
exports.inSituDownload=instances.inSituDownload
//authority
exports.authority=instances.authority
//transit
exports.transition=transition.transition

//new processing method
exports.newProcessing=processing.newProcessing