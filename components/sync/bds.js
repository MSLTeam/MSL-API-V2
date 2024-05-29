//由于mc官网忒慢，大概率失败：（
const cheerio = require('cheerio');
const {getResponse} = require("../../utils/http");
const fs = require("fs");
const logger = require("../../utils/logger");

//从官网爬取下载地址
//thanks new bing
async function jsonBDS(path) {
    logger.info('开始更新官方基岩版服务端')
    try {
        let html = await getResponse(`https://www.minecraft.net/zh-hans/download/server/bedrock`);

        let $ = cheerio.load(html);

        let links = $('a.downloadlink');

        let result = {
            "bds": {}
        };

        links.each((index, link) => {
            let href = $(link).attr('href');
            let version = href.match(/bedrock-server-(.*).zip/)[1];
            let platform = href.includes('win') ? 'Win' : 'Linux';
            let type = href.includes('preview') ? 'Preview' : 'Latest';
            result.bds[`${platform}-${type}-${version}`] = {
                "file": href,
                "mode": "full"
            };
        });
        fs.writeFileSync(path + '/temp/bds.json', JSON.stringify(result, null, 2));
        logger.info('官方基岩版服务端:' + JSON.stringify(result, null, 0));
        logger.info('更新官方基岩版服务端完成!')
    } catch (err) {
        logger.error('更新官方基岩版服务端失败!' + err)
    }


}

module.exports = jsonBDS;