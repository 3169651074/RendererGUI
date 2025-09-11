//检查和大模型的网络连接

// ====== 导入配置和库 ======

const configs = require('./Config.js');
const axios = require('axios');
const SocksProxyAgent = require("socks-proxy-agent").SocksProxyAgent;

// ====== 主逻辑函数 ======

//发送测试消息，消耗少量token
async function checkModelConnectionSendingMessage() {
    try {
        let requestData = null;
        switch (configs.apiFormat) {
            case "OpenAI":
                requestData = {
                    model: configs.modelID,
                    messages: [
                        { role: "user", content: "Hi" }
                    ],
                    max_tokens: 10, //最大回复token数
                    store: false
                }
                break;
            case "Anthropic":
                requestData = {
                    model: configs.modelID,
                    max_tokens: 10,
                    messages: { role: "user", content: "Hi" },
                    //store: false
                }
                break;
            default:
                return "[Error]Unknown API format.";
        }

        const options = {
            headers: {
                'Authorization': `Bearer ${configs.apiKey}`,
                'Content-Type': 'application/json'
            }
        };

        if (configs.isUseProxy) {
            if (configs.isUseSocks) {
                options.httpsAgent = new SocksProxyAgent(configs.socksProxy);
                console.log("Using socks proxy:", options.httpsAgent);
            } else {
                options.proxy = configs.proxy;
                console.log("Using proxy:", options.proxy);
            }
        }

        const response = await axios.post(configs.apiAddress, requestData, options);

        if (response.data == null) {
            return "[Error]Response is null.";
        }

        let responseText = null;
        switch (configs.apiFormat) {
            case "OpenAI":
                responseText = response.data.choices[0].message.content;
                break;
            case "Anthropic":
                responseText = response.data.content[0].text;
                break;
            default:
        }

        if (responseText != null && responseText !== "") {
            return {success: true, message: "OK, test response = " + responseText};
        } else {
            return {success: false, message: "Failed to get response from model."};
        }

        // const options = {
        //     method: "POST",
        //     url: configs.apiAddress,
        //     timeout: 5000,
        //     headers: {
        //         "Authorization": `Bearer ${configs.apiKey}`,
        //         "Content-Type": "application/json"
        //     },
        //     data: {
        //         model: configs.modelID,
        //         messages: [
        //             { role: "user", content: "Hi" }
        //         ],
        //         max_tokens: 10,
        //         temperature: 0
        //     }
        // };
        //
        // //添加代理
        // if (configs.isUseProxy) {
        //     if (configs.isUseSocks) {
        //         options.httpsAgent = new SocksProxyAgent(configs.socksProxy);
        //         console.log("Using socks proxy:", options.httpsAgent);
        //     } else {
        //         options.proxy = configs.proxy;
        //         console.log("Using proxy:", options.proxy);
        //     }
        // }
        // await axios(options);

        //自动封装为Promise.resolve({success: true, message: "OK"})
        //return {success: true, message: "OK"};
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
            errorMessage = `Error when request: ${error.message}`;
        }
        return {success: false, message: errorMessage};
    }
}

module.exports = {checkModelConnectionSendingMessage};
