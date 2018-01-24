# 一个关于旅游景点介绍的应用（express + mongoose + react）

------

## 文件目录

```
nodeApp
│   README.md
│   package.json
|   .gitignore
|   app.js（express主程序）    
│
└───reptile（爬虫程序）
│   │   index-promise.js
│   │   ...
│   │
│   └───data（mongoose数据库文件）
|   |
|   |
|   └───data-rar（数据库备份文件夹）
|   |
|   |
|   └───models（schemas生成的模型）
|   |   |   citys.js
|   |   |   fengjing.js
|   |   |   jingdian.js
|   |
|   |
|   └───schemas（数据库模型骨架）
|   |   |   citys.js
|   |   |   fengjing.js
|   |   |   jingdian.js
|
|
│   
└───routes（express路由）
|    │   index.js
|    │   users.js
|    |   ...
|
└───views（express视图）
    │   layout.jade
    │  ...

```
## mongoose配置

安装MongoDB，此处省略一万字...

开启MongoDB服务，指定dbpath，本项目使用的是`\nodeApp\reptile\data\`做为数据库路径，启动数据库完整命令：
```
mongod --dbpath=E:\git\node-project\nodeApp\reptile\data\

```
使用 MongoDB GUI进行管理数据库，推荐使用Robo 3T，习惯使用终端的话，运行`mongo`命令，客户端连接MongoDB

基础使用：

Schema：一种以文件形式存储的数据库模型骨架，不具备数据库的操作能力，示例代码：
``` javascript
// 引入mongoose
const mongoose = require('mongoose')
// 风景图模型
const FengjingSchema = new mongoose.Schema({
    thumbUrl: String, // 缩略图
    url: String, // 原图
    city_id: { type: String, index: true } , //城市Id
    source: String, // 来源
    page: Number, // 所属页数
    city_name: String, //城市
    surl: String,  // 城市景点标志，用于抓取对应城市景点
    psurl: String, // 城市标志，用于抓取对应城市
    createTime: { type: Date, default: Date.now }, //创建时间
    updateTime: { type: Date, default: Date.now } //更新时间
})

// 捕捉当索引建立失败
FengjingSchema.set('emitIndexErrors', true)

// 禁止索引自动调用ensureindex(禁止自动创建索引)
FengjingSchema.set('autoIndex', false)

module.exports = FengjingSchema

```

Model： 由Schema发布生成的模型，具有抽象属性和行为的数据库操作对，示例代码：

``` javascript

const mongoose = require('mongoose')
const FengjingSchema = require('../schemas/fengjing')
const Fengjing = mongoose.model('Fengjing', FengjingSchema)

Fengjing.on('error', function(error) {
    // gets an error whenever index build fails
    console.log(error)
})

// 手动创建索引
Fengjing.ensureIndexes(function(err){
    if(err){
        console.log(err)
    }
})

module.exports = Fengjing

```

Entity：  由Model创建的实体，他的操作也会影响数据库


连接Mongo数据库
``` javascript

// 引入mongoose
let mongoose = require('mongoose')
// 用于异步回调
mongoose.Promise = require('bluebird')
global.db = mongoose.connect('mongodb://localhost:27017/lvyou', { useMongoClient: true })
global.db.on('error', console.error.bind(console, '连接错误:'))
global.db.once('open', function () {
    console.log('Mongodb running')
})

```

`require('bluebird')`使得结果promise化，官方处理方案：![点我呀](http://mongoosejs.com/docs/promises.html)


学习资料：

![Mongoose学习参考文档——基础篇](https://cnodejs.org/topic/504b4924e2b84515770103dd)