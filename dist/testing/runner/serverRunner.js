"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

var Registry = require("LM").default.Registry;

exports.default = function (inpFile, inpComplete) {
    file = inpFile;
    script = require(file).default;

    onReady(() => {
        window = new _electron.BrowserWindow({ width: 1360, height: 800 });
        window.loadURL(_url2.default.format({
            pathname: _path2.default.join(process.cwd(), "dist", "testing", "runner", "window.html"),
            protocol: "file:",
            slashes: true
        }));
        _IPC2.default._registerWindow(window);
        window.openDevTools();
        complete = () => {
            window.close();
            _IPC2.default._deregisterWindow(window);
            if (inpComplete) inpComplete();
        };
    });
};

require("source-map-support/register");

var _electron = require("electron");

var _url = require("url");

var _url2 = _interopRequireDefault(_url);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _IPC = require("../../core/communication/IPC");

var _IPC2 = _interopRequireDefault(_IPC);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let readyListeners = [];
let isReady = false;
const onReady = callback => {
    if (isReady) callback();else readyListeners.push(callback);
};
_electron.app.on('ready', function () {
    isReady = true;
    readyListeners.forEach(listener => {
        listener();
    });
});

let phaseAwaiting = 2;
let file;
let script;
let continueServer;
let window;
let complete;
const runNextPhase = function () {
    phaseAwaiting = 2;
    window.webContents.send("TESTING.nextPhase");
    continueServer();
};

;

_electron.ipcMain.once('TESTING.windowReady', () => {
    script(0, () => {
        const promise = new _promise2.default((resolve, reject) => {
            continueServer = resolve;
        });
        if (--phaseAwaiting == 0) runNextPhase();
        return promise;
    }).then(complete);
    window.webContents.send("TESTING.loadFile", file);

    _electron.ipcMain.on("TESTING.completePhase", event => {
        if (--phaseAwaiting == 0) runNextPhase();
    });
});
//# sourceMappingURL=serverRunner.js.map