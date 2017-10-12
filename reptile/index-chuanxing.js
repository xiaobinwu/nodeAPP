const cheerio = require('cheerio');
const https = require('https');

const rp = require('request-promise');

const CronJob = require('cron').CronJob;

// 检查内存泄漏(node版本不能用)
// const memwatch = require('memwatch');
// const heapdump = require('heapdump');
// memwatch.on('leak', function(info) {
// 	console.error(info);
// 	const file = '/Library/Node/workspace/nodeAPP/rumrecord/' + process.pid + '-' + Date.now() + '.heapsnapshot';
// 	heapdump.writeSnapshot(file, function(err){
// 		if (err){
// 			console.error(err);
// 		}else{
// 			console.error('Wrote snapshot: ' + file);
// 		}
// 	});
// });

// node性能监控 
// const easyMonitor = require('easy-monitor');
// easyMonitor('nodeAPP');


// 引入mongoose
let mongoose = require('mongoose');
let Promise;
//开启日志
// mongoose.set('debug', true);
// 用于异步回调
mongoose.Promise = Promise = require('bluebird');
global.db = mongoose.connect('mongodb://localhost:27017/lvyou', {
	useMongoClient: true
});
global.db.on('error', console.error.bind(console, '连接错误:'));

const hostName = 'https://lvyou.baidu.com/';

const Citys = require('./models/citys');
const Fengjing = require('./models/fengjing');
const Jingdian = require('./models/jingdian');
/**
 * 
 * 封装http.get请求
 * @param {any} url 
 * @param {any} callback 
 */
const httpRequest = (url, callback) => {
	return rp(url).then(function (rawData) {
		return callback(rawData);
	}).catch(function (err) {
		return Promise.reject(err);
	});
}

/**
 * 获取城市列表
 * @param {number} p (城市列表页数)
 */
const fetchPage = (p, rn) => {
	console.log('第'+ p +'-'+ rn +'次抓取 nowTime:' + new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString())
	let parsedData;
	let url = hostName + 'destination/ajax/jingdian?format=ajax&cid=0&playid=0&seasonid=5&surl=zhongguo&pn=' + p + '&rn=' + rn;
	return httpRequest(url, function (rawData) {
		url = null;
		parsedData = JSON.parse(rawData);
		const county = parsedData.data.ambiguity_sname;
		const county_id = parsedData.data.cid;
		const request_id = parsedData.data.request_id;
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
				abs_desc: item.ext.abs_desc,
				map_info: item.ext.map_info // 坐标
			}
			finalDataArr.push(finalData);
		});
		parsedData = null;
		return Citys.insertMany(finalDataArr).then(function(data){
			finalDataArr = null;
			console.log('第'+ p +'-'+ rn +'次基本数据保存成功');

			let loopCityExtraMessage = (l) => {
				let start = new Date();
				while(new Date() - start < (Math.floor(Math.random()*10)+5)*1000){}
				start = null;
				return getSingleCityExtraMessage(data[l], request_id).then(function(){
					l++;
					if(l <= (data.length - 1)){
						return loopCityExtraMessage(l);
					} else{
						l = null;
						loopCityExtraMessage = null;
						return Promise.resolve();
					}
				}).catch(function (err) {
					return Promise.reject(err);
				});
			}

			return loopCityExtraMessage(0);



		}).then(function(){
			console.log('第'+ p +'-'+ rn +'次所有数据（城市数据、景点、景点风景图）保存成功');
			return Promise.resolve();
		}).catch(function (err) {
			return Promise.reject(err);
		});
	}).catch(function (err) {
		return Promise.reject(err);
	});
}

/**
 * 获取对应城市额外数据
 * @param {Object} item (对应城市文档数据)
 * @param {request_id} item (fetchPage函数获取request_id)
 */
