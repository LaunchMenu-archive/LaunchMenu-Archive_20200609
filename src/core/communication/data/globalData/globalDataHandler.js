import isMain from "../../../isMain";
import IPC from "../../IPC";
import GlobalData from "./globalData";

/**
 * @classdesc A static class that allows you to create global data which will be synchronised between modules
 * @class
 * @hideconstructor
 */
export default class GlobalDataHandler {
    /**
     * Creates a new globalData instance
     * @param {string} ID - The identifier of the globalData (preferably prefixed with some class ID)
     * @param {Object} defaultData - The data that the globalData should contain if it hasn't been initialised yet
     * @returns {GlobalData} The globalData instance
     * @async
     * @public
     */
    static async create(ID, defaultData) {
        // Get the currently stored data for this ID from main, will be set to default if absent
        const data = (await IPC.send(
            "GlobalData.retrieve",
            {
                ID: ID,
                defaultData: defaultData,
            },
            0
        ))[0];

        // Create a new global data instance
        const globalData = new GlobalData(ID);

        // Add the data retrieved from main to this instance
        globalData._setData(data);

        // Return the instance
        return globalData;
    }

    /**
     * Changes a field of for all instances of a specific globalData object
     * @param {string} ID - The identifier of the globalData that this data belongs to
     * @param {*} currentData - The data that is currently located at this path
     * @param {*} newData - The data that we want to assign to this path
     * @param {string} path - The path to assign the data to
     * @returns {Object} The newly set data
     * @protected
     */
    static _changeField(ID, currentData, newData, path) {
        // Check if the old data is a plain js object
        if (currentData && currentData.__proto__ == Object.prototype) {
            // Check if the new data is a plain js object
            if (newData && newData.__proto__ == Object.prototype) {
                // If both old and new data are objects, go through the fields in the new data to replace the old data with
                for (let key in newData) {
                    // Retrieve what the new value should be
                    const newValue = this._changeField(
                        ID,
                        currentData[key], // Get the field of the old data
                        newData[key], // get the field of the new data
                        path ? path + "." + key : key // Append the field to the path
                    );

                    // Check if the new value is undefined, if so, it should be deleted. Otherwise it should simply be stored
                    if (newValue === undefined) {
                        delete currentData[key];
                    } else {
                        currentData[key] = newValue;
                    }
                }

                // Return the now altered data
                return currentData;
            } else {
                // If the new data is not an object, check if it is defined at all
                if (newData === undefined) {
                    // If it isn't defined, that means the object got deleted, no new value should be stored
                    IPC.send("GlobalData.notifyChange." + ID, {
                        type: "delete",
                        path: path,
                    });
                } else {
                    // If it is defined, the object just got replaced by another value type, so broardcast the change
                    IPC.send("GlobalData.notifyChange." + ID, {
                        type: "change",
                        path: path,
                        value: newData,
                    });
                }
            }
        } else {
            // check if the new data is defined at all
            if (newData === undefined) {
                // If not, that means the object got deleted, no new value should be stored
                IPC.send("GlobalData.notifyChange." + ID, {
                    type: "delete",
                    path: path,
                });

                // Check if the new data is a plain js object
            } else if (newData && newData.__proto__ == Object.prototype) {
                // If the new data is an object, send out an event indicating that the new value should be a plain js object
                // Either give it a create event type if there was no previous value, or change type if there was
                IPC.send("GlobalData.notifyChange." + ID, {
                    type: currentData ? "change" : "create",
                    path: path,
                    value: {},
                });

                // Go through all the fields in the new data and send events for each
                for (let key in newData)
                    this._changeField(
                        ID,
                        undefined,
                        newData[key],
                        path ? path + "." + key : key
                    );
            } else {
                // If the new data is just a regular value, send out an event indicating what the new value should be
                // Either give it a create event type if there was no previous value, or change type if there was
                IPC.send("GlobalData.notifyChange." + ID, {
                    type: currentData ? "change" : "create",
                    path: path,
                    value: newData,
                });
            }
        }

        // By default return the new data to be stored
        return newData;
    }

    /**
     * The initial setup method to be called by this file itself, initialises the static fields of the class
     * @return {undefined}
     * @private
     */
    static __setup() {
        if (isMain) {
            // Store all the correct global data in a single place in main:
            this.globalDataInstances = {};

            // Listen for data change events
            IPC.on("GlobalData.change", event => {
                // Retrieve the globalData currently stored
                const data = event.data;
                const instance = this.globalDataInstances[data.ID];

                // If there is any, change the root 'field' to the new data
                if (instance)
                    return this._changeField(data.ID, instance, data.data, "");

                // Return false if there was no current data
                return false;
            });

            // Listen for global data being requested
            IPC.on("GlobalData.retrieve", event => {
                // Check if an instance of this global data already exists, if not created it
                if (!this.globalDataInstances[event.data.ID])
                    this.globalDataInstances[event.data.ID] =
                        event.data.defaultData;

                // Return the instance of this global data
                return this.globalDataInstances[event.data.ID];
            });
        }
    }
}
GlobalDataHandler.__setup();
