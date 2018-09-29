"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var Registry = require("LM").default.Registry;

require("source-map-support/register");

var _LMModule = Registry.requestModule("Module");

var _LMModule2 = _interopRequireDefault(_LMModule);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class MultiAlert extends _LMModule2.default {
    constructor(request) {
        super(request);
        this.__init(() => {
            return this.requestHandle({
                type: "alert"
            }).then(channel => {
                this.alertChannel = channel;
            });
        });
    }
    $alert(event, text) {
        return this.alertChannel.$alert(text).then(() => {
            return this.alertChannel.$alert(text);
        });
    }
}
exports.default = MultiAlert;
//# sourceMappingURL=multiAlert.js.map