const logger = require("../../utils/logger");
const {getResponse} = require("../../utils/http");
const fs = require("fs");
const sleep = require("../../utils/sleep");
const {sortJsonByVersion, compareMCVersions, mergeJson} = require("../../utils/combineJson");


async function jsonForge(path, banVersion) {
    logger.info('开始获取Forge端url')
    let jsonData = {
        "forge": {}
    };
    try {
        //获取最新版本的loader
        const response = await getResponse(`https://bmclapi2.bangbang93.com/forge/minecraft/`);
        let obj = JSON.parse(response.data);
        for (const ver of obj) {
            if (await compareMCVersions(ver, banVersion) !== 1) {
                //排除api中包含的pre4
                if (ver !== '1.7.10_pre4') {
                    try {
                        //获取最新版本的forge
                        const response = await getResponse(`https://bmclapi2.bangbang93.com/forge/minecraft/${ver}`);
                        let obj = JSON.parse(response.data);
                        let latestForge = obj[obj.length - 1].version
                        jsonData["forge"][ver] = {
                            "file": `https://bmclapi2.bangbang93.com/forge/download?mcversion=${ver}&version=${latestForge}&category=installer&format=jar`,
                            "mode": "full"
                        };
                        logger.info(`Forge ${ver}:https://bmclapi2.bangbang93.com/forge/download?mcversion=${ver}&version=${latestForge}&category=installer&format=jar`)
                        await sleep(2000);
                    } catch (error) {
                        logger.error(`Forge端同步失败!- 获取Forge ${ver}信息失败!` + error)
                    }
                }
            }


        }

        //读取archive版本的json
        try {
            let arcJson = fs.readFileSync(path + '/res/archive_json/forge.json');
            let json2 = JSON.parse(arcJson);
            jsonData = await mergeJson(jsonData, json2, 'forge');
            fs.writeFileSync(path + '/temp/forge.json', JSON.stringify(jsonData, null, 4));
            logger.info('Forge端Json输出完成!');
        } catch (err) {
            logger.error('Forge端同步失败!- 生成json失败！' + err)
        }


        //排序
        await sortJsonByVersion(path + '/temp/forge.json', 'forge');
    } catch (error) {
        logger.error('Forge端同步失败!- 获取MC版本信息失败!' + error)
    }
}

module.exports = jsonForge;