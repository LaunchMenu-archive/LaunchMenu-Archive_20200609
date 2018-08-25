"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _keys = require("babel-runtime/core-js/object/keys");

var _keys2 = _interopRequireDefault(_keys);

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

var Registry = require("../../../dist/core/registry/registry").default;

require("source-map-support/register");

var _electron = require("electron");

var _isMain = require("../isMain");

var _isMain2 = _interopRequireDefault(_isMain);

var _extendedJSON = require("../communication/extendedJSON");

var _extendedJSON2 = _interopRequireDefault(_extendedJSON);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @typedef {object} IPC~IPCevent
 * @property {number} sourceID - The ID of the process/window that original sent the event
 * @property {*} data - The data that was sent with the event
 */

/**
 * @classdesc A static class that allows for communication between different processes and windows
 * @class
 * @hideconstructor
 */
class IPC {
    /**
     * Send data to another window or the main script
     * @param  {string} type - The event type to send (preferably prefixed with some class ID)
     * @param  {Object} data - The data to send
     * @param  {(string|string[])} [dest="*"] - The process/window ID(s) to send this data to
     * @returns {Promise<Object[]>} An array of all the data that listeners for the event have returned
     * @async
     * @public
     */
    static send(type, data, dest = "*") {
        // Forward the event to the private send method (which can take additional arguments)
        return this.__send(type, data, dest);
    }

    /**
     * Send data synchronously to the main script
     * @param  {string} type - The event type to send (preferably prefixed with some class ID)
     * @param  {*} data - The data to send
     * @returns {Object[]} An array of all the data that listeners for the event have returned
     * @public
     */
    static sendSync(type, data) {
        // Forward the event to the private sendSync method (which can take additional arguments)
        return this.__sendSync(type, data);
    }

    // TODO: add proper handler definition once VScode fixes @callback
    /**
     * Listens for data being sent by a process/window
     * @param  {string} type - The type of event to listen for
     * @param  {function} handler - The function to handle the event occuring
     * @returns {undefined}
     * @public
     */
    static on(type, handler) {
        // If there are no listeners for this type yet, create an array for them
        if (!this.listeners[type]) this.listeners[type] = [];

        // Get the array of listeners for this type
        const listeners = this.listeners[type];

        // Check if this listener is already present, if not, add it
        const index = listeners.indexOf(handler);
        if (index == -1) listeners.push(handler);
    }

    /**
     * Listens for data being sent by a process/window, but only listen for it once
     * @param  {string} type - The type of event to listen for
     * @param  {function} handler - The function to handle the event occuring
     * @returns {undefined}
     * @public
     */
    static once(type, handler) {
        // Create a handler middleware that will automaticall remove itself
        const handleMiddleware = function (event) {
            // As soon as an event is received, remove yourself
            this.off(type, handleMiddleware);

            // Call the handler itself with the same data
            handler.apply(this, arguments);
        };

        // Add the handler middleware event listener
        return this.on(type, handleMiddleware);
    }

    /**
     * Stops listening for data being sent by a process/window
     * @param  {String} type - The type of event that is being listened for
     * @param  {Function(event)} - The function that handles the event when occuring
     * @return {undefined}
     * @public
     */
    static off(type, handler) {
        // Get the listeners for this type, and check if even existent
        const listeners = this.listeners[type];
        if (listeners) {
            // Get the index at which this handler is stored, and remove that index if present
            const index = listeners.indexOf(handler);
            if (index != -1) listeners.splice(index, 1);
        }
    }

    /**
     * Gets the identifier of this process or window which other processes or windows can use to communicate
     * @return {number} The numeric identifier
     * @public
     */
    static getID() {
        return this.ID;
    }

    /**
     * Get all the windows that are registered and can be communicated with (only works in the main process)
     * @return {BrowserWindow[]} The actual windows
     * @protected
     */
    static _getWindows() {
        return this.windows;
    }

    /**
     * Register a window such that it can start communicating with other processes and windows
     * @param  {BrowserWindow} window - The window to register
     * @param  {number} windowID - The ID to register the window under
     * @return {undefined}
     * @protected
     */
    static _registerWindow(window, windowID) {
        this.windows[windowID] = window;
    }

