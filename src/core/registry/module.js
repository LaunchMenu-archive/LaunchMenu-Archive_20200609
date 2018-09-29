import ChannelHandler from "../communication/channel/channelHandler";
import Registry from "./registry";
import RequestPath from "./requestPath";
import BooleanProcess from "../utils/booleanProcess";

export default class Module {
    /**
     * Create a module instance which is the core building block for LM
     * @param {Request} request - The request that caused this module to be instantiated
     * @param {boolean} canBeDirectlyInstantiated - Whether or not this module should be instantiatable without a request
     * @constructs Module
     * @public
     */
    constructor(request, canBeDirectlyInstantiated) {
        // Create the promise that gets resolved on registration
        let registerPromiseResolve = null;
        const registerPromise = new Promise((resolve, reject) => {
            registerPromiseResolve = resolve;
        });

        // Create the core data of the module
        this.core = {
            registration: {
                registered: new BooleanProcess(0),
                registerPromise: registerPromise,
                registerPromiseResolve: registerPromiseResolve,
            },
            initPromise: registerPromise, // Other methods may build upon this promise
            handlers: {},
            source: {},
        };

        // Check if the module was instanciated with a request
        if (request) {
            // Store the request
            this.core.source = {
                request: request,
            };

            // Register the module in the registry
            this.__register();
        } else if (!canBeDirectlyInstantiated) {
            // Throw an error if this module was instanciated without a request but isn't allowed to
            throw Error(
                "This module can only be instantiated from a handle request"
            );
        } else {
            this.core.initPromise = Promise.resolve();
        }
    }

