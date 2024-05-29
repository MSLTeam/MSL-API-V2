const {getResponse, downloadFile, downloadFileFromMirror, downloadFileMain} = require("../../utils/http");
const logger = require("../../utils/logger");
const fs = require("fs");
const {deleteFiles, checkFileMD5Sync} = require('../../utils/fs')
const config = require("../../config");

async function syncBanner(path) {
    let jsonData = { //给直接输出json留的
        "banner": {}
    };
    //请求banner的版本api
    logger.info('开始执行banner同步工作')
    //检查banner文件夹存在？
    if (!fs.existsSync(path + '/servers/banner')) {
        fs.mkdirSync(path + '/servers/banner', {recursive: true});
    }
    try {
        const response = await getResponse('https://mohistmc.com/api/v2/projects/banner/');
        logger.debug('成功获取banner版本列表:' + response.data)
        let obj = JSON.parse(response.data);
        for (const version of obj.versions.reverse()) {
            //开始查询每个版本的latest构建号
            try {
                const response = await getResponse(`https://mohistmc.com/api/v2/projects/banner/${version}/builds/`);
                let obj = JSON.parse(response.data);
                let latestBuilds = obj.builds[obj.builds.length - 1]; //获取最新版本的build
                if (config.mirrorMode === true) {
                    //检测本地版本
                    if (fs.existsSync(path + `/servers/banner/banner-${version}-${latestBuilds.number}.jar`) && checkFileMD5Sync(path + `/servers/banner/banner-${version}-${latestBuilds.number}.jar`, latestBuilds.fileMd5)) {
                        logger.info(`banner-${version}-${latestBuilds.number}.jar已存在且校验通过,跳过更新`)
                    } else {
                        logger.info(`开始下载:banner-${version}-${latestBuilds.number}.jar`)
                        await downloadFileMain(latestBuilds.url, path + `/servers/banner/banner-${version}-${latestBuilds.number}.jar`, latestBuilds.fileMd5, 'md5')
                            .then(success => {
                                if (success) {
                                    logger.info(`banner-${version}-${latestBuilds.number}.jar成功下载!`);
                                }
                            })
                            .catch(err => {
                                logger.error(`banner-${version}-${latestBuilds.number}.jar下载失败!` + err);
                            });
                        //尝试删除旧版本
                        await deleteFiles(path + `/servers/banner/`, `banner-${version}-`, '.jar', `banner-${version}-${latestBuilds.number}.jar`)
                    }
                } else {
                    //只输出url
                    jsonData["banner"][version] = {
                        "file": latestBuilds.url,
                        "mode": "full"
                    };
                }


            } catch (error) {
                logger.error('banner端同步失败!- 获取构建号失败!' + error)
            }

        }
        //非mirror模式下直接输出json
        if (config.mirrorMode === false) {
            fs.writeFileSync(path + `/temp/banner.json`, JSON.stringify(jsonData, null, 4));
            logger.info(`banner端Json输出完成!`)
        }

    } catch (error) {
        logger.error('banner端同步失败!- 查询版本列表失败!' + error)
    }
}


module.exports = syncBanner;