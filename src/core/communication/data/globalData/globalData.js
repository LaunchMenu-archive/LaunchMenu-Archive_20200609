import IPC from "../../IPC";
export default class GlobalData {
    /**
     * Create a new globalData object allowing you to share data between different modules
     * @constructs GlobalData
     * @hideconstructor
     * @param {string} ID - The ID of the global data to synchronise with
     */
    constructor(ID) {
        this.ID = ID;
        this.dataListener = event => {
            const data = event.data;
            this.__setField(data.path, data.value, data.type);
        };
        this.listeners = {};
        IPC.on("GlobalData.notifyChange." + ID, this.dataListener);
    }

    /**
     * Changes the data by providing an object with the field you want to alter,
     * The value 'undefined' can be used to delete a field
     * @param {Object} data - The object with the altered fields
     * @returns {Object} The currently saved data after the alteration
     * @async
     * @public
     */
    change(data) {
        return IPC.send("GlobalData.change", {
            ID: this.ID,
            data: data,
        });
    }

    /**
     * Gets a specific property by specifying the path to said property
     * @param {string} path - The path to the property
     * @returns {*} The data saved under the specified field
     * @public
     */
    get(path) {
        if (!path) path = "";
        let pathParts = path.split(".");
        let data = this.data;
        let variable;
        while ((variable = pathParts.shift()) && data && variable.length > 0)
            data = data[variable];
        return data;
    }

    //TODO: specify the callback once VScode works prooperly with @callback
    /**
     * Adds a listener to the object which will get invoked when data changes
     * @param {('update'|'delete'|'create'|'change')} type - The event type to listen to
     * @param {function} listener - The function to call once a property has been changed
     * @returns {undefined}
     * @public
     */
    on(type, listener) {
        let listeners = this.listeners[type];
        if (!listeners) listeners = this.listeners[type] = [];
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index == -1) listeners.push(listener);
        }
    }

    /**
     * Removes a listener from the object which would have gotten invoked when data changes
     * @param {('update'|'delete'|'create'|'change')} type - The event type that was listened to
     * @param {function} listener - The function that was listening to said event type
     * @returns {undefined}
     * @public
     */
    off(type, listener) {
        const listeners = this.listeners[type];
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index != -1) listeners.splice(index, 1);
            if (listeners.length == 0) delete this.listeners[type];
        }
    }

    /**
     * Gets rid of all connected data such that the object is safely removed
     * @returns {undefined}
     * @public
     */
    dispose() {
        IPC.off("GlobalData.notifyChange." + ID, this.dataListener);
    }

    /**
     * Sets the initial data of the object, without sending events to other instances
     * @param {Object} data - The data to store in the instance
     * @returns {undefined}
     * @protected
     */
    _setData(data) {
        this.data = data;
    }

    /**
     * Alters a local field and sends out an event to all listeners
     * @param {string} path - The path to the field to change
     * @param {*} value - The new value to store in the field
     * @param {('delete'|'create'|'change')} type - The event type to execute
     * @returns {undefined}
     * @private
     */
    __setField(path, value, type) {
        let pathParts = path.split(".");
        let field = pathParts.pop();
        const data = this.get(pathParts.join("."));
        if (data) {
            if (type == "delete") {
                delete data[field];
                this.__emitEvent(type, path);
                this.__emitEvent("update", path, {
                    type: "delete",
                });
            } else {
                data[field] = value;
                this.__emitEvent(type, path, {
                    value: value,
                });
                this.__emitEvent("update", path, {
                    type: type,
                    value: value,
                });
            }
        }
    }
    /**
     * Sends an event to the correct listeners with the correct data
     * @param {'update'|'delete'|'create'|'change'} type - The type of event to emit
     * @param {string} path - The path to the field for which to emit the event
     * @param {Object} event - The event to emit
     * @returns {undefined}
     * @private
     */
    __emitEvent(type, path, event) {
        if (!event) event = {};
        event.fullPath = path;
        if (!event.type) event.type = type;
        event.allData = this.data;

        const pathParts = path.split(".");
        let subPath = "";
        while (true) {
            let listeners = this.listeners[subPath + type];
            if (listeners) {
                event.path = pathParts.join(".");
                listeners.forEach(listener => {
                    listener.call(this, event);
                });
            }

            if (pathParts.length == 0) break;
            subPath += pathParts.shift() + ".";
        }
    }
}
