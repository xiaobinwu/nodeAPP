// 引入mongoose
const mongoose = require('mongoose')
// 城市旅游景点模型
const JingdianSchema = new mongoose.Schema({
    county: String, // 国家名
    county_id: String, // 国家id，后期可以多国家
    city_id: String, //城市id
    city_name: String, // 城市名
    en_sname: String, //城市英文名
    cover: String, // 景点图片
    pics: [], // 图片集
    ambiguity_sname: String, //景点名字
    surl: String, //景点标识
    remark_count: String, // 点评数
    avg_remark_score: String, //评分
    abs_desc: String, 
    address: String, // 位置
    impression: String, //简述
    map_info: String, //坐标
    more_desc: String, //详述
    sketch_desc: String, //草图介绍
    createTime: { type: Date, default: Date.now }, //创建时间
    updateTime: { type: Date, default: Date.now } //更新时间
})

module.exports = JingdianSchema