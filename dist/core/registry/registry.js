"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _keys = require("babel-runtime/core-js/object/keys");

var _keys2 = _interopRequireDefault(_keys);

var _from = require("babel-runtime/core-js/array/from");

var _from2 = _interopRequireDefault(_from);

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

require("source-map-support/register");

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _isMain = require("../isMain");

var _isMain2 = _interopRequireDefault(_isMain);

var _requestPath = require("./requestPath/requestPath");

var _requestPath2 = _interopRequireDefault(_requestPath);

var _requestPathPattern = require("./requestPath/requestPathPattern");

var _requestPathPattern2 = _interopRequireDefault(_requestPathPattern);

var _settingsHandler = require("../communication/data/settings/settingsHandler");

var _settingsHandler2 = _interopRequireDefault(_settingsHandler);

var _windowHandler = require("../window/windowHandler");

var _windowHandler2 = _interopRequireDefault(_windowHandler);

var _module = require("./module");

var _module2 = _interopRequireDefault(_module);

var _channelHandler = require("../communication/channel/channelHandler");

var _channelHandler2 = _interopRequireDefault(_channelHandler);

var _IPC = require("../communication/IPC");

var _IPC2 = _interopRequireDefault(_IPC);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const defaultModuleData = {
    location: {
        window: 1,
        section: 0
    }
};

/**
 * A request that can be made to retrieve a module
 * @typedef {Object} Registry~Request
 * @property {string} type - The type of handeling you are requesting
 * @property {('all'|'one'|function)} [use] - What modules to use to answer the request
 * @property {Object} [data] - Any extra data you want to pass that modules can use to determine if they can answer the request
 * @property {Module} [source] - The module that sent out the request (can be left out when usimg Module.requestHandle)
 * @property {Object} [methods] - Extra methods that can get called by the handle (is only used by Module.requestHandle)
 * @property {boolean} [embedGUI] - Whether the module GUI will be embeded into another module
 * @property {number} [_destinationWindowID] - The window that the module answering this request should be instanciated in (only used to force a value)
 * @property {number} [_destinationSectionID] - The section in the window that the module answering this request should be instanciated in (only used to force a value)
 */

/**
 * The data that is stored to track what modules can answer what requests
 * @typedef {Object} Registry~Requestlistener
 * @property {string} type - The type of request to handle
 * @property {Object[]} listeners - The modules that can answer this request
 * @property {Class<Module>} listeners[].module - The module class that can answer the request
 * @property {function} listeners[].filter - The filter to make sure the class can handle this request
 */

/**
 * The format that module configs should be in
 * @typedef {Object} Registry~Config
 * @property {string} type - The type of request to handle
 * @property {Function} [filter] - A method that will get passed a request, that determines whether to use this module and with what priority
 * @property {string} [module] - The relative path to the module to use
 * @property {Object} [settings] - The default settings to apply to modules of this type
 */

/**
 * The format that module instance config should be in, which are used as request listeners
 * @typedef {Object} Registry~ModuleInstanceConfig
 * @property {string} [type] - The type of request to handle, defaults to the module instance's type
 * @property {Function} [filter] - A method that will get passed a request, that determines whether to use this module instance and with what priority
 * @property {(RequestPath|string)} [requestPath] - The requestPath for the module instance to use
 */

/**
 * The location of a certain module, relative to the modules directory
 * @typedef {string} Registry~ModulePath
 */

/**
 * @classdesc A class to track all the modules, and handle module requests
 * @class
 * @hideconstructor
 */
class Registry {
    // Request related code
    /**
     * Request modules to handle the passed data and establish a connection with these modules
     * @param  {Request} request - The information on how to handle the data
     * @return {(Promise<ChannelSender>|Promise<ChannelSender[]>)} The channel(s) that have been created to answer the request
     * @async
     * @public
     */
    static async requestHandle(request) {
        // Normalize the request
        this._normalizeHandleRequest(request);

        // Retrieve the modules to resolve the request
        let requestModules;

        // Check if we are in the main process
        if (_isMain2.default) {
            // Directly resolve the request as we have access to all modules
            requestModules = this.__getRequestListeners(request, this.__data.requiringModules);
        } else {
            // Send a command to the main window to look for modules to resolve the request
            requestModules = (await _IPC2.default.send("Registry.request", {
                request: request,
                requiringModules: this.__data.requiringModules
            }, 0))[0];
        }

        // Instanciate all the modules

        // In order to batch the await, instead of waiting between each open instance request
        const instantiatePromises = [];

        // Go through modules for 1 request
        requestModules.forEach(module => {
            // Check if the module is an existing module, or a module class
            if (typeof module == "function") {
                // The module is a module class

                // Catch any errors that might occur while instanciating
                try {
                    // Create the proper request path
                    let source;
                    if (request.source) {
                        source = new _requestPath2.default(request.source).augmentPath(module);
                    } else {
                        source = new _requestPath2.default(module);
                    }

                    // Attempt to retrieve the correct startup location
                    let moduleLocation;

                    // Check if the request defined a location
                    if (request._destinationWindowID != null) {
                        // If it did, use this
                        moduleLocation = {
                            window: request._destinationWindowID,
                            section: request._destinationSectionID || 0
                        };
                    } else {
                        // Otherwise load the location from the settings
                        moduleLocation = _settingsHandler2.default._getModuleLocation(source);
                    }

                    // Open the window that the module should appear in
                    instantiatePromises.push(_windowHandler2.default.openModuleInstance(moduleLocation, request, module));
                } catch (e) {
                    // TODO: properply handle the error if something goes wrong
                    console.error(`Something went wrong while trying to instantiate ${module}: `, e);
                }
            } else {
                // Create a channelSender
                instantiatePromises.push(this.getModuleChannel(module, undefined, request.source).then(async channel => {
                    // Connect with the module instance
                    await channel.$connect(request.source);

                    // Forward the channel
                    return channel;
                }));
            }
        });

        // Wait for all the promises to resolve and get their channels
        const channels = await _promise2.default.all(instantiatePromises);

        // Determine whether to return only a single channel or an array of channels and return it
        if (request.use == "one") {
            return channels[0];
        } else {
            return channels.filter(channel => channel); // Remove failed instanciations
        }
    }

