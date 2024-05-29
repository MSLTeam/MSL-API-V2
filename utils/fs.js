const fs = require('fs');
const path = require('path');
const logger = require('./logger')
const crypto = require('crypto');
const {sortJsonByVersion} = require("./combineJson");
const config = require("../config");

//删除文件
let deleteFilesArgs = null;

function deleteFiles(dir, prefix, suffix, excludeFile) {
    deleteFilesArgs = {dir, prefix, suffix, excludeFile};
    logger.info('已记录删除文件的参数！将在json输出后开始删除！');
}

//执行删除文件
function deleteFilesNow() {
    logger.info('开始执行过期服务端清理！')
    if (deleteFilesArgs === null) {
        logger.info('没有文件需要被删除！');
        return;
    }

    const {dir, prefix, suffix, excludeFile} = deleteFilesArgs;
    const files = fs.readdirSync(dir);
    //遍历删除
    files.forEach(file => {
        if (file.startsWith(prefix) && file.endsWith(suffix) && file !== excludeFile) {
            fs.unlinkSync(path.join(dir, file));
            logger.info('已删除文件:' + file);
        }
    });

    //清空记录
    deleteFilesArgs = null;
}

async function outputJsonOfMirror(project, dirPath) {
    if (config.mirrorMode === true) {
        try {
            let data = {};

            fs.readdirSync(dirPath + '/servers/' + project).forEach(file => {
                let parts = path.basename(file).split('-');
                if (!data[project]) {
                    data[project] = {};
                }
                data[project][parts[1]] = {
                    "file": project + '/' + path.basename(file),
                    "mode": "relative",
                    "sha256": calFileSHA256Sync(dirPath + '/servers/' + project + '/' + file)
                };
            });


            fs.writeFileSync(dirPath + `/temp/${project}.json`, JSON.stringify(data, null, 4));
            logger.info(`${project}端Json输出完成!`)


            //重新排序
            await sortJsonByVersion(dirPath + `/temp/${project}.json`, project);
        } catch (err) {
            logger.error('${project}端json生成失败！' + err)
        }

    }

}

//单独的校验函数
function checkFileMD5Sync(filePath, expectedMD5) {
    try {
        const fileBuffer = fs.readFileSync(filePath);
        const hash = crypto.createHash('md5');
        hash.update(fileBuffer);
        const calculatedMD5 = hash.digest('hex');
        return calculatedMD5 === expectedMD5;
    } catch (error) {
        logger.error(filePath + `校验MD5失败!` + error);
        return false;
    }
}

function checkFileSHA256Sync(filePath, expectedSHA256) {
    try {
        const fileBuffer = fs.readFileSync(filePath);
        const hash = crypto.createHash('sha256');
        hash.update(fileBuffer);
        const calculatedSHA256 = hash.digest('hex');
        return calculatedSHA256 === expectedSHA256;
    } catch (error) {
        logger.error(filePath + `校验sha256失败!` + error);
        return false;
    }
}

//仅用于计算
function calFileSHA256Sync(filePath) {
    try {
        const fileBuffer = fs.readFileSync(filePath);
        const hash = crypto.createHash('sha256');
        hash.update(fileBuffer);
        return hash.digest('hex');
    } catch (error) {
        logger.error(filePath + `计算sha256失败!` + error);
        return 'undefined';
    }
}

module.exports = {
    deleteFiles,
    outputJsonOfMirror,
    checkFileMD5Sync,
    checkFileSHA256Sync,
    calFileSHA256Sync,
    deleteFilesNow
};