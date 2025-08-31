const configs = require("./Config.js");
const axios = require("axios");

async function callAI(messages) {
    try {
        const requestData = {
            model: configs.modelID,
            messages: [{ role: "user", content: messages }],
            store: true
        };

        const response = await axios.post(configs.apiAddress, requestData, {
            headers: {
                'Authorization': `Bearer ${configs.apiKey}`,
                'Content-Type': 'application/json'
            },
            proxy: configs.isUseProxy ? configs.proxy : false
        });
        console.log("Response from model:", response.data.choices[0].message.content);
        return "[OK]" + response.data.choices[0].message.content;
    } catch (error) {
        console.log("Error when sending message to model:", error);
        return "[Error]" + error;
    }
}

//通过API向大模型发送直接来自用户的提示词
async function sendUserMessage(content) {
    try {
        //构建初始消息
        let messages = [
            {
                role: "system",
                content: `You are an assistant for a ray tracer renderer configuration GUI. You can help users configure rendering settings and send commands to the renderer.
Available tools:
${tools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}
When users ask to:
- Configure renderer: use SendCommand with appropriate command
- Change settings like resolution, samples, etc.: use Configure with the element ID and new value
- See all available configuration options: use GetElementIDs
Always be helpful and explain what you're doing.`
            },
            {
                role: "user",
                content: content
            }
        ];

        const toolDefinitions = tools.map(tool => ({
            type: "function",
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.inputSchema
            }
        }));

        //第一次调用AI：让AI决定是否使用工具
        console.log("Sending initial message to AI...");
        let aiResponse = await this.callAI(messages, toolDefinitions);

        //如果AI决定调用工具，执行工具并获取结果
        if (aiResponse.toolCalls.length > 0) {
            console.log("AI wants to call tools:", aiResponse.tool_calls.map(tc => tc.function.name));

            //将AI的工具调用添加到消息历史
            messages.push({
                role: "assistant",
                content: aiResponse.content,
                toolCalls: aiResponse.toolCalls
            });

            //依次执行工具调用
            for (const toolCall of aiResponse.toolCalls) {
                const toolName = toolCall.function.name;
                const toolArgs = JSON.parse(toolCall.function.arguments);

                console.log(`Calling MCP tool: ${toolName} with args:`, toolArgs);

                try {
                    const toolResult = await this.callMCPTool(toolName, toolArgs);
                    console.log(`Tool ${toolName} result:`, toolResult);

                    //将工具结果添加到消息历史
                    messages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: toolResult
                    });

                } catch (error) {
                    console.error(`Error calling tool ${toolName}:`, error);

                    //将错误也添加到消息历史
                    messages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: `Error executing ${toolName}: ${error.message}`
                    });
                }
            }

            //第二次调用AI：让AI根据工具结果生成最终回答
            console.log("Sending tool results back to AI for final response...");
            aiResponse = await this.callAI(messages, toolDefinitions);
        }
        return aiResponse.content || "Failed to generate a response.";
    } catch (error) {
        console.error("Chat service error:", error);
        if (error.response) {
            console.error("API response error:", error.response.data);
        }
        return "An error encountered processing message. Please check your API configuration.";
    }
}

module.exports = {sendUserMessage, callAI};