    /**
     * Normalizes the handle request to a fixed format
     * @param {Request} request - The request to normalize
     * @returns {Request} The normalized request (same object as the paramater)
     * @protected
     */
    static _normalizeHandleRequest(request) {
        // Check if the request contains a valid use, if not set it to 'one'
        const hasInvalidUse = !request.use || typeof request.use == "string" || !request.use.match(/^(one|all)$/g);
        if (hasInvalidUse) request.use = "one";

        // Ensure at least an empty data object is present in the request
        if (!request.data) request.data = {};

        // Make sure that when embeding GUI, the result element is opened in the same window
        if (request.embedGUI) request._destinationWindowID = _windowHandler2.default.ID;

        // Check if the request source type is a module, if so, get its string identifier
        if (request.source instanceof _module2.default) request.source = request.source.getPath().toString(true);

        // Return the request
        return request;
    }

    /**
     * Request module classes of a specific type
     * @param {Request} request - The information on what module to get
     * @returns {(Class<Module>|Object<string, Class<Module>>)} The module(s) that it could find with the specified type
     * @public
     */
    static requestModule(request) {
        // Normalize all the possibly passed requests
        const requests = this._normalizeModuleRequest.apply(this, arguments);

        // Retrieve the request modules
        let requestsModules;

        // Check if we are in the main process
        if (_isMain2.default) {
            // Directly resolve the request as we have access to all modules
            requestsModules = requests.map(request => {
                return this.__getRequestListeners(request, this.__data.requiringModules);
            });
        } else {
            // Send a command to the main window to look for modules to resolve the request
            requestsModules = _IPC2.default.sendSync("Registry.request", {
                requests: requests,
                requiringModules: this.__data.requiringModules
            })[0];
        }

        // Format the response appropriately
        if (requestsModules.length > 1) {
            // Create a object to hold the output
            const response = {};

            // Map the modules to their request types
            requestsModules.forEach((requestModules, i) => {
                // Get the request corresponding to this module
                const request = requests[i];

                // Determine whether to return only a single channel or an array of module classes and return it
                if (request.use == "one") {
                    // Store a single request module under the correct name
                    response[request.type] = requestModules[0];
                } else {
                    // Store all request modules under the correct name
                    response[request.type] = requestModules;
                }
            });

            // Return the modules indexed by request type
            return response;
        } else {
            // Get the module class(es) corresponding to the request
            const requestModules = requestsModules[0];

            // Determine whether to return only a single channel or an array of module classes and return it
            if (requests[0].use == "one") {
                return requestModules[0];
            } else {
                return requestModules;
            }
        }
    }

    /**
     * Normalizes the module request to a fixed format
     * @param {Request} request - The request to normalize
     * @returns {Request[]} The normalized requests in array form
     * @protected
     */
    static _normalizeModuleRequest(request) {
        // Get all the requests that were passed (multiple are allowed) TODO: indicate multiple in JSdoc
        var requests = (0, _from2.default)(arguments);

        // Normalize the format of the requests
        var requests = requests.map(request => {
            // If the request is only a string rather than an object, turn it into an object
            if (typeof request == "string") request = { type: request };

            // Check if the request contains a valid use, if not set it to 'one'
            const hasInvalidUse = !request.use || typeof request.use == "string" || !request.use.match(/^(one|all)$/g);
            if (hasInvalidUse) request.use = "one";

            // Ensure at least an empty data object is present in the request
            if (!request.data) request.data = {};

            // Indicate that this is a moduleRequest
            request.isModuleRequest = true;

            // Return the new request variable
            return request;
        });

        // Return the requests
        return requests;
    }

