/*
 * 移动项目文件夹
 * 1. 删除node_modules
 * 2. 删除package.json
 * 3. 删除package-lock.json
 * 4. 删除.idea
 * 5. npm init -y
 * 6. 关闭代理
 * 7. npm i cnpm
 * 8. cnpm i -D electron@latest（必须在CMD中执行）
 * 9. 在package.json中修改scripts为"start": "electron ."
 * 官方安装命令：npm install electron --save-dev
 *
 * 10. cnpm install @modelcontextprotocol/sdk zod@3
 */
//重写console.log以加上时间信息
const _log = console.log;
console.log = function (...args) {
    const now = new Date();
    const MM = String(now.getMonth() + 1).padStart(2, "0"); // 月份
    const DD = String(now.getDate()).padStart(2, "0");      // 日
    const HH = String(now.getHours()).padStart(2, "0");     // 时
    const mm = String(now.getMinutes()).padStart(2, "0");   // 分
    const ss = String(now.getSeconds()).padStart(2, "0");   // 秒
    _log(`[${MM}-${DD}->${HH}:${mm}:${ss}]`, ...args);
};

console.log("Starting main process.");

//导入设置
const configs = require("../Config.js");

//导入 Electron 主模块
const electron = require("electron");

//导入node的路径和子进程模块
const path = require("path");
const childProcess = require("child_process");

//提取对象
const app = electron.app;
const window = electron.BrowserWindow;
const dialog = electron.dialog;
const ipc = electron.ipcMain;

console.log("Modules imported.");

//当前窗口对象
let win = null;

//渲染器子进程
let rendererProcess = null;

//mcp服务器子进程
let mcpServerProcess = null;

//启动渲染器子进程
function startRenderer(event, executablePath) {
    //已在运行则直接返回成功
    if (rendererProcess != null && !rendererProcess.killed) {
        return Promise.resolve(true);
    }

    /*
     * 启动可执行文件作为子进程
     * 第二个参数：数组，传递给可执行程序的命令行参数
     * 第三个参数：对象，stdio: 表示配置三个标准流
     *
     * 无论进程启动是否成功，rendererProcess都会得到对象，必须通过监听事件判断
     */
    return new Promise((resolve, reject) => {
        try {
            console.log("Starting renderer process, executablePath =", executablePath);

            //启动可执行文件作为子进程
            rendererProcess = childProcess.spawn(executablePath, [], {
                stdio: ["pipe", "pipe", "pipe"],
            });

            //使用 once，只在进程成功启动时触发一次
            rendererProcess.once("spawn", () => {
                console.log("Renderer process started.");
                resolve(true);
            });

            rendererProcess.once("exit", (code, signal) => {
                console.log(`Renderer process exited: code = ${code}, signal = ${signal}`);
                rendererProcess = null;
            });

            //需要多次监听，不能使用 once
            rendererProcess.on("error", (err) => {
                console.log("Failed to start renderer process:", err);
                rendererProcess = null;
                reject(err);
            });

            rendererProcess.stdout.on("data", (data) => {
                //禁用console.log的自动添加空格
                console.log(["Renderer output:\n", data.toString()].join(""));
            });

            rendererProcess.stderr.on("data", (data) => {
                console.error(["Renderer error:\n", data.toString()].join(""));
            });
        } catch (e) {
            reject(e);
        }
    });
}

//强制停止渲染器子进程
function stopRenderer() {
    if (rendererProcess == null) return;
    console.log("Stopping renderer process...");

    try {
        if (rendererProcess.stdin != null && !rendererProcess.stdin.destroyed) {
            rendererProcess.stdin.end();
        }
        rendererProcess.kill();
        console.log("Renderer process stopped.");
    } catch (e) {
        console.error("Error while killing renderer process:", e);
    } finally {
        rendererProcess = null;
    }
}

//向渲染器子进程发送命令
function sendCommand(event, command) {
    console.log("Sending command to renderer process:", command);

    if (rendererProcess != null && rendererProcess.stdin != null && rendererProcess.stdin.writable) {
        rendererProcess.stdin.write(command + "\n");

        console.log("Successfully send command", command, "to renderer process.");
        //此处的返回值将成为script.js中sendCommand函数的返回值
        return "OK";
    } else {
        return "Failed to send command to renderer: Process stdio is not available.";
    }
}

//展示弹窗，解决alert不支持自定义弹窗标题的问题
function showDialog(event, type, title, content) {
    console.log("Showing dialog: type=", type, "title =", title, "content =", content);
    dialog.showMessageBox(win, {type: type, title: title, message: content}).then(r => { console.log("Message confirmed"); });
}

