// ====== 导入配置和库 ======

const configs = require("./Config.js");
const McpClient = require("@modelcontextprotocol/sdk/client/index.js").Client;
const StdioClientTransport = require("@modelcontextprotocol/sdk/client/stdio.js").StdioClientTransport;
const readline = require("readline");
const path = require("path");
const axios = require("axios");

// ====== 全局变量 ======

const serverScriptPath = "./MCPServer.js";
let client = null;
let tools = [];

// ====== 客户端主逻辑函数 ======

async function connectToServer() {
    //连接到服务器
    try {
        //启动服务器进程
        const transport = new StdioClientTransport({
            command: "node",
            args: [path.join(__dirname, serverScriptPath)]
        });
        await client.connect(transport);

        //获取工具列表
        const toolsResult = await client.listTools();

        //MCP SDK自动根据供应商格式转换
        const toolsObject = toolsResult.tools;

        if (toolsObject == null || toolsObject.length === 0) {
            return Promise.reject("Failed to get tool list.");
        } else {
            console.log("Tool count:", toolsObject.length);
        }

        //遍历工具列表并打印每个工具的详细信息
        for (let i = 0; i < toolsObject.length; i++) {
            const tool = toolsObject[i];
            console.log("Tool", i + 1, tool);

            //将工具转换为JSON对象
            switch (configs.apiFormat) {
                case "OpenAI":
                    tools.push({
                        type: "function",
                        function: {
                            name: tool.name,
                            description: tool.description,
                            parameters: tool.inputSchema
                        }
                    });
                    break;
                case "Anthropic":
                    tools.push({
                        name: tool.name,
                        description: tool.description,
                        input_schema: tool.inputSchema
                    });
                    break;
                default:
                    return Promise.reject("Unknown API format.");
            }
        }

        return Promise.resolve();
    } catch (e) {
        console.log("Failed to connect to MCP server: ", e);
    }
}

async function cleanUp() {
    await client.close();
}

//处理带有工具调用的提示词请求
async function handleToolCall(content) {
    try {
        //构建原始消息
        console.log("Constructing initial message...");
        let requestData = null;
        switch (configs.apiFormat) {
            case "OpenAI":
                requestData = {
                    model: configs.modelID,
                    messages: [
                        { role: "system", content: configs.systemPrompt },
                        { role: "user", content: content }
                    ],
                    tools: tools
                };
                break;
            case "Anthropic":
                requestData = {
                    model: configs.modelID,
                    system: configs.systemPrompt,
                    max_tokens: 4096,
                    messages: [
                        { role: "user", content: content }
                    ],
                    tools: tools
                }
                break;
            default:
                return Promise.reject("Unknown API format.");
        }
        console.log("Initial message:\n", requestData);

        //发送请求
        console.log("Sending request...");
        const response = await axios.post(configs.apiAddress, requestData, {
            headers: {
                'Authorization': `Bearer ${configs.apiKey}`,
                'Content-Type': 'application/json'
            },
            proxy: configs.isUseProxy ? configs.proxy : false
        });

        //解析请求
        console.log("Analysing initial response...");
        let toolName = null;
        let toolArgs = null;
        let toolCallId = null;

        switch (configs.apiFormat) {
            case "OpenAI": {
                const data = response.data.choices[0].message;
                if ("content" in data && data.content != null) {
                    //无需调用工具
                    console.log("Initial request finished without calling tool:\n", data.content);
                    return Promise.resolve(data.content);
                } else {
                    if (!("tool_calls" in data) || data.tool_calls == null || data.tool_calls.length === 0) {
                        return Promise.reject("Failed to get tool call response.");
                    }
                    //根据OpenAI的格式解析工具调用信息
                    const toolCall = data.tool_calls[0];
                    toolName = toolCall.function.name;
                    toolArgs = JSON.parse(toolCall.function.arguments);
                    toolCallId = toolCall.id;

                    //在调用工具之前，需要将模型的工具调用请求也添加到消息历史中
                    requestData.messages.push(data);
                }
                break;
            }
            case "Anthropic": {
                const data = response.data.content[0];
                if (data.type === "text" && data.text != null) {
                    //无需调用工具
                    console.log("Initial request finished without calling tool:\n", data.text);
                    return Promise.resolve(data.text);
                } else {
                    if (data.type !== "tool_use") {
                        return Promise.reject("Failed to get tool call response.");
                    }
                    toolName = data.name;
                    toolArgs = data.input;
                    toolCallId = data.id;

                    requestData.messages.push({
                        role: "assistant",
                        content: response.data.content
                    });
                }
                break;
            }
            default:
        }
        console.log("Calling MCP tool: Name =", toolName, ", Args =", toolArgs, ", id =", toolCallId);

        //调用MCP服务器注册的工具
        let toolResultMessage = null;
        const toolResult = await client.callTool(toolName, toolArgs);
        console.log("Tool execution successful. Result:", toolResult);

        //将工具结果作为新消息返回给模型，client.callTool() 的返回值就是MCP服务器中注册的工具执行函数的返回值，用这个结果来构造下一条发给模型的请求
        switch (configs.apiFormat) {
            case "OpenAI":
                toolResultMessage = {
                    role: "tool", tool_call_id: toolCallId, content: toolResult
                };
                break;
            case "Anthropic":
                toolResultMessage = {
                    role: "user",
                    content: [{
                        type: "tool_result",
                        tool_use_id: toolCallId,
                        content: typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult)
                    }]
                };
                break;
            default:
        }

        //将调用结果添加到提示词中
        console.log("Pushing tool call result to message...");
        requestData.messages.push(toolResultMessage);

        //再次发送消息
        console.log("Sending message again with tool result to model:", requestData.messages);
        const responseWithTool = await axios.post(configs.apiAddress, requestData, {
            headers: {
                'Authorization': `Bearer ${configs.apiKey}`,
                'Content-Type': 'application/json'
            },
            proxy: configs.isUseProxy ? configs.proxy : false
        });

        //返回结果
        console.log("Analysing final response...");
        let responseText = null;
        switch (configs.apiFormat) {
            case "OpenAI":
                responseText = responseWithTool.data.choices[0].message.content;
                break;
            case "Anthropic":
                responseText = responseWithTool.data.content[0].text;
                break;
            default:
        }

        console.log("Final response from model:", responseText);
        return Promise.resolve(responseText);
    } catch (error) {
        return Promise.reject("Error when calling model with tools: " + error);
    }
}

//对话循环，阻塞客户端线程直到退出时释放资源
async function chatLoop() {
    //创建接口，监听stdin
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    console.log("Client ready to receive input...");

    //异步循环处理每一行输入，循环会在父进程调用stdin.end()时退出
    //传递调用结果：向stdout中打印以[OK]或[Error]开头的字符串，后面接大模型的回复消息或错误信息
    for await (const line of rl) {
        console.log("Received user input \"", line, "\" from main process.");
        try {
            const result = await handleToolCall(line);
            console.log("[OK]" + result);
        } catch (error) {
            console.log("[Error]" + error);
        }
    }

    console.log("stdin.end() called, quitting chat loop...");
}

async function main() {
    client = new McpClient({
        name: "client",
        version: "1.0.0"
    });

    //连接到服务器
    await connectToServer();

    //启动对话循环
    await chatLoop();

    //执行到这里说明对话已经结束，清理资源
    await cleanUp();
}

main().then(() => {
   console.log("Client started.");
}).catch((error) => {
   console.log("Error when starting MCP Client:", error);
});