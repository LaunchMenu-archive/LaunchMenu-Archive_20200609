import Path from "path";
import isMain from "../isMain";
import Module from "./module";
import RequestPath from "./requestPath";
import SettingsHandler from "../communication/data/settingsHandler";
import WindowHandler from "../window/windowHandler";
import ChannelHandler from "../communication/channel";
import IPC from "../communication/IPC";

const defaultModuleData = {
    location: {
        window: 1,
        section: 0
    }
};

/**
 * A class to track all the modules, and handle module requests
 */
class Registry{
    /**
     * Request modules to handle the passed data and establish a connection with these modules
     * @param  {{type:String, execute:String|function, data:Object, source:Module}} request The information on how to handle the data
     * @return {Promise} The Promise that shall return the channels created to communicate with the modules
     */
    static requestHandle(request){
        if(!request.use || (typeof(request.use)=="string" || !request.use.match(/^(one|all)$/g)))
            request.use = "one";
        if(request.source instanceof Module)
            request.source = request.source.getPath().toString(true);
        return this.__request([request], "handle");
    }
    static requestModule(request){
        var requests = Array.from(arguments);

        // Normalize the request format
        var requests = requests.map(request=>{
            if(typeof(request)=="string")
                request = {type: request};
            if(!request.use || (typeof(request.use)=="string" || !request.use.match(/^(one|all)$/g)))
                request.use = "one";
            return request;
        });

        // Retrieve the request modules
        const requestsModules = this.__request(requests, "module", true);

        // Format the response appropriately
        if(requestsModules.length>1){
            const response = {};

            // Map the modules to their request types
            for(let i=0; i<requestsModules.length; i++){
                const requestType = requests[i].type;
                response[requestType] = requestsModules[i];
            }

            return response;
        }else{
            // Directly return the modules from the only request
            return requestsModules[0];
        }
    }
    // /**
    //  * Registers a module in the registry such that it can be requested by other modules
    //  * @param  {Class} Class The class of the module you want to register
    //  * @param  {{type:String, filter:function(request)}} classListener An event you would like this module to act on
    //  * @return {Undefined} The method returns no useful information
    //  */
    // static __register(Class, ...classListeners){
    //     // Set the path of the module
    //     Class.modulePath = globalModulePath;
    //
    //     // Register the module itself
    //     this.moduleClasses[Class.modulePath] = {
    //         class: Class,
    //         listeners: classListeners
    //     };
    //
    //     // Register all the listeners
    //     classListeners.forEach(listener=>{
    //         // Keep a connection with the module itself
    //         listener.module = Class;
    //
    //         // Add to the list of listeners for this request type
    //         const listeners = this.__getListeners(listener.type);
    //         listeners.listeners.push(listener);
    //     });
    // }

    // Protected methods
    static _loadModule(path){
        if(!this.moduleClasses[path]){
            // Require module
            const data = require(this.__getModulesPath(path));

            // Verify all necessary data is passed
            if(data){
                const clas = data.default;
                const config = data.config;
                if(config){
                    // Augment data with some variables that can be extracted
                    clas.modulePath = path;
                    config.module = clas;

                    // Register the module itself
                    this.moduleClasses[path] = data;

                    // Add listener to the list of listeners for this request type
                    const listeners = this.__getListeners(config.type);
                    listeners.listeners.push(config);
                }else{
                    return data;
                }
            }
        }
        return this.moduleClasses[path];
    }
    static _loadAllModules(){
        //TODO make a module loader
    }

