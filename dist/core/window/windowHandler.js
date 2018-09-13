"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

require("source-map-support/register");

var _electron = require("electron");

var _url = require("url");

var _url2 = _interopRequireDefault(_url);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _settingsHandler = require("../communication/data/settings/settingsHandler");

var _settingsHandler2 = _interopRequireDefault(_settingsHandler);

var _channelHandler = require("../communication/channel/channelHandler");

var _channelHandler2 = _interopRequireDefault(_channelHandler);

var _IPC = require("../communication/IPC");

var _IPC2 = _interopRequireDefault(_IPC);

var _registry = require("../registry/registry");

var _registry2 = _interopRequireDefault(_registry);

var _isMain = require("../isMain");

var _isMain2 = _interopRequireDefault(_isMain);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let windowSettings;
let settingsPromise;
function settingsLoaded() {
    // Create a promise if not present yet
    if (!settingsPromise)
        // create a settings object to store window data
        settingsPromise = _settingsHandler2.default._create("windowCore", {
            windows: {}
        }).then(settings => {
            // Store these settings when retrieved
            windowSettings = settings;
        });

    // return the settings initialisation promise
    return settingsPromise;
}

/**
 * @classdesc A static class that allows for the creation and destruction of windows
 * @class
 * @hideconstructor
 */
class WindowHandler {
    /**
     * Opens a window according to the saved settings of that window
     * @param {number} windowID - The ID of the window to open
     * @returns {Promise} Resolves once the window fully opened and loaded
     * @async
     * @private
     */
    static async __open(windowID) {
        // Check if we are trying to open a window with a valid ID
        if (windowID < 1) {
            throw Error("Window IDs must start from 1");
        }

        // Check if this code is ran in the main process
        if (!_isMain2.default) {
            // If it is not ran in the main process, forward the call to the main process
            return _IPC2.default.sendSync("WindowHandler.open", {
                ID: windowID
            });
        } else {
            // If the window is already opened return
            if (this.openedWindows[windowID]) return;

            // If the window is already opening, return its promise
            if (this.openingWindows[windowID]) return this.openingWindows[windowID];

            // Create a new opening promise indicating that the window is currently opening, but only after the settings have loaded
            return this.openingWindows[windowID] = settingsLoaded().then(async () => {
                // Get the settings for this particular window
                let settings = windowSettings.get(`windows.${windowID}`);

                // Set default data if these settings are absent
                if (!settings) {
                    await windowSettings.change({
                        windows: {
                            [windowID]: {
                                width: 800,
                                height: 600,
                                sections: {
                                    0: {
                                        width: 100,
                                        height: 100,
                                        x: 0,
                                        y: 0,
                                        module: "none"
                                    }
                                }
                            }
                        }
                    });
                    settings = windowSettings.get(`windows.${windowID}`);
                }

                // Create a browser window according to these settings
                const window = new _electron.BrowserWindow({
                    width: settings.width,
                    height: settings.height
                });

                // Load the window index path into this window
                window.loadURL(_url2.default.format({
                    pathname: _path2.default.join(__dirname, "windowIndex.html"),
                    protocol: "file:",
                    slashes: true
                }));

                // Open dev tools for debugging TODO: add some option to disable/enable this
                window.openDevTools();

                // Wait for the window to finish loading
                await new _promise2.default((resolve, reject) => {
                    window.webContents.on("did-finish-load", () => {
                        resolve();
                    });
                });

                // Assign an ID to the window (LM IPC uses this, so we need to use lower level IPC until compeleted)
                await new _promise2.default((resolve, reject) => {
                    // A listener that resolves the promise when a IPC assignment event is received, in which case the listener is also removed
                    const waitForAssignment = (event, args) => {
                        if (args.ID == windowID) {
                            _electron.ipcMain.removeListener("WindowHandler.assignedID", waitForAssignment);
                            resolve();
                        }
                    };

                    // Enable the listener
                    _electron.ipcMain.on("WindowHandler.assignedID", waitForAssignment);

                    // Send the ID assignment to complete initialisation
                    window.webContents.send("WindowHandler.assignID", {
                        ID: windowID
                    });
                });

                // Register the newly created window in IPC so the higher level IPC class can send message to it
                _IPC2.default._registerWindow(window, windowID);

                // Finish the window initialisation
                await _IPC2.default.send("WindowHandler.initialise", {}, windowID);

                // Store the opened window and delete the opening promise
                this.openedWindows[windowID] = window;
                delete this.openingWindows[windowID];
            });
        }
    }

