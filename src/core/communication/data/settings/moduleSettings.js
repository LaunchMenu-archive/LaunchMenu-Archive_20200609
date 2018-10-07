import RequestPath from "../../../registry/requestPath/requestPath";
import RequestPathPattern from "../../../registry/requestPath/requestPathPattern";
import SettingsHandler from "./settingsHandler";
import IPC from "../../IPC";

/**
 * A configuration file for what settings to allow
 * @typedef {Object<string, (ModuleSettings~Setting|ModuleSettings~Config)>} ModuleSettings~Config The settings structure
 */
/**
 * The data to define a setting
 * @typedef {Object} ModuleSettings~Setting
 * @property {*} default The default value of the setting
 * @property {string} type The type of value E.G. 'string'
 * @property {function} [validation] A function to check whether the entered value is valid
 * @property {(boolean|function)} [visible=true] Whether the setting will show up in the GUI
 * @property {(boolean|function)} [disable=false] Whether or not changing the value has been blocked
 */

export default class ModuleSettings {
    /**
     * Create a new ModuleSettings object allowing you to store the data for a specific module instance
     * @constructs ModuleSettings
     * @hideconstructor
     * @param {(string|RequestPath)} requestPath - The requestPath that we want to store data for
     * @param {ModuleSettings~Config} config - The configuration for all the allowed settings
     */
    constructor(requestPath, config) {
        // Normalize the request path
        if (!(requestPath instanceof RequestPath))
            requestPath = new RequestPath(requestPath);

        // Store what request path these settings are for
        this.requestPath = requestPath;

        // Store the settings structure
        this.config = config;

        // Create the data object
        this.data = {};

        // Track all settings files seperately, the array is ordered from low to high priority
        this.settingsInstances = [];

        // The outside event listeners that will be called when data changes
        this.listeners = {};

        // Perform initialisation
        this.__loadDefaultSettings();
        this.__setupIPClisteners();
    }

    // Main methods to be used from outside
    /**
     * Gets a single setting at the specified path
     * @param {string} [path=""] - The path to get the setting from
     * @returns {ModuleSettings~setting} The setting found at the path
     * @public
     */
    getSettingDefinition(path) {
        return this.__getObjectField(this.config, path);
    }

    /**
     * Gets a specific property by specifying the path to said property
     * @param {string} [path=""] - The path to the property
     * @returns {*} The data saved under the specified path
     * @public
     */
    get(path) {
        return this.__getObjectField(this.data, path);
    }

    //TODO: specify the callback once VScode works prooperly with @callback
    /**
     * Adds a listener to the object which will get invoked when data changes
     * @param {string} [path=""] - The path at which to listen for changes
     * @param {function} listener - The function to call once a property has been changed
     * @returns {undefined}
     * @public
     */
    on(path, listener) {
        // If no path is defined, use an empty path
        if (path === undefined) path = "";

        // Get the listeners list for this event path, or create if non-existent
        let listeners = this.listeners[path];
        if (!listeners) listeners = this.listeners[path] = [];

        // Check if the listener is already added, and add it if it isn't
        const index = listeners.indexOf(listener);
        if (index == -1) listeners.push(listener);
    }

    /**
     * Removes a listener from the object which would have gotten invoked when data changes
     * @param {string} [path=""] - The path at which the listener was listening for changes
     * @param {function} listener - The function that was listening to said event path
     * @returns {undefined}
     * @public
     */
    off(path, listener) {
        // If no path is defined, use an empty path
        if (path === undefined) path = "";

        // Get the listeners list for this event path
        const listeners = this.listeners[path];
        if (listeners) {
            // Check at what index this listener is stored, and remove said index
            const index = listeners.indexOf(listener);
            if (index != -1) listeners.splice(index, 1);

            // If no more listeners exist, remove the list
            if (listeners.length == 0) delete this.listeners[path];
        }
    }

    /**
     * Alters a local field and sends out an event to all listeners
     * @param {string} path - The path to the field to change
     * @param {*} value - The new value to store in the field
     * @returns {undefined}
     * @private
     */
    __setField(path, value) {
        // Extract the field that was altered from the path
        const pathParts = path.split(".");
        const field = pathParts.pop();

        // Get the object that contains the field
        const data = this.get(pathParts.join("."));
        if (data) {
            // Get the previous value
            const curValue = data[field];

            // Set the field to the new value
            data[field] = value;

            // Send event to (change or create) and update listeners
            this.__emitEvent(path, {
                value: value,
                previousValue: curValue,
            });
        }
    }

