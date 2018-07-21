"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

require("source-map-support/register");

var _channel = require("../communication/channel");

var _channel2 = _interopRequireDefault(_channel);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Module {
    constructor(request, canBeDirectlyInstantiated) {
        this.ready = new _promise2.default((resolve, reject) => {
            if (request) {
                const requestPath = new RequestPath(request.origin);
                this.requestPath = requestPath.augmentPath(this.getClsas().modulePath, 0);
                Registry._deregisterModuleInstance(this).then(ID => {
                    _channel2.default.createSender(request.origin, request.type, this.requestPath.toString(true)).then(channel => {
                        this.origin = channel;
                        resolve(this);
                    });
                });
            } else if (!canBeDirectlyInstantiated) {
                const error = Error("This module can only be instantiated from a handle request");
                reject(error);
                throw error;
            } else {
                resolve(this);
            }
        });
    }
    toString() {
        return this.getClass().toString();
    }
    getClass() {
        return this.__proto__.constructor;
    }
    getPath() {
        return this.requestPath;
    }

    __ready() {
        return this.ready;
    }
    static toString() {
        return this.modulePath;
    }
}
exports.default = Module;
//# sourceMappingURL=module.js.map