const {getResponse, downloadFile, downloadFileFromMirror, downloadFileMain} = require("../../utils/http");
const logger = require("../../utils/logger");
const fs = require("fs");
const {deleteFiles, checkFileMD5Sync} = require('../../utils/fs')
const config = require("../../config");

async function syncMohist(path) {
    let jsonData = {
        "mohist": {}
    };
    //请求mohist的版本api
    logger.info('开始执行mohist同步工作')
    //检查mohist文件夹存在？
    if (!fs.existsSync(path + '/servers/mohist')) {
        fs.mkdirSync(path + '/servers/mohist', {recursive: true});
    }
    try {
        const response = await getResponse('https://mohistmc.com/api/v2/projects/mohist/');
        logger.debug('成功获取mohist版本列表:' + response.data)
        let obj = JSON.parse(response.data);
        for (const version of obj.versions.reverse()) {
            //排掉mohist中的1.13-pre7版本
            //开始查询每个版本的latest构建号
            try {
                const response = await getResponse(`https://mohistmc.com/api/v2/projects/mohist/${version}/builds/`);
                let obj = JSON.parse(response.data);
                let latestBuilds = obj.builds[obj.builds.length - 1]; //获取最新版本的build
                if (config.mirrorMode === true) {
                    //检测本地版本
                    if (fs.existsSync(path + `/servers/mohist/mohist-${version}-${latestBuilds.number}.jar`) && checkFileMD5Sync(path + `/servers/mohist/mohist-${version}-${latestBuilds.number}.jar`, latestBuilds.fileMd5)) {
                        logger.info(`mohist-${version}-${latestBuilds.number}.jar已存在且校验通过,跳过更新`)
                    } else {
                        logger.info(`开始下载:mohist-${version}-${latestBuilds.number}.jar`)
                        await downloadFileMain(latestBuilds.url, path + `/servers/mohist/mohist-${version}-${latestBuilds.number}.jar`, latestBuilds.fileMd5, 'md5')
                            .then(success => {
                                if (success) {
                                    logger.info(`mohist-${version}-${latestBuilds.number}.jar成功下载!`);
                                }
                            })
                            .catch(err => {
                                logger.error(`mohist-${version}-${latestBuilds.number}.jar下载失败!` + err);
                            });
                        //尝试删除旧版本
                        await deleteFiles(path + `/servers/mohist/`, `mohist-${version}-`, '.jar', `mohist-${version}-${latestBuilds.number}.jar`)
                    }
                } else {
                    jsonData["mohist"][version] = {
                        "file": latestBuilds.url,
                        "mode": "full"
                    };
                }


            } catch (error) {
                logger.error('mohist端同步失败!- 获取构建号失败!' + error)
            }

        }
        if (config.mirrorMode === false) {
            fs.writeFileSync(path + `/temp/mohist.json`, JSON.stringify(jsonData, null, 4));
            logger.info(`mohist端Json输出完成!`)
        }

    } catch (error) {
        logger.error('mohist端同步失败!- 查询版本列表失败!' + error)
    }
}


module.exports = syncMohist;