"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

require("source-map-support/register");

var _electron = require("electron");

class IPC {
    /**
     * Send data to another window or the main script
     * @param  {String} type The event type to send (preferbly prefixed with some module ID)
     * @param  {Object} data The data to send
     * @param  {String|[String, ...]} [dest="*"] The window ID(s) to send this data to
     * @return {Undefined} The method returns no useful information
     */
    static send(type, data, dest = "*") {
        if (this._isRenderer()) {
            _electron.ipcRenderer.send("IPC.forward", { dest: dest, data: data });
        } else {}
    }
    static on(type, handler) {}
    static once(type, handler) {}
    static off(type, handler) {}

    //protected methods
    static _setup() {
        this.windows = [];

        if (this._isRenderer()) {} else {
            //means it runs in a renderer
            _electron.ipcMain.on("IPC.forward", (event, arg) => {});
        }
    }
    static _getWindows() {
        return this.windows;
    }
    static _registerWindow(window) {
        this.windows.push(window);
    }
    static _isRenderer() {
        return !!_electron.ipcRenderer;
    }

    //private methods
    static __encodeData() {}
}
IPC._setup();
exports.default = IPC;
//# sourceMappingURL=IPC.js.map