    /**
     * A method to set up the required IPC listener for the request method
     * @returns {undefined}
     * @private
     */
    static __setupRequest() {
        // Make sure to only set this up in the main process
        if (_isMain2.default) {
            // Listen for requests getting routed through the main process
            _IPC2.default.on("Registry.request", event => {
                // Check if there is a single request or multiples
                if (event.data.request) {
                    const request = event.data.request;
                    const requiringModules = event.data.requiringModules;

                    // Retrieve the priority mapping for the request
                    const requestModules = this.__getRequestListeners(request, requiringModules);

                    // Return the modules and their priorities
                    return requestModules;
                } else {
                    const requests = event.data.requests;
                    const requiringModules = event.data.requiringModules;

                    // Retrieve the priority mapping for every request
                    const requestsModules = requests.map(request => {
                        return this.__getRequestListeners(request, requiringModules);
                    });

                    // Return the mapping of modules and their priorities
                    return requestsModules;
                }
            });
        }
    }

    /**
     * Retrieves the listeners that can handle the passed request
     * @param {Registry~Request} request - The request to find module classes for
     * @param {string[]} loadingModules - A list of module paths that are currently being required
     * @returns {(Class<Module>|Array<Class<Module>>)} The module classes that have been chosen to handle the request
     * @private
     */
    static __getRequestListeners(request, loadingModules) {
        // Get the module listeners to handle this type of request
        const listenerType = this.__getListeners(request.type);

        // Map modules with their priority to this particular request
        const priorities = listenerType.configs.map(config => {
            try {
                // Attempt to apply the filter and return the required data
                return {
                    priority: config.filter(request),
                    config: config
                };
            } catch (e) {
                console.error("Something went wrong while applying filter of config ", config);

                // Return the data with a priority of 0, as the filter errored
                return {
                    priority: 0,
                    config: config
                };
            }
        }).filter(priority => {
            // Make sure it should be included in the first place
            if (priority.priority == 0) return false;

            // Check if the config is a module class config
            if (priority.config.isModuleClassConfig) {
                // Check if the module isn't being loaded already
                const modulePath = priority.config.modulePath;
                if (loadingModules.indexOf(modulePath) != -1) return false;
            } else {
                // Check if we allow non-classes
                if (request.isModuleRequest) return false;
            }

            // If all checks passed
            return true;
        });

        // Sort the results
        priorities.sort((a, b) => b.priority - a.priority);

        // Determine what modules to return
        if (request.use == "all") {
            // If all modules should be returned, simply extract the modules from the priority data and return them
            return this.__getModulesFromConfigs(priorities.map(a => a.config));
        } else if (typeof request.use == "Function") {
            // If a filter function is provided, apply it and then extract the modules from the data and return them
            return this.__getModulesFromConfigs(priorities.filter(request.use).map(a => a.config));
        } else {
            // Otherwise only a single module should be returned, so simply return this module
            return priorities[0] && this.__getModulesFromConfigs([priorities[0].config]);
        }
    }

    /**
     * Goes through the array of configs and maps it to the modules of the configs (requires modules if needed)
     * @param {Registry~Config[]} configs - The configs to get the modules from
     * @returns {Array<Class<Module>>} The modules that got extracted fromt he configs
     * @private
     */
    static __getModulesFromConfigs(configs) {
        return configs.map(config => {
            // Check if it is a module instance or class config
            if (config.isModuleClassConfig) {
                // Require the module from the config if this hasn't happened yet
                if (!(config.module instanceof _module2.default)) this._loadModule(config);

                // Return the module itself, which should now in no situation be a path
                return config.module;
            } else {
                // Return the module's request path
                return config.requestPath;
            }
        });
    }

    /**
     * Establishes a connection with a module with the defined requestPath
     * @param {(string|requestPath)} requestPath - The unique request path of the module you are trying to conenct to
     * @param {string} [subChannelType=undefined] - The sub channel to connect with
     * @param {(Module|string|requestPath)} [senderID=undefined] - The channel ID to send messages back to for communication
     * @returns {ChannelSender} A channel set up for communication with the specified module
     * @async
     * @public
     */
    static async getModuleChannel(requestPath, subChannelType, senderID) {
        // Normalize the path to a string
        if (typeof requestPath != "string") requestPath = requestPath.toString(true);

        // Create a channel sender to this module instance and return it
        const channelSender = await _channelHandler2.default.createSender(requestPath, subChannelType, senderID);

        // Find the requested module instance in this window (if present in this window)
        const module = Registry._getModuleInstance(requestPath);

        // Check if the module exists, and if so extract its element creator
        if (module) {
            const elementCreator = module.core.elementCreator;

            // Attach the elementCreator to the channel
            channelSender.__data.elementCreator = elementCreator;
        }

        // Return the channelSender
        return channelSender;
    }

