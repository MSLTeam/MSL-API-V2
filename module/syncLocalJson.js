const {downloadFileMain} = require("./http");
const path = require("node:path");
const {calFileSHA256Sync} = require("./fs");
const logger = require("./logger");
const fs = require("fs");


async function syncLocalJson(path2, mainKey) {
    logger.info(`开始拉取${mainKey}···`);
    const jsonPath = `${path2}/temp/${mainKey}.json`;
    const serverPath = `${path2}/servers/${mainKey}`;

    if (!fs.existsSync(serverPath)) {
        fs.mkdirSync(serverPath, {recursive: true});
    }

    if (fs.existsSync(jsonPath)) {

        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

        //检查mainkey
        if (jsonData.hasOwnProperty(mainKey)) {
            const versions = jsonData[mainKey];
            for (const version in versions) {
                if (versions.hasOwnProperty(version)) {
                    const fileInfo = versions[version];
                    const fileUrl = fileInfo.file;
                    const fileSize = fileInfo.size;

                    //从url获取文件名
                    const fileName = path.basename(fileUrl);

                    const dest = `${serverPath}/${fileName}`;

                    //文件不存在，检查完整性
                    if (!fs.existsSync(dest)) {
                        //如果存在size key 检查
                        if (fileSize !== undefined) {
                            logger.info(`开始下载${fileUrl}···`);
                            await downloadFileMain(fileUrl, dest, fileSize, 'size');
                        } else {
                            // Download the file without any verification
                            await downloadFileMain(fileUrl, dest, null, 'nope');
                        }
                    } else {
                        //检查存在的文件的size
                        if (fileSize !== undefined) {
                            const stats = fs.statSync(dest);
                            if (stats.size !== fileSize) {
                                logger.warn(`文件 ${fileName} 的大小与预期不符，重新下载。`);
                                await downloadFileMain(fileUrl, dest, fileSize, 'size');
                            } else {
                                logger.info(`文件 ${fileName} 已存在，跳过下载。`);
                            }
                        } else {
                            logger.info(`文件 ${fileName} 已存在，跳过下载。`);
                        }

                    }


                    //计算sha256 然后输回去
                    const sha256 = calFileSHA256Sync(dest);
                    versions[version].sha256 = sha256;
                    versions[version].mode = "relative";
                    versions[version].file = mainKey + '/' + fileName;
                }
            }

            // Write back updated JSON data to file
            fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
            logger.info(`拉取${mainKey}成功！`);
        } else {
            logger.error(`找不到键：'${mainKey}'，拉取失败！`);
        }
    } else {
        logger.error(`找不到：'${mainKey}.json' 文件，拉取失败！`);
    }
}


module.exports = syncLocalJson;