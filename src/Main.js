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
 * 9. 在package.json中修改scripts为"start": "electron ." 修改main为"main": "src/Main.js",
 * 10. cnpm install @modelcontextprotocol/sdk zod@3 dotenv axios @types/node typescript
 */

// ====== 导入设置 ======

const configs = require("./Config.js");
require("./OutputReload.js");
const chatService = require("./ChatService.js");

//子进程
const rendererProcess = require("./RendererProcess.js");
const mcpProcess = require("./MCPProcess.js");
const checkConnection = require("./CheckConnection.js");

//Electron主模块
const electron = require("electron");

//Node.js模块
const path = require("path");

// ====== 提取对象 ======

const app = electron.app;
const dialog = electron.dialog;
const ipc = electron.ipcMain;
const shell = electron.shell;

const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu;

// ====== 全局对象变量 ======

//当前窗口对象
let window = null;

//菜单模板
const template = [
    {
        label: "Settings",
        submenu: [
            //展开/折叠对话框
            // {
            //     label: "Configure Chat Model",
            //     accelerator: "Ctrl+C",
            //     click() {
            //         console.log("Configure Chat Model.");
            //         //通知渲染进程
            //         window.webContents.send("chat-container");
            //     }
            // },
            // //分隔线
            // { type: "separator" },
            //退出应用
            {
                label: "Quit",
                role: "quit"
            }
        ]
    },
    {
        label: "Page",
        submenu: [
            //刷新
            { role: "reload" },
            { role: "forceReload" },
            //打开调试器
            { role: "toggleDevTools" },
            { type: "separator" },
            //缩放页面
            { role: "resetZoom" },
            { role: "zoomIn" },
            { role: "zoomOut" },
            { type: "separator" },
            //全屏
            { role: "togglefullscreen" }
        ]
    },
    {
        label: "About",
        submenu: [
            {
                label: "GitHub Repository",
                click: async () => {
                    await shell.openExternal(configs.repositoryURL);
                }
            }
        ]
    }
];

// ====== 主逻辑函数 ======

//注册ipc监听
function registerIPCChannel() {
    ipc.on("show-dialog", (event, type, title, content) => {
        console.log("Showing dialog: title =", title, ", content =", content);
        dialog.showMessageBox(window, {type: type, title: title, message: content}).then(r => {
            console.log("Message confirmed.");
        });
    });

    ipc.handle("send-command", (event, command) => {
        //传递返回值
        return rendererProcess.sendCommand(command);
    });

    ipc.handle("check-connection", async (event) => {
        console.log("Checking model connection...");
        const result = (await checkConnection.checkModelConnectionSendingMessage()).success; //等待异步结果
        if (result) {
            console.log("Connection check success.");
        } else {
            console.log("Connection check failed:", result.message);
        }
        return result;
    });

    ipc.handle("chat-message", async (event, content) => {
        if (configs.isUseMCP) {
            console.log("Sending message", content, "to chat with MCP...");
            return await chatService.callAIWithTools(content);
        } else {
            console.log("Sending message", content, "to chat without MCP...");
            return await chatService.callAIWithoutTools(content);
        }
    });
}

//初始化窗口
async function createWindow() {
    console.log("Creating window...");
    window = new BrowserWindow({
        title: "Renderer Configurator",
        width: configs.windowWidth,
        height: configs.windowHeight,
        //启用菜单栏
        autoHideMenuBar: false,
        //允许最大化
        maximizable: true,
        //指定预加载脚本
        webPreferences: {
            preload: path.resolve(__dirname, "./Preload.js"),
        }
    });

    //渲染HTML页面，阻塞直到渲染完成
    console.log("Loading HTML...");
    await window.loadFile("./page/Index.html");
    console.log("Finish loading HTML.");

    //最大化窗口
    if (configs.isMaximize) {
        window.maximize();
    }

    //设置菜单栏
    console.log("Setting menubar...");
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    //注册IPC
    console.log("Registering IPC...");
    registerIPCChannel();
}

//等待准备完成
function waitAppReady() {
    return new Promise(resolve => {
        if (app.isReady()) {
            resolve();
        } else {
            app.once("ready", resolve);
        }
    });
}

//清理资源
function cleanUp() {
    //确保子进程停止
    rendererProcess.stopRenderer();
    mcpProcess.stopMCPClient();

    app.quit();
}

async function main() {
    console.log("Versions:\n\tNode.js version:", process.versions.node, "\n\tChrome version:", process.versions.chrome, "\n\tElectron version:", process.versions.electron);
    console.log("Starting main process...");

    //准备完成时创建窗口，阻塞main方法
    await waitAppReady();
    await createWindow();

    //当所有窗口关闭时退出应用
    app.on("window-all-closed", () => {
        console.log("Quit application due to window closed, cleaning up...");
        cleanUp();
        console.log("Stop main process.");
    });

    //当应用被激活时如果没有窗口则创建一个新窗口
    app.on("activate", () => {
        if (window.getAllWindows().length === 0) { createWindow(); }
    });

    //启动子进程
    rendererProcess.startRenderer();
    mcpProcess.startMCPClient();
}

main().then(() => {
    console.log("Finish initializing window.");
}).catch((error) => {
    console.log("Error starting main process:", error);
});