    // Module loading and listener creation related methods
    /**
     * Loads a module at the specified path relative to the modules folder
     * @param {string} path - The path to the module class
     * @returns {Class<Module>} The module class that was loaded
     * @protected
     */
    static _loadModule(config) {
        // Get the path from the config
        const path = config.modulePath;

        // Only load the module if it hadn't been loaded already
        if (!config.module) {
            // Indicate that we have started requiring this module, to prevent import LM: recursion
            this.__data.requiringModules.push(path);

            // Require module
            const moduleImport = require(this.__getModulesPath(path));

            // Indicate that we are no longer in the process of loading this module
            const index = this.__data.requiringModules.indexOf(path);
            if (index != -1) this.__data.requiringModules.splice(index, 1);

            if (moduleImport) {
                // Get the module from the import
                const module = moduleImport.default;

                // Attach the config to the class
                module.config = config;

                // Attach the module to the config
                config.module = module;
            }
        }

        // Return the module
        return config.module;
    }

    /**
     * Loads a module at the specified path relative to the modules folder, should only be used once the module is already properly loaded, and only from the main process
     * @param {string} modulePath - The modulePath for the module to return
     * @returns {Class<Module>} The module that is located here
     * @protected
     */
    static _getModule(modulePath) {
        // Retrieve the config for this path
        const config = this.__data.moduleConfigs[modulePath];

        // If a config was found, return its module
        if (config) return this._loadModule(config);
    }

    /**
     * Loads a module config at the specified path relative to the modules folder
     * @param {string} path - The path to the config
     * @param {string} [modulePath] - The modulePath for the config to return
     * @returns {Config[]} The config that was loaded
     * @protected
     */
    static _loadConfig(path, modulePath) {
        // Require the config
        let configs = require(this.__getModulesPath(path)).default;

        // Normalize it into an array of configs if needed
        if (!(configs instanceof Array)) configs = [configs];

        // Go through all configs
        configs.forEach(config => {
            // Add listener to the list of listeners for this request type
            const listenerType = this.__getListeners(config.type);
            const index = listenerType.configs.indexOf(config);
            if (index != -1) return; // Don't add it, if it was already added

            listenerType.configs.push(config);

            // Get the module path
            let modulePath;
            if (config.module) {
                // Get the directory of the config path
                let dir = path.split(_path2.default.sep);
                dir.pop();
                dir = dir.join("/");

                // Get the module path relative to this dir
                modulePath = _path2.default.join(dir, config.module);
            } else {
                modulePath = path.replace(/\.?config/, "");
            }

            // Normalize the path's seperators
            modulePath = modulePath.replace(/\\/g, "/");

            // Add a filter to the config if not present
            if (!config.filter) config.filter = () => true;

            // Attach the location of the module to the config
            config.modulePath = modulePath;

            // Store the path of the config
            config.path = path;

            // Indicate that this config is indeed a config (as it will be used as a 'listener')
            config.isModuleClassConfig = true;

            // Store the config under its modulePath
            this.__data.moduleConfigs[modulePath] = config;
        });

        // If a modulePath was defined, return only the config of said path
        if (modulePath) return configs.find(config => config.modulePath == modulePath);

        // Return all the retrieved configs
        return configs;
    }

    /**
     * Loads all the configs of available modules
     * @returns {Promise<Array<Config>>} All the configs that have been loaded
     * @async
     * @protected
     */
    static _loadAllConfigs() {
        const startPath = _path2.default.resolve(__dirname, this.__getModulesPath());
        const readDir = path => {
            return new _promise2.default((resolve, reject) => {
                _fs2.default.readdir(path, (err, files) => {
                    // Store the resulting configs to return
                    const outConfigs = [];

                    // Store async dir reading promises that have to be resolved
                    const promises = [];

                    // Read the files
                    files.forEach(file => {
                        const filePath = _path2.default.join(path, file);
                        // Check if this file is a directory or not
                        if (_fs2.default.lstatSync(filePath).isDirectory()) {
                            // Recurse on the directory, and store the promise in order to wait for it
                            promises.push(readDir(filePath));
                        } else {
                            // Check if the file is a config, and if so, load it
                            if (file.match(/config\.js$/g)) {
                                // Get the file path relative to the modules folder
                                const relativeFilePath = filePath.substring(startPath.length + 1);

                                // Load the config and add it to the output configs
                                outConfigs.push.apply(outConfigs, this._loadConfig(relativeFilePath));
                            }
                        }
                    });

                    // Wait for all the directory async recursions to finish
                    _promise2.default.all(promises).then(configLists => {
                        // Add all returned lists to our main list
                        configLists.forEach(configs => {
                            outConfigs.push.apply(outConfigs, configs);
                        });

                        // Return our main list
                        resolve(outConfigs);
                    });
                });
            });
        };

        // start the recursive directory reading and return its promise
        return readDir(startPath);
    }

    /**
     * Returns the relative path from this class to the modules directory
     * @param {String} [path=""] - The path to append to the modules directory
     * @returns {String} The relative path to the directory
     * @private
     */
    static __getModulesPath(path = "") {
        // Calculate how many dirs to go up to reach the root
        let back = __dirname.substring(process.cwd().length).split(_path2.default.sep);
        back.pop();
        back = back.map(() => "..").join("/");

        // Get the path from the root to the indicated module
        return _path2.default.join(back, "dist", "modules", path);
    }

