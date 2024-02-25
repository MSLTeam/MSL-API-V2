const {githubReleaseToJson} = require("../http");
const fs = require("fs");
const {sortJsonByVersion} = require("../combinejson");
const logger = require("../logger");

async function syncCatserver(path) {
    logger.info('正在更新CatServer')
    try {
        let result = await githubReleaseToJson('Luohuayu', 'CatServer', 'catserver');
        let output = {"catserver": {}};
        logger.debug('Github CatServer返回:' + JSON.stringify(result));
        for (let version in result.catserver) {
            let target_commitish = result.catserver[version].target_commitish;
            if (!output.catserver[target_commitish]) {
                output.catserver[target_commitish] = [];
            }
            output.catserver[target_commitish].push({
                "name": version,
                "url": result.catserver[version].url,
                "size": result.catserver[version].size
            });
        }
        let latest = {"catserver": {}};
        for (let target_commitish in output.catserver) {
            if (output.catserver[target_commitish].length > 0) {
                latest.catserver[target_commitish] = {
                    "file": 'https://github.moeyy.xyz/' + output.catserver[target_commitish][0].url,
                    "mode": "full",
                    "size": output.catserver[target_commitish][0].size
                };
            }
        }
        fs.writeFileSync(path + '/temp/catserver.json', JSON.stringify(latest, null, 2));
        await sortJsonByVersion(path + '/temp/catserver.json', 'catserver');
        logger.info('更新CatServer成功!')
    } catch (err) {
        logger.error('更新CatServer失败!' + err)
    }

}

module.exports = syncCatserver;