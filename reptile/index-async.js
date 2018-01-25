/**
 *  aync实现爬虫程序
 */

import cheerio from 'cheerio'
import http from 'http'
import fs from 'fs'
import util from 'util'
import rp from 'request-promise'
import bluebird from 'bluebird'


const access = util.promisify(fs.access)
const writeFile = util.promisify(fs.writeFile)


// 引入mongoose
import mongoose from 'mongoose'
let Promise;
//开启日志
mongoose.set('debug', true);
// promise化
mongoose.Promise = Promise = bluebird
global.db = mongoose.connect('mongodb://localhost:27017/lvyou', {
    useMongoClient: true
})
global.db.on('error', console.error.bind(console, '连接错误:'))


import Fengjing from './models/fengjing'
import Citys from './models/citys'
import Jingdian from './models/jingdian'


const httpRequest = (options) => {
    options = {
        ...options,
        resolveWithFullResponse: true // Get the full response instead of just the body
    }
    return new Promise((resolve, reject) => {
        rp(options).then((response) => {


            const err = awiat access('./reptile/log', fs.constants.R_OK | fs.constants.W_OK)

            console.log(err)

            // fs.exists('./log', (exists) => {
            //     fs.mkdir('./log', 0777, (err) => {
            //         if (err) throw err;
            //         fs.writeFileSync(`./log/a.txt`, JSON.stringify(response), (err) => {
            //             if (err) { throw err }
            //         })
            //     });
            // })

            console.log(response);

        }).catch((err) => {
            throw err
            reject(err)
        })
    })
}

const test = async() => {
    await httpRequest({ uri: 'https://lvyou.baidu.com/business/ajax/weather/getweather?sid=5007715ac511463263cfd1f3' })
}

test()