    /**
     * Creates an object to store what classes can answer a certain request type if it hasn't been created already, and returns it
     * @param {String} type - The request type to return the object of
     * @returns {Registry~Requestlistener} An object that tracks the listeners for a certain request type
     * @private
     */
    static __getListeners(type) {
        // Create listeners type variable if not available
        if (!this.__data.listeners[type]) this.__data.listeners[type] = {
            type: type,
            configs: []
        };

        // Return listener type
        return this.__data.listeners[type];
    }

    /**
     * Registers a module instance to be usable for multiple requests
     * @param {Module} module - The module instance to use
     * @param {Registry~ModuleInstanceConfig} [config] - A config for if you want to listen for a specific request]
     * @returns {Promise<undefined>}
     * @public
     */
    static async registerRequestListener(module, config) {
        // Normalize the config
        if (!config) config = {};
        if (!config.type) config.type = module.getClass().getConfig().type;
        if (!config.filter) config.filter = () => 1.1;
        if (!config.requestPath) config.requestPath = module.getPath().toString(true);

        // Check if the module defined a connect method
        if (!module.core.channelReceiver._hasListener("$connect")) {
            throw Error("The module should contain a $connect method");
        }

        // Send the data to the main process to be stored as a listener
        await _IPC2.default.send("Registry.registerRequestListener", config, 0);
    }
    /**
     * A method to set up the required IPC listener for the registerRequestListener method
     * @returns {undefined}
     * @private
     */
    static __setupRegisterRequestListener() {
        // Make sure to only set this up in the main process
        if (_isMain2.default) {
            // Listen for windows/processes setting up a request listener
            _IPC2.default.on("Registry.registerRequestListener", event => {
                // Retrieve the config
                const config = event.data;

                // Retrieve the config's type
                const type = config.type;

                // Get the listeners for this type
                const listenerType = this.__getListeners(type);

                // Add the config tot hte listeners
                listenerType.configs.push(config);
            });
        }
    }

    /**
     * Returns a module's config' based on its location, if it has been loaded in this window/process
     * @param {Registry~ModulePath} modulePath - The location of the module class to get the config from
     * @returns {Registry~Config} The config that was found
     * @protected
     */
    static _getModuleConfig(modulePath) {
        return this.__data.moduleConfigs[modulePath];
    }

    /**
     * Returns the config file of a certain module
     * @param {Registry~ModulePath} modulePath - The location of the module
     * @returns {Registry~Config} - The config that was found for this modulePath
     * @public
     */
    static getModuleConfig(modulePath) {
        // First check for a local config in this window/process
        const localModuleConfig = this._getModuleConfig(modulePath);

        // If present, return it
        if (localModuleConfig) return localModuleConfig;

        // Otherwise request the config from the main process
        if (!_isMain2.default) {
            const moduleConfig = _IPC2.default.send("Registry.getModuleConfig", modulePath.toString());

            // Check if a config was found
            if (moduleConfig) {
                // Store the config locally to improve future performance
                this.__data.moduleConfigs[moduleConfig.modulePath] = moduleConfig;

                // return the moduleConfig
                return moduleConfig;
            }
        }
    }
    /**
     * A method to set up the required IPC listener for the getModuleConfig method
     * @returns {undefined}
     * @private
     */
    static __setupGetModuleConfig() {
        // Make sure to only set this up in the main process
        if (_isMain2.default) {
            // Listen for windows/processes requesting a module config
            _IPC2.default.on("Registry.getModuleConfig", event => {
                // Extract the modulePath
                const modulePath = event.data;

                // Return the config if found
                return this.getModuleConfig(modulePath);
            });
        }
    }

