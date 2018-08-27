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

        // The IPC listener that checks data change evens
        this.dataListener = event => {
            const data = event.data;
            this.__setField(data.path, data.value, data.type);
        };
        IPC.on("GlobalData.notifyChange." + ID, this.dataListener);

        // The outside event listeners that will be called when data changes
        this.listeners = {};
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
        // Send data to main and spread it around from there
        return IPC.send("GlobalData.change", {
            ID: this.ID,
            data: data,
        });
    }

    /**
     * Gets a specific property by specifying the path to said property
     * @param {string} [path] - The path to the property
     * @returns {*} The data saved under the specified field
     * @public
     */
    get(path) {
        if (!path) path = "";

        // Get field list from the path
        let pathParts = path.split(".");

        let data = this.data;
        let field;
        // Get the next field as long as there is a next field
        while ((field = pathParts.shift()) && data && field.length > 0)
            data = data[field];

        // Return the retrieved data
        return data;
    }

    //TODO: specify the callback once VScode works prooperly with @callback
    /**
     * Adds a listener to the object which will get invoked when data changes
     * @param {('update'|'delete'|'create'|'change')} type - The event type to listen to (may be prefexid by path E.G. 'field.subField.update')
     * @param {function} listener - The function to call once a property has been changed
     * @returns {undefined}
     * @public
     */
    on(type, listener) {
        // Get the listeners list for this event type, or create if non-existent
        let listeners = this.listeners[type];
        if (!listeners) listeners = this.listeners[type] = [];

        // Check if the listener is already added, and add it if it isn't
        const index = listeners.indexOf(listener);
        if (index == -1) listeners.push(listener);
    }

    /**
     * Removes a listener from the object which would have gotten invoked when data changes
     * @param {('update'|'delete'|'create'|'change')} type - The event type that was listened to (may be prefexid by path E.G. 'field.subField.update')
     * @param {function} listener - The function that was listening to said event type
     * @returns {undefined}
     * @public
     */
    off(type, listener) {
        // Get the listeners list for this event type
        const listeners = this.listeners[type];
        if (listeners) {
            // Check at what index this listener is stored, and remove said index
            const index = listeners.indexOf(listener);
            if (index != -1) listeners.splice(index, 1);

            // If no more listeners exist, remove the list
            if (listeners.length == 0) delete this.listeners[type];
        }
    }

    /**
     * Gets rid of all connected data such that the object is safely removed
     * @returns {undefined}
     * @public
     */
    dispose() {
        // Remove the IPC listener
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
        // Extract the field that was altered from the path
        const pathParts = path.split(".");
        const field = pathParts.pop();

        // Get the object that contains the field
        const data = this.get(pathParts.join("."));
        if (data) {
            // Check if the event type was a deletion
            if (type == "delete") {
                // Delete the attribute
                delete data[field];

                // Send event to delete and update listeners
                this.__emitEvent(type, path);
                this.__emitEvent("update", path, {
                    type: "delete",
                });
            } else {
                // Set the field to the new value
                data[field] = value;

                // Send event to (change or create) and update listeners
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
     * @param {('update'|'delete'|'create'|'change')} type - The type of event to emit
     * @param {string} path - The path to the field for which to emit the event
     * @param {Object} [event] - The event to emit
     * @returns {undefined}
     * @private
     */
    __emitEvent(type, path, event) {
        // Create the event object if left out
        if (!event) event = {};

        // Add the full path, allData and type to the event
        event.fullPath = path;
        if (!event.type) event.type = type;
        event.allData = this.data;

        // Get all fields of the path
        const pathParts = path.split(".");
        let subPath = ""; // The path that we are currently at

        // Go through all fields
        while (true) {
            // Get the listeners for the event type and check if they exist
            let listeners = this.listeners[subPath + type];
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
}
