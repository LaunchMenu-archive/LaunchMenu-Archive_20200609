"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _extends2 = require("babel-runtime/helpers/extends");

var _extends3 = _interopRequireDefault(_extends2);

var _keys = require("babel-runtime/core-js/object/keys");

var _keys2 = _interopRequireDefault(_keys);

var _stringify = require("babel-runtime/core-js/json/stringify");

var _stringify2 = _interopRequireDefault(_stringify);

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

require("source-map-support/register");

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _globalDataHandler = require("../globalData/globalDataHandler");

var _globalDataHandler2 = _interopRequireDefault(_globalDataHandler);

var _settings = require("./settings");

var _settings2 = _interopRequireDefault(_settings);

var _moduleSettings = require("./moduleSettings");

var _moduleSettings2 = _interopRequireDefault(_moduleSettings);

var _registry = require("../../../registry/registry");

var _registry2 = _interopRequireDefault(_registry);

var _requestPath = require("../../../registry/requestPath/requestPath");

var _requestPath2 = _interopRequireDefault(_requestPath);

var _requestPathPattern = require("../../../registry/requestPath/requestPathPattern");

var _requestPathPattern2 = _interopRequireDefault(_requestPathPattern);

var _isMain = require("../../../isMain");

var _isMain2 = _interopRequireDefault(_isMain);

var _IPC = require("../../IPC");

var _IPC2 = _interopRequireDefault(_IPC);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const dataDir = _path2.default.resolve(__dirname, "../../../../../data/settings");
const prefix = "Settings:";

/**
 * @classdesc A static class that allows you to create settings which will be synchronised between modules and can be saved in files. Takes care of both the settings and moduleSettings data handling needs.
 * @class
 * @hideconstructor
 */
class SettingsHandler {
    /**
     * Creates a new moduleSettings instance
     * @param {RequestPath} requestPath - The request path to create moduleSettings for
     * @param {ModuleSettings~Config} config - The settings config to use
     * @returns {ModuleSettings} The settings instance
     * @async
     * @public
     */
    static async createModuleSettings(requestPath, config) {
        // Augment the config with default settings that all modules should have
        config.location = {
            window: {
                default: 1,
                type: "number"
            },
            section: {
                default: 0,
                type: "number",
                validation: value => value >= 0
            }
        };

        // Create an instance of the moduleSettings
        const moduleSettings = new _moduleSettings2.default(requestPath, config);

        // Check what settings files exist for this requestPath
        const patterns = (await _IPC2.default.send("ModuleSettings.retrieve", { requestPath: requestPath.toString() }, 0))[0];

        // Create settings instances for each of these patterns
        const promises = patterns.map(pattern => {
            // Create the settings instance
            return this._create(pattern, {}, pattern, true).then(settings => {
                // Add the settings to moduleSettings
                moduleSettings._addSettings(settings);
            });
        });

        // Wait for all settings to be created and added
        await _promise2.default.all(promises);

        // Return the module settings
        return moduleSettings;
    }

    /**
     * Creates a new settings instance
     * @param {string} ID - The identifier of the settings (preferably prefixed with some class ID)
     * @param {Object} defaultData - The data that the settings should contain if no file exists yet
     * @returns {Settings} The settings instance
     * @async
     * @public
     */
    static create(module, defaultData) {
        // Use the module class path as the filename by default
        const path = module.getPath().toString();

        // Use the path with a settings prefix as the data ID
        const ID = prefix + path;

        // Create the settings
        return this._create(ID, defaultData, path);
    }

    /**
     * Creates a new settings instance
     * @param {string} ID - The identifier of the settings (preferably prefixed with some class ID)
     * @param {Object} defaultData - The data that the settings should contain if no file exists yet
     * @param {string} fileName - The name of the file to store the settings in
     * @param {boolean} isModuleFile - Whether or not the settings are for a module
     * @returns {Settings} The settings instance
     * @async
     * @protected
     */
    static async _create(ID, defaultData, fileName, isModuleFile) {
        if (!fileName) fileName = ID;
        // Get the currently stored data for this ID from main, will be set to default if absent
        const data = (await _IPC2.default.send("Settings.retrieve", {
            ID: ID,
            fileName: fileName,
            defaultData: defaultData,
            isModuleFile: isModuleFile
        }, 0))[0];

        // Createa a new settings instance
        const settings = new _settings2.default(ID, fileName, isModuleFile);

        // Add the data retrieved from main to this instance
        settings._setData(data);

        // Return the instance
        return settings;
    }

