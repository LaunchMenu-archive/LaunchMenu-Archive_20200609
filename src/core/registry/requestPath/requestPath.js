import Module from "../module";
import ModuleSequence from "./moduleSequence";

// a function to get the registry in order to deal with a cyclic import pattern
let Registry;
const getRegistry = function() {
    if (!Registry) Registry = require("../registry").default;
    return Registry;
};

export const moduleSeperator = "->";
export const IDseperator = ":";
export default class RequestPath extends ModuleSequence {
    /**
     * Create a request path that can be used to uniquely identifying module instances
     * @param {(string|RequestPath|Array)} path - The string representation of the request path
     * @constructs RequestPath
     */
    constructor(path) {
        super(path);
    }

    /**
     * Gets the object representation of a single module
     * @param {string} text - The string to turn into its object representation
     * @returns {Object} THe object representation of the module
     * @private
     */
    __getModuleID(text) {
        const data = text.split(IDseperator);
        return this.__createModuleID(data[0], data[1]);
    }

    /**
     * Creates the object that makes up the moduleID
     * @param {Registry~ModulePath} modulePath - The module of which this is the ID
     * @param {(number|string)} ID - The unique ID for the request path so far
     * @returns {Object} the moduleID that was created
     * @private
     */
    __createModuleID(modulePath, ID) {
        return {
            module: modulePath,
            ID: Number(ID || 0),
            getType: function() {
                // Check if we already stored the type, and if so return it
                if (this.type) return this.type;

                // Otherwise gett eh config from the registry
                const config = getRegistry().getModuleConfig(modulePath);

                // Check if we managed to find a config
                if (!config) return;

                // Store the type from the config
                this.type = config.type;

                // Return the type
                return this.type;
            },
        };
    }

    /**
     * Creates a new instance of RequestPath with the last n modules removed
     * @param {number} removeCount - The number of modules to remove
     * @returns {RequestPath} The newly created request path
     * @public
     */
    getSubPath(removeCount) {
        // Create a copy of this request path
        const requestPath = new RequestPath(this.toString(true));

        // Remove n of the last modules in the path
        const modules = requestPath.modules;
        modules.splice(modules.length - removeCount, removeCount);

        // Return the new request path
        return requestPath;
    }

    /**
     * Creates a new instance of RequestPath with a new module added
     * @param {(Module|Class<Module>|Registry~ModulePath)} module - The module to append to the path
     * @param {number} ID - The unique ID of the module that is added
     * @returns {RequestPath} The newly created request path
     * @public
     */
    augmentPath(module, ID) {
        // Make sure the module is a string of the module class path
        if (module.getClass) module = module.getClass();
        if (typeof module != "string") module = module.getPath();

        // Create a copy of the request path
        const requestPath = new RequestPath(this.toString(true));

        // Append a moduleID to thie modules of this request path
        requestPath.modules.push(requestPath.__createModuleID(module, ID));

        // Return the new request path
        return requestPath;
    }
}
