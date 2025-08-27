//引入主模块
const electron = require("electron");

//提取对象
const bridge = electron.contextBridge;
const ipc = electron.ipcRenderer;