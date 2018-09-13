"use strict";

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

var Registry = require("LM").default.Registry;

require("source-map-support/register");

var _electron = require("electron");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let script;
let continueWindow;
_electron.ipcRenderer.on("TESTING.loadFile", (event, file) => {
    script = require(file).default;
    script(1, () => {
        const promise = new _promise2.default((resolve, reject) => {
            continueWindow = resolve;
        });
        _electron.ipcRenderer.send("TESTING.completePhase");
        return promise;
    });
});
_electron.ipcRenderer.on("TESTING.nextPhase", () => {
    continueWindow();
});
_electron.ipcRenderer.send("TESTING.windowReady");
//# sourceMappingURL=windowRunner.js.map