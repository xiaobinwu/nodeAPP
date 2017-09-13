const mongoose = require('mongoose')
const FengjingSchema = require('../schemas/fengjing')
const Fengjing = mongoose.model('Fengjing', FengjingSchema)

module.exports = Fengjing