    //UUID related methods
    /**
     * Generates a UUID
     * @returns {string} The UUID
     * @private
     */
    static __generateUUID() {
        const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
        const format = "xxxx-xxxx-xxxx-xxxx-xxxx";
        return format.replace(/x/g, () => alphabet[Math.floor(alphabet.length * Math.random())]);
    }

    /**
     * Gets the UUID, used for the filename, that belongs to a specific request path pattern (only accessible in main)
     * @param {(RequestPathPattern|string)} requestPathPattern - The request path to get the UUID for
     * @returns {string} The file name of the file with this pattern
     * @private
     */
    static __getPathPatternUUID(requestPathPattern) {
        if (_isMain2.default) {
            // Normalize the requestPathPattern
            if (typeof requestPathPattern == "string") requestPathPattern = new _requestPathPattern2.default(requestPathPattern);

            // Get the module that this path would lead to
            const modulePath = requestPathPattern.getModuleID().text;

            // Check if there already are UUIDs for this end point
            const patterns = this.pathPatternUUIDs[modulePath];
            if (!patterns) return;

            // Check if there is a UUID for this specific pattern
            const UUID = patterns[requestPathPattern.toString()];
            if (!UUID) return;

            // Return the UUID
            return UUID;
        }
    }

    /**
     * Sets the UUID, used for the filename, that belongs to the given request path pattern (only accessible in main)
     * @param {RequestPath~pattern} requestPathPattern - The request path to set the UUID for
     * @param {string} UUID - The UUID to set
     * @returns {undefined}
     * @private
     */
    static __setPathPatternUUID(requestPathPattern, UUID) {
        if (_isMain2.default) {
            // Normalize the requestPathPattern
            if (typeof requestPathPattern == "string") requestPathPattern = new _requestPathPattern2.default(requestPathPattern);

            // Get the module that this path would lead to
            const modulePath = requestPathPattern.getModuleID().text;

            // Get the map of UUIDs for this endpoint
            let patterns = this.pathPatternUUIDs[modulePath];

            // If no such map exists yet, create it
            if (!patterns) patterns = this.pathPatternUUIDs[modulePath] = {};

            // Add this request path pattern to the map
            patterns[requestPathPattern] = UUID;

            // If the new UUID isn't defined, delete the field completely
            if (!UUID) delete patterns[requestPathPattern];
        }
    }

    /**
     * Gets the UUID data out of the text file (only accessible in main)
     * @returns {undefined}
     * @private
     */
    static __loadPathPatternUUIDS() {
        if (_isMain2.default) this.pathPatternUUIDs = this.__getFile(this.__getPath("moduleSettingPaths")) || {};
    }

    /**
     * Saves the UUID data to the text file (only accessible in main)
     * @returns {undefined}
     * @private
     */
    static __storePathPatternUUIDS() {
        if (_isMain2.default) this.__setFile(this.__getPath("moduleSettingPaths"), this.pathPatternUUIDs);
    }

    // Some file manipulation methods
    /**
     * Gets the contents of the file at the speciifed path
     * @param {string} path - The path to get the data from
     * @returns {Object} The data that was retrieved from the file
     * @private
     */
    static __getFile(path) {
        // Check if a file exists at this path
        if (_fs2.default.existsSync(path)) {
            try {
                // If it exists, read the contents and parse it to json
                const data = JSON.parse(_fs2.default.readFileSync(path));

                // Return the data
                return data;
            } catch (e) {
                // If anything goes wrong, just log an error. TODO: Properly handle these errors
                console.error(`Something went wrong while retrieving ${path}:`, e);
            }
        }
    }

    /**
     * Writes contents in the file at the speciifed path
     * @param {string} path - The path to write the data to
     * @param {Object} data - The data to write to the file
     * @returns {undefined}
     * @private
     */
    static __setFile(path, data) {
        // Turn the data to json and write at the path
        return _fs2.default.writeFileSync(path, (0, _stringify2.default)(data, null, 4));
    }

    /**
     * Deletes the file at the speciifed path
     * @param {string} path - The path to write the data to
     * @returns {undefined}
     * @private
     */
    static __deleteFile(path) {
        return _fs2.default.unlinkSync(path);
    }