    /**
     * Close a window (Doesn't properly dispose the modules loaded inside it)
     * @param {number} [windowID] - The ID of the window to close
     * @returns {Promise} Resolves once the window has fulyl closed
     * @async
     * @protected
     */
    static async _close(windowID) {
        // If no windowID is provided, use the ID of the window this code is running in
        if (!windowID) windowID = this.ID;

        // Check if we are trying to open a window with a valid ID
        if (windowID < 1) {
            throw Error("Window IDs must start from 0");
        } else {
            // Check if this code is ran in the main process
            if (!_isMain2.default) {
                // If it is not ran in the main process, forward the call to the main process
                return _IPC2.default.send("WindowHandler.close", {
                    ID: windowID
                });
            } else {
                // If the window is not opened, throw an error
                if (!this.openedWindows[windowID]) throw Error("Window must be opened in order to close");

                // Get the window in order to close it
                const window = this.openedWindows[windowID];

                // Indicate that the window is no longer opened
                this.openedWindows[windowID] = null;

                // Tell IPC that this window no longer exists
                _IPC2.default._deregisterWindow(windowID);

                // Close the actual window
                // Give stuff some time to properly finish
                // TODO: do more research as to why it crashes on immediate close
                window.hide();
                setTimeout(() => {
                    window.close();
                }, 10);
            }
        }
    }

    /**
     * Opens a module in the proper window, will automatically open the window if it isn't already
     * @param {object} moduleData - The settings data for the module to open
     * @param {Registry~Request} request - The request that caused this module to be opened
     * @param {strubg} modulePath - The path to the class of the module to be instantiated
     * @returns {Promise<ChannelSender>} A channel to the module that has been created
     * @async
     * @public
     */
    static async openModuleInstance(moduleData, request, modulePath) {
        // Retrieve the infoormation for where to instanciate the module
        const windowID = moduleData.location.window;
        const sectionID = moduleData.location.section;

        // Open the window that the module should be instanciated in
        await this.__open(windowID);

        // Send a request to main to create the instance, and return its unique request path
        const requestPath = (await _IPC2.default.send("WindowHandler.openModule", {
            request: request,
            modulePath: modulePath,
            moduleData: moduleData
        }, windowID))[0];

        // Check if a request path is returned, if it wasn't, it could be that the window was just closing
        if (requestPath) {
            // Create a channel sender to this module instance and return it
            return _channelHandler2.default.createSender(requestPath, undefined, request.source);
        } else {
            // Try again
            await openModuleInstance.apply(this, arguments);
        }
    }

    /**
     * The initial setup method to be called by this file itself, initialises the static fields of the class
     * @return {undefined}
     * @private
     */
    static __setup() {
        if (_isMain2.default) {
            // Set the own process/window ID to be 0
            this.ID = 0;

            // Forward a window open request to the __open method
            _IPC2.default.on("WindowHandler.open", event => {
                const data = event.data;
                const ID = data.ID;
                return this.__open(ID);
            });

            // Forward a window clsoe request to the __close method
            _IPC2.default.on("WindowHandler.close", event => {
                const data = event.data;
                const ID = data.ID;
                this._close(ID != null ? ID : event.sourceID);
            });

            // Keep track of what windows are currently opened and what windows are currently openeing
            this.openedWindows = {};
            this.openingWindows = {};
        } else {
            // Open a module when a request is received
            _IPC2.default.on("WindowHandler.openModule", async event => {
                const data = event.data;
                try {
                    // Load the module class from the passed module path
                    const ModuleClass = _registry2.default._loadModule(data.modulePath);

                    // Instanciate the module from the class
                    const module = new ModuleClass(data.request);

                    // Wait for the module to finish initialising
                    await module.onInit();

                    // Return the the unique path to the module
                    return module.getPath().toString(true);
                } catch (e) {
                    // TODO: properply handle the error when something goes wrong
                    console.error(`Something went wrong while trying to instantiate ${data.modulePath}`, e);
                    return false;
                }
            });

            // Use low level IPC to assign the correct window ID
            _electron.ipcRenderer.once("WindowHandler.assignID", async (event, args) => {
                const windowID = args.ID;
                window.ID = _IPC2.default.ID = this.ID = windowID;

                // Notify the main process that the ID was assigned
                _electron.ipcRenderer.send("WindowHandler.assignedID", { ID: windowID });
            });

            // Use higher level IPC to finish the initiialisation
            _IPC2.default.once("WindowHandler.initialise", async event => {
                const windowID = this.ID;

                // Load the window settings
                const windowSettings = await _settingsHandler2.default._create("windowCore");
                const settings = windowSettings.get(`windows.${windowID}`);
                window.settings = settings;

                // TODO: setup GUI sections and load the modules
                console.log(settings);
            });
        }
    }
}
exports.default = WindowHandler;
WindowHandler.__setup();
//# sourceMappingURL=windowHandler.js.map