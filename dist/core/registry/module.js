"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

require("source-map-support/register");

class Module {
    constructor(request) {}
    toString() {
        return this.getClass().toString();
    }
    getClass() {
        return this.__proto__.constructor;
    }
    static toString() {
        return this.modulePath;
    }
}
exports.default = Module;
//# sourceMappingURL=module.js.map