const getSingleCityExtraMessage = (data, request_id) => {
	// console.log(data);
	// 获取对应城市页面
	let url = hostName + data.surl + '?&request_id=' + request_id;
	return httpRequest(url, function (html) {
		let $ = cheerio.load(html);
		url = null;
		let pics = [];
		let ImgPages = Math.ceil(Number($('.pic-more-content span').text()) / 24);

		let AttractionsPages = 0;

		if($(".unmis-allview").length > 0){
			AttractionsPages = Math.ceil(Number($('.unmis-more span').eq(0).text()) / 18);
		}

		if($(".main-scene").length > 0){
			AttractionsPages = Math.ceil(Number($(".main-title a").eq(0).text().replace(/[^0-9]/ig,"")) / 18);
		}


		$(".pic-slider").find('.pic-item a').each(function (item) {
			const $img = $(this).find('img');
			pics.push({
				href: $(this).attr('href'),
				src: $img.attr('src'),
				alt: $img.attr('alt'),
				width: $img.attr('width'),
				height: $img.attr('height')
			});
		});
		$ = null;
		return Citys.findByIdAndUpdate(data._id, {
			$set: {
				pics: pics,
				updateTime: new Date()
			}
		}).then(function (data) {
			pics = null;
			console.log(data.city_name + '补充缺失基本数据[pics字段]保存成功');

			let loopAttractionsCity = (l) => {
				let start = new Date();
				while(new Date() - start < (Math.floor(Math.random()*10)+5)*1000){}
				start = null;	
				return getAttractionsCity(l, data).then(function(){
					l++;
					if(l <= AttractionsPages){
						return loopAttractionsCity(l);
					} else{
						console.log(data.city_name + '总共有' + AttractionsPages + '处景点下载完毕！');
						AttractionsPages = null;
						l = null;
						loopAttractionsCity = null;
						return Promise.resolve();
					}
				}).catch(function (err) {
					return Promise.reject(err);
				});
			}

			return loopAttractionsCity(1);

		}).catch(function (err) {
			return Promise.reject(err);
		});
	}).catch(function (err) {
		return Promise.reject(err)
	});
}

/**
 * 计算获取风景图片的pn参数
 * @param {any} p (页数)
 */
const calculatePn = (p) => {
	return (p - 1) * 24;
}


/**
 * 
 * 获取城市风景图片
 * @param {any} data (对应城市文档数据)
 * @param {any} name (是否为为景点的风景图)
 * @param {any} p (页数)
 */
const getFenjing = (p, data, name) => {
	let cityName = name || data.city_name;
	const url = hostName + data.surl + '/fengjing/?pn=' + calculatePn(p);
	return httpRequest(url, function (html) {
		let $ = cheerio.load(html);
		let finalDataArr = [];
		$("#photo-list").find('.photo-item').each(function () {
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
				psurl: data.psurl,
				surl: data.surl
			};
			finalDataArr.push(fengjing);
		});
		$ = null;
		return Fengjing.insertMany(finalDataArr).then(function (data) {
			finalDataArr = null;
			console.log(cityName + '---第' + p + '页风景图数据保存成功');
			cityName = null;
			return Promise.resolve();
		}).catch(function (err) {
			return Promise.reject(err);
		});
	}).catch(function (err) {
		return Promise.reject(err);
	});
}


/**
 * 获取城市景点详细信息
 * @param {any} data (对应城市文档数据)
 * @param {any} p (页数)
 */
