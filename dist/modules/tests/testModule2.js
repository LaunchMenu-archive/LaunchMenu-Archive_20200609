"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var Registry = require("LM").default.Registry;

require("source-map-support/register");

var _LMModule = Registry.requestModule("Module");

var _LMModule2 = _interopRequireDefault(_LMModule);

var _extendedJSON = require("../../core/communication/extendedJSON");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class TestModule2 extends _LMModule2.default {
    constructor(request, name) {
        super(request, true);
        this.name = name;
    }
    setSomething(something) {
        console.log(`something is now ${something}`);
        this.something = something;
        return 3;
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
exports.default = TestModule2;
//# sourceMappingURL=testModule2.js.map