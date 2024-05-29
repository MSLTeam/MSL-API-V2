const {getResponse, downloadFile, downloadFileFromMirror, downloadFileMain} = require("../../utils/http");
const logger = require("../../utils/logger");
const fs = require("fs");
const {deleteFiles, checkFileSHA256Sync} = require('../../utils/fs')
const config = require("../../config");

async function syncPaper(path) {
    let jsonData = {
        "paper": {}
    };
    //请求paper的版本api
    logger.info('开始执行paper同步')
    //检查paper文件夹存在？
    if (!fs.existsSync(path + '/servers/paper')) {
        fs.mkdirSync(path + '/servers/paper', {recursive: true});
    }
    try {
        const response = await getResponse('https://api.papermc.io/v2/projects/paper');
        logger.debug('成功获取paper版本列表:' + response.data)
        let obj = JSON.parse(response.data);
        for (const version of obj.versions.reverse()) {
            //排掉paper中的1.13-pre7版本
            if (version !== '1.13-pre7') {
                //开始查询每个版本的latest构建号
                try {
                    const response = await getResponse(`https://api.papermc.io/v2/projects/paper/versions/${version}`);
                    let obj = JSON.parse(response.data);
                    let latestBuilds = obj.builds[obj.builds.length - 1];
                    try {
                        const response = await getResponse(`https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${latestBuilds}`);
                        let obj = JSON.parse(response.data);

                        if (config.mirrorMode === true) {
                            //检测本地版本
                            if (fs.existsSync(path + `/servers/paper/${obj.downloads.application.name}`) && checkFileSHA256Sync(path + `/servers/paper/${obj.downloads.application.name}`, obj.downloads.application.sha256)) {
                                logger.info(`${obj.downloads.application.name}已存在且校验通过,跳过更新`)
                            } else {
                                logger.info(`开始下载:${obj.downloads.application.name}`)
                                await downloadFileMain(`https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${latestBuilds}/downloads/${obj.downloads.application.name}`, path + `/servers/paper/${obj.downloads.application.name}`, `${obj.downloads.application.sha256}`, 'sha256')
                                    .then(success => {
                                        if (success) {
                                            logger.info(`${obj.downloads.application.name}成功下载!`);
                                        }
                                    })
                                    .catch(err => {
                                        logger.error(`${obj.downloads.application.name}下载失败!` + err);
                                    });
                                //尝试删除旧版本
                                await deleteFiles(path + `/servers/paper/`, `paper-${version}-`, '.jar', `${obj.downloads.application.name}`)
                            }
                        } else {
                            jsonData["paper"][version] = {
                                "file": `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${latestBuilds}/downloads/${obj.downloads.application.name}`,
                                "mode": "full"
                            };
                        }


                    } catch (error) {
                        logger.error('Paper端同步失败!- 获取下载信息失败!' + error)
                    }
                } catch (error) {
                    logger.error('Paper端同步失败!- 获取构建号失败!' + error)
                }
            }

        }

        //非mirror模式下直接输出json
        if (config.mirrorMode === false) {
            fs.writeFileSync(path + `/temp/paper.json`, JSON.stringify(jsonData, null, 4));
            logger.info(`paper端Json输出完成!`)
        }
    } catch (error) {
        logger.error('Paper端同步失败!- 查询版本列表失败!' + error)
    }
}


module.exports = syncPaper;