"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

require("source-map-support/register");

var _IPC = require("../communication/IPC");

var _IPC2 = _interopRequireDefault(_IPC);

var _module = require("./module");

var _module2 = _interopRequireDefault(_module);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @typedef {Object} RequestPath~ModuleID
 * @property {string} module - The path to the module class
 * @property {number} ID - The unique ID of the module instance
 */

class RequestPath {
    /**
     * Create a request path that can be used to uniquely identifying module instances
     * @param {string} path - The string representation of the request path
     * @constructs RequestPath
     */
    constructor(path) {
        // Stringify the path if it is of unknown form (requestPath?)
        if (typeof path != "string" && !(path instanceof Array)) path = path.toString(true);

        // Extract the moduleIDs if the path is a string
        if (typeof path == "string") {
            path = path.split("->").map(module => {
                module = module.split(":");
                return {
                    module: module[0],
                    ID: Number(module[1] || 0)
                };
            });
        }

        // Store the moduleID array
        this.modules = path;
    }

    /**
     * Gets the string representation of this path
     * @param {boolean} unique - Whether or not to include the unique ID of each module instance
     * @returns {string} The string representation of this request path
     * @public
     */
    toString(unique) {
        return this.modules.map(module => {
            if (unique) return module.module + ":" + module.ID;
            return module.module + "";
        }).join("->");
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
            ID: Number(ID || 0)
        });

        // Return the new request path
        return requestPath;
    }

    /**
     * Returns the moduleID at a specific index
     * @param {number} [index] - The indedx at which to get the module (returns the last if left out)
     * @returns {RequestPath~ModuleID} The moduleID
     * @public
     */
    getModuleID(index) {
        // Select the last index if none was provided
        if (index == undefined) index = this.modules.length - 1;

        // Return the moduleID
        return this.modules[index];
    }
}
exports.default = RequestPath;
//# sourceMappingURL=requestPath.js.map