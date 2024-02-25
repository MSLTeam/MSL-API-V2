//官方端，不镜像，只输出json
const {getResponse} = require("../http");
const fs = require("fs");
const logger = require("../logger");
const {compareMCVersions, mergeJson} = require("../combinejson");

async function jsonVanilla(path, banVersion) {
    logger.info('开始同步原版香草端···')
    let data = {
        "vanilla": {}
    };
    try {
        //bmclapi获取官方json
        const response = await getResponse(`https://bmclapi2.bangbang93.com/mc/game/version_manifest_v2.json`);
        let obj = JSON.parse(response.data);
        for (const version of obj.versions) {
            //只需要发布版本
            if (version.type === 'release') {
                //原版香草端只获取新版本（旧版本官方也不会更新）
                if (await compareMCVersions(version.id, banVersion) !== 1) {
                    try {
                        //bmclapi获取官方json
                        const response = await getResponse(version.url);
                        let obj = JSON.parse(response.data);
                        let fileUrl = obj.downloads.server.url.replace('piston-data.mojang.com', 'bmclapi2.bangbang93.com'); // 这里应该是你的实际文件URL
                        data["vanilla"][version.id] = {
                            "file": fileUrl,
                            "mode": "full"
                        };
                        logger.info(`原版香草端${version.id}:${fileUrl}`)
                    } catch (error) {
                        logger.error(`香草端${version.id}同步失败!- 获取版本json失败!` + error)
                    }
                }
            }
        }
        //读取archive版本的json
        try {
            let arcJson = fs.readFileSync(path + '/res/archive_json/vanilla.json');
            let json2 = JSON.parse(arcJson);
            data = await mergeJson(data, json2, 'vanilla');
            fs.writeFileSync(path + '/temp/vanilla.json', JSON.stringify(data, null, 4));
            logger.info('原版香草端Json输出完成!');
        } catch (err) {
            logger.error('香草端同步失败!- 生成json失败！' + err)
        }

    } catch (error) {
        logger.error('香草端同步失败!- 获取manifest失败!' + error)
    }
}

module.exports = jsonVanilla;