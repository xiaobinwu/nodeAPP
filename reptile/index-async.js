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

//引入mongoose
import mongoose from 'mongoose'
let Promise;
//开启日志
// mongoose.set('debug', true);
// promise化
mongoose.Promise = Promise = bluebird
global.db = mongoose.connect('mongodb://localhost:27017/lvyou', {
    useMongoClient: true
})
global.db.on('error', console.error.bind(console, '连接错误:'))


import Fengjing from './models/fengjing'
import Citys from './models/citys'
import Jingdian from './models/jingdian'

const hostName = 'https://lvyou.baidu.com/'

const writeToLog = async (response) => {
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
/**
 * 
 * 封装http.get请求
 * @param {any} url 
 * @param {any} callback 
 */
const httpRequest = async (options) => {
    options = {
        ...options,
        resolveWithFullResponse: true // Get the full response instead of just the body
    }
    try {
        let response = await rp(options)
        await writeToLog(response)
        return response.body
    } catch(err) {
        throw err   
    }
}
/**
 * 获取城市列表
 * @param {number} p (城市列表页数)
 * @param {number} rn (第几个）
 */
const fetchPage = async (rn) => {
    console.log(`开始抓取城市基础数据：${new Date().toLocaleDateString()}  ${new Date().toLocaleTimeString()}`)
    let options = {
        uri: `${hostName}destination/ajax/jingdian?format=ajax&cid=0&playid=0&seasonid=5&surl=zhongguo&pn=1&rn=${rn}`,
        headers: {
            'Connection': 'keep-alive',
            'Host': 'lvyou.baidu.com',
            'Referer': 'https://lvyou.baidu.com/zhongguo/jingdian',
        }
    }
    let { data } = JSON.parse(await httpRequest(options))

    const county = data.ambiguity_sname
    const county_id = data.cid
    const request_id = data.request_id
    let finalData = []
    data.scene_list.forEach((item) => {
        finalData.push({
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
        })
    })
    let result = await Citys.create(finalData)
    console.log(`${data.scene_list.length}个城市基本数据保存成功`)
    await getCityExtraMessage(result, request_id)
}
/**
 * 获取对应城市额外数据
 * @param {Object} item (对应城市文档数据)
 * @param {request_id} item (fetchPage函数获取request_id)
 */
const getCityExtraMessage = async (result, request_id) => {
    for (let j = result.length - 1; j >= 0; j--) {
        let data = result[j]
        let options = {
            uri: `${hostName}${data.surl}?&request_id=${request_id}`
        }
        let _ = cheerio.load(await httpRequest(options))

        let pics = []
        let ImgPages = Math.ceil(Number(_('.pic-more-content span').text()) / 24)

        let AttractionsPages = 0

        if (_(".unmis-allview").length > 0) {
            AttractionsPages = Math.ceil(Number(_('.unmis-more span').eq(0).text()) / 18)
        }

        if (_(".main-scene").length > 0) {
            AttractionsPages = Math.ceil(Number(_(".main-title a").eq(0).text().replace(/[^0-9]/ig, "")) / 18)
        }

        _(".pic-slider").find('.pic-item a').each((item) => {
            const $img = _(this).find('img');
            pics.push({
                href: _(this).attr('href'),
                src: $img.attr('src'),
                alt: $img.attr('alt'),
                width: $img.attr('width'),
                height: $img.attr('height')
            });
        });    

        let updateCityData = await Citys.findByIdAndUpdate(data._id, {
            $set: {
                pics: pics,
                updateTime: new Date()
            }
        })
        console.log(`${updateCityData.city_name}补充缺失基本数据[pics字段]保存成功`)

        let i = 1
        while(i <= AttractionsPages) {
            await getAttractionsCity(i, updateCityData)
            i++
        }
        console.log(updateCityData.city_name + '总共有' + AttractionsPages + '处景点下载完毕！')
    }
}

/**
 * 获取城市景点详细信息
 * @param {any} data (对应城市文档数据)
 * @param {any} p (页数)
 */
const getAttractionsCity = async (p, data) => {
    let options = {
        uri: `${hostName}/destination/ajax/jingdian?format=ajax&cid=0&playid=0&seasonid=5&surl=${data.surl}&pn=${p}&rn=18`,
        headers: {
            'Connection': 'keep-alive',
            'Host': 'lvyou.baidu.com',
            'Referer': 'https://lvyou.baidu.com/zhongguo/jingdian',
        }
    }
    console.log(`准备获取${data.city_name}第${p}页景点数据, url：${options.uri}`)

    let parsedData = JSON.parse(await httpRequest(options))

    await (async () => {
        let result = await Citys.findByIdAndUpdate(data._id, {
            $set: {
                best_play_days: parsedData.data.content.besttime.recommend_visit_time,
                best_time: parsedData.data.content.besttime.month,
                best_time_more_desc: parsedData.data.content.besttime.more_desc,
                best_time_simple_desc: parsedData.data.content.besttime.simple_desc,
                foods: parsedData.data.content.dining.food || [],
                activitys: parsedData.data.content.entertainment.activity || [],
                business: parsedData.data.content.shopping.business || [],
                updateTime: new Date()
            }
        })
        console.log(`${data.city_name}补充其他[foods、activitys、business...]缺失数据保存成功`)
    })()

    let finalDataArr = []
    parsedData.data.scene_list.forEach((item) => {
        const finalData = {
            county: data.county, // 国家名
            county_id: data.county_id, // 国家id，后期可以多国家
            city_id: data.city_id, //城市id
            city_name: data.city_name, // 城市名
            psurl: data.surl, //城市标志
            en_sname: data.en_sname, //城市英文名
            cover: item.cover.full_url, // 景点图片
            ambiguity_sname: item.ambiguity_sname, //景点名字
            surl: item.surl, //景点标识
            remark_count: item.remark_count, // 点评数
            avg_remark_score: item.ext.avg_remark_score, //评分
            abs_desc: item.ext.abs_desc,
            address: item.ext.address, // 位置
            impression: item.ext.impression, //简述
            map_info: item.ext.map_info, //坐标
            more_desc: item.ext.more_desc, //详述
            sketch_desc: item.ext.sketch_desc, //草图介绍
            page: p
        }
        finalDataArr.push(finalData)
    })
    let result = await Jingdian.insertMany(finalDataArr)
    console.log(`${data.city_name}---第${p}页景点数据保存成功`)

    let i = 0
    while(i <= (result.length - 1)) {
        await getSingleJingdianExtraMessage(result[i])
        i++
    }
}
/**
 * 获取对应景点额外数据
 * @param {any} item 
 */
const getSingleJingdianExtraMessage = async (data) => {
    let options = {
        uri: `${hostName}${data.surl}?innerfr_pg=destinationDetailPg&accur_thirdpar=dasou_citycard`
    }

    let _ = cheerio.load(await httpRequest(options))

    let ImgPages = Math.ceil(Number(_('.pic-more-content span').text()) / 24)
    // 图片集遍历
    let pics = []
    _(".pic-slider").find('.pic-item a').each((item) => {
        const $img = _(this).find('img');
        pics.push({
            href: _(this).attr('href'),
            src: $img.attr('src'),
            alt: $img.attr('alt'),
            width: $img.attr('width'),
            height: $img.attr('height')
        })
    })
    let result = await Jingdian.findByIdAndUpdate(data._id, {
        $set: {
            pics: pics,
            imgNumber: ImgPages,
            updateTime: new Date()
        }
    })
    ImgPages = ImgPages > 5 ? 5 : ImgPages
    console.log(`${result.city_name}-${result.ambiguity_sname}补充缺失数据[pics字段]保存成功`)
    let i = 1
    while(i <= ImgPages) {
        await getFenjing(i, result, result.city_name + '-' + result.ambiguity_sname)
        i++
    }
}
/**
 * 计算获取风景图片的pn参数
 * @param {any} p (页数)
 */
const calculatePn = (p) => {
    return (p - 1) * 24
}
/**
 * 
 * 获取城市风景图片
 * @param {any} data (对应城市文档数据)
 * @param {any} name (是否为为景点的风景图)
 * @param {any} p (页数)
 */
const getFenjing = async (p, data, name) => {
    let cityName = name || data.city_name
    let options = {
        uri: `${hostName}${data.surl}/fengjing/?pn=${calculatePn(p)}`
    }
    let _ = cheerio.load(await httpRequest(options))
    let finalDataArr = []
    _("#photo-list").find('.photo-item').each(() => {
        const url = _(this).find('.photo-frame').attr('href')
        const thumbUrl = _(this).find('img').attr('src')
        const source = _(this).find('.photo-desc').text()
        const fengjing = {
            thumbUrl: thumbUrl,
            url: url,
            city_id: data.city_id,
            source: source,
            page: p,
            city_name: data.city_name,
            psurl: data.psurl,
            surl: data.surl
        };
        finalDataArr.push(fengjing)
    })
    let result = await Fengjing.insertMany(finalDataArr)
    console.log(`${cityName}---第${p}页风景图数据保存成功`)
}

fetchPage(2)