const pathSymbol = Symbol("path");
const parentSymbol = Symbol("parent");
const cleanSymbol = Symbol("clean");
const serializeSymbol = Symbol("serialize");
const deserializeSymbol = Symbol("deserialize");

export {serializeSymbol, deserializeSymbol};

/**
 * @classdesc
 * An extended version of JSON that is able to also encode the following information:
 *  - Module classes
 *  - Module class instances (if the class has serialize and deserialize methods)
 *  - recursive objects/internal object references
 * @class
 * @hideconstructor
 */
export default class ExtendedJSON {
    /**
     * Encode more complicated data into a serializable object
     * @param {Object} object -The data you want to map
     * @returns {Object} The object that represents your data as as serializable string
     * @public
     */
    static encode(object) {
        /**
         * Goes through an object and returns the object in the encoded format
         * @param {Object} object - The object to convert
         * @param {string} path - The path within the parent object to reach this object so far
         * @returns {Object} The encoded version of the input object
         * @inner
         * @private
         */
        const encodeValue = function(object, path) {
            try {
                if (object instanceof Object) {
                    // Encode an object of data into the extended format
                    // If object is null, return null object in the extended format
                    if (!object)
                        return {
                            type: "object",
                            value: null,
                        };

                    // If object has already been encoded, return a path instead (handles recursive structures)
                    if (object[pathSymbol] != null) {
                        // Get the current path and the reference path in array form
                        const referencePathDirs = object[pathSymbol].split("/");
                        const currentPathDirs = path.split("/");

                        // Remove all the common nodes
                        while (referencePathDirs[0] == currentPathDirs[0]) {
                            referencePathDirs.shift();
                            currentPathDirs.shift();
                        }

                        // Make the path go back to last common node
                        for (let i in currentPathDirs)
                            referencePathDirs.unshift("..");

                        // Return the referencePath as a string
                        return {
                            type: "object",
                            subType: "path",
                            value: referencePathDirs.join("/"),
                        };
                    }

                    // If object is an array or plain js object, recurse on this object
                    if (
                        object.__proto__ == Object.prototype ||
                        object.__proto__ == Array.prototype
                    ) {
                        // Indicate that this object is currently being handled, and prevent recusion
                        object[pathSymbol] = path;

                        // Go through all children and append their values to this value
                        const value = {};
                        for (let key in object)
                            value[key] = encodeValue(
                                object[key],
                                path + "/" + key
                            );

                        // Return either a plain js object type, or an array type
                        const ret = {
                            type: "object",
                            value: value,
                        };
                        if (object instanceof Array) ret.subType = "array";
                        return ret;
                    }

                    // If object is a module and serializable, serialize it
                    const Module = require("../registry/module").default;
                    if (
                        object instanceof Module &&
                        object[serializeSymbol] &&
                        object[deserializeSymbol]
                    ) {
                        const module = object.getClass().modulePath;
                        const data = object[serializeSymbol]();
                        return {
                            type: "object",
                            subType: "moduleInstance:" + module,
                            value: data,
                        };
                    }

                    // If object is a module class, return the path of the class
                    if (typeof object == "function" && object.modulePath)
                        return {
                            type: "object",
                            subType: "module:" + object.modulePath,
                            value: undefined,
                        };

                    // If none of the previous conditions apply, there is nothing left but ignore this value
                    return {
                        type: "undefined",
                        value: undefined,
                    };
                } else {
                    // Encode a primitive value in the extended format
                    const type = typeof object;
                    return {
                        type: type,
                        value: object,
                    };
                }
            } catch (e) {
                console.error(e);
                return undefined;
            }
        };

        // Encode data
        const encodedObject = encodeValue(object, "");

        // Remove data added to the original object during the process
        this.__cleanObject(object, pathSymbol);

        // Return the encoded data
        return encodedObject;
    }
    /**
     * Decode the more complicated data that was encoded into a serializable object
     * @param  {Object} object - The data you want return into its source data
     * @returns {Object} The source data in its format before encoding was applied
     * @public
     */
    static decode(object) {
        /**
         * Goes through an encoded object and returns the object in its original format
         * @param {Object} value - The value to decode
         * @param {Object} parent - The object that the value will be stored in (used for object reference paths)
         * @returns {Object} The resulting value after decoding the input value
         * @inner
         * @private
         */
        const decodeValue = function(value, parent) {
            try {
                if (value.type == "object") {
                    // Decode a value of the type Object
                    // If object is of a special type, decode it
                    if (value.subType) {
                        // If object is of type path (internal reference), retrieve the object
                        if (value.subType == "path") {
                            const path = value.value.split("/");
                            path.shift(); // The first

                            // Retrieve th object by going through the path
                            let obj = parent;
                            let key;
                            while ((key = path.shift()) && obj) {
                                if (key == "..")
                                    // Step up in the object
                                    obj = obj[parentSymbol];
                                // Step down to a child in the object
                                else obj = obj[key];
                            }

                            // Return the object
                            return obj;
                        }

                        let m;
                        // If object is a module class, retrieve said class
                        if ((m = value.subType.match(/module\:(.*)/))) {
                            // Retrieve the Registry at runtime, as the registry also uses this module (cross link)
                            const Registry = require("../registry/registry")
                                .default;

                            // Load the module from its path
                            const module = Registry._loadModule(m[1]);

                            // Load the module from its path and return it
                            return module;
                        }

                        // If object is a module instance, retrieve its class, instatiate it, and load the data
                        if ((m = value.subType.match(/moduleInstance\:(.*)/))) {
                            // Retrieve the Registry  at runtime, as the registry also uses this module (cross link)
                            const Registry = require("../registry/registry")
                                .default;

                            // Load the module from its path
                            const moduleData = Registry._loadModule(m[1]);
                            const module = moduleData.default;

                            // Instanciate the module with the correct arguments, and call the deserializer
                            const data = value.value;
                            const instance = new (module.bind.apply(
                                module,
                                [module].concat(data.constArgs || ["crap"])
                            ))();
                            instance[deserializeSymbol](data);

                            // Return the instance
                            return instance;
                        }
                    }

                    // Decode null objects
                    if (value.value == null) {
                        return null;
                    }

                    // Decode plain objects and arrays
                    const val = value.subType == "array" ? [] : {};
                    // Store the parent temporarely for relative path traversal
                    val[parentSymbol] = parent;
                    for (let key in value.value) // Fill object or array with child values
                        val[key] = decodeValue(value.value[key], val);

                    // Get rid of the temporary parent data
                    delete val[parentSymbol];

                    // Return the result
                    return val;
                } else {
                    // Decode primitive value
                    return value.value;
                }
            } catch (e) {
                // If anything goes wrong, just write value undefined
                console.error(e);
                return undefined;
            }
        };

        // Decode the object and return the result
        return decodeValue(object);
    }

