const fs = require('fs');
const {getResponse} = require("../utils/http");

//用于子节点数据同步的接口
const crypto = require('crypto');
const pathModule = require('path');

function childGetResources(jsonPath, publicPath) {
    let result = {
        "jsonRes": {},
        "publicFiles": {}
    };
    return function (req, res) {
        try {
            if (!req.query.ts || !req.query.sign) { //鉴权
                res.status(403).send('鉴权失败！请检查请求参数！');
                return;
            }

            // 处理json文件夹
            let jsonFiles = fs.readdirSync(jsonPath);
            for (let file of jsonFiles) {
                //获取文件的完整路径
                let filePath = pathModule.join(jsonPath, file);

                //只要json
                if (pathModule.extname(file) === '.json' && file !== "servers_index.json") {
                    let data = fs.readFileSync(filePath, 'utf8');

                    //将文件内容转换为字符串
                    let content = JSON.stringify(data);

                    //将文件名和base64编码结果添加到结果对象中
                    result.jsonRes[file] = Buffer.from(content).toString('base64');
                }
            }

            // 处理public文件夹
            let publicFiles = fs.readdirSync(publicPath);
            for (let file of publicFiles) {
                //获取文件的完整路径
                let filePath = pathModule.join(publicPath, file);

                // 计算非json文件的sha256
                const hash = crypto.createHash('sha256');
                const data = fs.readFileSync(filePath);
                hash.update(data);
                result.publicFiles[file] = hash.digest('hex');
            }

            //返回结果
            res.send(result);
        } catch (err) {
            res.status(500).send('服务器内部错误');
        }
    };
}

module.exports = {childGetResources};