const {getResponse} = require("../http");
const logger = require("../logger");
const fs = require("fs");
const {mergeJson, sortJsonByVersion} = require("../combinejson");

async function jsonNeoForge(path) {
    logger.info('开始更新NeoForge服务端Url')
    //先获取1.20.1版本（旧版api）,此版本仍然继承了forge的版本号
    let jsonData1 = {
        "neoforge": {}
    };
    try {
        const response = await getResponse(`https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/forge`);
        let obj = JSON.parse(response.data);
        let latestVersion = obj.versions[obj.versions.length - 2]
        jsonData1["neoforge"][latestVersion.split("-")[0]] = {
            "file": `https://maven.neoforged.net/releases/net/neoforged/forge/${latestVersion}/forge-${latestVersion}-installer.jar`,
            "mode": "full"
        };
    } catch (err) {
        logger.error('NeoForge端同步失败!- 1.20.1版本获取失败！' + err)
    }

    //然后获取1.20.2+版本（新版api）,此版本使用了新版版本号
    let jsonData2 = {
        "neoforge": {}
    };
    try {
        const response = await getResponse(`https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge`);
        let obj = JSON.parse(response.data);
        const versions = obj.versions;
        const versionMap = {};

        versions.forEach(version => {
            const [major, minor, patch] = version.split(".");
            const key = `${major}.${minor}`;

            if (!versionMap[key]) {
                versionMap[key] = version;
            } else {
                const existingPatch = versionMap[key].split(".")[2];
                if (parseInt(patch) > parseInt(existingPatch)) {
                    versionMap[key] = version;
                }
            }

            logger.debug(`MC版本:${'1.' + key}的NeoForge的版本： ${versionMap[key]}`);
            let latestVersion = '1.' + key
            jsonData1["neoforge"][latestVersion.split("-")[0]] = {
                "file": `https://maven.neoforged.net/releases/net/neoforged/neoforge/${versionMap[key]}/neoforge-${versionMap[key]}-installer.jar`,
                "mode": "full"
            };
        });

    } catch (err) {
        logger.error('NeoForge端同步失败!- 1.20.2+版本获取失败！' + err)
    }

    //合并输出json
    let jsonData;
    try {
        jsonData = await mergeJson(jsonData2, jsonData1, 'neoforge');
        fs.writeFileSync(path + '/temp/neoforge.json', JSON.stringify(jsonData, null, 4));
        logger.info('NeoForge端Json输出完成!');
        //排序
        await sortJsonByVersion(path + '/temp/neoforge.json', 'neoforge');
    } catch (err) {
        logger.error('NeoForge端同步失败!- 生成json失败！' + err)
    }
    logger.info('更新NeoForge服务端Url完成!')
}

module.exports = jsonNeoForge;