    /**
     * Sends an event to the correct listeners with the correct data
     * @param {string} path - The path to the field for which to emit the event
     * @param {Object} [event] - The event to emit
     * @returns {undefined}
     * @private
     */
    __emitEvent(path, event) {
        // Create the event object if left out
        if (!event) event = {};

        // Add the full path, allData and type to the event
        event.fullPath = path;
        event.allData = this.data;

        // Get all fields of the path
        const pathParts = path.split(".");
        let subPath = ""; // The path that we are currently at

        // Go through all fields
        while (true) {
            // Get the listeners for the event type and check if they exist
            let listeners = this.listeners[
                // Don't include the last dot
                subPath.substr(0, subPath.length - 1)
            ];
            if (listeners) {
                // Set the path of the event relative from the current location
                event.path = pathParts.join(".");

                // Send the event to all listeners
                listeners.forEach(listener => {
                    listener.call(this, Object.assign({}, event));
                });
            }

            // Check if the path has any fields left, if not break the loop
            if (pathParts.length == 0) break;

            // Go to the next field
            subPath += pathParts.shift() + ".";
        }
    }

    /**
     * Saves the data in all of the files
     * @returns {undefined}
     * @async
     * @public
     */
    save() {
        // Go through all of the settings
        const promises = this.settingsInstances.map(settingsData => {
            // Get the settings instance
            const settings = settingsData.settings;

            // Save the settings
            return settings.save();
        });

        // Return a promise waiting for all of the settings to save
        return Promise.all(promises);
    }

    /**
     * Changes the data by providing an object with the field you want to alter,
     * The value 'undefined' can be used to delete a field
     * @param {Object} data - The object with the altered fields
     * @param {(RequestPathPattern|string)} [requestPathPattern] - The pattern to save the data under, by default the data is stored in **->module
     * @returns {Object} The currently saved data after the alteration
     * @async
     * @public
     */
    async change(data, requestPathPattern) {
        // If no requestPathPattern was provided, set it to the default one
        if (!requestPathPattern)
            requestPathPattern = "**->" + this.requestPath.getModuleID().module;

        // Create both the requestPathPattern instance and string version
        let requestPathPatternString;
        if (typeof requestPathPattern != "string") {
            requestPathPatternString = requestPathPattern.toString();
        } else {
            requestPathPatternString = requestPathPattern;
            requestPathPattern = new RequestPathPattern(
                requestPathPatternString
            );
        }

        // Verify that requestPathPattern matches this request path
        if (!requestPathPattern.test(this.requestPath))
            throw Error(
                "Invalid pattern provided for path: " +
                    this.requestPath.toString()
            );

        // Get the settingsData (settings, pattern) from the requestPathPattern
        const settingsData = this.settingsInstances.find(settingsData => {
            return settingsData.pattern.toString() == requestPathPatternString;
        });

        // Get the settings to save the data in
        let settings;

        // Check if any settings data could be found
        if (settingsData) {
            // Get the settings
            settings = settingsData.settings;
        } else {
            // Request the settings to be created (which will update all affected moduleSettings)
            await IPC.send("ModuleSettings.create", {
                pattern: requestPathPatternString,
            });

            // Retrieve the settings which should now be added to the settingsInstances
            settings = this.settingsInstances.find(settingsData => {
                return (
                    settingsData.pattern.toString() == requestPathPatternString
                );
            }).settings;
        }

        // Store the data in the settings
        await settings.change(data);

        // Return the currently stored data
        return this.data;
    }

    // lifespan methods
    /**
     * Sets up the IPC listeners
     * @returns {undefined}
     * @private
     */
    __setupIPClisteners() {
        // Get the module path for the module that these settings are for
        const modulePath = this.requestPath.getModuleID().module;

        // Setup the creation listener
        this.settingsCreationListener = async event => {
            // Retrieve the pattern for which settings were created
            const pattern = event.data.pattern;

            // Check whether the pattern applies to this requestPath
            if (!new RequestPathPattern(pattern).test(this.requestPath)) return;

            // Get an settings instance for this pattern
            const settings = await SettingsHandler._create(
                pattern,
                {},
                pattern,
                true
            );

            // Add the settings to the instances
            this._addSettings(settings);
        };
        IPC.on(
            "ModuleSettings.createdSettings." + modulePath,
            this.settingsCreationListener
        );

        // Setup the disposal listener
        this.settingsDisposalListener = event => {
            // Retrieve the pattern of the settings to remove
            const pattern = event.data.pattern;

            // Remove the settings matching this pattern from the instances
            this.__removeSettings(pattern);
        };
        IPC.on(
            "ModuleSettings.removedSettings." + modulePath,
            this.settingsDisposalListener
        );
    }