//启动mcp服务器子进程
function startMCPServer() {
    if (mcpServerProcess != null && !mcpServerProcess.killed) {
        return Promise.resolve(true);
    }

    return new Promise((resolve, reject) => {
        try {
            console.log("Starting MCP Server process...");
            //在stdio中添加"ipc"来启用父子进程通信
            mcpServerProcess = childProcess.spawn("node", [path.join(__dirname, "../mcp/MCPServer.js")], {
                stdio: ["inherit", "inherit", "inherit", "ipc"]
            });

            //监听来自MCP服务器子进程的消息
            mcpServerProcess.on("message", (message) => {
                //确保message是符合预期的对象
                if (typeof message === "object" && message != null && "type" in message && "payload" in message) {
                    switch (message.type) {
                        case "SendCommand":
                            console.log(`Received command from MCP server via IPC: "${message.payload}"`);
                            //直接调用发送命令的逻辑
                            sendCommand(null, message.payload);
                            break;
                        case "StartRenderer":
                            console.log("Received command from MCP server via IPC: start renderer");
                            startRenderer(null, configs.executablePath);
                            break;
                        case "StopRenderer":
                            console.log("Received command from MCP server via IPC: stop renderer");
                            stopRenderer();
                            break;
                        case "UpdateUI":
                            //主进程接收来自mcp进程的更新UI信息，转发给渲染进程进行更新，message.payload为包含更新信息的对象
                            console.log("Received UI update from MCP server, forwarding to renderer window.");
                            if (win.webContents != null) {
                                win.webContents.send("update-ui-values", message.payload);
                            } else {
                                console.log("Cannot notify render process because win.webContents is null!");
                            }
                            break;
                        default:
                            console.log("Received unknown command from MCP server: type =", message.type);
                    }
                }
            });

            mcpServerProcess.once("spawn", () => {
                console.log("MCP server process started.")
                resolve(true);
            });

            mcpServerProcess.once("exit", (code, signal) => {
                console.log(`MCP server process exited: code = ${code}, signal = ${signal}`);
                rendererProcess = null;
            });

            mcpServerProcess.on("error", (err) => {
                console.log("Failed to start child process:", err);
                mcpServerProcess = null;
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
    if (mcpServerProcess == null) return;
    console.log("Stopping MCP server process...");

    try {
        if (mcpServerProcess.stdin != null && !mcpServerProcess.stdin.destroyed) {
            mcpServerProcess.stdin.end();
        }
        mcpServerProcess.kill();
        console.log("MCP server process stopped.");
    } catch (e) {
        console.error("Error while killing MCP server process:", e);
    } finally {
        mcpServerProcess = null;
    }
}

function createWindow() {
    win = new window({
        title: "Renderer Configurator",
        width: configs.windowWidth,
        height: configs.windowHeight,
        //禁用自带菜单栏
        autoHideMenuBar: true,
        //允许最大化
        maximizable: true,
        //指定预加载脚本
        webPreferences: {
            preload: path.resolve(__dirname, "./Preload.js"),
        }
    });

    //注册监听的IPC信道
    ipc.handle("send-command", sendCommand);
    ipc.handle("start-renderer", startRenderer);
    ipc.handle("stop-renderer", stopRenderer);
    ipc.on("show-dialog", showDialog);

    //渲染HTML页面
    win.loadFile("./page/Index.html").then(r => {
        console.log("Page load complete");
        console.log("Node version:", process.versions.node, ", Chrome version:", process.versions.chrome, ", Electron version:", process.versions.electron);
    });

    //最大化窗口
    if (configs.isMaximize) {
        win.maximize();
    }

    //启动渲染器进程
    startRenderer(null, configs.executablePath).catch(error => {
        console.log("Failed to start renderer process:", error);
        dialog.showErrorBox("Failed to start renderer process",  `Error message：${error.message || error}`);

        //在点击弹窗的确定后终止整个进程
        app.quit();
    });

    //启动mcp服务器
    startMCPServer().catch(error => {
        console.log("Failed to start MCP server process:", error);
        dialog.showErrorBox("Failed to start MCP server process",  `Error message：${error.message || error}`);
        app.quit();
    });
}

//准备完成时创建窗口
app.on("ready", createWindow);

//当所有窗口关闭时退出应用
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }

    //确保子进程被终止
    if (rendererProcess != null) {
        stopRenderer();
        rendererProcess = null;
    }

    if (mcpServerProcess != null) {
        stopMCPServer();
        mcpServerProcess = null;
    }
});

//当应用被激活时如果没有窗口则创建一个新窗口
app.on("activate", () => {
    if (window.getAllWindows().length === 0) { createWindow(); }
});
