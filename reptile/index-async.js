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
const mkdir = util.promisify(fs.mkdir)

<<
<< << < HEAD
//引入mongoose
import mongoose from 'mongoose'
let Promise;
//开启日志
mongoose.set('debug', true);
// promise化
mongoose.Promise = Promise = bluebird
global.db = mongoose.connect('mongodb://localhost:27017/lvyou', {
    useMongoClient: true
})
global.db.on('error', console.error.bind(console, '连接错误:')) ===
    === =
    console.log(access)

// 引入mongoose
// import mongoose from 'mongoose'
// let Promise;
// //开启日志
// mongoose.set('debug', true);
// // promise化
// mongoose.Promise = Promise = bluebird
// global.db = mongoose.connect('mongodb://localhost:27017/lvyou', {
//     useMongoClient: true
// })
// global.db.on('error', console.error.bind(console, '连接错误:'))
>>>
>>> > 37 c91700221903682a482f87cd65d21d4cdc89eb


import Fengjing from './models/fengjing'
import Citys from './models/citys'
import Jingdian from './models/jingdian'


const writeToLog = async(response) => {
    let dirUrl = './reptile/log',
        file = `${dirUrl}/${new Date().getTime()}.log`
    try {
        await access(dirUrl, fs.constants.R_OK | fs.constants.W_OK)
        await writeFile(file, JSON.stringify(response, null, '\t'), 'utf8')
    } catch (e) {
        await mkdir(dirUrl)
        await writeFile(file, JSON.stringify(response, null, '\t'), 'utf8')
    }
}

const httpRequest = (options) => {
    options = {
        ...options,
        resolveWithFullResponse: true // Get the full response instead of just the body
    }
    return new Promise((resolve, reject) => {
        rp(options).then(async(response) => {
            await writeToLog(response)
            resolve(JSON.parse(response.body))
        }).catch((err) => {
            throw err
            reject(err)
        })
    })
}

const fetchPage = async(rn) => {
    console.log(`开始抓取城市基础数据：${new Date().toLocaleDateString()}  ${new Date().toLocaleTimeString()}`)
    let parsedData;
    let options = {
        uri: `${hostName}destination/ajax/jingdian?format=ajax&cid=0&playid=0&seasonid=5&surl=zhongguo&pn=1&rn=${rn}`,
        headers: {
            'Connection': 'keep-alive',
            'Host': 'lvyou.baidu.com',
            'Referer': 'https://lvyou.baidu.com/zhongguo/jingdian',
        }
    }
    let parsedData = await httpRequest(options)

    const county = parsedData.data.ambiguity_sname
    const county_id = parsedData.data.cid
    const request_id = parsedData.data.request_id
    const item = parsedData.data.scene_list[rn - 1]
    let finalData = {
        county: county, // 国家名
        county_id: county_id, // 国家id，后期可以多国家
        city_id: item.cid, // 城市id
        city_name: item.ambiguity_sname, // 城市名
        en_sname: item.ext.en_sname, // 城市英文名
        cover: item.cover.full_url, // 城市图片
        surl: item.surl, // 城市标志，用于抓取对应城市景点
        avg_cost: item.ext.avg_cost, // 人均花费
        level: item.ext.level, //景区登记
        avg_remark_score: item.ext.avg_remark_score, // 评分
        remark_count: item.remark_count, // 点评数
        impression: item.ext.impression, // 城市简述
        more_desc: item.ext.more_desc, // 城市详述
        abs_desc: item.ext.abs_desc,
        map_info: item.ext.map_info // 坐标
    }

}


const test = async() => {
    const data = await httpRequest({ uri: 'https://lvyou.baidu.com/destination/ajax/jingdian?format=ajax&cid=0&playid=0&seasonid=5&surl=zhongguo&pn=1&rn=1' })
    console.log(data)
}

test()