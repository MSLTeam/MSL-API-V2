const https = require('follow-redirects').https;
const fs = require('fs');
const logger = require('./logger')
const crypto = require('crypto');
const axios = require('axios');
const config = require("../config");
const request = require('request-promise');

const AUTH_TOKEN = config.MIRROR_AUTH_TOKEN; // 授权令牌
const mirrorUrl = config.mirrorUrl; // 镜像服务器地址

//下载主函数，用于判断是否镜像下载
async function downloadFileMain(fileUrl, dest, expectedHash, hashMode) {
    if (config.useMirrorDownload === true) {
        return downloadFileFromMirror(fileUrl, dest, expectedHash, hashMode);
    } else {
        return downloadFile(fileUrl, dest, expectedHash, hashMode);
    }
}

//使用镜像下载
async function downloadFileFromMirror(fileUrl, dest, expectedHash, hashMode, retryCount = 2, timeout = 5000) {
    while (retryCount >= 0) {
        try {
            logger.debug('向镜像服务器发出下载请求：' + fileUrl)
            // 向镜像服务器发送下载请求
            const response = await axios.post(mirrorUrl, {
                url: fileUrl,
            }, {
                headers: {
                    'Authorization': `Bearer ${AUTH_TOKEN}`
                }
            });

            if (response.status === 200) {
                // 镜像服务器下载成功！
                logger.debug('镜像服务器返回：' + response.data.url)
                return downloadFile(response.data.url, dest, expectedHash, hashMode);
            } else {
                logger.error('镜像服务器下载文件失败！' + fileUrl);
            }
        } catch (err) {
            logger.error('镜像服务器下载文件失败！' + fileUrl + ' ' + err);
        }

        retryCount--;
        if (retryCount >= 0) {
            logger.info('正在重试下载，剩余重试次数：' + retryCount);
        }
    }

    logger.error('重试下载失败，已达到最大重试次数');
}


async function downloadFile(url, dest, expectedValue, hashMode, retryCount = 0, timeout = 5000) {
    let options = {
        uri: url,
        encoding: null, // 保证返回的数据是buffer
        timeout: timeout
    };
    logger.info(`开始请求下载：` + url)
    try {
        let fileData = await request(options);
        let receivedSize = fileData.length;
        let hash;

        if (hashMode !== 'size' && hashMode !== 'nope') {
            hash = crypto.createHash(hashMode);
            hash.update(fileData);
        }

        if (hashMode === 'size') {
            if (receivedSize === expectedValue) {
                fs.writeFileSync(dest, fileData);
                logger.info(url + ` 文件下载完成,文件大小校验成功`);
                return true;
            } else {
                logger.error(url + ` 文件下载完成,但文件大小校验失败`);
                if (retryCount < 3) {
                    logger.warn(`下载的文件大小校验失败,正在进行第 ${retryCount + 1} 次重试...`);
                    return downloadFile(url, dest, expectedValue, hashMode, retryCount + 1, timeout);
                } else {
                    throw new Error('文件大小校验失败');
                }
            }
        } else if (hashMode !== 'nope') {
            const computedHash = hash.digest('hex');
            if (computedHash === expectedValue) {
                fs.writeFileSync(dest, fileData);
                logger.info(url + ` 文件下载完成,${hashMode}校验成功`);
                return true;
            } else {
                logger.error(url + ` 文件下载完成,但${hashMode}校验失败`);
                if (retryCount < 3) {
                    logger.warn(`下载的文件校验完整性失败,正在进行第 ${retryCount + 1} 次重试...`);
                    return downloadFile(url, dest, expectedValue, hashMode, retryCount + 1, timeout);
                } else {
                    throw new Error(`${hashMode}校验失败`);
                }
            }
        } else {
            fs.writeFileSync(dest, fileData);
            logger.info(url + ` 文件下载完成,不做任何校验`);
            return true;
        }
    } catch (err) {
        logger.error('文件下载出错:' + err.message);
        if (retryCount < 3) {
            logger.warn(`文件下载出错了,正在进行第 ${retryCount + 1} 次重试...`);
            return downloadFile(url, dest, expectedValue, hashMode, retryCount + 1, timeout);
        } else {
            logger.error('文件下载出错（不再重试）:' + url);
        }
    }
}


//get函数,可重试3次
function getResponse(url, retryCount = 0, timeoutStr = 10000) {
    //设置请求参数
    const options = {
        headers: {
            'User-Agent': 'MMozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0'
        },
        timeout: timeoutStr, // 设置超时时间
    };

    return new Promise((resolve, reject) => {
        const request = https.get(url, options, (res) => {
            let data = '';

            //接收到数据时,加到data
            res.on('data', (chunk) => {
                data += chunk;
            });

            //接收完毕,返回状态码和数据
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    data: data
                });
            });

        }).on('error', (err) => {
            //出错,返回error
            if (retryCount < 3) {
                logger.warn(`Get请求出错,正在进行第 ${retryCount + 1} 次重试...`);
                logger.warn(`url:${url},` + err);
                resolve(getResponse(url, retryCount + 1));
            } else {
                reject(false);
            }
        });

        //超时,就返回一个错误
        request.on('timeout', () => {
            request.abort();
            if (retryCount < 3) {
                logger.warn(`Get请求超时,正在进行第 ${retryCount + 1} 次重试...`);
                logger.warn(`url:${url},` + '请求超时');
                resolve(getResponse(url, retryCount + 1));
            } else {
                reject(new Error('请求超时'));
            }
        });
    });
}


//把github release转换为简单的json（当前函数只处理assets只有一个文件的情况）
async function githubReleaseToJson(user, repo, type) {
    let jsonData = {};
    if (!jsonData[type]) {
        jsonData[type] = {};
    }
    try {
        const response = await getResponse(`https://api.github.com/repos/${user}/${repo}/releases`);
        let obj = JSON.parse(response.data);
        for (const jsonAsset of obj) {
            jsonData[type][jsonAsset.tag_name] = {
                "url": jsonAsset.assets[0].browser_download_url,
                "size": jsonAsset.assets[0].size,
                "target_commitish": jsonAsset.target_commitish
            };
        }
        return jsonData;
    } catch (err) {

    }
}

function getRedirectUrl(url) {
    return new Promise((resolve, reject) => {
        axios.get(url, {
            maxRedirects: 0,  // 禁止重定向
            validateStatus: function (status) {
                return status >= 200 && status < 300; // 默认的
            }
        }).then(function (response) {
            resolve(response.headers.location || url);
        }).catch(function (error) {
            if (error.response && error.response.status === 302) {
                resolve(error.response.headers.location);
            } else {
                reject(error);
            }
        });
    });
}

module.exports = {
    downloadFile,
    getResponse,
    githubReleaseToJson,
    getRedirectUrl,
    downloadFileFromMirror,
    downloadFileMain
};