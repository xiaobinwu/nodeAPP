import mongoose from 'mongoose'
import JingdianSchema from '../schemas/jingdian'

const Jingdian = mongoose.model('Jingdian', JingdianSchema)

Jingdian.on('error', function(error) {
    // gets an error whenever index build fails
    console.log(error)
})

// 手动创建索引
Jingdian.ensureIndexes(function(err) {
    if (err) {
        console.log(err)
    }
})

export default Jingdian