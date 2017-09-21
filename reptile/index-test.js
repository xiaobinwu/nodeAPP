const cheerio = require('cheerio');
const https = require('https');

const rp = require('request-promise');


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
 * 偏函数
 * @param {number} total (城市列表总页数)
 * @param {number} timeout (延时时间-节流)
 * @param {number} p (城市列表页数)
 */
const fetchPage = (total, timeout = 180) => {
	return function (p) {
		let caller = arguments.callee;
		let parsedData;
		if (p > total) {
			console.log('所有数据爬取成功！');
			parsedData = null;
			caller = null;
			return;
		}
		// if(p%5 === 0){
		// 	const waitUntil = new Date(new Date().getTime() + timeout * 1000);
		// 	while(waitUntil > new Date()){}
		// }
		let url = hostName + 'destination/ajax/jingdian?format=ajax&cid=0&playid=0&seasonid=5&surl=zhongguo&pn=' + p + '&rn=18';
		httpRequest(url, function (rawData) {
			url = null;
			parsedData = JSON.parse(rawData);
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
					abs_desc: item.ext.abs_desc,
					map_info: item.ext.map_info // 坐标
				}
				finalDataArr.push(finalData);
			});
			return Citys.insertMany(finalDataArr);
		}).then(function (data) {
			console.log('城市列表---第' + p + '页数据保存成功');
			return Promise.all(data.map(function (item) {
				getSingleCityExtraMessage(item, parsedData);
			}));
		}).then(function () {
			//延迟执行，避免频繁请求接口
			// setTimeout(function () {
			// 	caller(++p);
			// }, timeout);

			const fetchPageCaller = caller;
			parsedData = null;
			caller = null;

			process.nextTick(fetchPageCaller, ++p);
		}).catch(function (err) {
			console.log(err);
		});
	}
}

/**
 * 获取对应城市额外数据
 * @param {Object} item (对应城市文档数据)
 * @param {parsedData} item (fetchPage函数获取的数据返回)
 */
const getSingleCityExtraMessage = (data, parsedData) => {
	// console.log(data);
	// 获取对应城市页面
	let $ = null;
	let url = hostName + data.surl + '?&request_id=' + parsedData.data.request_id;
	return httpRequest(url, function (html) {
		$ = cheerio.load(html);
		url = null;
		const pics = [];
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
		return Citys.findByIdAndUpdate(data._id, {
			$set: {
				pics: pics,
				updateTime: new Date()
			}
		});
	}).then(function (data) {
		console.log(data.city_name + '补充缺失数据[pics字段]保存成功');
		// 页数
		const ImgPages = Math.ceil(Number($('.pic-more-content span').text()) / 24);


		// 测试
		// const ImgPages = 1;
		// 获取城市风景图
		return getFenjing(ImgPages, data)(1);

	}).then(function () {
		// const AttractionsPages = 1;
		const AttractionsPages = Math.ceil(Number($('.unmis-more span').text()) / 18);
		$ = null;
		return getAttractionsCity(AttractionsPages, data)(1);
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
 * @param {any} count (图片总页数数)
 * @param {any} data (对应城市文档数据)
 * @param {any} name (是否为为景点的风景图)
 * @param {any} p (页数)
 */
const getFenjing = (count, data, name) => {
	let cityName = name || data.city_name;
	return function (p) {
		let caller = arguments.callee;
		let $ = null;
		if (p > count) {
			console.log(cityName + '所有风景图数据保存成功');
			cityName = null;
			return Promise.resolve();
		}
		const url = hostName + data.surl + '/fengjing/?pn=' + calculatePn(p);
		return httpRequest(url, function (html) {
			$ = cheerio.load(html);
			const finalDataArr = [];
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
					surl: data.surl
				};
				finalDataArr.push(fengjing);
			});
			$ = null;
			return Fengjing.insertMany(finalDataArr);
		}).then(function (data) {
			console.log(cityName + '---第' + p + '页风景图数据保存成功');
			return Promise.resolve();
		}).then(function () {
			const fenjingCaller = caller;
			caller = null;
			return process.nextTick(fenjingCaller, ++p);
		}).catch(function (err) {
			return Promise.reject(err);
		});
	}
}


/**
 * 获取城市景点详细信息
 * @param {any} count (图片总页数数)
 * @param {any} data (对应城市文档数据)
 * @param {any} p (页数)
 */
const getAttractionsCity = (count, data) => {
	let cityName = data.city_name;
	return function (p) {
		let caller = arguments.callee;
		if (p > count) {
			console.log(cityName + '所有景点数据保存成功');
			cityName = null;
			return Promise.resolve();
		}
		let url = hostName + '/destination/ajax/jingdian?format=ajax&cid=0&playid=0&seasonid=5&surl=' + data.surl + '&pn=' + p + '&rn=18';
		return httpRequest(url, function (rawData) {
			url = null;
			const parsedData = JSON.parse(rawData);
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
						sketch_desc: item.ext.sketch_desc //草图介绍
					}
					finalDataArr.push(finalData);
				});

				return Jingdian.insertMany(finalDataArr);

			}).catch(function (err) {
				return Promise.reject(err);
			});

		}).then(function (data) {
			console.log(cityName + '---第' + p + '页景点数据保存成功');
			return Promise.all(data.map(function (item) {
				getSingleJingdianExtraMessage(item);
			}));
			// return Promise.resolve();
		}).then(function () {
			const attractionsCaller = caller;
			caller = null;
			return process.nextTick(attractionsCaller, ++p);
		})
	}
}

/**
 * 获取对应景点额外数据
 * @param {any} item 
 */
const getSingleJingdianExtraMessage = (data) => {
	let $ = null;
	let url = hostName + data.surl + '?innerfr_pg=destinationDetailPg&accur_thirdpar=dasou_citycard';
	return httpRequest(url, function (html) {
		url = null;
		$ = cheerio.load(html);
		// 图片集遍历
		const pics = [];
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
		return Jingdian.findByIdAndUpdate(data._id, {
			$set: {
				pics: pics,
				updateTime: new Date()
			}
		});
	}).then(function (data) {
		console.log(data.city_name + '-' + data.ambiguity_sname + '补充缺失数据[pics字段]保存成功');
		// 页数
		const ImgPages = Math.ceil(Number($('.pic-more-content span').text()) / 24);

		$ = null;

		// 测试
		// const ImgPages = 1;
		// 获取城市风景图
		return getFenjing(ImgPages, data, data.city_name + '-' + data.ambiguity_sname)(1);
	}).catch(function (err) {
		return Promise.reject(err);
	});
}


global.db.once('open', function () {
	let c = 0;
	console.log('Mongodb running');
	let timer = setInterval(function(){
		if(c > 78){
			clearInterval(timer);
			timer = null;
			return;
		}
		fetchPage(++c)(++c);
	},20*60*1000);
});