    /**
     * Deregister a window for when it is destroyed, such that it is no longer listed as a valid window
     * @param  {number} windowID - The ID the window is registered under
     * @return {undefined}
     * @protected
     */
    static _deregisterWindow(windowID) {
        delete this.windows[windowID];
    }

    /**
     * Emit an event to all the registered listeners in this process/window
     * @param  {string} type  - The event type to invoke
     * @param  {IPC~IPCevent} event - The event data to pass to the listeners
     * @param  {boolean} [sync] - Whether to act synchronously and only allow sync returns
     * @return {Promise<Object[]>} An array of all the data that listeners for the event have returned
     * @async
     * @private
     */
    static __emitEvent(type, event, sync) {
        // Retrieve the listeners to send this event to
        const listeners = this.listeners[type];

        // Track the returned respones as well as promises
        const responses = [];
        const promises = [];

        // Emit the event itself
        if (listeners) listeners.forEach(listener => {
            // Call the listener and store what it returns
            const response = listener.call(this, event);

            // If it returns a promise, add it to the promises, otherwise add it to the responses
            if (response instanceof _promise2.default) {
                promises.push(response);
            } else {
                responses.push(response);
            }
        });

        // Return the responses of the event and ignore the promises if synchronous
        if (sync) return responses;

        // If not synchronous, wait for all promises to resolve, and add their results to the reponses
        return _promise2.default.all(promises).then(promiseResponses => {
            return responses.concat(promiseResponses);
        });
    }

    /**
     * Send data to other processes/windows
     * @param  {string} type - The event type to send (preferbly prefixed with some module ID)
     * @param  {*} data - The data to send
     * @param  {(string|string[])} [dest="*"] - The process/window ID(s) to send this data to
     * @param  {number} source - The process/window ID that the event was originally sent from
     * @param  {number} respID - The ID of the response listener in the source process/window to call
     * @return {Promise<Object[]>} An array of all the data that listeners for the event have returned
     * @async
     * @private
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
                responseOriginsReceived: 0, // The number of processes/windows that have returned responses
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
                dest = (0, _keys2.default)(windows);
            } else if (!(dest instanceof Array)) {
                // If only a single destination is provided, still make sure it is an array
                dest = [dest];
            } else {
                // Remove all invalid window ids
                for (let i = dest.length - 1; i >= 0; i--) {
                    let id = dest[i];
                    if (!windows[Number(id)]) dest.splice(i, 1);
                }
            }

            // Go through all destionations and send the data
            const destCount = dest.length;
            dest.forEach(id => {
                if (id == 0) {
                    // Target the main process
                    // Emit the event if the main process is a destination of the event
                    const getResponses = this.__emitEvent(type, {
                        sourceID: source,
                        data: data
                    });

                    // Return responses
                    getResponses.then(responses => {
                        this.__sendResponse(source, {
                            responseID: respID,
                            responseOriginCount: destCount,
                            responses: responses
                        });
                    });
                } else {
                    // Target a window
                    const window = windows[Number(id)];
                    if (window) {
                        // Tell a window that it received the event defined below, so it can emit it and send back its response data to main
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
            // Send the event to the main process such that it can spread it to the appropriate windows
            _electron.ipcRenderer.send("IPC.forward", {
                dest: dest,
                type: type,
                sourceID: this.ID,
                responseID: respID,
                data: encodedData
            });
        }

        // Return the response promise
        return promise;
    }

    /**
     * Send data synchronously to the main script
     * @param  {string} type - The event type to send (preferably prefixed with some class ID)
     * @param  {*} data - The data to send
     * @param  {number} source - The process/window ID that the event was originally sent from
     * @return {Object[]} An array of all the data that listeners for the event have returned
     * @private
     */
    static __sendSync(type, data, sourceID) {
        if (_isMain2.default) {
            // If the call is made from the main process, just emit the event and return the responses
            return this.__emitEvent(type, {
                sourceID: sourceID,
                data: data
            }, true);
        } else {
            // Otherwise send the event to the main process and return the retrieved data from there
            const response = _electron.ipcRenderer.sendSync("IPC.syncCall", {
                type: type,
                data: _extendedJSON2.default.encode(data)
            });
            return _extendedJSON2.default.decode(response);
        }
    }

