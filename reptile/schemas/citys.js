// 引入mongoose
const mongoose = require('mongoose')
// 旅游城市模型
const CitysSchema = new mongoose.Schema({
    county: String, // 国家名
    county_id: String, // 国家id，后期可以多国家
    city_id: String, //城市id
    city_name: String, // 城市名
    en_sname: String, //城市英文名
    cover: String, // 城市图片
    surl: String, // 城市标志，用于抓取对应城市景点
    avg_cost: String, // 人均花费
    level: String, //景区登记
    avg_remark_score: String, // 评分
    remark_count: String, // 点评数
    impression: String, // 城市简述
    more_desc: String, // 城市详述
    map_info: String,// 坐标
    season: String, //适合游玩季节
    createTime: { type: Date, default: Date.now }, //创建时间
    updateTime: { type: Date, default: Date.now } //更新时间
})

module.exports = CitysSchema