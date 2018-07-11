"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

require("source-map-support/register");

var _registry = require("../core/registry/registry");

var _registry2 = _interopRequireDefault(_registry);

var _module = require("../core/registry/module");

var _module2 = _interopRequireDefault(_module);

var _extendedJSON = require("../core/communication/extendedJSON");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class TestModule extends _module2.default {
    constructor(name) {
        super();
        this.name = name;
    }
    setSomething(something) {
        this.something = something;
    }
    getSomething() {
        return this.something;
    }
    [_extendedJSON.serializeSymbol]() {
        return {
            constArgs: [this.name],
            something: this.something
        };
    }
    [_extendedJSON.deserializeSymbol](data) {
        this.setSomething(data.something);
    }
}
exports.default = TestModule;
_registry2.default.register(TestModule, { type: "test", filter: request => {
        return true;
    } });
//# sourceMappingURL=testModule.js.map