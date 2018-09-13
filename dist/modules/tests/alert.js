"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var Registry = require("LM").default.Registry;

require("source-map-support/register");

var _LMModule = Registry.requestModule("Module");

var _LMModule2 = _interopRequireDefault(_LMModule);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Alert extends _LMModule2.default {
    constructor(request) {
        super(request);
    }
    $alert(event, text) {
        window.alert(text);
        // console.info(text);
        // return new Promise(resolve=>{
        //     setTimeout(resolve, 2000);
        // })
    }
}
exports.default = Alert;
//# sourceMappingURL=alert.js.map