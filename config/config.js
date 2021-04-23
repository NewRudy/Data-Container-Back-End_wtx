module.exports={
    port:8899,
    
    // db:'mongodb://data:123@111.229.14.128:27017/dataSource',
    //本地数据库路径
    db:'mongodb://localhost:27017/insituShare',
    //门户库路径
    portalUserDb:'mongodb://172.21.213.33:27017/Portal',
    // portalUserDb:'mongodb://111.229.14.128:27019/Portal',
    //数据上传接口路径
    transitUrl:'http://111.229.14.128:8899',
    //绑定处理方法路径，明远机器测试路径
    bindPcsUrl:'http://223.2.47.247:8084/dataItem/bindDataItem',
    //python安装路径
    // pythonExePath:'C:\\Users\\HP\\AppData\\Local\\Programs\\Python\\Python36\\python.exe',
    //配置文件内容
    configUdxCfg:['<UDXZip>','<Name>', ' <add value="data" />','</Name>','<DataTemplate type="id">','</DataTemplate>','</UDXZip>'],

    //参与式平台地址，本来要放在公网服务器上，现在先用本机来测
    geoProblemsSolvingIp:'http://223.2.40.247:8081',


    //saga执行路径
    sagaExe:__dirname+'/../lib/SAGA/saga_cmd.exe'

}