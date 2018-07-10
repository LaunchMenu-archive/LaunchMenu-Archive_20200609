"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.IPC = undefined;

require("source-map-support/register");

class IPC {
    /**
     * Send data to another window or the main script
     * @param  {String} [type] The event type to send (preferbly prefixed with some module ID)
     * @param  {Object} [data] The data to send
     * @param  {String|[String, ...]} [dest="*"] The window ID(s) to send this data to
     * @return {Undefined} The method returns no useful information
     */
    static send(type, data, dest = "*") {}
    static on(type, handler) {}
    static once(type, handler) {}
    static off(type, handler) {}
}
exports.IPC = IPC;
//# sourceMappingURL=IPC.js.map