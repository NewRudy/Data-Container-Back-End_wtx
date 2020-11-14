在线接口文档：
https://documenter.getpostman.com/view/9819382/SzYbwc3b?version=latest


##  数据服务接口描述

- 数据上传

- 数据流下载

- 数据删除

- 数据可视化snapshot（目前支持shp、tiff格式数据）


## 上传
- 必要参数
- 单文件或多文件+配置文件

## 下载
- 利用id下载对应数据

## 删除
- 利用id删除对应数据

## 可视化
- tiff、shp可视化
- 带缓存和强制重新生成可视化结果两种方式
- ### 测试数据集目录
    [/visualTestData](https://github.com/Makoq/transitDataServer/tree/master/visualTestData "test data for visualization")
     
    - /shp    shp数据可视化，配置文件已写好
    - /tiff   tiff数据可视化，配置文件已写好

# 配置文件

## 字段
```
<UDXZip>
    <Name> 文件列表，不包含配置文件，数目要上传文件数一致（不包含配置文件）
        <add value:文件名>
        ...
    </Name>   
    <DataTemplate    type:数据类型，可选参数 id, schema, none > 数据类型id,在type为id时有值</DataTemplate>
</UDXZip>
```
## 基本内容
```
<UDXZip>
	<Name>//列出文件名，文件名不需要一一对应，但文件个数要和实际上传文件数对应
		<add value="dem.prj" />
		 <add value="dem.tif" />
	</Name>
    // type 参数可为id，schema，none,分别表示raw data、schema data 和其他任意数据
    //此尖括号下的内容为对应的数据模板的id,目前只有三种id可选，分别代表type=id的两种数据，shp和tiff
    //shp:['4996e027-209b-4121-907b-1ed36a417d22'],
    //tiff:['d3605b83-af8d-491c-91b3-a0e0bf3fe714','f73f31ff-2f23-4c7a-a57d-39d0c7a6c4e6']
    //此例中的id是tiff数据
	<DataTemplate type="id">d3605b83-af8d-491c-91b3-a0e0bf3fe714</DataTemplate>
</UDXZip>
```
## 可选模板id

    主要在type为id的数据类型，进行可视化时使用

    shp:['4996e027-209b-4121-907b-1ed36a417d22'],
    tiff:['d3605b83-af8d-491c-91b3-a0e0bf3fe714','f73f31ff-2f23-4c7a-a57d-39d0c7a6c4e6']

## 样例

参考项目中测试可视化数据的配置文件书写

# 注意

启动服务时配置python环境