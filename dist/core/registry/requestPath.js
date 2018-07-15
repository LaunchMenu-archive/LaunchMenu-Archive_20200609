"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _keys = require("babel-runtime/core-js/object/keys");

var _keys2 = _interopRequireDefault(_keys);

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

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
        return new _promise2.default((resolve, reject) => {
            try {
                module = module.toString(); // Get the path in case it is a module instance
                const requestPath = new RequestPath(this.toString(true));
                console.log(requestPath);
                requestPath.modules.push({
                    module: module,
                    ID: ID
                });
                if (ID != undefined) {
                    resolve(requestPath);
                } else {
                    _IPC2.default.send("RequestPath.getID", requestPath.toString()).then(IDs => {
                        ID = Math.max.apply(Math, IDs);
                        requestPath.getModuleID().ID = ID;
                        resolve(requestPath);
                    });
                }
            } catch (e) {
                reject(e);
            }
        });
    }
    getModuleID(index) {
        if (index == undefined) index = this.modules.length - 1;
        return this.modules[index];
    }

    // Protected methods
    _isEndPoint() {
        return this._getModuleInstance() != null;
    }
    _getModuleInstance() {
        return this.module;
    }
    _attachModuleInstance(moduleInstance) {
        this.module = moduleInstance;
        RequestPath.__addEndPoint(this);
    }
    _detachModuleInstance(moduleInstance) {
        delete this.module;
        RequestPath.__removeEndPoint(this);
    }

    // Private methods
    static __addEndPoint(requestPath) {
        const moduleID = requestPath.getModuleID();
        const stringPath = requestPath.toString();
        if (!this.endPoints[stringPath]) this.endPoints[stringPath] = {
            highestID: 0
        };
        console.log(stringPath, this.endPoints);
        const endPoints = this.endPoints[stringPath];
        endPoints[moduleID.ID] = RequestPath;
        if (moduleID.ID > endPoints.highestID) endPoints.highestID = moduleID.ID;
    }
    static __removeEndPoint(requestPath) {
        const moduleID = requestPath.getModuleID();
        const stringPath = requestPath.toString();
        const endPoints = this.endPoints[stringPath];
        if (endPoints) {
            delete endPoints[moduleID.ID];
            if ((0, _keys2.default)(endPOints).length == 1) delete this.endPoints[stringPath];
        }
    }
    static __setup() {
        this.endPoints = {}; //The paths that have a module instance attached

        _IPC2.default.on("RequestPath.getID", event => {
            console.log(event, this.endPoints);
            const requestPath = new RequestPath(event.data);
            const stringPath = requestPath.toString();
            const endPoints = this.endPoints[stringPath];
            if (endPoints) return endPoints.ID;
            return 0;
        });
    }
}
RequestPath.__setup();
exports.default = RequestPath;
//# sourceMappingURL=requestPath.js.map