"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _keys = require("babel-runtime/core-js/object/keys");

var _keys2 = _interopRequireDefault(_keys);

var _getOwnPropertyNames = require("babel-runtime/core-js/object/get-own-property-names");

var _getOwnPropertyNames2 = _interopRequireDefault(_getOwnPropertyNames);

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

var Registry = require("../../../dist/core/registry/registry").default;

require("source-map-support/register");

var _channel = require("../communication/channel");

var _channel2 = _interopRequireDefault(_channel);

var _registry = require("./registry");

var _registry2 = _interopRequireDefault(_registry);

var _windowHandler = require("../window/windowHandler");

var _windowHandler2 = _interopRequireDefault(_windowHandler);

var _requestPath = require("./requestPath");

var _requestPath2 = _interopRequireDefault(_requestPath);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Module {
    constructor(request, canBeDirectlyInstantiated) {
        let registerPromiseResolve = null;
        const registerPromise = new _promise2.default((resolve, reject) => {
            registerPromiseResolve = resolve;
        });
        this.core = {
            registered: false,
            registerPromise: registerPromise,
            registerPromiseResolve: registerPromiseResolve,
            initPromise: registerPromise, // Other methods may build upon this promise
            channelReceiver: null,
            request: request,
            channels: {
                source: null
            }
        };
        if (request) {
            this.__register();
        } else if (!canBeDirectlyInstantiated) {
            const error = Error("This module can only be instantiated from a handle request");
            reject(error);
            throw error;
        }
    }
    __register() {
        if (this.core.registered === false) {
            this.core.registered = null; //adding
            if (this.core.request) {
                const requestPath = new _requestPath2.default(this.core.request.source);
                this.core.requestPath = requestPath.augmentPath(this.getClass().modulePath, 0);
                _windowHandler2.default._registerModuleInstance(this);
                _registry2.default._registerModuleInstance(this).then(ID => {
                    _channel2.default.createReceiver(this.core.requestPath.toString(true), this.__createChannelMethods()).then(receiver => {
                        this.core.channelReceiver = receiver;
                        _channel2.default.createSender(this.core.request.source, this.core.request.type, this.core.requestPath.toString(true)).then(channel => {
                            this.core.channels.source = channel;
                            window.channel = channel; // TODO remove (for testing);
                            this.core.registered = true;
                            this.core.registerPromiseResolve(this);
                        });
                    });
                });
            } else {
                this.core.requestPath = new _requestPath2.default(this.getClass().modulePath);
                _windowHandler2.default._registerModuleInstance(this);
                _registry2.default._registerModuleInstance(this).then(ID => {
                    _channel2.default.createReceiver(this.core.requestPath.toString(true), this.__createChannelMethods()).then(receiver => {
                        this.core.channelReceiver = receiver;
                        this.core.registered = true;
                        this.core.registerPromiseResolve(this);
                    });
                });
            }
        }
    }
    __init(method) {
        return this.core.initPromise = this.core.initPromise.then(method);
    }
    __onRegister(then, ctch) {
        return this.core.registerPromise.then(then).catch(ctch);
    }
    onInit(then, ctch) {
        return this.core.initPromise.then(then).catch(ctch);
    }

    // Registry related methods
    toString() {
        return this.getClass().toString();
    }
    getClass() {
        return this.__proto__.constructor;
    }
    getPath() {
        return this.core.requestPath;
    }
    static toString() {
        return this.modulePath;
    }

    // Channel related methods
    __getMethods() {
        const output = {};
        const ignoreRegex = /constructor|^__/g;
        let nextProto = this.__proto__;
        while (nextProto && nextProto != Module.prototype) {
            const proto = nextProto;
            nextProto = proto.__proto__;

            (0, _getOwnPropertyNames2.default)(proto).forEach(varName => {
                const variable = this.__proto__[varName];
                if (variable instanceof Function && !ignoreRegex.test(varName)) {
                    output[varName] = this.__proto__[varName];
                }
            });
        }
        return output;
    }
    __createChannelMethods() {
        const output = {};
        const methods = this.__getMethods();
        (0, _keys2.default)(methods).forEach(methodName => {
            const method = methods[methodName];
            output[methodName] = event => {
                return method.apply(this, event.data);
            };
        });
        output.close = event => {
            console.log("close", this);
            return this.dispose();
        };
        output.closeDescendant = event => {
            return this.__disposeDescendant.apply(this, event.data);
        };
        return output;
    }
    __disposeDescendant(requestPath, type) {
        const channels = this.core.channels[type];
        if (channels) {
            if (channels instanceof Array) {
                this.core.channels[type] = channels.filter(channel => {
                    return channel._getID() != requestPath;
                });

                if (this.core.channels[type].length == 0) delete this.core.channels[type];
            } else if (channels._getID() == requestPath) {
                delete this.core.channels[type];
            }
        }
    }
    dispose() {
        if (this.core.registered) {
            this.core.registered = undefined; // Removing
            const channelDisposalPromises = [];
            (0, _keys2.default)(this.core.channels).forEach(type => {
                if (type != "source") {
                    const channels = this.core.channels[type];
                    if (channels instanceof Array) {
                        channelDisposalPromises.concat(channels.map(channel => {
                            return channel.close();
                        }));
                    } else {
                        channelDisposalPromises.push(channels.close());
                    }
                }
            });

            return _promise2.default.all(channelDisposalPromises).then(() => {
                return this.core.channels.source.closeDescendant(this.getPath().toString(true), this.core.request.type);
            }).then(() => {
                return _registry2.default._deregisterModuleInstance(this);
            }).then(() => {
                this.core.registered = false; // Removed
                return _promise2.default.resolve(_windowHandler2.default._deregisterModuleInstance(this));
            });
        }
    }

    /**
     * Request modules to handle the passed data and establish a connection with these modules
     * @param  {{type:String, execute:String|function, data:Object, source:Module, methods:Object}} request The information on how to handle the data
     * @return {Promise} The Promise that shall return the channels created to communicate with the modules
     */
    requestHandle(request) {
        if (!this.registered) this.__register();
        return this.__onRegister(() => {
            if (!request.methods) request.methods = {};
            request.source = this;

            if (this.core.channels[request.type]) return this.core.channels[request.type];

            this.core.channelReceiver.createSubChannel(request.type, request.methods);
            return _registry2.default.requestHandle(request).then(channels => {
                this.core.channels[request.type] = channels;
                return channels;
            });
        });
    }
}
exports.default = Module;
//# sourceMappingURL=module.js.map