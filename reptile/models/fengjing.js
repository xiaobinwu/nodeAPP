import mongoose from 'mongoose'
import FengjingSchema from '../schemas/fengjing'

const Fengjing = mongoose.model('Fengjing', FengjingSchema)

Fengjing.on('error', function(error) {
    // gets an error whenever index build fails
    console.log(error)
})

// 手动创建索引
Fengjing.ensureIndexes(function(err) {
    if (err) {
        console.log(err)
    }
})

export default Fengjing