    /**
     * Gets the correct fle path based on the file name (without extension)
     * @param {string} fileName - The name of the file
     * @returns {Object} The data that was retrieved from the file
     * @private
     */
    static __getPath(fileName) {
        // Combine the escaped file with the settings path and add th json extension
        return _path2.default.join(dataDir, fileName) + ".json";
    }

    /**
     * Gets the path for the specified pattern (only accessible in main)
     * @param {(requestPathPattern|string)} requestPathPattern - The pattern to get the path for
     * @returns {string} The file path for the settings of the pattern
     * @private
     */
    static __getPatternPath(requestPathPattern) {
        if (_isMain2.default) {
            // Get the file UUID
            const UUID = this.__getPathPatternUUID(requestPathPattern);

            // Get the path to the file with this UUID
            return this.__getUUIDpath(UUID);
        }
    }

    /**
     * Gets the path for the specified UUID
     * @param {string} UUID - The UUID that you want to get the file for
     * @returns {string} The file path for the settings of the UUID
     * @private
     */
    static __getUUIDpath(UUID) {
        return this.__getPath(_path2.default.join("moduleSettings", UUID));
    }

    // Methods for interfacing with the settings
    /**
     * Gets the location from the settings for a module with the specified path (only accessible in main)
     * @param {(RequestPath|string)} requestPath - The path to find the location for
     * @returns {object} The location of the module
     * @protected
     */
    static _getModuleLocation(requestPath) {
        if (_isMain2.default) {
            // Normalize the requestPathPattern
            if (typeof requestPath == "string") requestPath = new _requestPath2.default(requestPath);

            // Get the module that this path would lead to
            const modulePath = requestPath.getModuleID().module;

            // Define a default location
            const defaultLocation = {
                window: 1,
                section: 0
            };

            // Get the module itself
            const module = _registry2.default._getModule(modulePath);

            // Check if the module even exists
            if (module) {
                // If it does, get its config
                const config = module.getConfig();

                // Check if the config contains a location
                const location = config.settings && config.settings.location;
                if (location) {
                    // Copy any available parts of the location to be used as the default
                    if (location.window) defaultLocation.window = location.window;
                    if (location.section) defaultLocation.section = location.section;
                }
            }

            // Check if there are UUIDs for this end point
            const patternsData = this.pathPatternUUIDs[modulePath];
            if (patternsData) {
                // Check what patterns match this path
                const patterns = (0, _keys2.default)(patternsData).filter(pattern => new _requestPathPattern2.default(pattern).test(requestPath));

                // Sort the patterns on priority
                patterns.sort((a, b) => a.comparePriority(b));

                // Go through the patterns in order of priority untill a lcoatin could be found
                while (patterns.length > 0) {
                    const pattern = patterns.pop();

                    // Check if the data is already loaded
                    let data = _globalDataHandler2.default._getData(prefix + pattern.toString());

                    // If the data isn't yet loaded, load it locally
                    if (!data) data = this.__getFile(this.__getPatternPath(pattern));

                    // Check if the data contains a location, if so combine it
                    if (data && data.location) {
                        return (0, _extends3.default)({}, defaultLocation, data.location);
                    }
                }
            }

            // If no data could be found return some default
            return defaultLocation;
        } else {
            return _IPC2.default.sendSync("Settings.getModuleLocation", requestPath.toString(true), 0)[0];
        }
    }

