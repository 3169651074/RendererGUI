// ====== DOM元素 ======

//按钮，文本框和标题
let generateBtn = null;
let commitBtn = null;
let cancelBtn = null;
let copyBtn = null;
let outputTextarea = null;
let titleElement = null;
let resetBtn = null;
let fovInput = null;
let samplesPerPixelInput = null;
let maxDepthInput = null;
let cameraUpInput = null;

//分辨率输入
let resolutionPreset = null;
let resolutionXInput = null;
let resolutionYInput = null;

//背景色输入
let colorPicker = null;
let colorRInput = null;
let colorGInput = null;
let colorBInput = null;

// ====== 辅助函数 ======

//将 0-255 的整数转换为两位十六进制字符串
function toHex(c) {
    /*
     * parseInt(c, 10)：将输入变量 c 按十进制转换为整数
     * .toString(16)：把上一步得到的整数转换成十六进制字符串
     * "0" + ... .slice(-2)：前面加0补位，并取字符串的最后两位，保证结果总是两位
     */
    return "0" + parseInt(c, 10).toString(16).slice(-2);
}

//更新页面背景颜色
function updatePageBackground(hexColor) {
    document.body.style.backgroundColor = hexColor;
}

//根据背景亮度更新标题颜色
function updateTitleColor(r, g, b) {
    // 使用YIQ公式计算颜色的感知亮度
    const luminance = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    // 如果亮度大于阈值（128是中间点），则为浅色背景
    if (luminance > 220) {
        titleElement.style.color = "#000000"; // 黑色标题
        titleElement.style.textShadow = "1px 1px 2px rgba(255,255,255,0.2)";
    } else {
        titleElement.style.color = "#FFFFFF"; // 白色标题
        titleElement.style.textShadow = "1px 1px 2px rgba(0,0,0,0.2)";
    }
}

//监听RGB输入框的变化，更新颜色选择器和页面背景
function updateColorPickerAndBackground() {
    //当colorRInput.value为空时，使用"0"
    const r = parseInt(colorRInput.value || "0", 10);
    const g = parseInt(colorGInput.value || "0", 10);
    const b = parseInt(colorBInput.value || "0", 10);
    // 将 RGB 值转换为 #RRGGBB 格式的十六进制颜色
    const hexColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    colorPicker.value = hexColor;
    updatePageBackground(hexColor); // 实时更新背景
    updateTitleColor(r, g, b); // 实时更新标题颜色
}

// ====== 主渲染函数 ======

//获取通用按钮和输出区域的DOM元素
function getDOMElements() {
    //按钮，文本框和标题
    generateBtn = document.getElementById("generate-btn");
    commitBtn = document.getElementById("commit-btn");
    cancelBtn = document.getElementById("cancel-btn");
    copyBtn = document.getElementById("copy-btn");
    outputTextarea = document.getElementById("output-command");
    titleElement = document.querySelector("h1");
    resetBtn = document.getElementById("reset-btn"); // 新增

    //分辨率输入框
    resolutionPreset = document.getElementById("resolution-presets");
    resolutionXInput = document.getElementById("resolution-x");
    resolutionYInput = document.getElementById("resolution-y");

    //颜色选择器与RGB输入框双向绑定
    colorPicker = document.getElementById("bg-color-picker");
    colorRInput = document.getElementById("bg-color-r");
    colorGInput = document.getElementById("bg-color-g");
    colorBInput = document.getElementById("bg-color-b");
}

//生成命令
function generateCommand() {
    //检查文本框中是否已有命令
    const wasEmpty = outputTextarea.value === "";

    //分辨率
    const resX = resolutionXInput.value;
    const resY = resolutionYInput.value;

    //背景颜色 (获取 0-255 值)
    const bgColorR_255 = parseFloat(colorRInput.value);
    const bgColorG_255 = parseFloat(colorGInput.value);
    const bgColorB_255 = parseFloat(colorBInput.value);

    //转换背景颜色到 0-1 范围
    const bgColorR_norm = (bgColorR_255 / 255.0).toFixed(3);
    const bgColorG_norm = (bgColorG_255 / 255.0).toFixed(3);
    const bgColorB_norm = (bgColorB_255 / 255.0).toFixed(3);

    //其他参数
    const fov = document.getElementById("fov").value;
    const samplesPerPixel = document.getElementById("samples-per-pixel").value;
    const maxDepth = document.getElementById("max-depth").value;
    const cameraUp = document.getElementById("camera-up").value;

    //构建命令字符串数组
    const commands = [];
    commands.push(`set resolution {${resX} ${resY}}`);
    commands.push(`set background_color {${bgColorR_norm} ${bgColorG_norm} ${bgColorB_norm}}`);
    commands.push(`set fov ${fov}`);
    commands.push(`set samples_per_pixel ${samplesPerPixel}`);
    commands.push(`set max_depth ${maxDepth}`);

    let cameraUpValue = "{0 1 0}"; // 默认Y轴向上
    if (cameraUp === "x") {
        cameraUpValue = "{1 0 0}";
    } else if (cameraUp === "z") {
        cameraUpValue = "{0 0 1}";
    }
    commands.push(`set camera_up ${cameraUpValue}`);

    //将命令数组用 " && " 连接成一个字符串，并显示在文本框中
    outputTextarea.value = commands.join(" && ");

    //如果之前已经有命令，则触发高亮动画
    if (!wasEmpty) {
        outputTextarea.classList.remove("highlight-flash"); // 重置动画
        // 用 requestAnimationFrame 确保类被移除后再生效
        void outputTextarea.offsetWidth;
        outputTextarea.classList.add("highlight-flash");
    }
}

