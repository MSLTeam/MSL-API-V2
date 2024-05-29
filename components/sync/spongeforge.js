const {getResponse, downloadFileMain} = require("../../utils/http");
const logger = require("../../utils/logger");
const fs = require("fs");
const {deleteFiles, checkFileMD5Sync} = require("../../utils/fs");
const config = require("../../config");

async function syncSpongeForge(path) {
    logger.info('开始同步SpongeForge···')
    let jsonData = {
        "spongeforge": {}
    };
    try {
        if (!fs.existsSync(path + '/servers/spongeforge')) {
            fs.mkdirSync(path + '/servers/spongeforge', {recursive: true});
        }
        const response = await getResponse('https://dl-api.spongepowered.org/v2/groups/org.spongepowered/artifacts/spongeforge');
        let obj = JSON.parse(response.data);
        //遍历版本
        for (const version of obj.tags.minecraft) {
            try {
                const response = await getResponse(`https://dl-api.spongepowered.org/v2/groups/org.spongepowered/artifacts/spongeforge/versions?tags=,minecraft:${version}&offset=0&limit=10`);
                let obj = JSON.parse(response.data);
                //遍历获得版本号（一般只有1）
                for (let spVersion in obj.artifacts) {
                    logger.debug(`获取到spongeforge版本：` + spVersion)
                    //文件重命名
                    let jarName = `spongeforge-${version}-${spVersion.replace(version + '-', '').replace(new RegExp(version + '-', 'g'), '').replace(/-/g, '_')}.jar`;
                    try {
                        const response = await getResponse(`https://dl-api.spongepowered.org/v2/groups/org.spongepowered/artifacts/spongeforge/versions/${spVersion}`);
                        let obj = JSON.parse(response.data);
                        for (let builds of obj.assets) {

                            if (builds.extension === 'jar' && builds.classifier === '') {
                                if (config.mirrorMode === true) {
                                    //检测本地版本
                                    if (fs.existsSync(path + `/servers/spongeforge/${jarName}`) && checkFileMD5Sync(path + `/servers/spongeforge/${jarName}`, builds.md5)) {
                                        logger.info(`${jarName}已存在且校验通过,跳过更新`);
                                    } else {
                                        logger.info(`开始下载:${jarName}`);
                                        await downloadFileMain(builds.downloadUrl, path + `/servers/spongeforge/${jarName}`, builds.md5, 'md5')
                                            .then(success => {
                                                if (success) {
                                                    logger.info(`${jarName}成功下载!`);
                                                }
                                            })
                                            .catch(err => {
                                                logger.error(`${jarName}下载失败!` + err);
                                            });
                                        //尝试删除旧版本
                                        await deleteFiles(path + `/servers/spongeforge/`, `spongeforge-${version}-`, '.jar', `${jarName}`)
                                    }
                                } else {
                                    jsonData["spongeforge"][version] = {
                                        "file": builds.downloadUrl,
                                        "mode": "full"
                                    };
                                }

                                break;
                            }
                        }
                    } catch (err) {
                        logger.error('同步SpongeForge出错！ - 拉取版本构建信息或下载出错！' + err)
                    }
                    //只读取最新版本，所以直接跳出for
                    break;
                }

            } catch (err) {
                logger.error('同步SpongeForge出错！ - 拉取版本信息出错！' + err)
            }
        }
        //非mirror模式下直接输出json
        if (config.mirrorMode === false) {
            fs.writeFileSync(path + `/temp/spongeforge.json`, JSON.stringify(jsonData, null, 4));
            logger.info(`spongeforge端Json输出完成!`)
        }
        logger.info('同步SpongeForge结束！')
    } catch (err) {
        logger.error('同步SpongeForge出错！ - 拉取版本出错！' + err)
    }
}

module.exports = syncSpongeForge;