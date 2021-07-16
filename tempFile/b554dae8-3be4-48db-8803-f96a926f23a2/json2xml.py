import sys
import os
import dicttoxml
import json


def execute(input, output):      # 读入json文件，转为xml文件
    fileList = os.listdir(input)
    # 跳出json数据
    for file in fileList:
        if ('.' in file) and (file.split('.')[1] == 'json'):
            json_file = input + '/' + file
            fileName = file.split('.')[0]
            break

    dict_str = open(json_file,'r',encoding='utf-8').read()
    data_dict = json.loads(dict_str)
    data_xml = dicttoxml.dicttoxml(data_dict)
    with open(output + '/' + fileName + '.xml','w',encoding='utf-8') as file:
        file.write(data_xml.decode())
    return True

if __name__ == "__main__":
    if execute(sys.argv[1], sys.argv[2]) is True:
        print('ok')