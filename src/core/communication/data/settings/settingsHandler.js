import Path from "path";
import FS from "fs";

import GlobalDataHandler from "../globalData/globalDataHandler";
import Settings from "./settings";
import RequestPath from "../../../registry/requestPath/requestPath";
import RequestPathPattern from "../../../registry/requestPath/requestPathPattern";
import isMain from "../../../isMain";
import IPC from "../../IPC";

const dataDir = Path.resolve(__dirname, "../../../../../data/settings");
const prefix = "Settings:";

/**
 * @classdesc A static class that allows you to create settings which will be synchronised between modules and can be saved in files. Takes care of both the settings and moduleSettings data handling needs.
 * @class
 * @hideconstructor
 */
export default class SettingsHandler {
    /**
     * Creates a new moduleSettings instance
     * @returns {ModuleSettings} The settings instance
     * @async
     * @public
     */
    static createModuleSettings(requestPath) {}

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
        const data = (await IPC.send(
            "Settings.retrieve",
            {
                ID: ID,
                fileName: fileName,
                defaultData: defaultData,
                isModuleFile: isModuleFile,
            },
            0
        ))[0];

        // Createa a new settings instance
        const settings = new Settings(ID, fileName, isModuleFile);

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
        return format.replace(
            /x/g,
            () => alphabet[Math.floor(alphabet.length * Math.random())]
        );
    }

    /**
     * Gets the UUID, used for the filename, that belongs to a specific request path pattern (only accessible in main)
     * @param {(RequestPathPattern|string)} requestPathPattern - The request path to get the UUID for
     * @returns {string} The file name of the file with this pattern
     * @private
     */
    static __getPathPatternUUID(requestPathPattern) {
        if (isMain) {
            // Normalize the requestPathPattern
            if (typeof requestPathPattern == "string")
                requestPathPattern = new RequestPathPattern(requestPathPattern);

            // Get the module that this path would lead to
            const modulePath = requestPathPattern.getModuleID().module;

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
        if (isMain) {
            // Normalize the requestPathPattern
            if (typeof requestPathPattern == "string")
                requestPathPattern = new RequestPathPattern(requestPathPattern);

            // Get the module that this path would lead to
            const modulePath = requestPathPattern.getModuleID().module;

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
        if (isMain)
            this.pathPatternUUIDs =
                this.__getFile(this.__getPath("moduleSettingPaths")) || {};
    }

    /**
     * Saves the UUID data to the text file (only accessible in main)
     * @returns {undefined}
     * @private
     */
    static __storePathPatternUUIDS() {
        if (isMain)
            this.__setFile(
                this.__getPath("moduleSettingPaths"),
                this.pathPatternUUIDs
            );
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
        if (FS.existsSync(path)) {
            try {
                // If it exists, read the contents and parse it to json
                const data = JSON.parse(FS.readFileSync(path));

                // Return the data
                return data;
            } catch (e) {
                // If anything goes wrong, just log an error. TODO: Properly handle these errors
                console.error(
                    `Something went wrong while retrieving ${path}:`,
                    e
                );
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
        return FS.writeFileSync(path, JSON.stringify(data, null, 4));
    }

    /**
     * Deletes the file at the speciifed path
     * @param {string} path - The path to write the data to
     * @returns {undefined}
     * @private
     */
    static __deleteFile(path) {
        return FS.unlinkSync(path);
    }

    /**
     * Gets the correct fle path based on the file name (without extension)
     * @param {string} fileName - The name of the file
     * @returns {Object} The data that was retrieved from the file
     * @private
     */
    static __getPath(fileName) {
        // Combine the escaped file with the settings path and add th json extension
        return Path.join(dataDir, fileName) + ".json";
    }

    /**
     * Gets the path for the specified pattern (only accessible in main)
     * @param {(requestPathPattern|string)} requestPathPattern - The pattern to get the path for
     * @returns {string} The file path for the settings of the pattern
     * @private
     */
    static __getPatternPath(requestPathPattern) {
        if (isMain) {
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
        return this.__getPath(Path.join("moduleSettings", UUID));
    }

    // /**
    //  * Gets the contents of a file corresponding to a specific requestPath
    //  * @param {RequestPath} requestPath - The path for which to get a file
    //  * @returns {Object} The data that was retrieved from the file
    //  * @protected
    //  */
    // static _getModuleFile(requestPath) {
    //     // Get the data from the combined escaped request path and the settings path
    //     return this.__getFile(
    //         Path.join(dataDir, escapePath(requestPath.toString())) + ".json"
    //     );
    // }

    // Methods for interfacing with the settings
    /**
     * Gets the location from the settings for a module with the specified path (only accessible in main)
     * @param {(RequestPath|string)} requestPath - The path to find the location for
     * @returns {object} The location of the module
     * @protected
     */
    static _getModuleLocation(requestPath) {
        if (isMain) {
            // Normalize the requestPathPattern
            if (typeof requestPath == "string")
                requestPath = new RequestPath(requestPath);

            // Get the module that this path would lead to
            const modulePath = requestPath.getModuleID().module;

            // Check if there are UUIDs for this end point
            const patternsData = this.pathPatternUUIDs[modulePath];
            if (patternsData) {
                // Check what patterns match this path
                const patterns = Object.keys(patternsData).filter(pattern =>
                    new RequestPathPattern(pattern).test(requestPath)
                );

                // Sort the patterns on priority
                patterns.sort((a, b) => a.comparePriority(b));

                // Go through the patterns in order of priority untill a lcoatin could be found
                while (patterns.length > 0) {
                    const pattern = patterns.pop();

                    // Check if the data is already loaded
                    let data = GlobalDataHandler._getData(
                        prefix + pattern.toString()
                    );

                    // If the data isn't yet loaded, load it locally
                    if (!data)
                        data = this.__getFile(this.__getPatternPath(pattern));

                    // Check if the data contains a location, if so, return it
                    if (data && data.location) return data.location;
                }
            }

            // If no data could be found return some default
            return {
                window: 1,
                section: 1,
            };
        }
    }

    /**
     * The initial setup method to be called by this file itself, initialises the static fields of the class
     * @return {undefined}
     * @private
     */
    static __setup() {
        if (isMain) {
            // Listen for settings save events
            IPC.on("Settings.save", event => {
                // Get the data of the settings that want to be saved
                const ID = event.data.ID;
                const fileName = event.data.fileName;
                const isModuleFile = event.data.isModuleFile;

                // Retrieve the data to save
                const instance = GlobalDataHandler._getData(ID);
                if (instance) {
                    // Check if this data should be saved as module data
                    if (isModuleFile) {
                        let UUID = this.__getPathPatternUUID(fileName);

                        // Check if the settings coontain information
                        if (Object.keys(instance).length > 0) {
                            // If there is no UUID yet, store one
                            if (!UUID) {
                                UUID = this.__generateUUID();
                                this.__setPathPatternUUID(fileName, UUID);

                                // Store the updated patterns
                                this.__storePathPatternUUIDS();
                            }

                            // Store the data
                            this.__setFile(this.__getUUIDpath(UUID), instance);
                        } else if (UUID) {
                            // Make sure the UUID is removed from the files
                            this.__setPathPatternUUID(fileName, undefined);

                            // Delete the file at the current UUID
                            this.__deleteFile(this.__getUUIDpath(UUID));

                            // Store the updated patterns
                            this.__storePathPatternUUIDS();
                        }
                    } else {
                        // Save the data in the correct file
                        return this.__setFile(
                            this.__getPath(fileName),
                            instance
                        );
                    }
                }

                // Return false if there was no data to save
                return false;
            });

            // Listen for settings reload events
            IPC.on("Settings.reload", event => {
                // Get the data of the settings that want to be saved
                const ID = event.data.ID;
                const fileName = event.data.fileName;

                // Retrieve both the saved and currently loaded data
                const instance = GlobalDataHandler._getData(ID);
                const data = this.__getFile(this.__getPath(fileName));

                // Check if both are present
                if (instance && data) {
                    // Set undefined fields literally to undefined such that they will be deleted
                    Object.keys(instance).forEach(field => {
                        if (data[field] === undefined) data[field] = undefined;
                    });

                    // Change all the data
                    GlobalDataHandler._changeField(ID, instance, data, "");
                    return data;
                }

                // If either the current data or saved data is absent, return false
                return false;
            });

            // Add dedicated retrieve method that checks if data is stored in a file first
            IPC.on("Settings.retrieve", event => {
                // Get the data of the settings that want to be saved
                const ID = event.data.ID;
                const fileName = event.data.fileName;
                const isModuleFile = event.data.isModuleFile;

                //  Check if global data for these settings is already loaded
                if (!GlobalDataHandler._getData(ID)) {
                    // Check if there is any saved data
                    let data;
                    if (isModuleFile) {
                        // Get the data from a module file
                        const UUID = this.__getPathPatternUUID(fileName);
                        if (UUID)
                            data = this.__getFile(this.__getUUIDpath(UUID));
                    } else {
                        // Get the data from a general settings file
                        data = this.__getFile(this.__getPath(fileName));
                    }

                    // If it isn't already loaded, try to retrieve it from the file
                    if (data) {
                        // If the file contained data, load this data
                        GlobalDataHandler._setData(ID, data);
                    } else {
                        // If the file contained no data, load the default data
                        GlobalDataHandler._setData(ID, event.data.defaultData);
                    }
                }

                // Return the stored data for these settings
                return GlobalDataHandler._getData(ID);
            });

            // Load initial UUIDs
            this.__loadPathPatternUUIDS();
        }
    }
}
SettingsHandler.__setup();

// TODO: remove, just for testing
try {
    window.SettingsHandler = SettingsHandler;
} catch (e) {}
