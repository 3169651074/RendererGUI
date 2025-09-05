//检查和大模型的网络连接

// ====== 导入配置和库 ======

const configs = require('./Config.js');
const axios = require('axios');

// ====== 主逻辑函数 ======

//仅检查服务器连接，不发送消息，无token消耗
async function checkModelConnection() {
    try {
        //配置请求选项
        const options = {
            method: "GET",
            url: configs.apiAddress,
            timeout: 5000, //超时时间
            headers: {
                'Authorization': `Bearer ${configs.apiKey}`
            }
        };

        //如果启用了代理
        if (configs.isUseProxy && configs.proxy != null) {
            options.proxy = configs.proxy;
        }

        //发送请求
        await axios(options);
        return {success: true, message: "OK"};
    } catch (error) {
        console.error("Error when connect:", error.message);

        let errorMessage;
        if (error.response) {
            //服务器响应了，但状态码不在2xx范围内
            errorMessage = `Response code incorrect: ${error.response.status} - ${error.response.statusText}`;
        } else if (error.request) {
            //请求已发出但没有收到响应
            errorMessage = "No response from API server.";
        } else {
            //请求设置时出错
            errorMessage = `Error when request: ${error.message}`;
        }
        return {success: false, message: errorMessage};
    }
}

//发送测试消息，消耗少量token
async function checkModelConnectionSendingMessage() {
    try {
        const options = {
            method: "POST",
            url: configs.apiAddress,
            timeout: 5000,
            headers: {
                "Authorization": `Bearer ${configs.apiKey}`,
                "Content-Type": "application/json"
            },
            data: {
                model: configs.modelID,
                messages: [
                    { role: "user", content: "Hi" }
                ],
                max_tokens: 10,
                temperature: 0
            }
        };

        if (configs.isUseProxy && configs.proxy != null) {
            options.proxy = configs.proxy;
        }
        await axios(options);

        //自动封装为Promise.resolve({success: true, message: "OK"})
        return {success: true, message: "OK"};
    } catch (error) {
        console.error("Error when connect:", error.message);

        let errorMessage;
        if (error.response) {
            //服务器响应了，但状态码不在2xx范围内
            errorMessage = `Response code incorrect: ${error.response.status} - ${error.response.statusText}`;
            if (error.response.data && error.response.data.error) {
                errorMessage += `\n${error.response.data.error.message || JSON.stringify(error.response.data.error)}`;
            }
        } else if (error.request) {
            //请求已发出但没有收到响应
            errorMessage = "No response from API server.";
        } else {
            //请求设置时出错
            errorMessage = `Error when request: ${error.message}`;
        }
        return {success: false, message: errorMessage};
    }
}

module.exports = {checkModelConnection, checkModelConnectionSendingMessage};
