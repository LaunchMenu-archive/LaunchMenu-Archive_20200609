"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

require("source-map-support/register");

class Module {
    getClass() {
        return this.__proto__.constructor;
    }
}
exports.default = Module;
//# sourceMappingURL=module.js.map