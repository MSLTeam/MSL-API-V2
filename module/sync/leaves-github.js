const logger = require("../logger");
const {githubReleaseToJson} = require("../http");
const fs = require("fs");
const {sortJsonByVersion} = require("../combinejson");


//没写完，因为api只返回很少版本号
async function syncLeavesGithub(path) {
    try {
        logger.info('正在更新Leaves(FromGithub)')
        let result = await githubReleaseToJson('LeavesMC', 'Leaves', 'leaves');

        fs.writeFileSync(path + '/temp/leaves.json', JSON.stringify(result, null, 2));
        await sortJsonByVersion(path + '/temp/leaves.json', 'arclight');
        logger.info('更新Arclight成功!(FromGithub)')
    } catch (err) {

    }
}

module.exports = syncLeavesGithub;