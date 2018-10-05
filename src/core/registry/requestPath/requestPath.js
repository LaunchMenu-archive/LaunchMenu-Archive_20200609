import Module from "../module";
import ModuleSequence from "./moduleSequence";

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
     * @param {(Module|string)} module - The module to append to the path
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
        requestPath.modules.push({
            module: module,
            ID: Number(ID || 0),
        });

        // Return the new request path
        return requestPath;
    }
}
