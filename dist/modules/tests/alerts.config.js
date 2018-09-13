"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var Registry = require("LM").default.Registry;

require("source-map-support/register");

exports.default = [{
    type: "alert",
    module: "alert.js"
}, {
    type: "multiAlert",
    filter: request => {
        return true;
    },
    module: "multiAlert.js"
}];
//# sourceMappingURL=alerts.config.js.map