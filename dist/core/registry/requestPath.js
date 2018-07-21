"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

require("source-map-support/register");

var _IPC = require("../communication/IPC");

var _IPC2 = _interopRequireDefault(_IPC);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class RequestPath {
    constructor(path) {
        if (typeof path == "string") {
            path = path.split("->").map(module => {
                module = module.split(":");
                return {
                    module: module[0],
                    ID: module[1] || 0
                };
            });
        }

        this.modules = path;
    }
    toString(unique) {
        return this.modules.map(module => {
            if (unique) return module.module + ":" + module.ID;
            return module.module + "";
        }).join("->");
    }
    getSubPath(removeCount) {
        const requestPath = new RequestPath(this.toString(true));
        const modules = requestPath.modules;
        modules.splice(modules.length - removeCount, removeCount);
        return requestPath;
    }
    augmentPath(module, ID) {
        const requestPath = new RequestPath(this.toString(true));
        requestPath.modules.push({
            module: module,
            ID: ID
        });
        return requestPath;
    }
    getModuleID(index) {
        if (index == undefined) index = this.modules.length - 1;
        return this.modules[index];
    }
}
exports.default = RequestPath;
//# sourceMappingURL=requestPath.js.map