    // Module registation related methods
    /**
     * Registers the module so the registry knows of its existence
     * @param {Module} moduleInstance - The module to register
     * @param {number} [uniqueID] - A specific uniqueID that the module should get (only used when moving modules)
     * @returns {number} The unique ID that the module instance has now been assigned
     * @async
     * @protected
     */
    static async _registerModuleInstance(moduleInstance, uniqueID) {
        // Extract data from the moduleInstance
        const requestPath = moduleInstance.getPath();
        const isEmbeded = moduleInstance._isEmbeded();

        // Get the a unique ID for the request path
        const ID = (await _IPC2.default.send("Registry.registerModuleInstance", {
            requestPath: requestPath.toString(true),
            isEmbeded: isEmbeded,
            uniqueID: uniqueID
        }, 0))[0];

        // Assign the ID to this request path and return it
        requestPath.getModuleID().ID = ID;

        // Store the instance in this module/process
        this.__data.moduleInstances[moduleInstance.getPath().toString(true)] = moduleInstance;

        // Return the obtained ID
        return ID;
    }
    /**
     * A method to set up the required IPC listener for the registerModuleInstance method
     * @returns {undefined}
     * @private
     */
    static __setupRegisterModuleInstance() {
        // Make sure to only set this up in the main process
        if (_isMain2.default) {
            // List for modules getting registered
            _IPC2.default.on("Registry.registerModuleInstance", event => {
                // Get whether or not the module is embeded
                const embeded = event.data.isEmbeded;

                // Get the request path for the module to register
                const requestPath = new _requestPath2.default(event.data.requestPath);

                // Get the module class of the path to register
                const moduleClass = requestPath.getModuleID().module;

                // Retrieve the path collection that exists for this non unique request path, or create it if non-existent
                let paths = this.__data.requestPaths[requestPath.toString()];
                if (!paths) paths = this.__data.requestPaths[requestPath.toString()] = {};

                // Create a unique ID for the path
                let ID = 0;

                // Check if a ID was provided by the event
                if (event.data.uniqueID) {
                    // If so, just use that ID
                    ID = event.data.uniqueID;
                } else {
                    // Find a unique ID in this collection
                    while (paths[ID]) ID++;
                }

                // Asssign this unique ID to the last module of the request path and store the path
                requestPath.getModuleID().ID = ID;
                paths[ID] = requestPath;

                // Retrieve the request path list that exists for that class, or create it if non-existent
                let pathList = this.__data.moduleInstancePaths[moduleClass];
                if (!pathList) pathList = this.__data.moduleInstancePaths[moduleClass] = [];

                // Add this path to the list together with the window it is stored in
                pathList.push({
                    window: event.sourceID,
                    path: requestPath.toString(true),
                    embeded: embeded,
                    active: false
                });

                // Return the unique request path identifier
                return ID;
            });
        }
    }

    /**
     * Indicates that the registration and initialisation process of a module instance has completed
     * @param {Module} moduleInstance - The module that finished registration
     * @returns {undefined}
     * @async
     * @protected
     */
    static async _registerModuleInstanceCompleted(moduleInstance) {
        // Retiever the requestPath of the moduleInstance
        const requestPath = moduleInstance.getPath();

        // Forward the data to the main process
        return _IPC2.default.send("Registry.registerModuleInstanceCompleted", { requestPath: requestPath.toString(true) }, 0);
    }
    /**
     * A method to set up the required IPC listener for the registerModuleInstanceComplete method
     * @returns {undefined}
     * @private
     */
    static __setupRegisterModuleInstanceCompleted() {
        // Make sure to only set this up in the main process
        if (_isMain2.default) {
            // Listen for modules indicating that their setup has completed
            _IPC2.default.on("Registry.registerModuleInstanceCompleted", event => {
                // Get the request path for the module to activate
                const requestPath = new _requestPath2.default(event.data.requestPath);

                // Get the module class of the path to activate
                const moduleClass = requestPath.getModuleID().module;

                // Retrieve the request path list that exists for that class, or create it if non-existent
                const pathList = this.__data.moduleInstancePaths[moduleClass];

                // Get the item corresponding to this requestPath
                const item = pathList.find(item => item.path == event.data.requestPath);

                // Make sure an item was found
                if (item) {
                    // Indicate that the module is now active
                    item.active = true;

                    // Check if there is a pattern waiting that matches this requestPath
                    this.__data.moduleAwaiters.forEach((waiter, index) => {
                        // Extract the pattern
                        const pattern = waiter.pattern;

                        // Make sure we either accept embeded modules, or this module isn't embeded
                        if (!waiter.acceptEmbeded && item.embeded) return;

                        // Test if the pattern matches the new module instance
                        if (pattern.test(requestPath)) {
                            // If it does, delete the item
                            this.__data.moduleAwaiters.splice(index, 1);

                            // And resolve the promise when the module finished registering
                            waiter.resolve(requestPath.toString(true));
                        }
                    });
                } else {
                    // This should in theory not happen
                    console.error("Something went wrong; ", event.data.requestPath + " couldn't be found");
                    console.log(pathList);
                }
            });
        }
    }

    /**
     * Deregisters the module so the registry knows it is no longer used
     * @param {Module} moduleInstance - The module to deregister
     * @returns {undefined}
     * @async
     * @protected
     */
    static async _deregisterModuleInstance(moduleInstance) {
        // Remove the module path in the main process
        const requestPath = moduleInstance.getPath();
        await _IPC2.default.send("Registry.deregisterModuleInstance", {
            requestPath: requestPath.toString(true)
        }, 0);

        // Remove the instance from this process/window
        delete this.__data.moduleInstances[moduleInstance.getPath().toString(true)];

        // Close this window if there are no more modules in it
        if ((0, _keys2.default)(this.__data.moduleInstances).length == 0) _windowHandler2.default._close();
    }
    /**
     * A method to set up the required IPC listener for the deregisterModuleInstance method
     * @returns {undefined}
     * @private
     */
    static __setupDeregisterModuleInstance() {
        // Make sure to only set this up in the main process
        if (_isMain2.default) {
            // Listen for modules getting deregistered
            _IPC2.default.on("Registry.deregisterModuleInstance", event => {
                // Get the request path for the module to deregister
                const requestPath = new _requestPath2.default(event.data.requestPath);

                // Get the module class of the path to deregister
                const moduleClass = requestPath.getModuleID().module;

                // Get the paths that are stored for this class
                const pathList = this.__data.moduleInstancePaths[moduleClass];
                if (pathList) {
                    // get the unique request path in string form
                    const requestPathString = requestPath.toString(true);

                    // Filter out the object that corresponds with this string
                    this.__data.moduleInstancePaths[moduleClass] = pathList.filter(path => {
                        return path.path != requestPathString;
                    });
                }

                // Get the unique path identifier from the request path
                const ID = requestPath.getModuleID().ID;

                // Retrieve the path collection that exists for this non unique request path, and delete the path with this unique ID
                const paths = this.__data.requestPaths[requestPath.toString()];
                if (paths) delete paths[ID];
            });
        }
    }

