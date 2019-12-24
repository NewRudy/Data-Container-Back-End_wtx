import sys
import matplotlib.pyplot as plt
import shapefile   
##shp数据可视化，snapshot
def f(path):
     
    shpFilePath =  path 
    listx=[]
    listy=[]
    test = shapefile.Reader(shpFilePath)
    for sr in test.shapeRecords():
        for xNew,yNew in sr.shape.points:
            listx.append(xNew)
            listy.append(yNew)
    plt.plot(listx,listy)
    plt.axis('off')
    plt.savefig('D:\\z\\shp.png')
    return True
# plt.show()

if __name__ == '__main__':
    # print(sys.argv[1])
    if f(sys.argv[1]) is True:
        print("D:\z\shp.png")
 