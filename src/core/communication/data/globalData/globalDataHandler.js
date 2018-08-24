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
        const data = (await IPC.send(
            "GlobalData.retrieve",
            {
                ID: ID,
                defaultData: defaultData,
            },
            0
        ))[0];

        const globalData = new GlobalData(ID);
        globalData._setData(data);
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
        if (currentData && currentData.__proto__ == Object.prototype) {
            if (newData && newData.__proto__ == Object.prototype) {
                for (let key in newData)
                    currentData[key] = this._changeField(
                        ID,
                        currentData[key],
                        newData[key],
                        path ? path + "." + key : key
                    );
                return currentData;
            } else {
                if (newData === undefined) {
                    IPC.send("GlobalData.notifyChange." + ID, {
                        type: "delete",
                        path: path,
                    });
                } else {
                    IPC.send("GlobalData.notifyChange." + ID, {
                        type: "change",
                        path: path,
                        value: newData,
                    });
                }
            }
        } else {
            if (newData === undefined) {
                IPC.send("GlobalData.notifyChange." + ID, {
                    type: "delete",
                    path: path,
                });
            } else if (newData && newData.__proto__ == Object.prototype) {
                IPC.send("GlobalData.notifyChange." + ID, {
                    type: currentData ? "change" : "create",
                    path: path,
                    value: {},
                });
                for (let key in newData)
                    this._changeField(
                        ID,
                        undefined,
                        newData[key],
                        path ? path + "." + key : key
                    );
            } else if (currentData === undefined) {
                IPC.send("GlobalData.notifyChange." + ID, {
                    type: "create",
                    path: path,
                    value: newData,
                });
            } else {
                IPC.send("GlobalData.notifyChange." + ID, {
                    type: "change",
                    path: path,
                    value: newData,
                });
            }
        }
        return newData;
    }

    /**
     * The initial setup method to be called by this file itself, initialises the static fields of the class
     * @return {undefined}
     * @private
     */
    static __setup() {
        if (isMain) {
            this.globalDataInstances = {};

            IPC.on("GlobalData.change", event => {
                const data = event.data;
                const instance = this.globalDataInstances[data.ID];
                if (instance)
                    return this._changeField(data.ID, instance, data.data, "");
                return false;
            });
            IPC.on("GlobalData.retrieve", event => {
                if (!this.globalDataInstances[event.data.ID])
                    this.globalDataInstances[event.data.ID] =
                        event.data.defaultData;
                return this.globalDataInstances[event.data.ID];
            });
        }
    }
}
GlobalDataHandler.__setup();
