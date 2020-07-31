const fs = require('fs');
const path = require('path');

const copyDirectorySync = (src, dest) => {
    if (!fs.existsSync(src)) {
        return false;
    }
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, {recursive: true});
    }
    var dirs = fs.readdirSync(src);
    dirs.forEach(function (item) {
        var item_path = path.join(src, item);
        var temp = fs.statSync(item_path);
        if (temp.isFile()) {
            fs.copyFileSync(item_path, path.join(dest, item));
        } else if (temp.isDirectory()) {
            // console.log("Item Is Directory:" + item);
            copyDirectorySync(item_path, path.join(dest, item));
        }
    });
};

fs.rmdirSync("./build-web", {recursive: true});
fs.rmdirSync("./build-server", {recursive: true});
fs.rmdirSync("./static", {recursive: true});
fs.rmdirSync("./CuraEngine", {recursive: true});

copyDirectorySync("../web/build-web", "./build-web");
copyDirectorySync("../server/build-server", "./build-server");
copyDirectorySync("../server/static/fonts", "./static/fonts");
copyDirectorySync("../server/CuraEngine/Config", "./CuraEngine/Config");

const os = process.argv[2];
switch (os) {
    case "mac":
        copyDirectorySync("../server/CuraEngine/2.7/macOS", "./CuraEngine/2.7/macOS");
        fs.chmodSync("./CuraEngine/2.7/macOS/CuraEngine", 511);
        break;
    case "windows":
        copyDirectorySync("../server/CuraEngine/2.7/Win-x64", "./CuraEngine/2.7/Win-x64");
        fs.chmodSync("./CuraEngine/2.7/Win-x64/CuraEngine.exe", 511);
        break;
    case "linux":
        copyDirectorySync("../server/CuraEngine/2.7/Linux-x64", "./CuraEngine/2.7/Linux-x64");
        fs.chmodSync("./CuraEngine/2.7/Linux-x64/CuraEngine", 511);
        break;
    default:
        copyDirectorySync("../server/CuraEngine/2.7", "./CuraEngine/2.7");
        break;
}




