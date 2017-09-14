const mongoose = require('mongoose')
const JingdianSchema = require('../schemas/jingdian')
const Jingdian = mongoose.model('Jingdian', JingdianSchema)

module.exports = Jingdian