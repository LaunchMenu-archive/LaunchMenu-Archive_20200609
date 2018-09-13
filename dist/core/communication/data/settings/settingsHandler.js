"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _keys = require("babel-runtime/core-js/object/keys");

var _keys2 = _interopRequireDefault(_keys);

var _stringify = require("babel-runtime/core-js/json/stringify");

var _stringify2 = _interopRequireDefault(_stringify);

require("source-map-support/register");

var _globalDataHandler = require("../globalData/globalDataHandler");

var _globalDataHandler2 = _interopRequireDefault(_globalDataHandler);

var _settings = require("./settings");

var _settings2 = _interopRequireDefault(_settings);

var _isMain = require("../../../isMain");

var _isMain2 = _interopRequireDefault(_isMain);

var _IPC = require("../../IPC");

var _IPC2 = _interopRequireDefault(_IPC);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function escapePath(path) {
    return path.replace(/\>/g, "").replace(/[\\\/]/g, "_").replace(/\..*$/, "");
}
const dataDir = _path2.default.resolve(__dirname, "../../../../../data/settings");
const prefix = "Settings:";

/**
 * @classdesc A static class that allows you to create settings which will be synchronised between modules and can be saved in files
 * @class
 * @hideconstructor
 */
class SettingsHandler {
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
     * @returns {Settings} The settings instance
     * @async
     * @protected
     */
    static async _create(ID, defaultData, fileName) {
        if (!fileName) fileName = ID;
        // Get the currently stored data for this ID from main, will be set to default if absent
        const data = (await _IPC2.default.send("Settings.retrieve", {
            ID: ID,
            fileName: fileName,
            defaultData: defaultData
        }, 0))[0];

        // Createa a new settings instance
        const settings = new _settings2.default(ID, prefix);

        // Add the data retrieved from main to this instance
        settings._setData(data);

        // Return the instance
        return settings;
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
     * Gets the correct fle path based on the file name (without extension)
     * @param {string} fileName - The name of the file
     * @returns {Object} The data that was retrieved from the file
     * @private
     */
    static __getPath(fileName) {
        // Combine the escaped file with the settings path and add th json extension
        return _path2.default.join(dataDir, escapePath(fileName)) + ".json";
    }
    /**
     * Gets the contents of a file corresponding to a specific requestPath
     * @param {RequestPath} requestPath - The path for which to get a file
     * @returns {Object} The data that was retrieved from the file
     * @protected
     */
    static _getModuleFile(requestPath) {
        // Get the data from the combined escaped request path and the settings path
        return this.__getFile(_path2.default.join(dataDir, escapePath(requestPath.toString())) + ".json");
    }

    /**
     * The initial setup method to be called by this file itself, initialises the static fields of the class
     * @return {undefined}
     * @private
     */
    static __setup() {
        if (_isMain2.default) {
            // Listen for settings save events
            _IPC2.default.on("Settings.save", event => {
                // Get the data of the settings that want to be saved
                const ID = event.data.ID;
                const fileName = event.data.fileName;

                // Retrieve the data to save
                const instance = _globalDataHandler2.default.globalDataInstances[ID];
                if (instance) {
                    // Save the data in the correct file
                    return this.__setFile(this.__getPath(fileName), instance);
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
                const instance = _globalDataHandler2.default.globalDataInstances[ID];
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

                //  Check if global data for these settings is already loaded
                if (!_globalDataHandler2.default.globalDataInstances[ID]) {
                    // If it isn't already loaded, try to retrieve it from the file
                    const data = this.__getFile(this.__getPath(fileName));
                    if (data) {
                        // If the file contained data, load this data
                        _globalDataHandler2.default.globalDataInstances[ID] = data;
                    } else {
                        // If the file contained no data, load the default data
                        _globalDataHandler2.default.globalDataInstances[ID] = event.data.defaultData;
                    }
                }

                // Return the stored data for these settings
                return _globalDataHandler2.default.globalDataInstances[ID];
            });
        }
    }
}
exports.default = SettingsHandler;
SettingsHandler.__setup();
//# sourceMappingURL=settingsHandler.js.map