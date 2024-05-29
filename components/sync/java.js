const fs = require('fs');
const cheerio = require('cheerio');
const logger = require("../../utils/logger");
const {getResponse} = require("../../utils/http");

async function syncJava(path) {
    logger.info('开始更新Java···')
    try {
        const response = await getResponse('https://injdk.cn/');
        const html = response.data
        const json = parseHtml(html);

        fs.writeFile(path + '/res/java.json', JSON.stringify(json, null, 2), (err) => {
            if (err) throw err;
            logger.info('成功更新Java！')
        });
    } catch (err) {
        logger.error('Java更新失败！' + err)
    }

}

function parseHtml(html) {
    const $ = cheerio.load(html);
    const result = {};

    $('.tab-pane').each(function () {
        const id = $(this).attr('id');
        result[id] = {};

        $(this).find('.col-sm-3').each(function () {
            let version = $(this).find('span').text();
            version = version.replace(/\s+/g, ' ').trim();  // 清理空白字符
            version = version.replace('(LTS)', '');
            version = version.replace(' ', '');
            version = version.replace('Java', 'JDK');
            result[id][version] = {};

            $(this).find('li').each(function () {
                let file = $(this).find('a').text();
                file = file.replace(/\s+/g, ' ').trim();
                const url = $(this).find('a').attr('href');
                let platform = file.split('.')[0];
                platform = platform.replace(/\s+/g, ' ').trim();  // 清理空白字符
                result[id][version][platform] = {
                    file: file,
                    url: url
                };
            });
        });
    });

    return result;
}


module.exports = syncJava;