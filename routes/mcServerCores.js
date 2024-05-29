const fs = require('fs');
const {getResponse} = require("../utils/http");

//从versions中返回服务端类型
function availableServerTypes(path) {

    return function (req, res) {
        try {
            fs.readFile(path, (err, data) => {
                if (err) {
                    res.status(500).send('服务器内部错误');
                    return;
                }

                let json = JSON.parse(data);

                res.send(json.enabledServerMirrorTypes);

            });
        } catch (err) {
            res.status(500).send('服务器内部错误');
        }

    };
}

//分类
function serverClassify(path) {

    return function (req, res) {
        try {
            fs.readFile(path, (err, data) => {
                if (err) {
                    res.status(500).send('服务器内部错误');
                    return;
                }

                let json = JSON.parse(data);

                res.send(json.serverClassify);

            });
        } catch (err) {
            res.status(500).send('服务器内部错误');
        }

    };
}

//返回服务端描述
function getServerDescription(path) {
    return function (req, res) {
        try {
            let server = req.params.server;

            fs.readFile(path, (err, data) => {
                if (err) {
                    res.status(500).send('服务器内部错误');
                    return;
                }

                let json = JSON.parse(data);
                let serverDescription = json.serverDescription[server];

                if (serverDescription) {
                    res.send(serverDescription);
                } else {
                    res.status(404).send('未找到服务器描述');
                }
            });
        } catch (err) {
            res.status(500).send('服务器内部错误');
        }

    };
}

//返回该服务端可用版本
function getAvailableVersions(path) {
    return function (req, res) {
        try {
            let server = req.params.server;

            fs.readFile(path, (err, data) => {
                if (err) {
                    res.status(500).send('服务器内部错误');
                    return;
                }

                let json = JSON.parse(data);
                let versions = json.versions[server];

                if (versions) {
                    let versionKeys = Object.keys(versions);
                    res.send(versionKeys);
                } else {
                    res.status(404).send('未找到服务器版本');
                }
            });
        } catch (err) {
            res.status(500).send('服务器内部错误');
        }

    };
}

module.exports = {
    availableServerTypes,
    getServerDescription,
    getAvailableVersions, serverClassify,
};