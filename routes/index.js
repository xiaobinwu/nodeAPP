var express = require('express');
var router = express.Router();

// 引入mongoose
let mongoose = require('mongoose')
// 用于异步回调
mongoose.Promise = require('bluebird')
global.db = mongoose.connect('mongodb://localhost:27017/lvyou', { useMongoClient: true })
global.db.on('error', console.error.bind(console, '连接错误:'))
global.db.once('open', function () {
    console.log('Mongodb running')
})

const Citys = require('../reptile/models/citys')
const Fengjing = require('../reptile/models/fengjing')


/* GET home page. */
router.get('/', function(req, res, next) {
	// 获取旅游城市信息
	Citys.find().limit(5).sort("{ createTime: -1 }").exec(function (err, message) {
	    if (err) {
	        console.log(err)
	    } else {
	    	console.log(message)
	    }
	})

	Fengjing.find().limit(1).sort("{ createTime: -1 }").exec(function (err, message) {
	    if (err) {
	        console.log(err)
	    } else {
	    	console.log(message)
	    }
	})

   res.render('index', { title: 'Express' });
});

module.exports = router;
