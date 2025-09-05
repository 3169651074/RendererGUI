const configs = require("./Config.js");
const axios = require("axios");
const mcpProcess = require("./MCPProcess.js");

//向大模型发送消息，无工具调用
async function callAIWithoutTools(messages) {
    try {
        //构造消息JSON对象
        let requestData = null;
        switch (configs.apiFormat) {
            case "OpenAI":
                requestData = {
                    model: configs.modelID,
                    messages: [
                        //{ role: "system", content: "Plain text response, do not use any markdown syntax"},
                        { role: "user", content: messages }
                    ],
                    store: true
                }
                break;
            case "Anthropic":
                requestData = {
                    model: configs.modelID,
                    //system: "Plain text response, do not use any markdown syntax",
                    messages: { role: "user", content: messages }
                }
                break;
            default:
                return "[Error]Unknown API format.";
        }

        //发送请求
        const response = await axios.post(configs.apiAddress, requestData, {
            headers: {
                'Authorization': `Bearer ${configs.apiKey}`,
                'Content-Type': 'application/json'
            },
            proxy: configs.isUseProxy ? configs.proxy : false
        });

        if (response.data == null) {
            return "[Error]Response is null.";
        }

        //接收结果（文本回复，无工具调用）
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

        console.log("Response from model:", responseText);
        return "[OK]" + responseText;
    } catch (error) {
        console.log("Error when sending message to model:", error);
        return "[Error]" + error;
    }
}

//向大模型发送消息，包含工具列表，启用工具调用
async function callAIWithTools(messages) {
    return await mcpProcess.sendUserPrompt(messages);
}

module.exports = {callAIWithoutTools, callAIWithTools};