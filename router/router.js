const storageData=require('../service/dataStorage.js');

const user=require('../service/user.js');

const instances=require('../service/instances.js');

const transition=require('../service/transition.js');

const processing=require('../service/processing.js')

const geoProbems=require('../service/geoProblems.js')


const indexService=require('../service/index.js');
const systemRouter = require('../service/systemStateRouter.js')

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

// 数据类型
exports.iszip=storageData.iszip;

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
//删除处理方法
exports.delProcessing=processing.delProcessing
//绑定处理方法 executePrcs
exports.bindProcessing=processing.bindProcessing
//执行数据处理方法
exports.executePrcs=processing.executePrcs

exports.chsdtne=processing.chsdtne;
exports.lcalpcsmeta=processing.lcalpcsmeta

exports.uploadPcsMethod=processing.uploadPcsMethod

// 可视化结果本地展示
exports.visualResult=processing.visualResult

//注册到参与式平台
exports.newDataIndexGSP=geoProbems.newDataIndexGSP


// sdk api
exports.availableServices=processing.availableServices

exports.exeWithOtherData=processing.exeWithOtherData

exports.capability=instances.capability

exports.systemStatus = systemRouter.systemStatus;
exports.systemInfo = systemRouter.systemInfo;



//saga Capabilities
exports.sagaCapabilities=processing.sagaCapabilities

exports.indexGet=indexService.indexServiceGet;
exports.indexPost=indexService.indexServicePost;

 exports.invokeProUrl = processing.invokeProUrl;