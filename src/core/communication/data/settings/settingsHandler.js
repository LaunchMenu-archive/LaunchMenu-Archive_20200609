import GlobalDataHandler from "../globalData/globalDataHandler";
import Settings from "./settings";
import isMain from "../../../isMain";
import IPC from "../../IPC";
import Path from "path";
import FS from "fs";

function escapePath(path) {
    return path.replace(/\>/g, "").replace(/\\\//g, "_");
}
const dataDir = Path.resolve(__dirname, "../../../../../data/settings");
const prefix = "Settings:";

/**
 * @classdesc A static class that allows you to create settings which will be synchronised between modules and can be saved in files
 * @class
 * @hideconstructor
 */
export default class SettingsHandler {
    /**
     * Creates a new settings instance
     * @param {string} ID - The identifier of the settings (preferably prefixed with some class ID)
     * @param {Object} defaultData - The data that the settings should contain if no file exists yet
     * @returns {Settings} The settings instance
     * @async
     * @public
     */
    static create(module, defaultData) {
        const path = module.getPath().toString();
        const ID = prefix + path;
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
        const data = (await IPC.send(
            "Settings.retrieve",
            {
                ID: ID,
                fileName: fileName,
                defaultData: defaultData,
            },
            0
        ))[0];

        const settings = new Settings(ID, prefix);
        settings._setData(data);
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
        if (FS.existsSync(path)) {
            try {
                const data = JSON.parse(FS.readFileSync(path));
                return data;
            } catch (e) {
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
        return FS.writeFileSync(path, JSON.stringify(data, null, 4));
    }
    /**
     * Gets the correct fle path based on the file name (without extension)
     * @param {string} fileName - The name of the file
     * @returns {Object} The data that was retrieved from the file
     * @private
     */
    static __getPath(fileName) {
        return Path.join(dataDir, escapePath(fileName)) + ".json";
    }
    /**
     * Gets the contents of a file corresponding to a specific requestPath
     * @param {RequestPath} requestPath - The path for which to get a file
     * @returns {Object} The data that was retrieved from the file
     * @protected
     */
    static _getModuleFile(requestPath) {
        return this.__getFile(
            Path.join(dataDir, escapePath(requestPath.toString())) + ".json"
        );
    }

    /**
     * The initial setup method to be called by this file itself, initialises the static fields of the class
     * @return {undefined}
     * @private
     */
    static __setup() {
        if (isMain) {
            IPC.on("Settings.save", event => {
                const ID = event.data.ID;
                const fileName = event.data.fileName;
                const instance = GlobalDataHandler.globalDataInstances[ID];
                if (instance) {
                    return this.__setFile(this.__getPath(fileName), instance);
                }
                return false;
            });
            IPC.on("Settings.reload", event => {
                const ID = event.data.ID;
                const fileName = event.data.fileName;
                const instance = GlobalDataHandler.globalDataInstances[ID];
                const data = this.__getFile(this.__getPath(fileName));
                if (instance && data) {
                    // Set undefined fields literally to undefined such that they will be deleted
                    Object.keys(instance).forEach(field => {
                        if (data[field] === undefined) data[field] = undefined;
                    });

                    // Change all the data
                    GlobalDataHandler._changeField(ID, instance, data, "");
                    return data;
                }
                return false;
            });

            // Add dedicated retrieve method that checks if data is stored in a file first
            IPC.on("Settings.retrieve", event => {
                const ID = event.data.ID;
                const fileName = event.data.fileName;
                if (!GlobalDataHandler.globalDataInstances[ID]) {
                    const data = this.__getFile(this.__getPath(fileName));
                    if (data) {
                        GlobalDataHandler.globalDataInstances[ID] = data;
                    } else {
                        GlobalDataHandler.globalDataInstances[ID] =
                            event.data.defaultData;
                    }
                }
                return GlobalDataHandler.globalDataInstances[ID];
            });
        }
    }
}
SettingsHandler.__setup();
