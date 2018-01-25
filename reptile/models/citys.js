import mongoose from 'mongoose'
import CitysSchema from '../schemas/citys'

const Citys = mongoose.model('Citys', CitysSchema)

export default Citys