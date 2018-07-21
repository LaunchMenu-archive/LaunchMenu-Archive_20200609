"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

require("source-map-support/register");

var _electron = require("electron");

var _isMain = require("../isMain");

var _isMain2 = _interopRequireDefault(_isMain);

var _extendedJSON = require("../communication/extendedJSON");

var _extendedJSON2 = _interopRequireDefault(_extendedJSON);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * A class that allows for communication between different processes and renderers
 */
class IPC {
    /**
     * Send data to another window or the main script
     * @param  {String} type                        The event type to send (preferably prefixed with some class ID)
     * @param  {Object} data                        The data to send
     * @param  {String|[String, ...]} [dest="*"]    The window ID(s) to send this data to
     * @return {Promise} The promise that will get called with all the returned data from the listeners
     */
    static send(type, data, dest = "*") {
        return this.__send(type, data, dest);
    }
    /**
     * Send data synchronously to the main script
     * @param  {String} type                        The event type to send (preferably prefixed with some class ID)
     * @param  {Object} data                        The data to send
     * @return {Promise} The promise that will get called with all the returned data from the listeners
     */
    static sendSync(type, data) {
        return this.__sendSync(type, data);
    }
    /**
     * Listen for data being send by the main process or renderers
     * @param  {String} type                The type of event to listen for
     * @param  {Function(event)} handler    The function to handle the event occuring
     * @return {Undefined} The method returns no useful information
     */
    static on(type, handler) {
        if (!this.listeners[type]) this.listeners[type] = [];
        const listeners = this.listeners[type];
        const index = listeners.indexOf(handler);
        if (index == -1) listeners.push(handler);
    }
    /**
     * Listen for data being send by the main process or renderers, but only listen for it once
     * @param  {String} type                The type of event to listen for
     * @param  {Function(event)} handler    The function to handle the event when occuring
     * @return {Undefined} The method returns no useful information
     */
    static once(type, handler) {
        const orHandler = handler;
        handler = event => {
            this.off(type, handler);
            orHandler.call(this, event);
        };
        this.on(type, handler);
    }
    /**
     * Stop listening for data being send by the main process or renderers
     * @param  {String} type                The type of event that is being listened for
     * @param  {Function(event)} handler    The function that handles the event when occuring
     * @return {Undefined} The method returns no useful information
     */
    static off(type, handler) {
        const listeners = this.listeners[type];
        if (listeners) {
            const index = listeners.indexOf(handler);
            if (index != -1) listeners.splice(index, 1);
        }
    }

    /**
     * Gets the identifier of this process or renderer which other processes or renderers can use to communicate
     * @return {Number} The numeric identifier
     */
    static getID() {
        return this.ID;
    }

    // Protected methods
    /**
     * Get all the windows that are registered and can be communicated with (only works in the main process)
     * @return {[BrowserWindow]} The actual windows
     */
    static _getWindows() {
        return this.windows;
    }
    /**
     * Register a window such that it can start communicating with other processes and windows
     * @param  {BrowserWindow} window The window to register
     * @return {Undefined} The method returns no useful information
     */
    static _registerWindow(window) {
        this.windows[window.id] = window;
    }
    /**
     * Deregister a window for when it is destroyed, such that it is no longer listed as a valid window
     * @param  {BrowserWindow} window The window to deregister
     * @return {Undefined} The method returns no useful information
     */
    static _deregisterWindow(window) {
        const index = this.windows.indexOf(window);
        if (index != -1) delete this.windows[index];
    }