    /**
     * The initial setup method to be called by this file itself, initialises the static fields of the class
     * @return {undefined}
     * @private
     */
    static __setup() {
        if (_isMain2.default) {
            // Listen for moduleLocation requests, so they can be executed from the main process
            _IPC2.default.on("Settings.getModuleLocation", event => {
                return this._getModuleLocation(event.data);
            });

            // Listen for settings save events
            _IPC2.default.on("Settings.save", async event => {
                // Get the data of the settings that want to be saved
                const ID = event.data.ID;
                const fileName = event.data.fileName;
                const isModuleFile = event.data.isModuleFile;

                // Retrieve the data to save
                const instance = _globalDataHandler2.default._getData(ID);
                if (instance) {
                    // Check if this data should be saved as module data
                    if (isModuleFile) {
                        let UUID = this.__getPathPatternUUID(fileName);

                        // Check if the settings coontain information
                        if ((0, _keys2.default)(instance).length > 0) {
                            // If there is no UUID yet, store one
                            if (!UUID) {
                                UUID = this.__generateUUID();
                                this.__setPathPatternUUID(fileName, UUID);

                                // Store the updated patterns
                                this.__storePathPatternUUIDS();
                            }

                            // Store the data
                            this.__setFile(this.__getUUIDpath(UUID), instance);
                        } else {
                            // Dispose the file if present
                            if (UUID) {
                                // Make sure the UUID is removed from the files
                                this.__setPathPatternUUID(fileName, undefined);

                                // Delete the file at the current UUID
                                this.__deleteFile(this.__getUUIDpath(UUID));

                                // Store the updated patterns
                                this.__storePathPatternUUIDS();
                            }

                            // Notify moduleSettings instances about the deletion
                            // Get the endpoint module to target
                            const module = new _requestPathPattern2.default(fileName).getModuleID().module;

                            // Send the removal to all moduleSettings with this module as an endpoint
                            await _IPC2.default.send("ModuleSettings.removedSettings." + module, { pattern: fileName });
                        }
                    } else {
                        // Save the data in the correct file
                        this.__setFile(this.__getPath(fileName), instance);
                    }
                }

                // Return false if there was no data to save
                return false;
            });

            // Listen for settings reload events
            _IPC2.default.on("Settings.reload", event => {
                // Get the data of the settings that want to be saved
                const ID = event.data.ID;
                const fileName = event.data.fileName;

                // Retrieve both the saved and currently loaded data
                const instance = _globalDataHandler2.default._getData(ID);
                const data = this.__getFile(this.__getPath(fileName));

                // Check if both are present
                if (instance && data) {
                    // Set undefined fields literally to undefined such that they will be deleted
                    (0, _keys2.default)(instance).forEach(field => {
                        if (data[field] === undefined) data[field] = undefined;
                    });

                    // Change all the data
                    _globalDataHandler2.default._changeField(ID, instance, data, "");
                    return data;
                }

                // If either the current data or saved data is absent, return false
                return false;
            });

            // Add dedicated retrieve method that checks if data is stored in a file first
            _IPC2.default.on("Settings.retrieve", event => {
                // Get the data of the settings that want to be saved
                const ID = event.data.ID;
                const fileName = event.data.fileName;
                const isModuleFile = event.data.isModuleFile;

                // Check if no global data for these settings has already been loaded
                if (!_globalDataHandler2.default._getData(ID)) {
                    // Check if there is any saved data
                    let data;
                    if (isModuleFile) {
                        // Get the data from a module file
                        const UUID = this.__getPathPatternUUID(fileName);
                        if (UUID) data = this.__getFile(this.__getUUIDpath(UUID));
                    } else {
                        // Get the data from a general settings file
                        data = this.__getFile(this.__getPath(fileName));
                    }

                    // If it isn't already loaded, try to retrieve it from the file
                    if (data) {
                        // If the file contained data, load this data
                        _globalDataHandler2.default._setData(ID, data);
                    } else {
                        // If the file contained no data, load the default data
                        _globalDataHandler2.default._setData(ID, event.data.defaultData);
                    }
                }

                // Return the stored data for these settings
                return _globalDataHandler2.default._getData(ID);
            });

            // Listen for settings creation events (which firstly check whether the settings don't exist already)
            _IPC2.default.on("ModuleSettings.create", async event => {
                // Get the pattern to create settings for
                const pattern = event.data.pattern;

                // Get the end point of the pattern
                const module = new _requestPathPattern2.default(pattern).getModuleID().module;

                // Notify all moduleSettings with this endpoint
                await _IPC2.default.send("ModuleSettings.createdSettings." + module, {
                    pattern: pattern
                });
            });

            // Listen for available setting instance requests
            _IPC2.default.on("ModuleSettings.retrieve", async event => {
                // Get the requestPath to get patterns for
                const requestPath = new _requestPath2.default(event.data.requestPath);

                // Get the endpoint of the path
                const modulePath = requestPath.getModuleID().module;

                // Check if there are patterns for this end point
                const patternsData = this.pathPatternUUIDs[modulePath];
                if (!patternsData) return [];

                // Get the patterns (keys) from the data
                let patterns = (0, _keys2.default)(patternsData);

                // Filter out all patterns that don't match this requestPath
                patterns = patterns.filter(pattern => new _requestPathPattern2.default(pattern).test(requestPath));

                // Return the patterns
                return patterns;
            });

            // Load initial UUIDs
            this.__loadPathPatternUUIDS();
        }
    }
}
exports.default = SettingsHandler;
SettingsHandler.__setup();
//# sourceMappingURL=settingsHandler.js.map