const getAttractionsCity = (p, data) => {
	let cityName = data.city_name;
	let url = hostName + '/destination/ajax/jingdian?format=ajax&cid=0&playid=0&seasonid=5&surl=' + data.surl + '&pn=' + p + '&rn=18';
	console.log('准备获取'+ cityName + '第' + p + '页景点数据, url：' + url );
	return httpRequest(url, function (rawData) {
		url = null;
		let parsedData = JSON.parse(rawData);
		// 保存城市缺失的数据（最适合旅游季节和最适合旅游天数）
		const saveMissingData = () => {
			if (p === 1) {
				return Citys.findByIdAndUpdate(data._id, {
					$set: {
						best_play_days: parsedData.data.content.besttime.recommend_visit_time,
						best_time: parsedData.data.content.besttime.month,
						best_time_more_desc: parsedData.data.content.besttime.more_desc,
						best_time_simple_desc: parsedData.data.content.besttime.simple_desc,
						foods: parsedData.data.content.dining.food || [],
						activitys: parsedData.data.content.entertainment.activity || [],
						business: parsedData.data.content.shopping.business || [],
						updateTime: new Date()
					}
				}).then(function (data) {
					console.log(data.city_name + '补充其他[foods、activitys、business...]缺失数据保存成功');
					return Promise.resolve();
				}).catch(function (err) {
					return Promise.reject(err);
				});
			} else {
				return Promise.resolve();
			}
		}
		return saveMissingData().then(function () {
			let finalDataArr = [];
			parsedData.data.scene_list.forEach((item) => {
				const finalData = {
					county: data.county, // 国家名
					county_id: data.county_id, // 国家id，后期可以多国家
					city_id: data.city_id, //城市id
					city_name: data.city_name, // 城市名
					psurl: data.surl, //城市标志
					en_sname: data.en_sname, //城市英文名
					cover: item.cover.full_url, // 景点图片
					ambiguity_sname: item.ambiguity_sname, //景点名字
					surl: item.surl, //景点标识
					remark_count: item.remark_count, // 点评数
					avg_remark_score: item.ext.avg_remark_score, //评分
					abs_desc: item.ext.abs_desc,
					address: item.ext.address, // 位置
					impression: item.ext.impression, //简述
					map_info: item.ext.map_info, //坐标
					more_desc: item.ext.more_desc, //详述
					sketch_desc: item.ext.sketch_desc, //草图介绍
					page: p
				}
				finalDataArr.push(finalData);
			});
			parsedData = null;
			return Jingdian.insertMany(finalDataArr).then(function (data) {
				finalDataArr = null;
				console.log(cityName + '---第' + p + '页景点数据保存成功');
				cityName = null;

				let loopSingleJingdianExtraMessage = (l) => {
					let start = new Date();
					while(new Date() - start < (Math.floor(Math.random()*10)+5)*1000){}
					start = null;
					return getSingleJingdianExtraMessage(data[l]).then(function(){
						l++;
						if(l <= (data.length - 1)){
							return loopSingleJingdianExtraMessage(l);
						} else{
							l = null;
							loopSingleJingdianExtraMessage = null;
							return Promise.resolve();
						}
					}).catch(function (err) {
						return Promise.reject(err);
					});
				}

				return loopSingleJingdianExtraMessage(0);




			}).catch(function (err) {
				return Promise.reject(err);
			});
		}).catch(function (err) {
			return Promise.reject(err);
		});
	}).catch(function (err) {
		return Promise.reject(err);
	});

}

/**
 * 获取对应景点额外数据
 * @param {any} item 
 */
const getSingleJingdianExtraMessage = (data) => {
	let url = hostName + data.surl + '?innerfr_pg=destinationDetailPg&accur_thirdpar=dasou_citycard';
	return httpRequest(url, function (html) {
		url = null;
		let $ = cheerio.load(html);
		let ImgPages = Math.ceil(Number($('.pic-more-content span').text()) / 24);
		// 图片集遍历
		let pics = [];
		$(".pic-slider").find('.pic-item a').each(function (item) {
			const $img = $(this).find('img');
			pics.push({
				href: $(this).attr('href'),
				src: $img.attr('src'),
				alt: $img.attr('alt'),
				width: $img.attr('width'),
				height: $img.attr('height')
			});
		});
		$ = null;
		return Jingdian.findByIdAndUpdate(data._id, {
			$set: {
				pics: pics,
				imgNumber: ImgPages,
				updateTime: new Date()
			}
		}).then(function (data) {
			pics = null;
			ImgPages = ImgPages > 5 ? 5 : ImgPages; //只爬取前五页
			console.log(data.city_name + '-' + data.ambiguity_sname + '补充缺失数据[pics字段]保存成功');

			let loopJingDianFengjing = (j) => {
				let start = new Date();
				while(new Date() - start < (Math.floor(Math.random()*10)+5)*1000){}
				start = null;
				return getFenjing(j, data, data.city_name + '-' + data.ambiguity_sname).then(function(){
					j++;
					if(j <= ImgPages){
						return loopJingDianFengjing(j);
					} else{
						ImgPages = null;
						j = null;
						loopJingDianFengjing = null;
						return Promise.resolve();
					}
				}).catch(function (err) {
					return Promise.reject(err);
				});
			}

			return loopJingDianFengjing(1);


		}).catch(function (err) {
			return Promise.reject(err);
		});
	}).catch(function (err) {
		return Promise.reject(err);
	});
}


global.db.once('open', function () {
	let c = 1;
	let rn = 1;
	console.log('Mongodb running');

	// 获取北京－测试
	fetchPage(c, rn)

	
	// let CronJobTimer = new CronJob('0 */59 * * * *',function(){

	// 	if(c > 1) { CronJobTimer.stop(); CronJobTimer = null; return; }

	// 	fetchPage(c, rn).then(function(){
	// 		if(rn >= 18){
	// 			c++;
	// 			rn = 1;
	// 		} else{
	// 			rn++;
	// 		}
	// 	}).catch(function(){
	// 		return Promise.reject(err);
	// 	})


	// },null,true,null);

});