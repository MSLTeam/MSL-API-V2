const {getResponse, downloadFileMain} = require("../../utils/http");
const logger = require("../../utils/logger");
const fs = require("fs");
const {deleteFiles, checkFileMD5Sync} = require("../../utils/fs");
const config = require("../../config");

async function syncSpongeVanilla(path) {
    let jsonData = {
        "spongevanilla": {}
    };
    logger.info('开始同步spongevanilla···')

    try {
        if (!fs.existsSync(path + '/servers/spongevanilla')) {
            fs.mkdirSync(path + '/servers/spongevanilla', {recursive: true});
        }
        const response = await getResponse('https://dl-api.spongepowered.org/v2/groups/org.spongepowered/artifacts/spongevanilla');
        let obj = JSON.parse(response.data);
        //遍历版本
        for (const version of obj.tags.minecraft) {
            if (version.toString().includes('rc') || version.toString().includes('pre')) {
                continue;
            }
            try {
                const response = await getResponse(`https://dl-api.spongepowered.org/v2/groups/org.spongepowered/artifacts/spongevanilla/versions?tags=,minecraft:${version}&offset=0&limit=10`);
                let obj = JSON.parse(response.data);
                //遍历获得版本号（一般只有1）
                for (let spVersion in obj.artifacts) {
                    logger.debug(`获取到spongevanilla版本：` + spVersion)
                    //文件重命名
                    let jarName = `spongevanilla-${version}-${spVersion.replace(version + '-', '').replace(new RegExp(version + '-', 'g'), '').replace(/-/g, '_')}.jar`;
                    try {
                        const response = await getResponse(`https://dl-api.spongepowered.org/v2/groups/org.spongepowered/artifacts/spongevanilla/versions/${spVersion}`);
                        let obj = JSON.parse(response.data);
                        for (let builds of obj.assets) {

                            if (builds.extension === 'jar' && builds.classifier === 'universal') {
                                if (config.mirrorMode === true) {
                                    //检测本地版本
                                    if (fs.existsSync(path + `/servers/spongevanilla/${jarName}`) && checkFileMD5Sync(path + `/servers/spongevanilla/${jarName}`, builds.md5)) {
                                        logger.info(`${jarName}已存在且校验通过,跳过更新`);
                                    } else {
                                        logger.info(`开始下载:${jarName}`);
                                        await downloadFileMain(builds.downloadUrl, path + `/servers/spongevanilla/${jarName}`, builds.md5, 'md5')
                                            .then(success => {
                                                if (success) {
                                                    logger.info(`${jarName}成功下载!`);
                                                }
                                            })
                                            .catch(err => {
                                                logger.error(`${jarName}下载失败!` + err);
                                            });
                                        //尝试删除旧版本
                                        await deleteFiles(path + `/servers/spongevanilla/`, `spongevanilla-${version}-`, '.jar', `${jarName}`)
                                    }
                                } else {
                                    jsonData["spongevanilla"][version] = {
                                        "file": builds.downloadUrl,
                                        "mode": "full"
                                    };
                                }

                                break;
                            }
                        }
                    } catch (err) {
                        logger.error('同步spongevanilla出错！ - 拉取版本构建信息或下载出错！' + err)
                    }
                    //只读取最新版本，所以直接跳出for
                    break;
                }

            } catch (err) {
                logger.error('同步spongevanilla出错！ - 拉取版本信息出错！' + err)
            }
        }
        //非mirror模式下直接输出json
        if (config.mirrorMode === false) {
            fs.writeFileSync(path + `/temp/spongevanilla.json`, JSON.stringify(jsonData, null, 4));
            logger.info(`spongevanilla端Json输出完成!`)
        }
        logger.info('同步spongevanilla结束！')
    } catch (err) {
        logger.error('同步spongevanilla出错！ - 拉取版本出错！' + err)
    }
}

module.exports = syncSpongeVanilla;