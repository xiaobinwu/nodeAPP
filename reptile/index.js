const cheerio = require('cheerio');
const https = require('https');

// 引入mongoose
let mongoose = require('mongoose')
// 用于异步回调
mongoose.Promise = require('bluebird')
global.db = mongoose.connect('mongodb://localhost:27017/lvyou', { useMongoClient: true })
global.db.on('error', console.error.bind(console, '连接错误:'))
global.db.once('open', function () {
    console.log('Mongodb running')
})

const Citys = require('./models/citys')


const fetchPage = (p) => {
	const url = 'https://lvyou.baidu.com/destination/ajax/jingdian?format=ajax&cid=0&playid=0&seasonid=5&surl=zhongguo&pn=' + p + '&rn=18';
	https.get(url, (res) => {
		const { statusCode } = res;
		let error;
		if(statusCode !== 200){
			error = new Error('请求失败。\n' + `状态码：${statusCode}`);
		}
		if(error){
			console.log(error.message);
			res.resume();
			return;
		}
		res.setEncoding('utf8');
		let rawData = '';
		res.on('data', (chunk) => { rawData += chunk; });
		res.on('end', () => {
			try {
				const parsedData = JSON.parse(rawData);
				const county = parsedData.data.ambiguity_sname;
				const county_id = parsedData.data.cid;
				parsedData.data.scene_list.forEach((item) => {
					const finalData = {
					    county: county, // 国家名
					    county_id: county_id, // 国家id，后期可以多国家
					    city_id: item.cid, // 城市id
					    city_name: item.ambiguity_sname, // 城市名
					    en_sname: item.ext.en_sname, // 城市英文名
					    cover: item.cover.full_url, // 城市图片
					    surl: item.surl, // 城市标志，用于抓取对应城市景点
					    avg_cost: item.ext.avg_cost, // 人均花费
					    level: item.ext.level, //景区登记
					    avg_remark_score: item.ext.avg_remark_score, // 评分
					    remark_count: item.remark_count, // 点评数
					    impression: item.ext.impression, // 城市简述
					    more_desc: item.ext.more_desc, // 城市详述
					    map_info: item.ext.map_info // 坐标
					}
			        const citys = new Citys(finalData)
			        citys.save(function (err, data) {
			            if (err) {
			                console.log(err)
			                return
			            }
			            console.log(data)
			        })
				})
			} catch (e) {
				console.error(e.message);
			}
		});
	}).on('error', (e) => {
	 	console.error(e);
	});
}

fetchPage(1);
