"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _symbol = require("babel-runtime/core-js/symbol");

var _symbol2 = _interopRequireDefault(_symbol);

var _stringify = require("babel-runtime/core-js/json/stringify");

var _stringify2 = _interopRequireDefault(_stringify);

require("source-map-support/register");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class ExtendedJSON {
    /**
     * Encode more complicated data into a serializable object
     * @param  {Object} object The data you want to map
     * @return {Object}        The object that represents your data as as serializable string
     */
    static encode(object) {
        /*
            TODO:
            -map recursive structures to none recursive structures
            -map primitive values to strings
            -map modules to their paths
         */
        return object;
    }
    /**
     * Decode the more complicated data that was encoded into a serializable object
     * @param  {Object} object The data you want return into its source data
     * @return {Object}        The source data in its format before encoding was applied
     */
    static decode(object) {
        /*
            TODO:
            -map none recursive structure representations to their recursive structures
            -map primitive value strings representations to their value
            -map module paths to their module
         */
        return object;
    }
    static parse(string) {
        return this.decode(JSON.parse(string));
    }
    static stringify(object) {
        return (0, _stringify2.default)(this.encode(object));
    }

    static get serializeSymbol() {
        if (!this.serializeSymbol) this.serializeSymbol = (0, _symbol2.default)("serialize");
        return this.serializeSymbol;
    }
    static get deserializeSymbol() {
        if (!this.deserializeSymbol) this.deserializeSymbol = (0, _symbol2.default)("deserialize");
        return this.deserializeSymbol;
    }
}
exports.default = ExtendedJSON;
//# sourceMappingURL=extendedJSON.js.map