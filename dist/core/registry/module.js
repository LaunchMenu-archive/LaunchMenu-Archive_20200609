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

var _channelHandler = require("../communication/channel/channelHandler");

var _channelHandler2 = _interopRequireDefault(_channelHandler);

var _registry = require("./registry");

var _registry2 = _interopRequireDefault(_registry);

var _requestPath = require("./requestPath");

var _requestPath2 = _interopRequireDefault(_requestPath);

var _booleanProcess = require("../utils/booleanProcess");

var _booleanProcess2 = _interopRequireDefault(_booleanProcess);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Module {
    /**
     * Create a module instance which is the core building block for LM
     * @param {Request} request - The request that caused this module to be instantiated
     * @param {boolean} canBeDirectlyInstantiated - Whether or not this module should be instantiatable without a request
     * @constructs Module
     * @public
     */
    constructor(request, canBeDirectlyInstantiated) {
        let registerPromiseResolve = null;
        const registerPromise = new _promise2.default((resolve, reject) => {
            registerPromiseResolve = resolve;
        });
        this.core = {
            registration: {
                registered: new _booleanProcess2.default(0),
                registerPromise: registerPromise,
                registerPromiseResolve: registerPromiseResolve
            },
            initPromise: registerPromise, // Other methods may build upon this promise
            handlers: {},
            source: {}
        };

        if (request) {
            this.core.source = {
                request: request
            };
            this.__register();
        } else if (!canBeDirectlyInstantiated) {
            const error = Error("This module can only be instantiated from a handle request");
            reject(error);
            throw error;
        }
    }
    /**
     * Registers the module if it wasn't registered already
     * @returns {Module} A reference to itself
     * @async
     * @private
     */
    async __register() {
        if (this.core.registration.registered.false()) {
            this.core.registration.registered.turningTrue(true);
            const source = this.core.source;
            if (source.request) {
                const requestPath = new _requestPath2.default(source.request.source);
                source.requestPath = requestPath.augmentPath(this.getClass().modulePath, 0);
                const ID = await _registry2.default._registerModuleInstance(this);

                this.core.channelReceiver = await _channelHandler2.default.createReceiver(source.requestPath.toString(true), this.__createChannelMethods());
                source.channel = await _channelHandler2.default.createSender(source.request.source, source.request.type, source.requestPath.toString(true));

                this.core.registration.registered.true(true);
                this.core.registration.registerPromiseResolve(this);
            } else {
                source.requestPath = new _requestPath2.default(this.getClass().modulePath);
                const ID = await _registry2.default._registerModuleInstance(this);
                this.core.channelReceiver = await _channelHandler2.default.createReceiver(source.requestPath.toString(true), this.__createChannelMethods());
                this.core.registration.registered.true(true);
                this.core.registration.registerPromiseResolve(this);
            }
        }
    }

    /**
     * Adds a function to run before indicating that initialisation has finished
     * @param {function} method - The function to run (may be async)
     * @returns {Promise} A promise that resolves when the module is initialised
     * @private
     */
    __init(method) {
        return this.core.initPromise = this.core.initPromise.then(method);
    }

    /**
     * Adds a then and catch function to the registration completion promise
     * @param {function} [then] - The function to run when registration has finished
     * @param {function} [ctch] - The function to run if something goes wrong during registration
     * @returns {Promise<Module>} A reference to this module instance
     * @async
     * @private
     */
    __onRegister(then, ctch) {
        return this.core.registration.registerPromise.then(then).catch(ctch);
    }

    /**
     * Adds a then and catch function to the initialization completion promise
     * @param {function} [then] - The function to run when initialization has finished
     * @param {function} [ctch] - The function to run if something goes wrong during initialization
     * @returns {Promise<Module>} A reference to this module instance
     * @async
     * @private
     */
    onInit(then, ctch) {
        return this.core.initPromise.then(then).catch(ctch);
    }

    // Registry related methods
    /**
     * Returns the path to this module class
     * @returns {string} The path to this module class
     * @public
     */
    toString() {
        return this.getClass().toString();
    }

    /**
     * Returns the class of this module instance
     * @returns {Class<Module>} The class of this module instance
     * @public
     */
    getClass() {
        return this.__proto__.constructor;
    }

    /**
     * Returns the requestPath that created this module instance
     * @returns {RequestPath} The request path
     * @public
     */
    getPath() {
        return this.core.source.requestPath;
    }

    /**
     * Returns the path to this module class
     * @returns {string} The path to this module class
     * @public
     */
    static getPath() {
        return this.modulePath;
    }

    /**
     * Returns the path to this module class
     * @returns {string} The path to this module class
     * @public
     */
    static toString() {
        return this.getPath();
    }

    // Channel-related methods
    /**
     * Gets all the methods of this module that are not static
     * @returns {Object} All methods indexed by name
     * @private
     */
    __getMethods() {
        const output = {};
        const channelMethodRegex = /^\$/g;
        let nextProto = this.__proto__;
        while (nextProto && nextProto != Module.prototype) {
            const proto = nextProto;
            nextProto = proto.__proto__;

            (0, _getOwnPropertyNames2.default)(proto).forEach(varName => {
                const variable = this.__proto__[varName];
                if (variable instanceof Function && channelMethodRegex.test(varName) && !output[varName]) {
                    output[varName.replace(channelMethodRegex, "")] = this.__proto__[varName];
                }
            });
        }
        return output;
    }

    /**
     * Creates all methods to interact with this module over a channel
     * @returns {Object} All methods indexed by name
     * @private
     */
    __createChannelMethods() {
        const output = {};
        const methods = this.__getMethods();
        (0, _keys2.default)(methods).forEach(methodName => {
            const method = methods[methodName];
            output[methodName] = event => {
                return method.apply(this, [event].concat(event.data));
            };
        });
        output.close = event => {
            return this.dispose();
        };
        output.closeDescendant = event => {
            return this.__disconnectDescendant.apply(this, event.data);
        };
        return output;
    }

    /**
     * Disconnects a module from this module (But doesn't dispose it)
     * @param {RequestPath} requestPath - The request path for the module to disconnect
     * @param {string} type - The type of request that the module was instiated for
     * @returns {undefined}
     * @private
     */
    __disconnectDescendant(requestPath, type) {
        const handler = this.core.handlers[type];
        if (handler) {
            const channels = handler.channels;
            if (channels instanceof Array) {
                handler.channels = channels.filter(channel => {
                    return channel._getID() != requestPath;
                });

                if (handler.channels.length == 0) delete this.core.handlers[type];
            } else if (channels._getID() == requestPath) {
                delete this.core.handlers[type];
            }
        }
    }

    /**
     * Disposes this module entirely, also getting rid of its connections to other modules
     * @returns {Promise} The promise that resolves once disposal has completed
     * @async
     * @public
     */
    async dispose() {
        if (this.core.registration.registered.turningTrue()) throw Error("Module is still registering");
        if (this.core.registration.registered.true()) {
            this.core.registration.registered.turningFalse(true);
            const channelDisposalPromises = [];
            (0, _keys2.default)(this.core.handlers).forEach(type => {
                const handler = this.core.handlers[type];
                const channels = handler.channels;
                if (channels instanceof Array) {
                    channelDisposalPromises.concat(channels.map(channel => {
                        return channel.close();
                    }));
                } else {
                    channelDisposalPromises.push(channels.close());
                }
            });

            await _promise2.default.all(channelDisposalPromises);
            if (this.core.source.channel) {
                await this.core.source.channel.closeDescendant(this.getPath().toString(true), this.core.source.request.type);
            }

            this.core.registration.registered.false(true);
            await this.core.channelReceiver.close();

            await _registry2.default._deregisterModuleInstance(this);
        }
    }

    /**
     * Request modules to handle the passed data and establish a connection with these modules
     * @param  {Registry~Request} request - The information on how to handle the data
     * @returns {Promise<ChannelSender[]>} The channel(s) that have been created to answer the request
     * @async
     * @public
     */
    async requestHandle(request) {
        if (this.core.registration.registered.turningFalse()) throw Error("Module is currently deregistering");

        if (this.core.registration.registered.false()) {
            await this.__register();
            // await this.__onRegister();
        } else if (this.core.registration.registered.turningTrue()) {
            await this.__onRegister();
        }

        if (!request.methods) request.methods = {};

        request.source = this;

        if (this.core.handlers[request.type]) return this.core.handler[request.type].channels;

        this.core.channelReceiver.createSubChannel(request.type, request.methods);
        const channels = await _registry2.default.requestHandle(request);
        this.core.handlers[request.type] = {
            request: request,
            channels: channels
        };
        return channels;
    }
}
exports.default = Module;
//# sourceMappingURL=module.js.map