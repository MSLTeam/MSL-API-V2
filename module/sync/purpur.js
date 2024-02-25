const {getResponse, downloadFile, downloadFileFromMirror, downloadFileMain} = require("../http");
const logger = require("../logger");
const fs = require("fs");
const {deleteFiles, checkFileMD5Sync} = require('../fs')

async function syncPurpur(path) {
    //请求purpur的版本api
    logger.info('开始执行purpur同步')
    //检查purpur文件夹存在？
    if (!fs.existsSync(path + '/servers/purpur')) {
        fs.mkdirSync(path + '/servers/purpur', {recursive: true});
    }
    try {
        const response = await getResponse('https://api.purpurmc.org/v2/purpur/');
        logger.debug('成功获取purpur版本列表:' + response.data)
        let obj = JSON.parse(response.data);
        for (const version of obj.versions.reverse()) {
            //开始查询每个版本的latest构建号
            try {
                const response = await getResponse(`https://api.purpurmc.org/v2/purpur/${version}`);
                let obj = JSON.parse(response.data);
                let latestBuilds = obj.builds.latest;
                try {
                    const response = await getResponse(`https://api.purpurmc.org/v2/purpur/${version}/${latestBuilds}`);
                    let obj = JSON.parse(response.data);
                    //检测本地版本
                    if (fs.existsSync(path + `/servers/purpur/purpur-${version}-${latestBuilds}.jar`) && checkFileMD5Sync(path + `/servers/purpur/purpur-${version}-${latestBuilds}.jar`, obj.md5)) {
                        logger.info(`purpur-${version}-${latestBuilds}.jar已存在且校验通过,跳过更新`)
                    } else {
                        logger.info(`开始下载:purpur-${version}-${latestBuilds}.jar`)
                        await downloadFileMain(`https://api.purpurmc.org/v2/purpur/${version}/${latestBuilds}/download`, path + `/servers/purpur/purpur-${version}-${latestBuilds}.jar`, `${obj.md5}`, 'md5')
                            .then(success => {
                                if (success) {
                                    logger.info(`purpur-${version}-${latestBuilds}.jar成功下载!`);
                                }
                            })
                            .catch(err => {
                                logger.error(`purpur-${version}-${latestBuilds}.jar下载失败!` + err);
                            });
                        //尝试删除旧版本
                        await deleteFiles(path + `/servers/purpur/`, `purpur-${version}-`, '.jar', `purpur-${version}-${latestBuilds}.jar`)
                    }


                } catch (error) {
                    logger.error('purpur端同步失败!- 获取下载信息失败!' + error)
                }
            } catch (error) {
                logger.error('purpur端同步失败!- 获取构建号失败!' + error)
            }


        }
    } catch (error) {
        logger.error('purpur端同步失败!- 查询版本列表失败!' + error)
    }
}


module.exports = syncPurpur;