    /**
     * Returns the modules that are currently registered
     * @returns {Module[]} The modules are currently registered
     * @protected
     */
    static _getModuleInstances() {
        return this.__data.moduleInstances;
    }

    /**
     * Returns the module with a certain request path if available in the window
     * @param {(string|RequestPath)} requestPath - The unique request path of the module you are looking for
     * @returns {(Module|null)} The modules that got found
     * @protected
     */
    static _getModuleInstance(requestPath) {
        // Normalize the path to a string
        if (typeof requestPath != "string") requestPath = requestPath.toString(true);

        // Go through all instances to find a module that matches this path
        return this.__data.moduleInstances[requestPath];
    }

    // Methods that help with hackability of modules (mainly in other windows)
    // TODO: deprecate this method and replace it with something that uses
    /**
     * Gets channels to all instances of a specific module class
     * @param {(Class<Module>|Module)} module - The module to get the instance of
     * @param {string} [subChannel] - The sub channel to target
     * @param {(Module|RequestPath|string)} source - The channelID to return messages to if needed
     * @param {number} [windowID] - Only looks in this window for instances if provided
     * @returns {Promise<ChannelSender[]>} The channels that were set up for the found modules
     * @async
     * @public
     */
    static async getModuleInstanceChannels(module, subChannel, source, windowID) {
        // Get the module class path from the module
        if (module.getClass) module = module.getClass();
        if (module.getPath) module = module.getPath();

        // Ask for all module instances from main
        const instancePaths = (await _IPC2.default.send("Registry.getModuleInstances", module, 0))[0];

        // Get the actual unique request path from the module
        if (source.getPath) source = source.getPath().toString(true);

        // If a windowID is specified, filter the instancePaths so only ones in the correct window are kept
        if (windowID != undefined) instancePaths = instancePaths.filter(path => {
            return path.windowID == windowID;
        });

        // Create a channel for each of retrieved instance paths
        const channels = instancePaths.map(path => {
            return this.getModuleChannel(path.path, subChannel, source);
        });

        // Wait for all channels to be created and then return them
        return _promise2.default.all(channels);
    }
    /**
     * A method to set up the required IPC listener for the getModuleInstanceChannels method
     * @returns {undefined}
     * @private
     */
    static __setupGetModuleInstanceChannels() {
        // Make sure to only set this up in the main process
        if (_isMain2.default) {
            // Listen for windows/processes requesting instances of a certain module
            _IPC2.default.on("Registry.getModuleInstances", event => {
                // Extract the module class path that we are looking for
                const data = event.data;
                const modulePath = data.modulePath;

                // Return the request path attached to this class
                return this.__data.moduleInstancePaths[modulePath];
            });
        }
    }

    /**
     * Moves a specific module from one location to another
     * @param {RequestPathPattern} requestPathPattern - A pattern for the module to target
     * @param {WindowHandler~moduleLocation} moduleLocation - The location that the module should move to
     * @param {boolean} [includeEmbeded=false] - Whether to also target embeded modules
     * @returns {Promise<RequestPath[]>} - The request paths of the modules that were moved
     * @async
     * @public
     */
    static async moveModuleTo(requestPathPattern, moduleLocation, includeEmbeded) {
        // Send a request to move the module to all windows/processes
        const responses = await _IPC2.default.send("Registry.moveModuleTo", {
            pattern: requestPathPattern.toString(),
            location: moduleLocation,
            includeEmbeded: includeEmbeded
        });

        // Create an array to store all module paths
        const modulePaths = [];

        // Combine all responses to a single array
        responses.forEach(response => {
            // Push all paths to the array
            modulePaths.push.apply(modulePaths, response);
        });

        // Return the module ids
        return modulePaths;
    }
    /**
     * A method to set up the required IPC listener for the moveModuleTo method
     * @returns {undefined}
     * @private
     */
    static __setupMoveModuleTo() {
        // Listen for windows/processes trying to move modules
        _IPC2.default.on("Registry.moveModuleTo", event => {
            // Extract the relevant information
            const pattern = new _requestPathPattern2.default(event.data.pattern);
            const location = event.data.location;
            const includeEmbeded = event.data.includeEmbeded;

            // Go through all module instances to find any matches
            const modulePaths = (0, _keys2.default)(this.__data.moduleInstances).filter(modulePath => {
                // Get the module corresponding to this modulePath
                const module = this.__data.moduleInstances[modulePath];

                // Check whether this module is not embeded
                const embedCheck = includeEmbeded || !module.getRequest() || !module.getRequest().embedGUI;

                // Check if the pattern matches
                return embedCheck && pattern.test(modulePath);
            });

            // Move all matching modules to the specified location and return a promise resolving in the path once the module moved
            return _promise2.default.all(modulePaths.map(modulePath => {
                // Get the module corresponding to this modulePath
                const module = this.__data.moduleInstances[modulePath];

                // Move the module
                const promise = module.moveTo(location);

                // Make the promise resolve into the module's path
                return promise.then(channelSender => {
                    return modulePath;
                });
            }));
        });
    }

