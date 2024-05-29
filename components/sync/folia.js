const {getResponse, downloadFile, downloadFileFromMirror, downloadFileMain} = require("../../utils/http");
const logger = require("../../utils/logger");
const fs = require("fs");
const {deleteFiles, checkFileSHA256Sync} = require('../../utils/fs')
const config = require("../../config");

async function syncFolia(path) {
    let jsonData = {
        "folia": {}
    };
    //请求folia的版本api
    logger.info('开始执行folia同步工作')
    //检查folia文件夹存在？
    if (!fs.existsSync(path + '/servers/folia')) {
        fs.mkdirSync(path + '/servers/folia', {recursive: true});
    }
    try {
        const response = await getResponse('https://api.papermc.io/v2/projects/folia');
        logger.debug('成功获取folia版本列表:' + response.data)
        let obj = JSON.parse(response.data);
        for (const version of obj.versions.reverse()) {
            //开始查询每个版本的latest构建号
            try {
                const response = await getResponse(`https://api.papermc.io/v2/projects/folia/versions/${version}`);
                let obj = JSON.parse(response.data);
                let latestBuilds = obj.builds[obj.builds.length - 1];
                try {
                    const response = await getResponse(`https://api.papermc.io/v2/projects/folia/versions/${version}/builds/${latestBuilds}`);
                    let obj = JSON.parse(response.data);
                    if (config.mirrorMode === true) {
                        //检测本地版本
                        if (fs.existsSync(path + `/servers/folia/${obj.downloads.application.name}`) && checkFileSHA256Sync(path + `/servers/folia/${obj.downloads.application.name}`, obj.downloads.application.sha256)) {
                            logger.debug(`${obj.downloads.application.name}已存在且校验通过,跳过更新!`)
                        } else {
                            logger.info(`开始下载:${obj.downloads.application.name}`)
                            await downloadFileMain(`https://api.papermc.io/v2/projects/folia/versions/${version}/builds/${latestBuilds}/downloads/${obj.downloads.application.name}`, path + `/servers/folia/${obj.downloads.application.name}`, `${obj.downloads.application.sha256}`, 'sha256')
                                .then(success => {
                                    if (success) {
                                        logger.info(`${obj.downloads.application.name}成功下载!`);
                                    }
                                })
                                .catch(err => {
                                    logger.error(`${obj.downloads.application.name}下载失败!` + err);
                                });
                            //尝试删除旧版本
                            await deleteFiles(path + `/servers/folia/`, `folia-${version}-`, '.jar', `${obj.downloads.application.name}`)
                        }
                    } else {
                        jsonData["folia"][version] = {
                            "file": `https://api.papermc.io/v2/projects/folia/versions/${version}/builds/${latestBuilds}/downloads/${obj.downloads.application.name}`,
                            "mode": "full"
                        };

                    }


                } catch (error) {
                    logger.error('folia端同步失败!- 获取下载信息失败!' + error)
                }
            } catch (error) {
                logger.error('folia端同步失败!- 获取构建号失败!' + error)
            }

        }
        //非mirror模式下直接输出json
        if (config.mirrorMode === false) {
            fs.writeFileSync(path + `/temp/folia.json`, JSON.stringify(jsonData, null, 4));
            logger.info(`folia端Json输出完成!`)
        }

    } catch (error) {
        logger.error('folia端同步失败!- 查询版本列表失败!' + error)
    }
}


module.exports = syncFolia;