// ====== 导入配置和库 ======

const configs = require("./Config.js");
const axios = require("axios");
const McpClient = require("@modelcontextprotocol/sdk/client/index.js").Client;
const StdioClientTransport = require("@modelcontextprotocol/sdk/client/stdio.js").StdioClientTransport;
const zod = require("zod").z;
const readline = require("readline");
const childProcess = require("child_process");
const path = require("path");

// ====== 全局变量 ======

const serverScriptPath = "./MCPServer.js";
let client = null;

//服务器子进程由客户端管理，先启动服务器再初始化客户端
let serverProcess = null;

// ====== 主逻辑函数 ======

async function connect() {
    //连接到服务器
    try {
        const transport = new StdioClientTransport({
            command: "node",
            args: [serverScriptPath]
        });
        await client.connect(transport);

        //获取工具列表
        const toolsResult = await client.listTools();
        const tools = toolsResult.tools.map((tool) => {
            return {
                name: tool.name,
                description: tool.description,
                input_schema: tool.inputSchema,
            };
        });
        console.log("Tools:", tools.map(({ name }) => name));
    } catch (e) {
        //client允许使用log
        console.log("Failed to connect to MCP server: ", e);
    }
}

//启动mcp服务器子进程
function startMCPServer() {
    if (serverProcess != null && !serverProcess.killed) {
        return Promise.resolve(true);
    }

    return new Promise((resolve, reject) => {
        try {
            console.log("Starting MCP Server process...");
            //在stdio中添加"ipc"来启用父子进程通信
            serverProcess = childProcess.spawn("node", [path.join(__dirname, "../mcp/MCPServer.js")], {
                stdio: ["inherit", "inherit", "inherit", "ipc"]
            });

            //TODO 监听来自MCP服务器子进程的消息
            serverProcess.on("message", (message) => {
                //确保message是符合预期的对象
                if (typeof message === "object" && message != null && "type" in message && "payload" in message) {
                    switch (message.type) {
                        case "SendCommand":
                            console.log(`Received command from MCP server via IPC: "${message.payload}"`);
                            //通过主进程调用sendCommand方法
                            break;
                        default:
                            console.log("Received unknown command from MCP server: type =", message.type);
                    }
                }
            });

            serverProcess.once("spawn", () => {
                console.log("MCP server process started.")
                resolve(true);
            });

            serverProcess.once("exit", (code, signal) => {
                console.log(`MCP server process exited: code = ${code}, signal = ${signal}`);
            });

            serverProcess.on("error", (err) => {
                console.log("Failed to start child process:", err);
                serverProcess = null;
                reject(err);
            });

            //子进程的stdout和stderr都继承自父进程，不需要监听
        } catch (e) {
            reject(e);
        }
    });
}

//停止MCP服务器子进程
function stopMCPServer() {
    if (serverProcess == null) return;
    console.log("Stopping MCP server process...");

    try {
        if (serverProcess.stdin != null && !serverProcess.stdin.destroyed) {
            serverProcess.stdin.end();
        }
        serverProcess.kill();
        console.log("MCP server process stopped.");
    } catch (e) {
        console.error("Error while killing MCP server process:", e);
    } finally {
        serverProcess = null;
    }
}

async function chatLoop() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    function askQuestion(query) {
        return new Promise(resolve => rl.question(query, resolve));
    }

    while (true) {
        const toolName = await askQuestion("Enter tool to call (or 'quit' to exit): ");
        if (toolName.toLowerCase() === "quit") {
            break;
        }

        try {
            const toolsResult = await client.listTools();
            const tool = toolsResult.tools.find(t => t.name === toolName);

            if (tool == null) {
                console.log(`Tool "${toolName}" not found.`);
                continue;
            }

            let input = {};
            if (tool.inputSchema && Object.keys(tool.inputSchema).length > 0) {
                const inputString = await askQuestion(`Enter JSON input for ${toolName}: `);
                input = JSON.parse(inputString);
            }

            const result = await client.callTool(toolName, input);
            console.log(`Tool ${toolName} returned:`, result);
        } catch (error) {
            console.error(`Error calling tool ${toolName}:`, error);
        }
    }
    rl.close();
}

function startClient() {
    client = new McpClient({
        name: "client", version: "1.0.0"
    });

    //启动服务器子进程
    startMCPServer();

    //连接到服务器
    connect().then(() => {
        console.log("Connected to server.");
    });

    chatLoop().then(() => {
       console.log("Quit chat loop.");
    });
}

function stopClient() {
    stopMCPServer();
    client.close();
}

module.exports = {startClient, stopClient};