/**
 *  aync实现爬虫程序
 */

import cheerio from 'cheerio'
import http from 'http'
import rp from 'request-promise'

// 引入mongoose
import mongoose from 'mongoose'
let Promise;
//开启日志
mongoose.set('debug', true);
// promise化
mongoose.Promise = Promise = require('bluebird');
global.db = mongoose.connect('mongodb://localhost:27017/lvyou', {
    useMongoClient: true
});
global.db.on('error', console.error.bind(console, '连接错误:'));