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
    surl: String,  // 城市标志，用于抓取对应城市景点
    createTime: { type: Date, default: Date.now }, //创建时间
    updateTime: { type: Date, default: Date.now } //更新时间
})

// 捕捉当索引建立失败
FengjingSchema.set('emitIndexErrors', true)

// 禁止索引自动调用ensureindex(禁止自动创建索引)
FengjingSchema.set('autoIndex', false)

module.exports = FengjingSchema