    /**
     * Send a response to the source window that emitted the event
     * @param  {string} sourceID - The ID of the event source process/window
     * @param  {object} responseData - The response data
     * @param  {number} responseData.responseID - The ID of the response in said process/window
     * @param  {Object[]}  responseData.responses - The actual array of returned responses
     * @param  {number} responseData.responseOriginCount - The number of processes/windows that need to return responses
     * @return {undefined}
     * @private
     */
    static __sendResponse(sourceID, responseData) {
        // Check whether this is the main process or a window
        if (_isMain2.default) {
            // If this is the main process, and the event was sent by the main process, process the data
            if (sourceID == 0) {
                this.__recieveResponse(responseData.responseID, responseData.responses, responseData.responseOriginCount);

                // If this is the main process and the data was meant for anotherw process/window, forward the data
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
            // If this is a process/window, pass the response back to the main process
            _electron.ipcRenderer.send("IPC.forwardResponse", {
                sourceID: sourceID,
                responseID: responseData.responseID,
                responseOriginCount: responseData.responseOriginCount,
                responses: _extendedJSON2.default.encode(responseData.responses)
            });
        }
    }

    /**
     * Recieve a response from some process/window, and resolve promise when all are recieved
     * @param  {number} responseID - The ID of the response identifier
     * @param  {Object[]}  responses - The actual array of returned responses
     * @param  {number} responseOriginCount - The number of processes/windows that need to return responses
     * @return {undefined}
     * @private
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
     * @return {undefined}
     * @private
     */
    static __setup() {
        this.windows = { 0: this }; // The available windows to forward the events to
        this.listeners = {}; // The event listeners in this process/window
        this.responseListeners = { ID: 0 }; // The response listeners in this process/window

        // Check whether this is the main process or a window
        if (_isMain2.default) {
            this.ID = 0;

            // Forward the call made by a window, and passing the sourceID to track the origin
            _electron.ipcMain.on("IPC.forward", (event, arg) => {
                this.__send(arg.type, _extendedJSON2.default.decode(arg.data), arg.dest, arg.sourceID, arg.responseID);
            });

            // Return any responses to the source process/window when recieved
            _electron.ipcMain.on("IPC.forwardResponse", (event, arg) => {
                arg.responses = _extendedJSON2.default.decode(arg.responses); // __sendResponse expects non encodedData
                this.__sendResponse(arg.sourceID, arg);
            });

            // Listen for synchonous IPC calls
            _electron.ipcMain.on("IPC.syncCall", (event, arg) => {
                // Send the event synchrnously to all listeners, and retrieve their responses
                const response = this.__sendSync(arg.type, _extendedJSON2.default.decode(arg.data), arg.sourceID);

                // Set their responses as the return datan
                event.returnValue = _extendedJSON2.default.encode(response);
            });
        } else {
            // Is a window thread
            // this.ID gets set in windowHandler once finished loading

            // Emit the IPC event to all listeners whenever it is recieved
            _electron.ipcRenderer.on("IPC.recieve", (event, arg) => {
                // Emit the event when recieved
                const getResponses = this.__emitEvent(arg.type, {
                    sourceID: arg.sourceID,
                    data: _extendedJSON2.default.decode(arg.data)
                });

                // Return responses
                getResponses.then(responses => {
                    this.__sendResponse(arg.sourceID, {
                        responseID: arg.responseID,
                        responseOriginCount: arg.responseOriginCount,
                        responses: responses
                    });
                });
            });

            // Call the response listener whenever the response returned
            _electron.ipcRenderer.on("IPC.recieveResponse", (event, arg) => {
                this.__recieveResponse(arg.responseID, _extendedJSON2.default.decode(arg.responses), arg.responseOriginCount);
            });
        }
    }
}
exports.default = IPC;
IPC.__setup();
//# sourceMappingURL=IPC.js.map