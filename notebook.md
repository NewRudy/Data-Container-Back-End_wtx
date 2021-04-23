# 开发笔记

可视化接口改进：

通过配置文件中的数据模板id，找到数据可视化方案，进行特定数据的可视化，将可视化接口参数精简为只有数据id

2020.3.29. 测试成功


# 登录加密

前端密码加密后传给后台，与后台加密后的密码进行匹配


# 案例

## 处理服务

- csv转shp处理方法

http://111.229.14.128.:8898/invokeDistributedPcs?token=LhDgkD%2Bcn0q3xkI6Z6QRHg%3D%3D&pcsId=1b09874d-ddfc-4894-bd78-a145fe387c77&contDtId=d7e37702-6df5-4acf-b71a-91f2457947bc&params


- aermap处理商业dem数据到aermod模型的输入数据

http://111.229.14.128.:8898/invokeDistributedPcs?token=LhDgkD%2Bcn0q3xkI6Z6QRHg%3D%3D&pcsId=359e3290-8a07-464a-8acd-cec574f82a12&contDtId=4bd1abb9-ec83-42a4-b62c-94931b1aa14a&params

## 可视化服务
- 可视化，南京数据可视化
http://111.229.14.128.:8898/invokeDistributedPcs?token=LhDgkD%2Bcn0q3xkI6Z6QRHg%3D%3D&pcsId=c1e0b4c3-4c60-495a-afad-589f94a47d27&contDtId=04ac72a6-65fb-4432-a130-00bf74ae0296&params


## 查库
查到每一个instance,返回值是只含有一个元素的list数组

   db.instances.findOne({list:{$elemMatch:{id:"60cd09a3-cd57-490f-9f51-7105bd283786"}}},{list:{$elemMatch:{"id":"60cd09a3-cd57-490f-9f51-7105bd283786"}}})


 
TODO

需要输入，而且没有绑定
URLs 可用


不需要输入，而且没有绑定
URLs 改


需要输入，而且没有绑定
URLS 可用

不需要输入，而且没有绑定
改 放开绑定测试数据 extPcs


xml修改

采用新的封装方法

参考mdl里Event，按索引读取input, 读入dependency,给DDL里加节点，类似于mdl


2021.1.17 添加了不用绑定数据的处理和可视化类型 命名为ProcssingMethod,VisualizationProcessing