    /**
     * Use ExtendedJSON to turn a string into an object just like JSON would
     * @param {String} string - The string to translate back into an object
     * @returns {Object} The source object that the string was made from
     * @public
     */
    static parse(string) {
        return this.decode(JSON.parse(string));
    }
    /**
     * Use ExtendedJSON to turn an object into a string just like JSON would
     * @param {Object} object - The source object to turn into a string
     * @returns {String} The string that the object was translated into
     * @public
     */
    static stringify(object) {
        return JSON.stringify(this.encode(object));
    }

    /**
     * Get the serializeSymbol to use as a function name in your own class, allowing said class to be serialized by ExtendedJSON
     * @type {Symbol}
     * @public
     */
    static get serializeSymbol() {
        return serializeSymbol;
    }
    /**
     * Get the deserializeSymbol to use as a function name in your own class, allowing said class to be deserialized by ExtendedJSON
     * @type {Symbol}
     * @public
     */
    static get deserializeSymbol() {
        return deserializeSymbol;
    }

    // Private methods
    /**
     * Goes through an object and returns all the pathSymbols from it
     * @param {Object} object 0 The object to clean up
     * @param {(Symbol|string)} prop - The property to remove from the object
     * @returns {undefined} The method returns no useful information
     * @private
     */
    static __cleanObject(object, prop) {
        // Only clean the object if it really is an object, if it isn't already cleaned and if there is still something to clean
        if (
            object instanceof Object &&
            !object[cleanSymbol] &&
            prop in object
        ) {
            // Prevent recursion while cleaning the object
            object[cleanSymbol] = true;

            // Remove the path or parent if it is present
            if (prop in object) delete object[prop];

            // If no path is present, recurse on its children
            for (let key in object) this.__cleanObject(object[key], prop);

            // Remove the cleanSymbol which prevent recursion
            delete object[cleanSymbol];
        }
    }
}
