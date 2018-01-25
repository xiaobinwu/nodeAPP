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

## index-promise.js 与 index-async.js

index-promise.js：promise实现爬虫程序，结果遇到了很多坑，首先Promise出现十分多的then函数，相当不美观，表示自己看自己写的代码都是晕头转向的...由先使用了很多闭包、柯里化函数，变量却没有及时地去销毁，结果导致爬虫前期总是导致内存泄露，没有使用es6语法，代码多而杂，没有很好的捕获错误机制（应该说是没有 ((٩(//̀Д/́/)۶))），所以爬取到一半断了，你都不知道因为什么原因断了，这样自然也不知道断掉时的正在抓哪个景点或是景点风景图，没有实现断点爬取，爬取中断，就只能手动重新开启爬取，数据会遗漏，总之，惨不忍睹，真是连看不想看...

index-async.js: 若干月后，重新打开这个项目后，决定重整旗鼓，摒弃index-promise.js，重新写一个爬虫程序，于是就有了index-async.js，改用async与await、es6重写该文件，当然，是需要做些准备工作滴！


查阅资料后得知，Node本身已经支持部分ES6语法，但是import export，以及async await(Node 8 已经支持)等一些语法，我们还是无法使用。为了能使用这些新特性，我们就需要使用babel把ES6转成ES5语法。以下是如何在node项目畅通无阻地使用es6语法。

安装babel
``` javascript
    npm install babel-cli -g
```

`es2015`可以转码es6的语法规则，`stage-0`可以转码ES7语法(比如async await)，`preset-env`可以自动检测当前node版本，只转码node不支持的语法
``` javascript
    npm install --save-dev babel-preset-es2015  babel-preset-stage-0 babel-preset-env
```

package.json配置， 运行`npm run async`即可
``` javascript
    "scripts": {
        ...
        "async": "babel-node ./reptile/index-async.js"
    }
```

