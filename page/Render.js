// ====== 全局对象变量 ======

let body = document.body.style;
let title = document.querySelector("h1").style;

//分辨率
let resolutionPresetsForm = document.getElementById("resolution-presets");
let resolutionWidthInput = document.getElementById("resolution-width");
let resolutionHeightInput = document.getElementById("resolution-height");

//背景颜色
let backgroundColorRInput = document.getElementById("background-color-r");
let backgroundColorGInput = document.getElementById("background-color-g");
let backgroundColorBInput = document.getElementById("background-color-b");
let backgroundColorPicker = document.getElementById("background-color-picker");

//相机基准方向
let cameraUpForm = document.getElementById("camera-up");

//FOV, SPP, 最大追踪深度
let fovInput = document.getElementById("fov");
let sppInput = document.getElementById("samples-per-pixel");
let maxDepthInput = document.getElementById("max-depth");

//按钮
let generateCommandButton = document.getElementById("generate-command-button");
let resetButton = document.getElementById("reset-button");
let commitButton = document.getElementById("commit-button");
let copyButton = document.getElementById("copy-button");

//命令文本框
let outputTextarea = document.getElementById("output-command-textarea");

//对话框
let chatInputTextarea = document.getElementById("chat-input");
let checkConnectionButton = document.getElementById("check-connect-button");
let sendButton = document.getElementById("chat-send-button");

// ====== 页面渲染函数 ======

function setDefaultValue() {
    body.backgroundColor = defaultBackgroundColor.hex;
    title.color = defaultTitleColor;

    resolutionPresetsForm.value = defaultResolution.width + 'x' + defaultResolution.height;
    resolutionWidthInput.value = defaultResolution.width;
    resolutionHeightInput.value = defaultResolution.height;

    backgroundColorRInput.value = defaultBackgroundColor.r;
    backgroundColorGInput.value = defaultBackgroundColor.g;
    backgroundColorBInput.value = defaultBackgroundColor.b;
    backgroundColorPicker.value = defaultBackgroundColor.hex;

    cameraUpForm.value = defaultCameraUp;
    fovInput.value = defaultFOV;
    sppInput.value = defaultSPP;
    maxDepthInput.value = defaultMaxDepth;
    outputTextarea.value = "";
}

//为DOM元素添加监听器
function addListeners() {
    //分辨率输入框改变预设
    resolutionPresetsForm.addEventListener("change", () => {
        const selectedValue = resolutionPresetsForm.value;
        if (selectedValue != null) {
            const [width, height] = selectedValue.split("x");
            //更新输入框的值
            resolutionWidthInput.value = width;
            resolutionHeightInput.value = height;
        }
    });

    //监听颜色选择器的变化，更新RGB输入框和页面背景
    backgroundColorPicker.addEventListener("input", () => {
        const hex = backgroundColorPicker.value;

        //将 #RRGGBB 格式的十六进制颜色转换为 RGB
        const r = parseInt(hex.substring(1, 3), 16);
        const g = parseInt(hex.substring(3, 5), 16);
        const b = parseInt(hex.substring(5, 7), 16);
        backgroundColorRInput.value = r;
        backgroundColorGInput.value = g;
        backgroundColorBInput.value = b;
        //更新背景颜色
        body.backgroundColor = hex;
        //更新标题颜色
        updateTitleColor(title, r, g, b);
    });

    //颜色输入框变化
    backgroundColorRInput.addEventListener("input", () => {
        updateColorPickerAndBackground(title, body, backgroundColorPicker, backgroundColorRInput, backgroundColorGInput, backgroundColorBInput)
    });
    backgroundColorGInput.addEventListener("input", () => {
        updateColorPickerAndBackground(title, body, backgroundColorPicker, backgroundColorRInput, backgroundColorGInput, backgroundColorBInput)
    });
    backgroundColorBInput.addEventListener("input", () => {
        updateColorPickerAndBackground(title, body, backgroundColorPicker, backgroundColorRInput, backgroundColorGInput, backgroundColorBInput)
    });

    //命令生成按钮
    generateCommandButton.addEventListener("click", () => {
        generateCommand(outputTextarea, resolutionWidthInput, resolutionHeightInput,
                        backgroundColorRInput, backgroundColorGInput, backgroundColorBInput,
                        sppInput, maxDepthInput, cameraUpForm);
    });

    //复制命令按钮
    copyButton.addEventListener("click", () => {
        const commandText = outputTextarea.value;
        if (commandText !== "") {
            //向剪切板中写入命令字符串
            navigator.clipboard.writeText(commandText).then(() => {
                //复制成功
                copyButton.textContent = "Copied!";
                //恢复原样
                setTimeout(() => {
                    copyButton.textContent = "Copy";
                }, 2000);
            }).catch(err => {
                //显示失败对话框
                mainProcess.showDialog("error", "Error", "Failed to copy command.");
            });
        } else {
            //未生成命令
            mainProcess.showDialog("info", "Info", "Please generate a command first.");
        }
    });

    //重置按钮
    resetButton.addEventListener("click", () => {
        setDefaultValue();
    });

    //提交按钮
    commitButton.addEventListener("click", async () => {
        if (outputTextarea.value !== "") {
            /*
             * 发送命令到主进程，由主进程发往渲染器
             * sendCommand返回Promise，需要await
             * result就是RendererProcess.sendCommand函数的返回值，为一个字符串
             */
            const result = await mainProcess.sendCommand(outputTextarea.value + " && commit");
            if (result !== "OK") {
                mainProcess.showDialog("error", "Error", result);
            } else {
                const originText = commitButton.innerText;
                commitButton.innerText = "Success!";
                setTimeout(() => {commitButton.innerText = originText;}, 2000);
            }
        } else {
            mainProcess.showDialog("info", "Info", "Please generate a command first.");
        }
    });

    //检查连接按钮
    checkConnectionButton.addEventListener("click", () => {
        mainProcess.checkConnection();
    });

    //监听动画结束事件，移除动画类，以便下次可以重新触发
    outputTextarea.addEventListener("animationend", () => {
        outputTextarea.classList.remove("highlight-flash");
    });
}

function main() {
    setDefaultValue();
    addListeners();

    //页面加载时，根据默认颜色设置初始标题颜色
    updateTitleColor(title,
        parseInt(backgroundColorRInput.value, 10),
        parseInt(backgroundColorGInput.value, 10),
        parseInt(backgroundColorBInput.value, 10)
    );
}

//当文档加载完成后执行逻辑函数
document.addEventListener("DOMContentLoaded", main);