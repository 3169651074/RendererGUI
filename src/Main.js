// ====== 导入设置 ======
const configs = require("./Config.js");

//Electron主模块
const electron = require("electron");

//Node.js的路径和子进程模块
const path = require("path");
const childProcess = require("child_process");

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
            {
                label: "Toggle Chat Dialog",
                accelerator: "Ctrl+C",
                click() {
                    console.log("Toggle Chat Dialog");
                }
            },
            //分隔线
            { type: "separator" },
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
            { role: "reload" },
            { role: "forceReload" },
            //开发者工具
            { role: "toggleDevTools" },
            { type: "separator" },
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

function createWindow() {
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

    //渲染HTML页面
    window.loadFile("./page/Index.html").then(r => {
        console.log("Page load complete");
        console.log("Node version:", process.versions.node, ", Chrome version:", process.versions.chrome, ", Electron version:", process.versions.electron);
    });

    //最大化窗口
    if (configs.isMaximize) {
        window.maximize();
    }

    //设置菜单栏
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function main() {
    console.log("Starting main process.");

    //准备完成时创建窗口
    app.on("ready", createWindow);

    //当所有窗口关闭时退出应用
    app.on("window-all-closed", () => {
        app.quit();
    });

    //当应用被激活时如果没有窗口则创建一个新窗口
    app.on("activate", () => {
        if (window.getAllWindows().length === 0) { createWindow(); }
    });
}

main();