    /**
     * Registers the module if it wasn't registered already
     * @returns {Module} A reference to itself
     * @async
     * @private
     */
    async __register() {
        // Chech if the module is currently unregistered
        if (this.core.registration.registered.false()) {
            // Indicate that we are now in the process of registering the moduke
            this.core.registration.registered.turningTrue(true);

            // Get the module source
            const source = this.core.source;

            // Check if the source contains a request that instanciated it
            if (source.request) {
                // Store the requestPath to this module by agumenting the request's requestPath by this module
                const requestPath = new RequestPath(source.request.source);
                source.requestPath = requestPath.augmentPath(
                    this.getClass().modulePath,
                    0
                );

                // Register this module in the registry (which will automatically assign a unique module ID)
                await Registry._registerModuleInstance(this);

                const promises = [];
                // Create a channel receiver that can be used to receive messages from other modules
                promises.push(
                    ChannelHandler.createReceiver(
                        source.requestPath.toString(true),
                        this.__createChannelMethods()
                    )
                );

                // Creat a channel sender to the module that requested this module
                promises.push(
                    ChannelHandler.createSender(
                        source.request.source,
                        source.request.type,
                        source.requestPath.toString(true)
                    )
                );

                // Wait for both to finish
                await Promise.all(promises).then(results => {
                    this.core.channelReceiver = results[0];
                    source.channel = results[1];
                });

                // Indicate that registering has finished and resolve the promise
                this.core.registration.registered.true(true);
                this.core.registration.registerPromiseResolve(this);
            } else {
                // If the module was not instantiated by a request, the request path is simply this module path
                source.requestPath = new RequestPath(
                    this.getClass().modulePath,
                    0
                );

                // Register this module in the registry (which will automatically assign a unique module ID)
                await Registry._registerModuleInstance(this);

                // Create a channel receiver that can be used to receive message from other modules
                this.core.channelReceiver = await ChannelHandler.createReceiver(
                    source.requestPath.toString(true),
                    this.__createChannelMethods()
                );

                // Indicate that registering has finished and resolve th epromise
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
        // Add the method to the chain and return the chain
        return (this.core.initPromise = this.core.initPromise.then(method));
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
     * Returns the path to this module instance
     * @returns {string} The path to this module instance
     * @public
     */
    toString() {
        // Get the request path and get its unique string representation
        return this.getPath().toString(true);
    }

    /**
     * Returns the class of this module instance
     * @returns {Class<Module>} The class of this module instance
     * @public
     */
    getClass() {
        // Get the class out of this object instance
        return this.__proto__.constructor;
    }

    /**
     * Returns the requestPath that created this module instance
     * @returns {RequestPath} The request path
     * @public
     */
    getPath() {
        // Get the channel sender that has been created in the __register method
        return this.core.source.requestPath;
    }

    /**
     * Returns the path to this module class
     * @returns {string} The path to this module class
     * @public
     */
    static getPath() {
        // Get the modulePath that has been assigned by the registry when loading the module class
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

    /**
     * Returns the channelSender to communicate with the module that instanciated this module
     * @returns {ChannelSender} The channelSender to communicate with the module
     * @public
     */
    getSource() {
        return this.core.source.channel;
    }

    // Channel-related methods
    /**
     * Gets all the methods of this module that are available for channels
     * @param {Regex} regexFilter - The filter to apply to determine whether or not the method should be returned
     * @returns {Object} All methods indexed by name
     * @private
     */
    __getMethods(regexFilter) {
        // Set up an object to store the output methods
        const output = {};

        // Go through the inheritence chain
        let nextProto = this.__proto__;
        while (nextProto && nextProto != Module.prototype) {
            // Get the prototype of which to get the methods
            const proto = nextProto;
            nextProto = proto.__proto__;

            // Go through all methods in the class
            Object.getOwnPropertyNames(proto).forEach(varName => {
                // Get the variable
                const variable = this.__proto__[varName];

                // Check if the variable is a method that should be available for the chanenl
                const isChannelMethod =
                    variable instanceof Function &&
                    regexFilter.test(varName) &&
                    !output[varName];

                if (isChannelMethod) {
                    // If the method should be avaiable, remove the prefix and store it in the output
                    output[varName] = this.__proto__[varName];
                }
            });
        }

        // Return the output
        return output;
    }

    /**
     * Creates all methods to interact with this module over a channel
     * @returns {Object} All methods indexed by name
     * @private
     */
    __createChannelMethods() {
        // Set up an object to store the output methods
        const output = {};

        // Get the methpds that are available for the channel
        const methods = this.__getMethods(/^\$/);

        // Go through all the methods to correctly map the channel data
        Object.keys(methods).forEach(methodName => {
            // Get the method from its name
            const method = methods[methodName];

            // Apply the event followed by the channel data as arguments for the method
            output[methodName] = event => {
                return method.apply(this, [event].concat(event.data));
            };
        });

        // Set up a close method for the channel
        output.close = event => {
            return this.dispose();
        };

        // Set up a disconnectDescendant method for the channel that will detach a descendant from itself
        output.disconnectDescendant = event => {
            return this.__disconnectDescendant.apply(this, event.data);
        };

        // Return the output
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
        // Get the handler for this request type if available
        const handler = this.core.handlers[type];
        if (handler) {
            // Extract the channels from this handler
            const channels = handler.channels;

            // Remove the channel that matches the requestPath
            handler.channels = channels.filter(channel => {
                return channel._getID() != requestPath;
            });

            // Remove the handler if all channels have been closed
            if (handler.channels.length == 0) delete this.core.handlers[type];
        }
    }

    /**
     * Disposes this module entirely, also getting rid of its connections to other modules
     * @returns {Promise} The promise that resolves once disposal has completed
     * @async
     * @public
     */
    async dispose() {
        // Check if the module is not still registering
        if (this.core.registration.registered.turningTrue())
            throw Error("Module is still registering");

        // Check if the module is registered in the first place
        if (this.core.registration.registered.true()) {
            // Indicate that the module is now in the process of deregestering
            this.core.registration.registered.turningFalse(true);

            // Object to track all the promises of modules being disposed
            const channelDisposalPromises = [];

            // Go through all the handlers to dispose them
            Object.keys(this.core.handlers).forEach(type => {
                // Get the handler and its channels
                const handler = this.core.handlers[type];
                const channels = handler.channels;

                // Close all the handle modules and track their promises
                channelDisposalPromises.push.apply(
                    channelDisposalPromises,
                    channels.map(channel => {
                        return channel.close();
                    })
                );
            });

            // Wait for all modules to finish disposing
            await Promise.all(channelDisposalPromises);

            // If this module has a source channel, indicate that this module has been closed by disconnecting it
            if (this.core.source.channel) {
                await this.core.source.channel.disconnectDescendant(
                    this.getPath().toString(true),
                    this.core.source.request.type
                );
            }

            // Dispose the channel receiver properly
            await this.core.channelReceiver.close();

            // Tell the registry that this module no longer exists
            await Registry._deregisterModuleInstance(this);

            // Indicate that deregistering has finished
            this.core.registration.registered.false(true);
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
        // Check if the module is not currently deregistering, if it is, throw an error
        if (this.core.registration.registered.turningFalse())
            throw Error("Module is currently deregistering");

        // Check if the module is currently not registered
        if (this.core.registration.registered.false()) {
            // Wait for the module to finish registering
            await this.__register();

            // Check if the module is currently registering
        } else if (this.core.registration.registered.turningTrue()) {
            // Wait for th emodule to finish regestering
            await this.__onRegister();
        }

        // If no extra methods have been assigned to the request, assign it an empty object
        if (!request.methods) request.methods = {};

        // Set this module to be the source of the request
        request.source = this;

        // If this module has already made a request for this type, return those channels instead
        if (this.core.handlers[request.type])
            return this.core.handler[request.type].channels;

        // Create a subchannel in this channel receiver to handle received data from the requested handlers
        this.core.channelReceiver.createSubChannel(
            request.type,
            request.methods
        );

        // Send the request to the registry and receive its created channels
        const channels = await Registry.requestHandle(request);

        // Store the created handlers locally
        this.core.handlers[request.type] = {
            request: request,
            channels: channels instanceof Array ? channels : [channels], // Make sure it is an array of channels
        };

        // Return the received channels
        return channels;
    }
}