    static async _registerModuleInstance(moduleInstance){
        // Store the instance in this module/process
        this.moduleInstances.push(moduleInstance);

        // Set the proper ID for the request path
        const requestPath = moduleInstance.getPath();
        const ID = (await IPC.send("Registry.registerModuleInstance", {
            requestPath: requestPath.toString(true)
        }, 0))[0];
        requestPath.getModuleID().ID = ID;
        return ID;
    }
    static async _deregisterModuleInstance(moduleInstance){
        // Remove the module path in the main process
        const requestPath = moduleInstance.getPath();
        await IPC.send("Registry.deregisterModuleInstance", {
            requestPath: requestPath.toString(true)
        }, 0);

        // Remove the instance from this module/process
        const index = this.moduleInstances.indexOf(moduleInstance);
        if(index!==-1) this.moduleInstances.splice(index, 1);
        if(this.moduleInstances.length==0)
            WindowHandler._close();
    }
    static _getModuleInstanceCount(){
        return this.moduleInstances.length;
    }

    // Private methods
    /**
     * Creates the listener variable for a certain type if necessary, and returns it
     * @param  {String} type The request type to return the listener of
     * @return {{type:String, listeners:[{module:Module, filter:function(request)}, ...]}} An object that tracks the listeners for a certain request type
     */
    static __getListeners(type){
        // Create listeners type variable if not available
        if(!this.listeners[type])
            this.listeners[type] = {
                type: type,
                listeners: []
            };

        // Return listener type
        return this.listeners[type];
    }
    /**
     * Returns the relative path from this class to the modules directory
     * @param  {String} [path=""] The path to append to the modules directory
     * @return {String}           The relative path to the directory
     */
    static __getModulesPath(path=""){
        return Path.join("..", "..", "modules", path);
    }

    static __getModules(request){
        // Get the module listeners to handle this type of request
        const listenerType = this.__getListeners(request.type);

        // Map modules with their priority to this particular request
        const priorities = listenerType.listeners.map(listener=>{
            return {
                priority:listener.filter(request),
                module:listener.module
            };
        }).filter(priority=>priority.priority>0);

        // Sort the results
        priorities.sort((a,b)=>b.priority-a.priority);

        // Determine what modules to return
        if(request.use=="all"){
            return priorities.map(a=>a.module);
        }else if(typeof(request.use)=="Function"){
            return priorities.filter(request.use).map(a=>a.module);
        }else{
            return priorities[0] && priorities[0].module;
        }
    }
    static async __resolveRequest(type, requests, requestsModules){
        // Resolve request by simply returning the module if it was a module request,
        //      or instanciate a module and return a channel on a handle request
        if(type=="module"){
            return requestsModules;
        }else if(type=="handle"){ // The handle type only permits 1 request to exist
            let requestModules = requestsModules[0];
            const request = requests[0];

            // In order to batch the await, instead of waiting between each open instance request
            const instantiatePromises = [];

            if(!(requestModules instanceof Array))
                requestModules = [requestModules];

            // Go through modules for 1 request
            requestModules.forEach(module=>{
                try{
                    // Create the proper request path
                    let source;
                    if(request.source){
                        source = new RequestPath(request.source).augmentPath(module);
                    }else{
                        source = new RequestPath(module);
                    }

                    // Attempt to retrieve the correct startup settings
                    let moduleData = SettingsHandler._getModuleFile(source);
                    if(!moduleData)
                        moduleData = SettingsHandler._getModuleFile(new RequestPath(module));
                    if(!moduleData)
                        moduleData = defaultModuleData;

                    // Open the window that the module should appear in
                    instantiatePromises.push(
                        WindowHandler.openModuleInstance(
                            moduleData,
                            request,
                            module.toString()
                        )
                    );
                }catch(e){
                    console.error(`Something went wrong while trying to instantiate ${module}: `, e);
                }
            });


            // Return all the created channels once ready
            const channels = await Promise.all(instantiatePromises);

            if(request.use=="one"){
                return channels[0];
            }else{
                return channels.filter(channel=>channel) // Remove failed instanciations
            }
        }
    }
    static __request(requests, type, synced){
        if(synced){
            if(isMain){
                // Directly resolve the request as we have access to all modules
                return requests.map(request=>{
                    return this.__getModules(request);
                });
            }else{
                // Send a command to the main window to look for modules to resolve the request
                return IPC.sendSync("Registry.request", requests)[0];
            }
        }else{
            // Retrieve the modules to resolve the request
            if(isMain){
                // Directly resolve the request as we have access to all modules
                const requestsModules = requests.map(request=>{
                    return this.__getModules(request);
                });
                return this.__resolveRequest(type, requests, requestsModules);
            }else{
                // Send a command to the main window to look for modules to resolve the request
                return IPC.send("Registry.request", requests, 0).then(responses=>{
                    const requestsModules = responses[0];

                    return this.__resolveRequest(type, requests, requestsModules);
                });
            }
        }
    }

