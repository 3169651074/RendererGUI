//MCP进程管理函数，由主进程执行
// ====== 导入配置和库 ======

require("./OutputReload.js");
const childProcess = require("child_process");
const path = require("path");

// ====== 全局变量 ======

const clientScriptPath = "./MCPClient.js";
const serverScriptPath = "./MCPServer.js";

let clientProcess = null;
let serverProcess = null;

let messageWaiter = null;

// ====== 主逻辑函数 ======

// ====== MCP客户端 ======

function startMCPClient() {
    if (clientProcess != null && !clientProcess.killed) {
        return Promise.resolve(true);
    }

    return new Promise((resolve, reject) => {
        try {
            console.log("Starting MCP Client process...");

            clientProcess = childProcess.spawn("node", [path.join(__dirname, clientScriptPath)], {
                stdio: ["pipe", "pipe", "pipe"]
            });

            clientProcess.once("spawn", () => {
                console.log("MCP Client process started.")
                resolve(true);
            });

            clientProcess.once("exit", (code, signal) => {
                console.log("MCP Client process exited, code =", code, ", signal =", signal);
            });

            clientProcess.on("error", (err) => {
                console.log("MCP Client process error:", err);
                reject(err);
            });

            //转发客户端进程的输出
            clientProcess.stdout.on("data", (data) => {
                //data为缓冲区ASCII，需要转换为字符串，并去掉末尾自带的换行符
                const str = data.toString().slice(0, -1);
                //console.log("[MCP Client]", str);

                if (str.startsWith("[OK]") && messageWaiter != null) {
                    //如果正在等待结果，就调用它的resolve函数
                    messageWaiter.resolve(str);
                    messageWaiter = null; //完成后清空，准备下一次等待
                } else if (str.startsWith("[Error]") && messageWaiter != null) {
                    messageWaiter.reject(str);
                    messageWaiter = null;
                } else {
                    //如果不是结果，那就是普通日志，直接打印
                    console.log("[MCP Client]", str);
                }
            });

            clientProcess.stderr.on("data", (data) => {
                //使用StdioClientTransport启动服务器进程，服务器信息在stderr上打印，去掉末尾的换行符
                const str = data.toString().slice(0, -1);
                if (str.startsWith("[Tool]")) {
                    console.log("[MCP Tool]", str);
                } else {
                    console.log("[MCP Server]", str);
                }
            });
        } catch (e) {
            reject(e);
        }
    });
}

function stopMCPClient() {
    if (clientProcess == null) return;
    console.log("Stopping MCP Client process...");

    try {
        if (clientProcess.stdin != null && !clientProcess.stdin.destroyed) {
            clientProcess.stdin.end();
        }
        clientProcess.kill();
        console.log("MCP Client process stopped.");
    } catch (e) {
        console.error("Error while killing MCP Client process:", e);
    } finally {
        clientProcess = null;
    }
}

//等待客户端返回调用结果
async function waitForMessage() {
    return new Promise((resolve, reject) => {
        //检查是否已经有另一个请求正在等待结果，防止并发错误
        if (messageWaiter != null) {
            return reject("Another prompt is already waiting for a response.");
        }

        //将resolve和reject函数存起来，交给中央处理器去调用
        messageWaiter = { resolve, reject };
    });
}

//向客户端发送用户提示词
async function sendUserPrompt(content) {
    if (clientProcess == null) {
        return Promise.reject("Client process does not exist.");
    }
    if (!clientProcess.stdin.writable) {
        return Promise.reject("Client stdin does not writable.");
    }

    //向客户端进程的stdin中写入后等待消息
    //console.log("Writing content:", content);
    clientProcess.stdin.write(content + "\n");
    return await waitForMessage();
}

// ====== MCP服务器（通过StdioClientTransport启动服务器进程，以下函数不使用） ======

//启动MCP服务器子进程
function startMCPServer() {
    if (serverProcess != null && !serverProcess.killed) {
        return Promise.resolve(true);
    }

    return new Promise((resolve, reject) => {
        try {
            console.log("Starting MCP Server process...");

            //以当前文件启动子进程
            //在stdio中添加"ipc"来启用父子进程通信
            serverProcess = childProcess.spawn("node", [path.join(__dirname, serverScriptPath)], {
                stdio: ["pipe", "pipe", "pipe"]
            });

            // //TODO 监听来自MCP服务器子进程的消息
            // serverProcess.on("message", (message) => {
            //     //确保message是符合预期的对象
            //     if (typeof message === "object" && message != null && "type" in message && "payload" in message) {
            //         switch (message.type) {
            //             case "SendCommand":
            //                 console.log(`Received command from MCP server via IPC: "${message.payload}"`);
            //                 //通过主进程调用sendCommand方法
            //                 break;
            //             default:
            //                 console.log("Received unknown command from MCP server: type =", message.type);
            //         }
            //     }
            // });

            serverProcess.once("spawn", () => {
                console.log("MCP Server process started.")
                resolve(true);
            });

            serverProcess.once("exit", (code, signal) => {
                console.log("MCP Server process exited, code =", code, ", signal =", signal);
            });

            serverProcess.on("error", (err) => {
                console.log("MCP Server process error:", err);
                reject(err);
            });

            serverProcess.stderr.on("data", (data) => {
                console.log("[MCP Server]", data);
            });
        } catch (e) {
            reject(e);
        }
    });
}

//停止MCP服务器子进程
function stopMCPServer() {
    if (serverProcess == null) return;
    console.log("Stopping MCP Server process...");

    try {
        if (serverProcess.stdin != null && !serverProcess.stdin.destroyed) {
            serverProcess.stdin.end();
        }
        serverProcess.kill();
        console.log("MCP Server process stopped.");
    } catch (e) {
        console.error("Error while killing MCP Server process:", e);
    } finally {
        serverProcess = null;
    }
}

module.exports = {startMCPClient, stopMCPClient, sendUserPrompt};