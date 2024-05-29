const {
    getResponse,
    downloadFile,
    getRedirectUrl,
    downloadFileFromMirror,
    downloadFileMain
} = require("../../utils/http");
const logger = require("../../utils/logger");
const fs = require("fs");
const {deleteFiles, checkFileSHA256Sync} = require('../../utils/fs')
const config = require("../../config");

async function syncLeaves(path) {
    let jsonData = {
        "leaves": {}
    };
    //请求leaves的版本api
    logger.info('开始执行leaves同步工作')
    //检查leaves文件夹存在？
    if (!fs.existsSync(path + '/servers/leaves')) {
        fs.mkdirSync(path + '/servers/leaves', {recursive: true});
    }
    try {
        const response = await getResponse('https://api.leavesmc.top/v2/projects/leaves');
        logger.debug('成功获取leaves版本列表:' + response.data)
        let obj = JSON.parse(response.data);
        for (const version of obj.versions.reverse()) {
            //开始查询每个版本的latest构建号
            try {
                const response = await getResponse(`https://api.leavesmc.top/v2/projects/leaves/versions/${version}`);
                let obj = JSON.parse(response.data);
                let latestBuilds = obj.builds[obj.builds.length - 1];
                try {
                    const response = await getResponse(`https://api.leavesmc.top/v2/projects/leaves/versions/${version}/builds/${latestBuilds}`);
                    let obj = JSON.parse(response.data);
                    if (config.mirrorMode === true) {
                        //检测本地版本
                        if (fs.existsSync(path + `/servers/leaves/leaves-${version}-${latestBuilds}.jar`) && checkFileSHA256Sync(path + `/servers/leaves/leaves-${version}-${latestBuilds}.jar`, obj.downloads.application.sha256)) {
                            logger.info(`leaves-${version}-${latestBuilds}.jar已存在且校验通过，不更新!`)
                        } else {
                            logger.info(`开始下载:leaves-${version}-${latestBuilds}.jar`)
                            let dlUrl = await getRedirectUrl(`https://api.leavesmc.top/v2/projects/leaves/versions/${version}/builds/${latestBuilds}/downloads/${obj.downloads.application.name}`)
                            logger.debug('获取到Leaves Release地址：' + dlUrl)
                            await downloadFileMain(`https://github.moeyy.xyz/${dlUrl}`, path + `/servers/leaves/leaves-${version}-${latestBuilds}.jar`, `${obj.downloads.application.sha256}`, 'sha256')
                                .then(success => {
                                    if (success) {
                                        logger.info(`leaves-${version}-${latestBuilds}.jar成功下载!`);
                                    }
                                })
                                .catch(err => {
                                    logger.error(`leaves-${version}-${latestBuilds}.jar下载失败!` + err);
                                });
                            //尝试删除旧版本
                            await deleteFiles(path + `/servers/leaves/`, `leaves-${version}-`, '.jar', `leaves-${version}-${latestBuilds}.jar`)
                        }
                    } else {
                        let dlUrl = await getRedirectUrl(`https://api.leavesmc.top/v2/projects/leaves/versions/${version}/builds/${latestBuilds}/downloads/${obj.downloads.application.name}`)
                        jsonData["leaves"][version] = {
                            "file": dlUrl,
                            "mode": "full"
                        };

                    }


                } catch (error) {
                    logger.error('leaves端同步失败!- 获取下载信息失败!' + error)
                }
            } catch (error) {
                logger.error('leaves端同步失败!- 获取构建号失败!' + error)
            }

        }
        //非mirror模式下直接输出json
        if (config.mirrorMode === false) {
            fs.writeFileSync(path + `/temp/leaves.json`, JSON.stringify(jsonData, null, 4));
            logger.info(`leaves端Json输出完成!`)
        }

    } catch (error) {
        logger.error('leaves端同步失败!- 查询版本列表失败!' + error)
    }
}


module.exports = syncLeaves;