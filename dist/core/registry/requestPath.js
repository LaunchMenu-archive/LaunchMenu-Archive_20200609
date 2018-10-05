"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.IDseperator = exports.moduleSeperator = undefined;

require("source-map-support/register");

var _module = require("./module");

var _module2 = _interopRequireDefault(_module);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * An identifier for a module, where ID make sure that the request path with all IDs left out except for this one, would be unique.
 * @typedef {Object} RequestPath~ModuleID
 * @property {string} module - The path to the module class
 * @property {number} ID - The unique ID of the module instance
 */

const moduleSeperator = exports.moduleSeperator = "->";
const IDseperator = exports.IDseperator = ":";
class RequestPath {
    /**
     * Create a request path that can be used to uniquely identifying module instances
     * @param {(string|RequestPath|Array)} path - The string representation of the request path
     * @constructs RequestPath
     */
    constructor(path) {
        // Stringify the path if it is of unknown form (requestPath?)
        if (typeof path != "string" && !(path instanceof Array)) path = path.toString(true);

        // Extract the moduleIDs if the path is a string
        if (typeof path == "string") {
            path = path.split(moduleSeperator).map(module => {
                module = module.split(IDseperator);
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
            if (unique) return module.module + IDseperator + module.ID;
            return module.module + "";
        }).join(moduleSeperator);
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

    /**
     * Returns a module path at the specified index, with negative indices starting at the end
     * @param {(string|requestPath)} requestPath - The path to get the module path from
     * @param {number} [index=-1] - The index to get the module path from
     * @returns {string} The module path
     * @public
     */
    static getModulePath(requestPath, index = -1) {
        // Normalize the request path to a string
        if (typeof requestPath != "string") requestPath = requestPath.toString();

        // Split the request path into pieces
        const parts = requestPath.split(moduleSeperator);

        // Get the specified index
        const part = parts[index % parts.length];

        // Extract just the module path from the part
        return part.split(IDseperator)[0];
    }
}
exports.default = RequestPath;
//# sourceMappingURL=requestPath.js.map