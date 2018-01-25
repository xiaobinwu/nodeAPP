// 引入mongoose
import mongoose from 'mongoose'
// 城市旅游景点模型
const Schema = mongoose.Schema
const JingdianSchema = new mongoose.Schema({
    county: String, // 国家名
    county_id: String, // 国家id，后期可以多国家
    city_id: { type: String, index: true }, //城市Id
    city_name: String, // 城市名
    en_sname: String, //城市英文名
    psurl: String, // 城市标志
    cover: String, // 景点图片
    pics: [Schema.Types.Mixed], // 图片集
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
    page: Number, //所在页数
    imgNumber: Number, //风景图总数
    createTime: { type: Date, default: Date.now }, //创建时间
    updateTime: { type: Date, default: Date.now } //更新时间
})

// 捕捉当索引建立失败
JingdianSchema.set('emitIndexErrors', true)

// 禁止索引自动调用ensureindex
JingdianSchema.set('autoIndex', false)

export default JingdianSchema