    // TODO: test if this method works at all
    static async getModuleInstanceChannels(module, windowID, subChannel, source){
        if(module.getPath) module = module.getPath();
        const responses = (await IPC.send("Registry.getModuleInstances", module, 0))[0];
        const instancePaths = responses;
        if(source.getPath) source = source.getPath();

        if(windowID!=undefined)
            instancePaths = instancePaths.filter(path=>{
                return path.windowID==windowID;
            });

        instancePaths = instancePaths.map(path=>{
            return ChannelHandler.createSender(path.path, subChannel, source);
        });

        return Promise.all(instancePaths);
    }

    /**
     * The initial setup method to be called by this file itself, initialises the static fields of the class
     * @return {Undefined} The method returns no useful information
     */
    static __setup(){
        // Stores the listeners for handle and module requests, indexed by type
        this.listeners = {};

        // Stores the registered modules themselves, indexed by path
        this.moduleClasses = {};

        // Stores instances of modules registered in this window/process
        this.moduleInstances = [];

        // Set up the IPC listeners in the renderers and main process to allow renderers to request modules
        if(isMain){
            // Filter out possible modules in this window to handle the handle request
            IPC.on("Registry.request", event=>{
                const requests = event.data;

                // Retrieve the priority mapping for every request
                const requestsModules = requests.map(request=>{
                    return this.__getModules(request);
                });

                // Return the mapping of modules and their priorities
                return requestsModules;
            });


            // Stores unique module instance request paths, indexed by [request path][UID]
            this.requestPaths = {};

            // Stores unique module instance request path lists, indexed by module path
            this.moduleInstancePaths = {};

            // Listen for module instances being registered
            IPC.on("Registry.registerModuleInstance", event=>{
                const requestPath = new RequestPath(event.data.requestPath);

                const type = requestPath.getModuleID().module;
                let pathList = this.moduleInstancePaths[type];
                if(!pathList)
                    pathList = this.moduleInstancePaths[type] = [];
                pathList.push({
                    window: event.sourceID,
                    path: requestPath.toString(true)
                });

                let paths = this.requestPaths[requestPath.toString()];
                if(!paths)
                    paths = this.requestPaths[requestPath.toString()] = {};

                let ID = 0;
                while(paths[ID]) ID++;

                requestPath.getModuleID().ID = ID;
                paths[ID] = requestPath;
                return ID;
            });

            // Listen for module instances being deregistered
            IPC.on("Registry.deregisterModuleInstance", event=>{
                const requestPath = new RequestPath(event.data.requestPath);

                const type = requestPath.getModuleID().module;
                const pathList = this.moduleInstancePaths[type];
                if(pathList){
                    const requestPathString = requestPath.toString(true);
                    this.moduleInstancePaths[type] = pathList.filter(path=>{
                        return path.path!=requestPathString;
                    });
                }

                const paths = this.requestPaths[requestPath.toString()];
                const ID = requestPath.getModuleID().ID;
                if(paths)
                    delete paths[ID];
            });

            // Listen for windows/processes requesting instances of a certain module
            IPC.on("Registry.getModuleInstances", event=>{
                const data = event.data;
                const modulePath = event.modulePath;
                return this.moduleInstancePaths[modulePath];
            });
        }
    }
};
Registry.__setup();
export default Registry;
