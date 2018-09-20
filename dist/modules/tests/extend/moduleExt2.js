"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var Registry = require("LM").default.Registry;

require("source-map-support/register");

var _LMModule = Registry.requestModule("Module");

var _LMModule2 = _interopRequireDefault(_LMModule);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class ModuleExt1 extends _LMModule2.default {
    constructor(request, canBeDirectlyInstantiated) {
        super(request, canBeDirectlyInstantiated);
        try {
            // alert("Git rekt");
        } catch (e) {}
    }
}
exports.default = ModuleExt1;
//# sourceMappingURL=moduleExt2.js.map