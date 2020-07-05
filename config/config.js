module.exports={
    port:8899,
    
    // db:'mongodb://data:123@111.229.14.128:27017/dataSource',
    //本地数据库路径
    db:'mongodb://localhost:27017/insituShare',
    //门户库路径
    portalUserDb:'mongodb://ogms:123@111.229.14.128:27017/Portal',
    //数据上传接口路径
    transitUrl:'http://111.229.14.128:8899',
    //绑定处理方法路径，明远机器测试路径
    bindPcsUrl:'http://111.229.14.128:8898/dataItem/bindDataItem',
    //python安装路径
    pythonExePath:'D:\\python\\python.exe',

    //配置文件内容
   configUdxCfg:['<UDXZip>','<Name>', ' <add value="data" />','</Name>','<DataTemplate type="id">','</DataTemplate>','</UDXZip>']


}