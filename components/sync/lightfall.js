const {githubReleaseToJson} = require("../../utils/http");
const fs = require("fs");
const logger = require("../../utils/logger");

async function syncLightfall(path) {
    logger.info('开始更新lightfall')
    try {
        let result = await githubReleaseToJson('ArclightPowered', 'lightfall', 'lightfall');
        let newResult = {"lightfall": {}};
        //把版本归类到数组
        for (let version in result.lightfall) {
            let majorVersion = version.substring(0, version.lastIndexOf('-'));
            if (!newResult.lightfall[majorVersion]) {
                newResult.lightfall[majorVersion] = [];
            }
            newResult.lightfall[majorVersion].push({
                "id": version,
                "url": result.lightfall[version].url
            });
        }
        //提取最新版本作为输出
        let latestResult = {"lightfall": {}};

        for (let majorVersion in newResult.lightfall) {
            let latestVersion = newResult.lightfall[majorVersion][0];
            latestResult.lightfall[majorVersion] = {
                "file": latestVersion.url,
                "mode": "full"
            };
        }
        fs.writeFileSync(path + '/temp/lightfall.json', JSON.stringify(latestResult, null, 2));
        logger.info('更新lightfall完成!')
    } catch (err) {
        logger.info('更新lightfall失败!' + err)
    }
}

module.exports = syncLightfall;