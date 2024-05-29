const cheerio = require('cheerio');
const {getResponse} = require("../../utils/http");
const fs = require("fs");
const logger = require("../../utils/logger");
const sleep = require("../../utils/sleep");
const {mergeJson, compareMCVersions} = require("../../utils/combineJson");

async function jsonBukkit(path, banVersion) {
    logger.info('开始更新水桶端URL')
    let jsonData = {
        "bukkit": {}
    };

    try {
        const response = await getResponse(`https://getbukkit.org/download/craftbukkit`);
        const html = response.data;
        let $ = cheerio.load(html);
        let data = [];

        $('.download-pane').each(async function (i, elem) {
            let version = $(this).find('h2').first().text();
            let url = $(this).find('.btn-download').attr('href');
            data.push({
                version: version,
                url: url
            });

        });
        //从提取出来的json中，继续访问下一级网页，获取真正的下载地址
        for (const obj of data) {
            try {
                //更低版本直接读取归档
                if (await compareMCVersions(obj.version, banVersion) !== 1) {
                    const response = await getResponse(obj.url);
                    const html = response.data;
                    let $ = cheerio.load(html);
                    let downloadLink;

                    $('.well').each(function (i, elem) {
                        if ($(this).find('p').text() === "You're about to download:") {
                            downloadLink = $(this).find('h2 a').attr('href');
                        }
                    });
                    jsonData["bukkit"][obj.version] = {
                        "file": downloadLink,
                        "mode": "full"
                    };
                    logger.info(`水桶端${obj.version}:${downloadLink}`)
                    await sleep(2000);
                }

            } catch (error) {
                logger.error(`bukkit端同步失败!- 获取${obj.version}版本HTML失败!` + error)
            }

        }
        //读取archive版本的json
        try {
            let arcJson = fs.readFileSync(path + '/res/archive_json/bukkit.json');
            let json2 = JSON.parse(arcJson);
            jsonData = await mergeJson(jsonData, json2, 'bukkit');
            fs.writeFileSync(path + '/temp/bukkit.json', JSON.stringify(jsonData, null, 4));
            logger.info('水桶端Json输出完成!');
        } catch (err) {
            logger.error('水桶端同步失败!- 生成json失败！' + err)
        }


    } catch (error) {
        logger.error('bukkit端同步失败!- 获取HTML失败!' + error)
    }
}

module.exports = jsonBukkit;