    /**
     * Waits for a particular module matching the given requestPath to be registered
     * @param {RequestPathPattern} requestPathPattern - A pattern for the module to target
     * @param {boolean} [acceptEmbeded=false] - Whether to also accept embeded modules
     * @returns {Promise<RequestPath>} - The request path that matched the request
     * @async
     * @public
     */
    static async awaitModuleCreation(requestPathPattern, acceptEmbeded) {
        // Send the await call to the main module and return it's promise
        return _IPC2.default.send("Registry.awaitModuleCreation", {
            pattern: requestPathPattern.toString(),
            acceptEmbeded: acceptEmbeded
        }, 0).then(responses => responses[0]);
    }
    /**
     * A method to set up the required IPC listener for the awaitModuleCreation method
     * @returns {undefined}
     * @private
     */
    static __setupAwaitModuleCreation() {
        // Make sure to only set this up in the main process
        if (_isMain2.default) {
            // Listen for windows/processes listening for the creation of a module
            _IPC2.default.on("Registry.awaitModuleCreation", event => {
                // Exactract the passed data
                const acceptEmbeded = event.data.acceptEmbeded;
                const pattern = new _requestPathPattern2.default(event.data.pattern);

                // Check if a module already exists that matches this pattern
                const moduleClassPaths = (0, _keys2.default)(this.__data.moduleInstancePaths);

                // Create a list to store the matches
                const matches = [];

                // Go through all paths
                moduleClassPaths.forEach(requestPath => {
                    // Get the list of unique module instance paths from the path
                    const uniquePaths = this.__data.moduleInstancePaths[requestPath];

                    // Go through the unique paths
                    uniquePaths.forEach(item => {
                        // Make sure the module is active
                        if (!item.active) return;

                        // Make sure we either accept embeded modules, or this module isn't embeded
                        if (!acceptEmbeded && item.embeded) return;

                        // Get the unique path from the item
                        const uniquePath = item.path;

                        // Test the unique path
                        if (pattern.test(uniquePath)) matches.push(uniquePath);
                    });
                });

                // Check if any matches were found
                if (matches.length > 0) return matches[0];

                // If no matches were found, create a promise to return
                let resolver;
                const promise = new _promise2.default(resolve => {
                    resolver = resolve;
                });

                // Store the awaiter to be resolved later
                this.__data.moduleAwaiters.push({
                    pattern: pattern,
                    acceptEmbeded: acceptEmbeded,
                    resolve: resolver
                });

                // Return the promise
                return promise;
            });
        }
    }

    // Initialisation code for the class
    /**
     * The initial setup method to be called by this file itself, initialises the static fields of the class
     * @return {undefined}
     * @private
     */
    static __setup() {
        // Create an object to store all variables
        this.__data = {};

        // Stores the listeners for handle and module requests, indexed by type
        this.__data.listeners = {};

        // Stores the configs, indexed by modulePath
        this.__data.moduleConfigs = {};

        // Stores instances of modules registered in this window/process by requestPath
        this.__data.moduleInstances = {};

        // Keep track of modules that are currently being required
        this.__data.requiringModules = [];

        // Add fields unique to the main process
        if (_isMain2.default) {
            // Stores unique module instance request paths, indexed by [request path][UID]
            this.__data.requestPaths = {};

            // Stores unique module instance request path lists, indexed by module path
            this.__data.moduleInstancePaths = {};

            // Store listeners for the creation of specific modules
            this.__data.moduleAwaiters = [];
        }

        // Setup all IPC listeners
        this.__setupRequest();
        this.__setupRegisterRequestListener();
        this.__setupRegisterModuleInstance();
        this.__setupRegisterModuleInstanceCompleted();
        this.__setupDeregisterModuleInstance();
        this.__setupGetModuleInstanceChannels();
        this.__setupMoveModuleTo();
        this.__setupAwaitModuleCreation();
        this.__setupGetModuleConfig();
    }
}
exports.default = Registry;
Registry.__setup();
//# sourceMappingURL=registry.js.map