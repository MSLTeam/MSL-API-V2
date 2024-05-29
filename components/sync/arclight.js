const logger = require("../../utils/logger");
const {githubReleaseToJson} = require("../../utils/http");
const fs = require("fs");
const {sortJsonByVersion} = require("../../utils/combineJson");

async function syncArclight(path) {
    try {
        logger.info('正在更新Arclight')
        let result = await githubReleaseToJson('IzzelAliz', 'Arclight', 'arclight');
        let newResult = {'arclight': {}};
        let latestResult = {'arclight': {}};
        logger.debug('Github Arclight返回:' + JSON.stringify(result));
        //对mc版本分组
        for (let key in result['arclight']) {
            let versions = key.split("/");
            let mcversion = versions[0];
            let arcversion = versions[1];
            //由于arc的神奇命名，执行替换
            mcversion = mcversion.replace('GreatHorn', '1.19.3')
            mcversion = mcversion.replace('Whisper', '1.20.4')
            mcversion = mcversion.replace('Trials', '1.20.1')
            mcversion = mcversion.replace('horn', '1.19.2')
            mcversion = mcversion.replace('Net', '1.20.2')
            mcversion = mcversion.replace('Executions', '1.19.4')


            if (!newResult['arclight'][mcversion]) {
                newResult['arclight'][mcversion] = [];
            }

            newResult['arclight'][mcversion].push({
                "arcversion": arcversion,
                "url": result['arclight'][key]['url'],
                "size": result['arclight'][key]['size'],
            });
        }
        //提取最新版本的arc
        for (let mcversion in newResult['arclight']) {
            newResult['arclight'][mcversion].sort((a, b) => b.arcversion.localeCompare(a.arcversion));
            latestResult['arclight'][mcversion] = {
                "file": 'https://github.moeyy.xyz/' + newResult['arclight'][mcversion][0]['url'],
                "mode": "full",
                "size": newResult['arclight'][mcversion][0]['size']
            };
        }


        fs.writeFileSync(path + '/temp/arclight.json', JSON.stringify(latestResult, null, 2));
        await sortJsonByVersion(path + '/temp/arclight.json', 'arclight');
        logger.info('更新Arclight成功!')
    } catch (err) {
        logger.error('更新Arclight失败!' + err)
    }

}

module.exports = syncArclight;