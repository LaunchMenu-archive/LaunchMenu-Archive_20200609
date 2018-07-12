"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

require("source-map-support/register");

var _IPC = require("./IPC");

var _IPC2 = _interopRequireDefault(_IPC);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Channel {
    /**
     * Create a new channel
     * @param {String} ID           The unique identifier for the channel
     * @param {String} subChannelID The subChannelID that will be used to augment special channel methods
     */
    constructor(ID, subChannelID) {
        this.ID = ID;
        this.subChannelID = subChannelID;

        this.load();
    }
    load() {}
}
exports.default = Channel;
//# sourceMappingURL=channel.js.map