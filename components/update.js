const packageDetails = require('../package.json');
const {compareMCVersions} = require("../utils/combineJson");
const {getResponse} = require("../utils/http");
const logger = require("../utils/logger");
const config = require("../config");

async function checkUpdate() {
    logger.info(`开始进行检查更新···`)
    try {
        const response = await getResponse(config.githubPackageUrl); //通过设置的url，get到json（仅用于public仓库）
        if (response.statusCode === 404) {
            logger.warn(`检查更新失败！ 当前版本:${packageDetails.version} 原因：GithubRepo非Public!`)
        } else {
            let obj = JSON.parse(response.data);
            let upd = await compareMCVersions(obj.version, packageDetails.version);
            if (upd === -1) {
                logger.info(`检测到新版本! 最新版本:${obj.version} 当前版本:${packageDetails.version}`)
            }
        }

    } catch (err) {
        logger.warn(`检查更新失败！ 当前版本:${packageDetails.version} ` + err)
    }
}


module.exports = {checkUpdate};