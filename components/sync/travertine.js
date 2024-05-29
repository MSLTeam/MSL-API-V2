const {getResponse, downloadFile, downloadFileFromMirror, downloadFileMain} = require("../../utils/http");
const logger = require("../../utils/logger");
const fs = require("fs");
const {deleteFiles, checkFileSHA256Sync} = require('../../utils/fs')
const config = require("../../config");

async function syncTravertine(path) {
    let jsonData = {
        "travertine": {}
    };
    //请求travertine的版本api
    logger.info('开始执行travertine同步工作')
    //检查travertine文件夹存在？
    if (!fs.existsSync(path + '/servers/travertine')) {
        fs.mkdirSync(path + '/servers/travertine', {recursive: true});
    }
    let version; //存储最新版本
    try {
        const response = await getResponse('https://api.papermc.io/v2/projects/travertine/');
        logger.debug('成功获取travertine版本列表:' + response.data)
        let obj = JSON.parse(response.data);
        version = obj.versions[obj.versions.length - 1]
        //开始查询最新版本的latest构建号
        try {
            const response = await getResponse(`https://api.papermc.io/v2/projects/travertine/versions/${version}`);
            let obj = JSON.parse(response.data);
            let latestBuilds = obj.builds[obj.builds.length - 1];
            try {
                const response = await getResponse(`https://api.papermc.io/v2/projects/travertine/versions/${version}/builds/${latestBuilds}`);
                let obj = JSON.parse(response.data);
                if (config.mirrorMode === true) {
                    //检测本地版本
                    if (fs.existsSync(path + `/servers/travertine/${obj.downloads.application.name}`) && checkFileSHA256Sync(path + `/servers/travertine/${obj.downloads.application.name}`, obj.downloads.application.sha256)) {
                        logger.info(`${obj.downloads.application.name}已存在且校验通过,跳过更新`)
                    } else {
                        logger.info(`开始下载:${obj.downloads.application.name}`)
                        await downloadFileMain(`https://api.papermc.io/v2/projects/travertine/versions/${version}/builds/${latestBuilds}/downloads/${obj.downloads.application.name}`, path + `/servers/travertine/${obj.downloads.application.name}`, `${obj.downloads.application.sha256}`, 'sha256')
                            .then(success => {
                                if (success) {
                                    logger.info(`${obj.downloads.application.name}成功下载!`);
                                }
                            })
                            .catch(err => {
                                logger.error(`${obj.downloads.application.name}下载失败!` + err);
                            });
                        //尝试删除旧版本
                        await deleteFiles(path + `/servers/travertine/`, `travertine-`, '.jar', `${obj.downloads.application.name}`)
                    }
                } else {
                    //只输出url
                    jsonData["travertine"][version] = {
                        "file": `https://api.papermc.io/v2/projects/travertine/versions/${version}/builds/${latestBuilds}/downloads/${obj.downloads.application.name}`,
                        "mode": "full"
                    };
                }

                //非mirror模式下直接输出json
                if (config.mirrorMode === false) {
                    fs.writeFileSync(path + `/temp/travertine.json`, JSON.stringify(jsonData, null, 4));
                    logger.info(`travertine端Json输出完成!`)
                }

            } catch (error) {
                logger.error('travertine端同步失败!- 获取下载信息失败!' + error)
            }
        } catch (error) {
            logger.error('travertine端同步失败!- 获取构建号失败!' + error)
        }


    } catch (error) {
        logger.error('travertine端同步失败!- 查询版本列表失败!' + error)
    }
}


module.exports = syncTravertine;