//一键重置为默认值
function resetForm() {
    // 分辨率预设与输入框
    resolutionPreset.selectedIndex = 0;
    const [width, height] = (resolutionPreset.value || "1920x1080").split("x");
    resolutionXInput.value = width;
    resolutionYInput.value = height;

    //背景颜色（与初始值保持一致）
    colorRInput.value = "179";
    colorGInput.value = "204";
    colorBInput.value = "229";
    //直接设置颜色选择器，避免 toHex 的潜在拼接问题
    colorPicker.value = "#B3CCE5";
    updatePageBackground("#B3CCE5");
    updateTitleColor(179, 204, 229);

    //其他参数
    fovInput.value = "90";
    samplesPerPixelInput.value = "100";
    maxDepthInput.value = "50";
    cameraUpInput.value = "y";

    //输出与按钮文本
    outputTextarea.value = "";
    outputTextarea.classList.remove("highlight-flash");
    copyBtn.textContent = "Copy";
}

//为DOM元素添加监听器
function addListeners() {
    //分辨率输入框改变预设
    resolutionPreset.addEventListener("change", () => {
        const selectedValue = resolutionPreset.value;
        if (selectedValue) {
            const [width, height] = selectedValue.split("x");
            resolutionXInput.value = width;
            resolutionYInput.value = height;
        }
    });

    // 监听颜色选择器的变化，更新RGB输入框和页面背景
    colorPicker.addEventListener("input", () => {
        const hex = colorPicker.value;
        // 将 #RRGGBB 格式的十六进制颜色转换为 RGB
        const r = parseInt(hex.substring(1, 3), 16);
        const g = parseInt(hex.substring(3, 5), 16);
        const b = parseInt(hex.substring(5, 7), 16);
        colorRInput.value = r;
        colorGInput.value = g;
        colorBInput.value = b;
        updatePageBackground(hex); // 实时更新背景
        updateTitleColor(r, g, b); // 实时更新标题颜色
    });

    colorRInput.addEventListener("input", updateColorPickerAndBackground);
    colorGInput.addEventListener("input", updateColorPickerAndBackground);
    colorBInput.addEventListener("input", updateColorPickerAndBackground);

    //命令生成逻辑
    generateBtn.addEventListener("click", generateCommand);

    //监听动画结束事件，移除动画类，以便下次可以重新触发
    outputTextarea.addEventListener("animationend", () => {
        outputTextarea.classList.remove("highlight-flash");
    });

    //按钮
    copyBtn.addEventListener("click", () => {
        const commandText = outputTextarea.value;
        if (commandText) {
            navigator.clipboard.writeText(commandText).then(() => {
                // 成功反馈
                copyBtn.textContent = "Copied!";
                setTimeout(() => {
                    copyBtn.textContent = "Copy";
                }, 2000);
            }).catch(err => {
                console.error("Failed to copy text: ", err);
                renderer.showDialog("error", "Error", "Failed to copy command.");
            });
        } else {
            renderer.showDialog("info", "Info", "Please generate a command first.");
        }
    });

    commitBtn.addEventListener("click", async () => {
        console.log("Commit button clicked. Command to send:", outputTextarea.value);
        if (outputTextarea.value) {
            /*
             * 发送命令到主进程，由主进程发往渲染器
             * sendCommand返回Promise，使用try catch进行处理
             */
            const result = await renderer.sendCommand(outputTextarea.value + " && commit");
            if (result !== "OK") {
                renderer.showDialog("error", "Error", result.toString());
            }
        } else {
            renderer.showDialog("info", "Info", "Please generate a command first.");
        }
    });

    cancelBtn.addEventListener("click", () => {
        //清空生成的命令
        outputTextarea.value = "";
        console.log("Commands cancelled.");
    });

    // 新增：一键重置
    resetBtn.addEventListener("click", resetForm);
}

//当文档加载完成后执行渲染函数
document.addEventListener("DOMContentLoaded", () => {
    getDOMElements();
    addListeners();

    //页面加载时，根据默认颜色设置初始标题颜色
    updateTitleColor(
        parseInt(colorRInput.value, 10),
        parseInt(colorGInput.value, 10),
        parseInt(colorBInput.value, 10)
    );
});