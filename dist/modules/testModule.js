"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.config = undefined;

var Registry = require("../../dist/core/registry/registry").default;

require("source-map-support/register");

var _registry = require("../core/registry/registry");

var _registry2 = _interopRequireDefault(_registry);

var _module = require("../core/registry/module");

var _module2 = _interopRequireDefault(_module);

var _extendedJSON = require("../core/communication/extendedJSON");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class TestModule extends _module2.default {
    constructor(request, name) {
        super(request, true);
        this.name = name;
    }
    setSomething(something) {
        this.something = something;
        console.log(`something is now ${something}`);
        return 6;
    }
    alert(text) {
        window.alert(text);
    }
    getSomething() {
        return this.something;
    }
}
exports.default = TestModule;
const config = exports.config = {
    type: "alert",
    filter: request => {
        return true;
    }
};
//# sourceMappingURL=testModule.js.map