import Path from "path";
import FS from "fs";
import isMain from "../isMain";
import RequestPath from "./requestPath/requestPath";
import SettingsHandler from "../communication/data/settings/settingsHandler";
import WindowHandler from "../window/windowHandler";
import Module from "./module";
import ChannelHandler from "../communication/channel/channelHandler";
import IPC from "../communication/IPC";

const defaultModuleData = {
    location: {
        window: 1,
        section: 0,
    },
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
 */

/**
 * @classdesc A class to track all the modules, and handle module requests
 * @class
 * @hideconstructor
 */
export default class Registry {
    /**
     * Request modules to handle the passed data and establish a connection with these modules
     * @param  {Request} request - The information on how to handle the data
     * @return {Promise<ChannelSender[]>} The channel(s) that have been created to answer the request
     * @async
     * @public
     */
    static requestHandle(request) {
        // Normalize the request
        this._normalizeHandleRequest(request);

        // let the private __request method handle the request
        return this.__request([request], "handle");
    }

    /**
     * Normalizes the handle request to a fixed format
     * @param {Request} request - The request to normalize
     * @returns {Request} The normalized request (same object as the paramater)
     * @protected
     */
    static _normalizeHandleRequest(request) {
        // Check if the request contains a valid use, if not set it to 'one'
        const hasInvalidUse =
            !request.use ||
            (typeof request.use == "string" ||
                !request.use.match(/^(one|all)$/g));
        if (hasInvalidUse) request.use = "one";

        // Ensure at least an empty data object is present in the request
        if (!request.data) request.data = {};

        // Make sure that when embeding GUI, the result element is opened in the same window
        if (request.embedGUI) request._destinationWindowID = WindowHandler.ID;

        // Check if the request source type is a module, if so, get its string identifier
        if (request.source instanceof Module)
            request.source = request.source.getPath().toString(true);

        // Return the request
        return request;
    }

    /**
     * Request module classes of a specific type
     * @param {Request} request - The information on what module to get
     * @returns {(Class<Module>|Array<Class<Module>>)} The module(s) that it could find with the specified type
     * @public
     */
    static requestModule(request) {
        // Normalize all the possibly passed requests
        const requests = this._normalizeModuleRequest.apply(this, arguments);

        // Retrieve the request modules
        const requestsModules = this.__request(requests, "module", true);

        // Format the response appropriately
        if (requestsModules.length > 1) {
            const response = {};

            // Map the modules to their request types
            for (let i = 0; i < requestsModules.length; i++) {
                const requestType = requests[i].type;
                response[requestType] = requestsModules[i];
            }

            // Return the modules indexed by request type
            return response;
        } else {
            // Directly return the modules from the only request
            return requestsModules[0];
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
        var requests = Array.from(arguments);

        // Normalize the format of the requests
        var requests = requests.map(request => {
            // If the request is only a string rather than an object, turn it into an object
            if (typeof request == "string") request = {type: request};

            // Check if the request contains a valid use, if not set it to 'one'
            const hasInvalidUse =
                !request.use ||
                (typeof request.use == "string" ||
                    !request.use.match(/^(one|all)$/g));
            if (hasInvalidUse) request.use = "one";

            // Ensure at least an empty data object is present in the request
            if (!request.data) request.data = {};

            // Return the new request variable
            return request;
        });

        // Return the requests
        return requests;
    }

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
        if (!this.moduleClasses[path]) {
            // Indicate that we have started requiring this module
            this.requiringModules.push(path);

            // Require module
            const moduleImport = require(this.__getModulesPath(path));

            // Indicate that we are no longer in the process of loading this module
            const index = this.requiringModules.indexOf(path);
            if (index != -1) this.requiringModules.splice(index, 1);

            if (moduleImport) {
                // Register the module itself
                this.moduleClasses[path] = moduleImport.default;

                // Attach the location to the class
                const module = moduleImport.default;
                module.modulePath = path;

                // Attach the config to the class
                module.config = config;
            }
        }

        // Return the module
        return this.moduleClasses[path];
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
            const listeners = this.__getListeners(config.type);
            const index = listeners.configs.indexOf(config);
            if (index != -1) return; // Don't add it, if it was already added

            listeners.configs.push(config);

            // Get the module path
            let modulePath;
            if (config.module) {
                // Get the directory of the config path
                let dir = path.split(Path.sep);
                dir.pop();
                dir = dir.join("/");

                // Get the module path relative to this dir
                modulePath = Path.join(dir, config.module);
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
        });

        // If a modulePath was defined, return only the config of said path
        if (modulePath)
            return configs.find(config => config.modulePath == modulePath);

        // Return all the retrieved configs
        return configs;
    }

    /**
     * Loads a module at the specified path relative to the modules folder, should only be used once the module is already properly loaded, and only from the main process
     * @param {string} modulePath - The modulePath for the module to return
     * @returns {Class<Module>} The module that is located here
     * @protected
     */
    static _getModule(modulePath) {
        return require(this.__getModulesPath(modulePath)).default;
    }

    /**
     * Loads all the configs of available modules
     * @returns {Promise<Array<Config>>} All the configs that have been loaded
     * @async
     * @protected
     */
    static _loadAllConfigs() {
        const startPath = Path.resolve(__dirname, this.__getModulesPath());
        const readDir = path => {
            return new Promise((resolve, reject) => {
                FS.readdir(path, (err, files) => {
                    // Store the resulting configs to return
                    const outConfigs = [];

                    // Store async dir reading promises that have to be resolved
                    const promises = [];

                    // Read the files
                    files.forEach(file => {
                        const filePath = Path.join(path, file);
                        // Check if this file is a directory or not
                        if (FS.lstatSync(filePath).isDirectory()) {
                            // Recurse on the directory, and store the promise in order to wait for it
                            promises.push(readDir(filePath));
                        } else {
                            // Check if the file is a config, and if so, load it
                            if (file.match(/config\.js$/g)) {
                                // Get the file path relative to the modules folder
                                const relativeFilePath = filePath.substring(
                                    startPath.length + 1
                                );

                                // Load the config and add it to the output configs
                                outConfigs.push.apply(
                                    outConfigs,
                                    this._loadConfig(relativeFilePath)
                                );
                            }
                        }
                    });

                    // Wait for all the directory async recursions to finish
                    Promise.all(promises).then(configLists => {
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
        let back = __dirname.substring(process.cwd().length).split(Path.sep);
        back.pop();
        back = back.map(() => "..").join("/");

        // Get the path from the root to the indicated module
        return Path.join(back, "dist", "modules", path);
    }

    /**
     * Registeres the module so the registry knows of its existence
     * @param {Module} moduleInstance - The module to register
     * @param {number} [uniqueID] - A specific uniqueID that the module should get (only used when moving modules)
     * @returns {number} The unique ID that the module instance has now been assigned
     * @async
     * @protected
     */
    static async _registerModuleInstance(moduleInstance, uniqueID) {
        // Get the a unique ID for the request path
        const requestPath = moduleInstance.getPath();
        const ID = (await IPC.send(
            "Registry.registerModuleInstance",
            {
                requestPath: requestPath.toString(true),
                uniqueID: uniqueID,
            },
            0
        ))[0];

        // Assign the ID to this request path and return it
        requestPath.getModuleID().ID = ID;

        // Store the instance in this module/process
        this.moduleInstances[
            moduleInstance.getPath().toString(true)
        ] = moduleInstance;

        // Return the obtained ID
        return ID;
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
        await IPC.send(
            "Registry.deregisterModuleInstance",
            {
                requestPath: requestPath.toString(true),
            },
            0
        );

        // Remove the instance from this process/window
        delete this.moduleInstances[moduleInstance.getPath().toString(true)];

        // Close this window if there are no more modules in it
        if (Object.keys(this.moduleInstances).length == 0)
            WindowHandler._close();
    }

    /**
     * Returns the modules that are currently registered
     * @returns {Module[]} The modules are currently registered
     * @protected
     */
    static _getModuleInstances() {
        return this.moduleInstances;
    }

    /**
     * Returns the module with a certain request path if available in the window
     * @param {(string|RequestPath)} requestPath - The unique request path of the module you are looking for
     * @returns {(Module|null)} The modules that got found
     * @protected
     */
    static _getModuleInstance(requestPath) {
        // Normalize the path to a string
        if (typeof requestPath != "string")
            requestPath = requestPath.toString(true);

        // Go through all instances to find a module that matches this path
        return this.moduleInstances[requestPath];
    }

    /**
     * Establishes a connection with a module with the defined requestPath
     * @param {(string|requestPath)} requestPath - The unique request path of the module you are trying to conenct to
     * @param {string} [subChannelType=undefined] - The sub channel to connect with
     * @param {string} [senderID=undefined] - The channel ID to send messages back to for communication
     * @returns {ChannelSender} A channel set up for communication with the specified module
     * @async
     * @public
     */
    static async getModuleChannel(requestPath, subChannelType, senderID) {
        // Normalize the path to a string
        if (typeof requestPath != "string")
            requestPath = requestPath.toString(true);

        // Create a channel sender to this module instance and return it
        const channelSender = await ChannelHandler.createSender(
            requestPath,
            subChannelType,
            senderID
        );

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

    /**
     * Creates an object to store what classes can answer a certain request type if it hasn't been created already, and returns it
     * @param {String} type - The request type to return the object of
     * @returns {Registry~Requestlistener} An object that tracks the listeners for a certain request type
     * @private
     */
    static __getListeners(type) {
        // Create listeners type variable if not available
        if (!this.listeners[type])
            this.listeners[type] = {
                type: type,
                configs: [],
            };

        // Return listener type
        return this.listeners[type];
    }

    /**
     * Retrieves the modules that can handle the passed request
     * @param {Registry~Request} request - The request to find module classes for
     * @param {string[]} loadingModules - A list of module paths that are currently being required
     * @returns {(Class<Module>|Array<Class<Module>>)} The module classes that have been chosen to handle the request
     * @private
     */
    static __getModules(request, loadingModules) {
        // Get the module listeners to handle this type of request
        const listenerType = this.__getListeners(request.type);

        // Map modules with their priority to this particular request
        const priorities = listenerType.configs
            .map(config => {
                return {
                    priority: config.filter(request),
                    config: config,
                };
            })
            .filter(
                priority =>
                    priority.priority > 0 &&
                    loadingModules.indexOf(priority.config.modulePath) == -1
            );

        // Sort the results
        priorities.sort((a, b) => b.priority - a.priority);

        // Determine what modules to return
        if (request.use == "all") {
            // If all modules should be returned, simply extract the modules from the priority data and return them
            return this.__getModulesFromConfigs(priorities.map(a => a.config));
        } else if (typeof request.use == "Function") {
            // If a filter function is provided, apply it and then extract the modules from the data and return them
            return this.__getModulesFromConfigs(
                priorities.filter(request.use).map(a => a.config)
            );
        } else {
            // Otherwise only a single module should be returned, so simply return this module
            return (
                priorities[0] &&
                this.__getModulesFromConfigs([priorities[0].config])[0]
            );
        }
    }

    /**
     * Goes through the array of configs and maps it to the modules of the configs (requires modules if needed)
     * @param {Registry~config[]} configs - The configs to get the modules from
     * @returns {Array<Class<Module>>} The modules that got extracted fromt he configs
     * @private
     */
    static __getModulesFromConfigs(configs) {
        return configs.map(config => {
            // Require the module from its path if this hasn't happened yet
            if (!(config.module instanceof Module)) {
                // Load the module from the config
                const module = this._loadModule(config);

                // Store the module
                config.module = module;
            }

            // Return the module itself, which should now in no situation be a path
            return config.module;
        });
    }

    /**
     * Handles one or more requests and serves the responses
     * @param {Registry~Request[]} requests - The requests to make
     * @param {('module'|'handle')} type - The type of request that was made (either to handle data, or to get modules)
     * @param {boolean} synced - Whether or not to request data synchronously (can only be synced if type=='module')
     * @returns {(Promise<Array<Array<Class<Module>>>>|Promise<ChannelSender[]>|Promise<ChannelSender>)} The data that the request results in
     * @private
     */
    static __request(requests, type, synced) {
        if (synced) {
            if (isMain) {
                // Directly resolve the request as we have access to all modules
                return requests.map(request => {
                    return this.__getModules(request, this.requiringModules);
                });
            } else {
                // Send a command to the main window to look for modules to resolve the request
                const modules = IPC.sendSync("Registry.request", {
                    requests: requests,
                    requiringModules: this.requiringModules,
                });

                return modules[0];
            }
        } else {
            // Retrieve the modules to resolve the request
            if (isMain) {
                // Directly resolve the request as we have access to all modules
                const requestsModules = requests.map(request => {
                    return this.__getModules(request, this.requiringModules);
                });
                return this.__finishRequest(type, requests, requestsModules);
            } else {
                // Send a command to the main window to look for modules to resolve the request
                const requestsModules = IPC.sendSync(
                    "Registry.request",
                    {
                        requests: requests,
                        requiringModules: this.requiringModules,
                    },
                    0
                );
                return this.__finishRequest(type, requests, requestsModules);
            }
        }
    }

    /**
     * Finishes the request by serving the correct data based on the module classes that were found
     * @param {('module'|'handle')} type - The type of request that was made (either to handle data, or to get modules)
     * @param {Registry~Request[]} requests - The requests that are being finished (only contains 1 if type=='handle')
     * @param {Array<Array<Class<Module>>>} requestsModules - The modules that are found to match each request
     * @returns {(Promise<Array<Array<Class<Module>>>>|Promise<ChannelSender[]>|Promise<ChannelSender>)} The data that the request results in
     * @async
     * @private
     */
    static async __finishRequest(type, requests, requestsModules) {
        // Resolve request by simply returning the module if it was a module request,
        //      or instanciate a module and return a channel on a handle request
        if (type == "module") {
            return requestsModules;
        } else if (type == "handle") {
            // The handle type only permits 1 request to exist
            let requestModules = requestsModules[0];
            const request = requests[0];

            // In order to batch the await, instead of waiting between each open instance request
            const instantiatePromises = [];

            if (!(requestModules instanceof Array))
                requestModules = [requestModules];

            // Go through modules for 1 request
            requestModules.forEach(module => {
                try {
                    // Create the proper request path
                    let source;
                    if (request.source) {
                        source = new RequestPath(request.source).augmentPath(
                            module
                        );
                    } else {
                        source = new RequestPath(module);
                    }

                    // Attempt to retrieve the correct startup location
                    let moduleLocation;

                    // Check if the request defined a location
                    if (request._destinationWindowID != null) {
                        // If it did, use this
                        moduleLocation = {
                            window: request._destinationWindowID,
                            section: request._destinationSectionID || 0,
                        };
                    } else {
                        // Otherwise load the location from the settings
                        moduleLocation = SettingsHandler._getModuleLocation(
                            source
                        );
                    }

                    // Open the window that the module should appear in
                    instantiatePromises.push(
                        WindowHandler.openModuleInstance(
                            moduleLocation,
                            request,
                            module
                        )
                    );
                } catch (e) {
                    // TODO: properply handle the error if something goes wrong
                    console.error(
                        `Something went wrong while trying to instantiate ${module}: `,
                        e
                    );
                }
            });

            // Wait for all the promises to resolve and get their channels
            const channels = await Promise.all(instantiatePromises);

            // Determine whether to return only a single channel or an array of channels and return it
            if (request.use == "one") {
                return channels[0];
            } else {
                return channels.filter(channel => channel); // Remove failed instanciations
            }
        }
    }

    // TODO: test if this method works at all
    /**
     * Gets channels to all instances of a specific module class
     * @param {(Class<Module>|Module)} module - The module to get the instance of
     * @param {string} [subChannel] - The sub channel to target
     * @param {(Module|string)} source - The channelID to return messages to if needed
     * @param {number} [windowID] - Only looks in this window for instances if provided
     * @returns {Promise<ChannelSender[]>} The channels that were set up for the found modules
     * @async
     * @public
     */
    static async getModuleInstanceChannels(
        module,
        subChannel,
        source,
        windowID
    ) {
        // Get the module class path from the module
        if (module.getClass) module = module.getClass();
        if (module.getPath) module = module.getPath();

        // Ask for all module instances from main
        const instancePaths = (await IPC.send(
            "Registry.getModuleInstances",
            module,
            0
        ))[0];

        // Get the actual unique request path from the module
        if (source.getPath) source = source.getPath().toString(true);

        // If a windowID is specified, filter the instancePaths so only ones in the correct window are kept
        if (windowID != undefined)
            instancePaths = instancePaths.filter(path => {
                return path.windowID == windowID;
            });

        // Create a channel for each of retrieved instance paths
        const channels = instancePaths.map(path => {
            return ChannelHandler.createSender(path.path, subChannel, source);
        });

        // Wait for all channels to be created and then return them
        return Promise.all(channels);
    }

    /**
     * The initial setup method to be called by this file itself, initialises the static fields of the class
     * @return {undefined}
     * @private
     */
    static __setup() {
        // Stores the listeners for handle and module requests, indexed by type
        this.listeners = {};

        // Stores the registered modules themselves, indexed by path
        this.moduleClasses = {};

        // Stores instances of modules registered in this window/process by requestPath
        this.moduleInstances = {};

        // Keep track of modules that are currently being required
        this.requiringModules = [];

        // Set up the IPC listeners in the renderers and main process to allow renderers to request modules
        if (isMain) {
            // Filter out possible modules in this window to handle the handle request
            IPC.on("Registry.request", event => {
                const requests = event.data.requests;
                const requiringModules = event.data.requiringModules;

                // Retrieve the priority mapping for every request
                const requestsModules = requests.map(request => {
                    return this.__getModules(request, requiringModules);
                });

                // Return the mapping of modules and their priorities
                return requestsModules;
            });

            // Stores unique module instance request paths, indexed by [request path][UID]
            this.requestPaths = {};

            // Stores unique module instance request path lists, indexed by module path
            this.moduleInstancePaths = {};

            // Listen for module instances being registered
            IPC.on("Registry.registerModuleInstance", event => {
                // Get the request path for the module to register
                const requestPath = new RequestPath(event.data.requestPath);

                // Get the module class of the path to register
                const moduleClass = requestPath.getModuleID().module;

                // Retrieve the request path list that exists for that class, or create it if non-existent
                let pathList = this.moduleInstancePaths[moduleClass];
                if (!pathList)
                    pathList = this.moduleInstancePaths[moduleClass] = [];

                // Add this path to the list together with the window it is stored in
                pathList.push({
                    window: event.sourceID,
                    path: requestPath.toString(true),
                });

                // Retrieve the path collection that exists for this non unique request path, or create it if non-existent
                let paths = this.requestPaths[requestPath.toString()];
                if (!paths)
                    paths = this.requestPaths[requestPath.toString()] = {};

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

                // Return the unique request path identifier
                return ID;
            });

            // Listen for module instances being deregistered
            IPC.on("Registry.deregisterModuleInstance", event => {
                // Get the request path for the module to deregister
                const requestPath = new RequestPath(event.data.requestPath);

                // Get the module class of the path to deregister
                const moduleClass = requestPath.getModuleID().module;

                // Get the paths that are stored for this class
                const pathList = this.moduleInstancePaths[moduleClass];
                if (pathList) {
                    // get the unique request path in string form
                    const requestPathString = requestPath.toString(true);

                    // Filter out the object that corresponds with this string
                    this.moduleInstancePaths[moduleClass] = pathList.filter(
                        path => {
                            return path.path != requestPathString;
                        }
                    );
                }

                // Get the unique path identifier from the request path
                const ID = requestPath.getModuleID().ID;

                // Retrieve the path collection that exists for this non unique request path, and delete the path with this unique ID
                const paths = this.requestPaths[requestPath.toString()];
                if (paths) delete paths[ID];
            });

            // Listen for windows/processes requesting instances of a certain module
            IPC.on("Registry.getModuleInstances", event => {
                // Extract the module class path that we are looking for
                const data = event.data;
                const modulePath = data.modulePath;

                // Return the request path attached to this class
                return this.moduleInstancePaths[modulePath];
            });
        }
    }
}
Registry.__setup();