    // Private methods
    /**
     * Emit an event to all the registered listeners
     * @param  {String} type  The event type to invoke
     * @param  {Object} event The event data to pass to the listeners
     * @return {Undefined} The method returns no useful information
     */
    static __emitEvent(type, event) {
        const listeners = this.listeners[type];
        const responses = [];

        // Emit the event itself
        if (listeners) listeners.forEach(listener => {
            var response = listener.call(this, event);
            responses.push(response);
        });

        // Return the responses of the event
        return responses;
    }
    /**
     * Send data to another window or the main script
     * @param  {String} type                        The event type to send (preferbly prefixed with some module ID)
     * @param  {Object} data                        The data to send
     * @param  {String|[String, ...]} [dest="*"]    The window ID(s) to send this data to
     * @param  {Number} source                      The process/renderer ID that the event was originally sent from
     * @param  {Number} respID                      The ID of the response listener in the source process/renderer to call
     * @return {Promise} The promise that will get called with all the returned data from the listeners
     */
    static __send(type, data, dest = "*", source = 0, respID = undefined) {
        // Only create a promise if this is not a forwarded event
        let promise;
        if (respID == undefined) {
            // Create a promise that can be used to return a response
            let resolve;
            promise = new _promise2.default((res, reject) => {
                resolve = res;
            });
            // Register the response listener
            respID = this.responseListeners.ID++;
            this.responseListeners[respID] = {
                resolve, // The resolve function to call when finished
                responseOriginsReceived: 0, // The number of processes/renderers that have returned responses
                responses: [] // The responses that have been recieved so far
            };
        }

        // Send the data
        const encodedData = _extendedJSON2.default.encode(data);
        if (_isMain2.default) {
            // If the call is made from the main process
            // Send the data to the appropriate windows
            const windows = this._getWindows();

            // Format the destination
            if (dest == "*") {
                // If we want to target all windows (and the main thread), create a list of all destinations
                dest = [];
                for (let i in windows) dest.push(i);
            } else if (!(dest instanceof Array)) {
                // If only a single destination is provided, still make sure it is an array
                dest = [dest];
            } else {
                // Remove all invalid window ids
                for (let i = dest.length - 1; i >= 0; i--) {
                    let id = dest[i];
                    if (!this.windows[Number(id)]) dest.splice(i, 1);
                }
            }

            // Go through all destionations and send the data
            const destCount = dest.length;
            dest.forEach(id => {
                if (id == 0) {
                    // Target the main process
                    // Emit the event if the main process is a destination of the event
                    const responses = this.__emitEvent(type, {
                        sourceID: source,
                        data: data
                    });

                    // Return responses
                    this.__sendResponse(source, {
                        responseID: respID,
                        responseOriginCount: destCount,
                        responses: responses
                    });
                } else {
                    // Target a window
                    const window = this.windows[Number(id)];
                    if (window) {
                        window.webContents.send("IPC.recieve", {
                            type: type,
                            sourceID: source,
                            data: encodedData,
                            responseID: respID,
                            responseOriginCount: destCount
                        });
                    }
                }
            });
        } else {
            // Send the data to the main process such that it can spread it to the appropriate windows
            const forwardData = { dest: dest, type: type, sourceID: this.ID, responseID: respID, data: encodedData };
            _electron.ipcRenderer.send("IPC.forward", forwardData);
        }

        // Return the response promise
        return promise;
    }
    /**
     * Send data synchronously to the main script
     * @param  {String} type                        The event type to send (preferably prefixed with some class ID)
     * @param  {Object} data                        The data to send
     * @param  {Number} source                      The process/renderer ID that the event was originally sent from
     * @return {Promise} The promise that will get called with all the returned data from the listeners
     */
    static __sendSync(type, data, sourceID) {
        if (_isMain2.default) {
            // If the call is made from the main process
            return this.__emitEvent(type, {
                sourceID: sourceID,
                data: data
            });
        } else {
            // Send event to the main process and return the data
            const response = _electron.ipcRenderer.sendSync("IPC.syncCall", { type: type, data: _extendedJSON2.default.encode(data) });
            return _extendedJSON2.default.decode(response);
        }
    }
    /**
     * Send a response to the source window that emitted the event
     * @param  {Number} sourceID                         The ID of the event source process/renderer
     * @param  {NUmber} responseData.responseID          The ID of the response in said process/renderer
     * @param  {Array}  responseData.responses           The actual array of returned responses
     * @param  {Number} responseData.responseOriginCount The number of processes/renderers that need to return responses
     * @return {Undefined} The method returns no useful information
     */
    static __sendResponse(sourceID, responseData) {
        // Check whether this is the main process or a renderer
        if (_isMain2.default) {
            // If this is the main process, and the event was sent by the main process, process the data
            if (sourceID == 0) {
                this.__recieveResponse(responseData.responseID, responseData.responses, responseData.responseOriginCount);

                // If this is the main process and the data was meant for a renderer, forward the data
            } else {
                const window = this.windows[Number(sourceID)];
                if (window) {
                    window.webContents.send("IPC.recieveResponse", {
                        responseID: responseData.responseID,
                        responseOriginCount: responseData.responseOriginCount,
                        responses: _extendedJSON2.default.encode(responseData.responses)
                    });
                }
            }
        } else {
            // If this is a renderer, pass the response back to the main process
            _electron.ipcRenderer.send("IPC.forwardResponse", {
                sourceID: sourceID,
                responseID: responseData.responseID,
                responseOriginCount: responseData.responseOriginCount,
                responses: _extendedJSON2.default.encode(responseData.responses)
            });
        }
    }
    /**
     * Recieve a response from some process/renderer, and resolve promise when all are recieved
     * @param  {Number} responseID          The ID of the response identifier
     * @param  {Array}  responses           The actual array of returned responses
     * @param  {Number} responseOriginCount The number of processes/renderers that need to return responses
     * @return {Undefined} The method returns no useful information
     */
    static __recieveResponse(responseID, responses, responseOriginCount) {
        // Find the attached response listener from the ID
        const rl = this.responseListeners[responseID];
        if (rl) {
            // Combine the new responses with the already recieved responses
            rl.responses = rl.responses.concat(responses);

            // Increase the response count, and if it matches the required response count, resolve the promise
            if (++rl.responseOriginsReceived == responseOriginCount) {
                // Delete the listener, and resolve the promise
                delete this.responseListeners[responseID];
                rl.resolve(rl.responses);
            }
        }
    }
    /**
     * The initial setup method to be called by this file itself, initialises the static fields of the class
     * @return {Undefined} The method returns no useful information
     */
    static __setup() {
        this.windows = [this]; // The available windows to forward the events to
        this.listeners = {}; // The event listeners in this process/renderer
        this.responseListeners = { ID: 0 }; // The response listeners in this process/renderer

        // Check whether this is the main process or a renderer
        if (_isMain2.default) {
            this.ID = 0;

            // Forward the call made by a renderer, and passing the sourceID to track the origin
            _electron.ipcMain.on("IPC.forward", (event, arg) => {
                this.__send(arg.type, _extendedJSON2.default.decode(arg.data), arg.dest, arg.sourceID, arg.responseID);
            });

            // Return any responses to the source process/renderer when recieved
            _electron.ipcMain.on("IPC.forwardResponse", (event, arg) => {
                this.__sendResponse(arg.sourceID, arg);
            });

            // Listen for synchonous IPC calls
            _electron.ipcMain.on("IPC.syncCall", (event, arg) => {
                const response = this.__sendSync(arg.type, _extendedJSON2.default.decode(arg.data), arg.sourceID);
                event.returnValue = _extendedJSON2.default.encode(response);
            });
        } else {
            // Is a renderer thread
            this.ID = require('electron').remote.getCurrentWindow().id; // (Starts from 1)

            // Emit the event to all listeners whenever it is recieved
            _electron.ipcRenderer.on("IPC.recieve", (event, arg) => {
                // Emit the event when recieved
                const responses = this.__emitEvent(arg.type, {
                    sourceID: arg.sourceID,
                    data: _extendedJSON2.default.decode(arg.data)
                });

                // Return responses
                this.__sendResponse(arg.sourceID, {
                    responseID: arg.responseID,
                    responseOriginCount: arg.responseOriginCount,
                    responses: responses
                });
            });

            // Call the response listener whenever the response returned
            _electron.ipcRenderer.on("IPC.recieveResponse", (event, arg) => {
                this.__recieveResponse(arg.responseID, _extendedJSON2.default.decode(arg.responses), arg.responseOriginCount);
            });
        }
    }
}
IPC.__setup();
exports.default = IPC;
//# sourceMappingURL=IPC.js.map