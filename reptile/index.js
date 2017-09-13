const cheerio = require('cheerio');
const https = require('https');

// 引入mongoose
let mongoose = require('mongoose');
// 用于异步回调
mongoose.Promise = require('bluebird');
global.db = mongoose.connect('mongodb://localhost:27017/lvyou', { useMongoClient: true });
global.db.on('error', console.error.bind(console, '连接错误:'));
global.db.once('open', function () {
    console.log('Mongodb running');
})

const hostName = 'https://lvyou.baidu.com/';

const Citys = require('./models/citys');
const Fengjing = require('./models/fengjing');
/**
 * 获取城市列表
 * 偏函数
 * @param {number} total (城市列表总页数)
 * @param {number} p (城市列表页数)
 */
const fetchPage = (total) => {
	return function(p) {
		const caller = arguments.callee;
		if(p > total) { return; }
		const url = hostName + 'destination/ajax/jingdian?format=ajax&cid=0&playid=0&seasonid=5&surl=zhongguo&pn=' + p + '&rn=18';
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
					let finalDataArr = [];
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
						finalDataArr.push(finalData);
					});
					Citys.insertMany(finalDataArr).then(function(data){
						console.log(data + '数据保存成功');
						data.forEach(function(item){
							getSingleCityExtraMessage(item, parsedData);
						});
						caller(++p);
					}).catch(function(err){
						console.log(err)
					});
				} catch (e) {
					console.error(e.message);
				}
			});
		}).on('error', (e) => {
			 console.error(e);
		});
	}
}

/**
 * 获取对应城市额外数据
 * @param {Object} item (对应城市文档数据)
 * @param {parsedData} item (fetchPage函数获取的数据返回)
 */
const getSingleCityExtraMessage = (item, parsedData) =>{
	// console.log(data);
	// 获取对应城市页面
	if(item.surl === 'beijing'){
		const cityUrl = hostName + item.surl + '?&request_id=' + parsedData.data.request_id;
		https.get(cityUrl, (res) => {
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
			let html = '';
			res.on('data', (chunk) => { html += chunk; });
			res.on('end', function(){
				const $ = cheerio.load(html);
				// 页数
				const ImgPages = Math.ceil(Number($('.pic-more-content span').text())/24);
				const AttractionsPages = Math.ceil(Number($('.unmis-more span').text())/18);
				//更新Citys Model里面的缺失数据
				Citys.findByIdAndUpdate(item._id, {$set: { season: $('.main-dcnt span p').text(), updateTime: new Date() }}).then(function(data){
					console.log(data + '缺失数据保存成功');
					getCityFenjing(ImgPages, data)(1);
				}).catch(function(err){
					console.log(err)
				});
			});	        		
		})
	}
}

/**
 * 
 * 获取城市风景图片
 * @param {any} count (图片总页数数)
 * @param {any} data (对应城市文档数据)
 * @param {any} p (页数)
 */
const getCityFenjing = (count, data) => {
	return function(p){
		const caller = arguments.callee;
		if(p > count) { return; }
		const url = hostName + data.surl + '/fengjing/?pn=' + p;
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
			let html = '';
			res.on('data', (chunk) => { html += chunk; });
			res.on('end', function(){
				const $ = cheerio.load(html);
				const finalDataArr = [];
				$("#photo-list").find('.photo-item').each(function(){
					const url = $(this).find('.photo-frame').attr('href');
					const thumbUrl = $(this).find('img').attr('src');
					const source = $(this).find('.photo-desc').text();
					const fengjing = {
						thumbUrl: thumbUrl,
						url: url,
						city_id: data.city_id,
						source: source,
						page: p,
						city_name: data.city_name,
						surl: data.surl
					};			
					finalDataArr.push(fengjing);		
				});

				Fengjing.insertMany(finalDataArr).then(function(data){
					console.log(data + '风景图数据保存成功');
					caller(++p)
				}).catch(function(err){
					console.log(err);
				});
			});	        		
		});
	}
}





fetchPage(1)(1);
