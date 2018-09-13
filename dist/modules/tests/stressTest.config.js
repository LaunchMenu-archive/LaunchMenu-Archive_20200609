"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var Registry = require("LM").default.Registry;

require("source-map-support/register");

exports.default = {
    type: "stress",
    filter: request => {
        return true;
    }
};
//# sourceMappingURL=stressTest.config.js.map