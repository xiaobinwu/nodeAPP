const express = require('express');
const router = express.Router();

// 引入mongoose
let mongoose = require('mongoose')
    // 用于异步回调
mongoose.Promise = require('bluebird')
global.db = mongoose.connect('mongodb://localhost:27017/lvyou', { useMongoClient: true })
global.db.on('error', console.error.bind(console, '连接错误:'))
global.db.once('open', function() {
    console.log('Mongodb running')
})

const Citys = require('../reptile/models/citys')
const Fengjing = require('../reptile/models/fengjing')
const Jingdian = require('../reptile/models/jingdian')

/* GET home page. */
router.get('/', function(req, res, next) {
    // 获取旅游城市信息
    Citys.find().limit(5).sort("{ createTime: -1 }").exec(function(err, message) {
        if (err) {
            console.log(err)
        } else {
            console.log(JSON.parse(JSON.stringify(message)))
                // console.log(message[0].business)
        }
    })

    Fengjing.find().limit(1).sort("{ createTime: -1 }").exec(function(err, message) {
        if (err) {
            console.log(err)
        } else {
            console.log(JSON.parse(JSON.stringify(message)))
        }
    })

    Jingdian.find().limit(1).exec(function(err, message) {
        if (err) {
            console.log(err)
        } else {
            console.log(JSON.parse(JSON.stringify(message)))
        }
    })

    res.render('index', { title: 'Express' });
});

module.exports = router;