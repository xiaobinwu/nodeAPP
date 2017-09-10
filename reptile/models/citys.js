const mongoose = require('mongoose')
const CitysSchema = require('../schemas/citys')
const Citys = mongoose.model('Citys', CitysSchema)

module.exports = Citys