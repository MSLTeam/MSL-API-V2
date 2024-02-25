const {getResponse, downloadFileMain} = require("../http");
const fs = require("fs");
const logger = require("../logger");
const {deleteFiles, outputJsonOfMirror} = require("../fs");

async function syncPufferfish(path) {
    logger.info('开始同步海豚系列服务端···')
    //从api获取项目列表
    try {
        const response = await getResponse('https://ci.pufferfish.host/api/json?pretty=true')
        let data = JSON.parse(response.data);
        const output = {};

        data.jobs.forEach(job => {
            let parts = job.name.split('-');
            let key, version;

            if (job.name.endsWith('Purpur')) {
                // Handle cases like "PufferfishPlus-1.18-Purpur"
                key = parts.slice(0, parts.length - 2).join('-') + '-Purpur';
                version = parts[parts.length - 2];
            } else {
                // Handle cases like "Pufferfish-1.17"
                key = parts.slice(0, parts.length - 1).join('-');
                version = parts[parts.length - 1];
            }

            if (!output[key]) {
                output[key] = {};
            }

            output[key][version] = job.url;
        });


        // 遍历项目和版本获取build
        for (let project in output) {
            let projectRename = project.toLowerCase().replace('-', '_')
            if (!fs.existsSync(path + '/servers/' + projectRename)) {
                fs.mkdirSync(path + '/servers/' + projectRename, {recursive: true});
            }
            for (let version in output[project]) {
                let url = output[project][version] + "api/json?tree=builds[number,status,timestamp,id,result,artifacts[*]]";
                const response = await getResponse(url)
                let data = JSON.parse(response.data);

                // 我只要最新的！
                let build = data.builds[0];

                //提取版本号
                let fileName = build.artifacts[0].fileName;
                let fileVersion;

                //一堆乱七八糟的提取版本号
                if (project.startsWith("PufferfishPlus")) {
                    if (fileName.split('-')[1].split('.')[2] === 'jar') {
                        fileVersion = fileName.split('-')[1].split('.')[0] + '.' + fileName.split('-')[1].split('.')[1];
                    } else {
                        fileVersion = fileName.split('-')[1].split('.')[0] + '.' + fileName.split('-')[1].split('.')[1] + '.' + fileName.split('-')[1].split('.')[2];
                    }

                } else {
                    fileVersion = fileName.split('-')[2];
                }


                //1.17.1格式处理 简单方便（）
                fileVersion = fileVersion.replace('R0.1', '1.17.1')

                //下载下来吧
                let jarName = `${projectRename}-${fileVersion}-${build.id}.jar`
                //检测本地版本
                if (fs.existsSync(path + `/servers/${projectRename}/${jarName}`)) {
                    logger.info(`${jarName}已存在,跳过更新`)
                } else {
                    logger.info(`开始下载:${jarName}`)
                    await downloadFileMain(output[project][version] + build.id + "/artifact/" + build.artifacts[0].relativePath, path + `/servers/${projectRename}/${jarName}`, null, 'nope')
                        .then(success => {
                            if (success) {
                                logger.info(`${jarName}成功下载!`);
                            }
                        })
                        .catch(err => {
                            logger.error(`${jarName}下载失败!` + err);
                        });
                    //尝试删除旧版本
                    await deleteFiles(path + `/servers/${projectRename}/`, `${projectRename}-${fileVersion}-`, '.jar', `${jarName}`)
                }
                await outputJsonOfMirror(projectRename, path)

                logger.info(`海豚端：${project} ${fileVersion}: ${output[project][version] + build.id + "/artifact/" + build.artifacts[0].relativePath}`)
            }

        }


        logger.info('海豚系列服务端同步结束！')
    } catch (err) {
        logger.error('海豚端同步失败！' + err)
    }
}

module.exports = syncPufferfish;