    /**
     * Gets rid of all connected data such that the object is safely removed and saves the data in the file
     * @param {boolean} dontSave - Whether to not save the file when disposing
     * @returns {undefined}
     * @public
     */
    dispose(dontSave) {
        // By default save the data on exit
        if (!dontSave) this.save();

        // Get the module path for the module that these settings are for
        const modulePath = this.requestPath.getModuleID().module;

        // Dispose all the listeners
        IPC.off(
            "ModuleSettings.createdSettings." + modulePath,
            this.settingsCreationListener
        );
        IPC.off(
            "ModuleSettings.removedSettings." + modulePath,
            this.settingsDisposalListener
        );

        // Dispose all of the settings
        this.settingsInstances.forEach(settingsData => {
            // Get the settings instance
            const settings = settingsData.settings;

            // Get rid of the settings
            settings.dispose();
        });
    }

    /**
     * Loads all the default values into the current data
     * @returns {undefined}
     * @private
     */
    __loadDefaultSettings() {
        // Obtain all paths to settings
        const settingPaths = this.__getObjectPaths(
            this.config,
            (path, value, isObject) => {
                // Only consider objects
                if (isObject) {
                    // If the object contains 'default' it is a setting
                    if (value.default !== undefined)
                        return {add: true, stop: true};
                }
            }
        );

        // Go through all paths, and copy over their value
        settingPaths.forEach(path => {
            // Get the setting definition
            const definition = this.getSettingDefinition(path);

            // Get teh default value
            const value = definition.default;

            // Split the path in its fields
            const fields = path.split(".");
            const topField = fields.pop();

            // Define some variables to be used in the loop
            let object = this.data;

            // Go through all fields of the path, except the top one
            fields.forEach(field => {
                // Make sure the field exists in the data
                if (!object[field]) object[field] = {};

                // Replace the object by the field value
                object = object[field];
            });

            // Store the value in the object
            object[topField] = value;
        });
    }

    // Helper methods
    /**
     * Gets a property from the specified object at the specified path
     * @param {Object} object - The path to get the value from
     * @param {string} path - The path at which to get the value
     * @returns {*} The value at the specified path of the specified object
     * @private
     */
    __getObjectField(object, path = "") {
        // Get field list from the path
        let pathParts = path.split(".");

        // Define some variables to use in the loop
        let data = object;
        let field;

        // Get the next field as long as there is a next field
        while ((field = pathParts.shift()) && data && field.length > 0)
            data = data[field];

        // Return the retrieved data
        return data;
    }

    /**
     * Walks through the object, and performs a function for each item
     * @param {Object} object - The object to walk through
     * @param {function} callback - The method to call for each field
     * @param {string} [path] - The path of the object currently considered
     * @returns {undefined}
     * @private
     */
    __walkObject(object, callback, path) {
        // Get all the keys of the object
        const keys = Object.keys(object);

        // Go through all the keys
        keys.forEach(key => {
            // Get the value corresponding to the key
            const value = object[key];

            // Get the path corresponding to the key
            const keyPath = path ? path + "." + key : key;

            // Check if the value is a object
            const isObject = value.__proto__ == Object.prototype;

            // Call the callback method, and store the return value
            const resp = callback(keyPath, value, isObject);

            // Iterate through the value if its an object, and the callback didn't prevent it
            if (isObject && !resp) this.__walkObject(value, callback, keyPath);
        });
    }

    /**
     * Gets all of the paths available in the object
     * @param {Object} object - The object to get the paths from
     * @param {function} [filter] - A way of specifying what paths to keep
     * @returns {Array<string>} A list of fields of the object
     * @private
     */
    __getObjectPaths(object, filter) {
        // Create an list to store the paths in
        const paths = [];

        // Walk recursively through the object
        this.__walkObject(object, (path, value, isObject) => {
            // Check whether to pick according to the filter or pick every field
            if (filter) {
                // Check what the filter wants to do
                const resp = filter(path, value, isObject);

                // If the filter specifies to add, do so
                if (resp && resp.add) paths.push(path);

                // If the filter specifies to stop, stop recursion down the branch
                if (resp && resp.stop) return true;

                // Otherwise do nothing
            } else {
                // Only add fields to the paths
                if (!isObject) {
                    paths.push(path);
                }
            }
        });

        // Reeturn the discovered paths
        return paths;
    }

    // Settings instance related methods
    /**
     * Removes a settings file with the assumption it contains no data
     * @param {(RequestPathPattern|string|Settings)} settings - The settings file to remove
     * @returns {undefined}
     * @private
     */
    __removeSettings(settings) {
        // The index to remove
        let index = -1;

        // Find the index from either the settings directly, or the pattern
        if (
            typeof settings == "string" ||
            settings instanceof RequestPathPattern
        ) {
            // Normalize the requestPathPattern
            if (typeof settings != "string") settings = settings.toString();

            // Find the index to remove
            index = this.settingsInstances.findIndex(
                settingsData => settingsData.pattern.toString() == settings
            );
        } else {
            // Find the index to remove
            index = this.settingsInstances.findIndex(
                settingsData => settingsData.settings == settings
            );
        }

        // Remove this index from the array if present
        if (index >= 0) this.settingsInstances.splice(index);
    }

