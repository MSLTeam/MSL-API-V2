const {getResponse} = require("../http");
const fs = require("fs");
const logger = require("../logger");

async function jsonFabric(path) {
    logger.info('获取Fabric端url')
    let jsonData = {
        "fabric": {}
    };
    try {
        //获取最新版本的loader
        const response = await getResponse(`https://meta.fabricmc.net/v2/versions/loader`);
        let latestLoader = JSON.parse(response.data)[0].version;

        try {
            const response = await getResponse(`https://meta.fabricmc.net/v2/versions/game`);
            let obj = JSON.parse(response.data);
            for (const ver of obj) {
                if (ver.stable === true) {
                    jsonData["fabric"][ver.version] = {
                        "file": `https://meta.fabricmc.net/v2/versions/loader/${ver.version}/${latestLoader}/1.0.0/server/jar`,
                        "mode": "full"
                    };
                    logger.info(`Fabric ${ver.version}:https://meta.fabricmc.net/v2/versions/loader/${ver.version}/${latestLoader}/1.0.0/server/jar`)
                }
            }
        } catch (error) {
            logger.error('Fabric端同步失败!- 获取版本信息失败!' + error)
        }
        fs.writeFileSync(path + '/temp/fabric.json', JSON.stringify(jsonData, null, 4), (err) => {
            if (err) throw err;
            logger.info('Fabric端Json输出完成!')
        });
    } catch (error) {
        logger.error('Fabric端同步失败!- 获取Loader信息失败!' + error)
    }

}

module.exports = jsonFabric;