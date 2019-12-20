通过公网服务器上的数据转发服务器进行数据服务的转发。

##  数据存储
- 数据上传
- 数据流获取


## 上传数据接口

- ### http://111.229.14.128:8899/udxzip POST
  - 专业用户
  - 必填参数：上传文件，name,userId,serverNode,origination,
  - 选填参数：info，access
  
  - 输入：
    - 参数部分：
      - 必填参数：name,userId,serverNode,origination,
      - 选填参数：info（json格式组织），access
    - 文件部分：
      - 只支持单文件
      - 专业zip包数据上传，zip中包含系列数据集，数据模板和配置i文件
  - 输出：文件提取索引id，输入的文件名参数
  
  - 接口检查：
    - 必填参数是否完整
    - 配置文件是否正确描述数据数目
  
  - 错误返回：
     ```
    {
        code:0,
        message:"xxxxx"
    }
      ``` 
  - 正确返回：
     ```
    {
        "source_store_id": "854dd40d-89b9-4e1b-85c2-5ed2b1d7d449",
        "file_name": "test"
    }
        ```
- ### http://111.229.14.128:8899/source/:type POST
  
  - type=tep, 原始数据+数据模板的数据上传方式
  - type=udx, mdl中的schema内容+udxdata上传方式
  
  - 必填参数：上传文件，name,userId,serverNode,origination,
  - 选填参数：info，access

  - 输入：
    - 参数部分：
      - 必填参数：name,userId,serverNode,origination,
      - 选填参数：info（json格式组织），access
    - 文件部分：
      - type=tep，原始数据 + 数据模板 + 配置i文件
      - type=udx, schema + udxdata + 配置i文件
  - 输出：文件提取索引id，输入的文件名参数
  - 接口检查：
  
    - 必填参数是否完整
    - 配置文件是否正确描述数据数目
    - ### type=tep时检查数据模板id是否出现在配置文件里
  
  - 错误返回：
     ```
    {
        code:0,
        message:"xxxxx"
    }
      ``` 
  - 正确返回：
     ```
    {
        "source_store_id": "854dd40d-89b9-4e1b-85c2-5ed2b1d7d449",
        "file_name": "test"
    }
        ```

- ### http://111.229.14.128:8899/randomsource POST
  
  - 上传任意类型数据
  - 支持多文件，只返回一个id
  - 不做检验
  - 输入：
    - 参数部分：
      - 必填参数：name,userId,serverNode,origination,
      - 选填参数：info（json格式组织），access
    - 文件部分：
      - 任意用户文件
  - 输出：文件提取索引id，输入的文件名参数
  - 错误返回：
     ```
    {
        code:0,
        message:"xxxxx"
    }
      ``` 
  - 正确返回：
     ```
    {
        "source_store_id": "854dd40d-89b9-4e1b-85c2-5ed2b1d7d449",
        "file_name": "test"
    }
        ```