    /**
     * Adds a settings file in the appropriate position in the array, and updates the overall data
     * @param {Settings} settings - The settings file to add
     * @returns {undefined}
     * @protected
     */
    _addSettings(settings) {
        // Get the requestPathPattern from the settings
        const requestPathPattern = new RequestPathPattern(settings.ID);

        // Go through the current settings and find the location to insert the new settings in
        for (let i = 0; i < this.settingsInstances.length; i++) {
            // Get the data to compare with
            const compRequestPathPattern = this.settingsInstances[i].pattern;

            // Check if this pattern isn't already in the list
            if (
                compRequestPathPattern.toString() ==
                requestPathPattern.toString()
            )
                return;

            // Compare the patterns
            const compData = requestPathPattern.comparePriority(
                compRequestPathPattern
            );

            // Insert the pattern before the compPattern, if it has lower priority
            if (compData == -1) {
                this.__insertSettings(settings, requestPathPattern, i);

                // Stop the loop
                return;
            }
        }

        // If the pattern doesn't have lower priority than any other pattern, add it to the end
        this.__insertSettings(settings, requestPathPattern);
    }

    /**
     * Inserts a settings file at the specified index of the array, and updates the overal data
     * @param {Settings} settings - The settings file to add
     * @param {RequestPathPattern} pattern - The pattern that belongs to the settings
     * @param {number} [index] - The index to add the settings at, will be the last index by default
     * @returns {undefined}
     * @private
     */
    __insertSettings(settings, pattern, index) {
        // Set the index to the last index if not defined
        if (index === undefined) index = this.settingsInstances.length;

        // Insert the data in an appropriate format
        this.settingsInstances.splice(index, 0, {
            pattern: pattern,
            settings: settings,
        });

        // Get all fields of the settings instance
        const settingPaths = this.__getObjectPaths(settings.get());

        // Go through all paths and check whether this setting is at the top of the stack
        settingPaths.forEach(path => {
            // Find the settings instance with the highest priority at which the path is present
            const prioritySettings = this.__getPrioritySettings(path);

            // Check if it is these settings that have the highest priority
            if (prioritySettings == settings) {
                // Get the value of the settings
                const value = settings.get(path);

                // Store the data
                this.__setField(path, value);
            }
        });

        // Add listeners that check whether the overall data should be updated
        settings.on("update", event => {
            // Get relevant information from the event
            const type = event.type;
            const path = event.path;
            const value = event.value;

            // Make sure the path is a setting (not a category)
            if (this.getSettingDefinition(path).default === undefined) return;

            // Differentiate between setting deletion or change
            if (type == "delete") {
                // Get the settings that should now define this field
                const settings = this.__getPrioritySettings(path);

                // Find the new value
                let fieldValue;

                // Check if the settings are defined
                if (settings) {
                    // Get the current value according to those settings
                    fieldValue = settings.get(path);
                } else {
                    // Get teh current value from the default values
                    fieldValue = this.getSettingDefinition(path).default;
                }

                // Check if that's not equal to the current overall value already
                if (fieldValue == this.get(path)) return;

                // Update the value
                this.__setField(path, fieldValue);
            } else {
                // Check what settings should define this field
                const pathSettings = this.__getPrioritySettings(path);

                // Check if that corresponds with these settings
                if (settings != pathSettings) return;

                // Check if that's not equal to the current overall value already
                if (value == this.get(path)) return;

                // Update the value
                this.__setField(path, value);
            }
        });
    }

    /**
     * Returns the settings with the highest priority in which the specified settingPath is present
     * @param {string} settingPath - The path to find in the settings
     * @returns {Settings} The settings instance with the highest priority
     * @private
     */
    __getPrioritySettings(settingPath) {
        // Go through the settings until this setting can be found
        for (let i = this.settingsInstances.length - 1; i >= 0; i--) {
            const settings = this.settingsInstances[i].settings;

            // Check if the settings contains this setting
            const value = settings.get(settingPath);

            // If a value was found, and is valid, return the settings
            if (value !== undefined && this.__validateValue(value, settingPath))
                return settings;
        }
    }

    /**
     * Checks whether or not the value conforms to the setting definition at the given path
     * @param {*} value - The value to check
     * @param {string} path - The path of the setting to check with
     * @returns {boolean} Whether or not the value is allowed
     * @private
     */
    __validateValue(value, path) {
        // Get the setting definition
        const definition = this.getSettingDefinition(path);

        // Check if there is even supposed to be a setting at this path
        if (!definition) return false;

        // Check if the value is of the specified type
        if (typeof value != definition.type) return false;

        // If a validation method was provided, apply it
        if (definition.validation && !definition.validation(value, path))
            return false;

        //TODO: add more validations

        // If no tests failed:
        return true;
    }
}
