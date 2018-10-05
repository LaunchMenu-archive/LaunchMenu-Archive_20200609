export const moduleSeperator = "->";
export const IDseperator = ":";
/**
 * An identifier for a module, where ID make sure that the request path with all IDs left out except for this one, would be unique.
 * @typedef {Object} ModuleSequence~ModuleID
 * @property {string} module - The path to the module class
 * @property {number} ID - The unique ID of the module instance
 */
export default class ModuleSequence {
    /**
     * Create a request path that can be used to uniquely identifying module instances
     * @param {(string|ModuleSequence|Array)} path - The string representation of the request path
     * @constructs ModuleSequence
     */
    constructor(path) {
        // Stringify the path if it is of unknown form (requestPath?)
        if (typeof path != "string" && !(path instanceof Array))
            path = path.toString(true);

        // Extract the moduleIDs if the path is a string
        if (typeof path == "string") {
            path = path
                .split(moduleSeperator)
                .map(module => this.__getModuleID(module));
        }

        // Store the moduleID array
        this.modules = path;
    }

    /**
     * Gets the object representation of a single module
     * @param {string} text - The string to turn into its object representation
     * @returns {Object} THe object representation of the module
     * @private
     */
    __getModuleID(text) {
        const data = text.split(IDseperator);
        return {
            module: data[0],
            ID: Number(data[1] || 0),
        };
    }

    /**
     * Gets the string representation of this path
     * @param {boolean} unique - Whether or not to include the unique ID of each module instance
     * @returns {string} The string representation of this request path
     * @public
     */
    toString(unique) {
        return this.modules
            .map(module => this.__getModuleString(module, unique))
            .join(moduleSeperator);
    }

    /**
     * gets the string representation of a specific module ID
     * @param {ModuleSequence~ModuleID} moduleID - The module to get the string representation for
     * @returns {string} The string representing this module
     * @private
     */
    __getModuleString(moduleID, unique) {
        if (unique) return moduleID.module + IDseperator + moduleID.ID;
        return moduleID.module + "";
    }

    /**
     * Returns the moduleID at a specific index
     * @param {number} [index=-1] - The indedx at which to get the module (returns the last if left out)
     * @returns {ModuleSequence~ModuleID} The moduleID
     * @public
     */
    getModuleID(index = -1) {
        // Return the moduleID
        return this.modules[
            (this.modules.length + index) % this.modules.length
        ];
    }
}
