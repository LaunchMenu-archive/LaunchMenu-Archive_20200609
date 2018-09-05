import {app, BrowserWindow, ipcMain, ipcRenderer} from "electron";
import Url from "url";
import Path from "path";
import SettingsHandler from "../communication/data/settings/settingsHandler";
import ChannelHandler from "../communication/channel/channelHandler";
import IPC from "../communication/IPC";
import Registry from "../registry/registry";
import isMain from "../isMain";

let windowSettings;
let settingsPromise;
function settingsLoaded() {
    // Create a promise if not present yet
    if (!settingsPromise)
        // create a settings object to store window data
        settingsPromise = SettingsHandler._create("windowCore", {
            windows: {},
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
export default class WindowHandler {
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
        if (!isMain) {
            // If it is not ran in the main process, forward the call to the main process
            return IPC.send("WindowHandler.open", {
                ID: windowID,
            });
        } else {
            // If the window is already opened return
            if (this.openedWindows[windowID]) return;

            // If the window is already opening, return its promise
            if (this.openingWindows[windowID])
                return this.openingWindows[windowID];

            // Create a new opening promise indicating that the window is currently opening, but only after the settings have loaded
            return (this.openingWindows[windowID] = settingsLoaded().then(
                async () => {
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
                                            module: "none",
                                        },
                                    },
                                },
                            },
                        });
                        settings = windowSettings.get(`windows.${windowID}`);
                    }

                    // Create a browser window according to these settings
                    const window = new BrowserWindow({
                        width: settings.width,
                        height: settings.height,
                    });

                    // Load the window index path into this window
                    window.loadURL(
                        Url.format({
                            pathname: Path.join(__dirname, "windowIndex.html"),
                            protocol: "file:",
                            slashes: true,
                        })
                    );

                    // Open dev tools for debugging TODO: add some option to disable/enable this
                    window.openDevTools();

                    // Wait for the window to finish loading
                    await new Promise((resolve, reject) => {
                        window.webContents.on("did-finish-load", () => {
                            resolve();
                        });
                    });

                    // Assign an ID to the window (LM IPC uses this, so we need to use lower level IPC until compeleted)
                    await new Promise((resolve, reject) => {
                        // A listener that resolves the promise when a IPC assignment event is received, in which case the listener is also removed
                        const waitForAssignment = (event, args) => {
                            if (args.ID == windowID) {
                                ipcMain.removeListener(
                                    "WindowHandler.assignedID",
                                    waitForAssignment
                                );
                                resolve();
                            }
                        };

                        // Enable the listener
                        ipcMain.on(
                            "WindowHandler.assignedID",
                            waitForAssignment
                        );

                        // Send the ID assignment to complete initialisation
                        window.webContents.send("WindowHandler.assignID", {
                            ID: windowID,
                        });
                    });

                    // Register the newly created window in IPC so the higher level IPC class can send message to it
                    IPC._registerWindow(window, windowID);

                    // Finish the window initialisation
                    await IPC.send("WindowHandler.initialise", {}, windowID);

                    // Store the opened window and delete the opening promise
                    this.openedWindows[windowID] = window;
                    delete this.openingWindows[windowID];
                }
            ));
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
            if (!isMain) {
                // If it is not ran in the main process, forward the call to the main process
                return IPC.send("WindowHandler.close", {
                    ID: windowID,
                });
            } else {
                // If the window is not opened, throw an error
                if (!this.openedWindows[windowID])
                    throw Error("Window must be opened in order to close");

                // Get the window in order to close it
                const window = this.openedWindows[windowID];

                // Indicate that the window is no longer opened
                this.openedWindows[windowID] = null;

                // Tell IPC that this window no longer exists
                IPC._deregisterWindow(windowID);

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
        const requestPath = (await IPC.send(
            "WindowHandler.openModule",
            {
                request: request,
                modulePath: modulePath,
                moduleData: moduleData,
            },
            windowID
        ))[0];

        // Check if a request path is returned, if it wasn't, it could be that the window was just closing
        if (requestPath) {
            // Create a channel sender to this module instance and return it
            return ChannelHandler.createSender(
                requestPath,
                undefined,
                request.source
            );
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
        if (isMain) {
            // Set the own process/window ID to be 0
            this.ID = 0;

            // Forward a window open request to the __open method
            IPC.on("WindowHandler.open", event => {
                const data = event.data;
                const ID = data.ID;
                return this.__open(ID);
            });

            // Forward a window clsoe request to the __close method
            IPC.on("WindowHandler.close", event => {
                const data = event.data;
                const ID = data.ID;
                this._close(ID != null ? ID : event.sourceID);
            });

            // Keep track of what windows are currently opened and what windows are currently openeing
            this.openedWindows = {};
            this.openingWindows = {};
        } else {
            // Open a module when a request is received
            IPC.on("WindowHandler.openModule", async event => {
                const data = event.data;
                try {
                    // Load the module class from the passed module path
                    const moduleExport = Registry._loadModule(data.modulePath);
                    const ModuleClass = moduleExport.default;

                    // Instanciate the module from the class
                    const module = new ModuleClass(data.request);

                    // Wait for the module to finish initialising
                    await module.onInit();

                    // Return the the unique path to the module
                    return module.getPath().toString(true);
                } catch (e) {
                    // TODO: properply handle the error when something goes wrong
                    console.error(
                        `Something went wrong while trying to instantiate ${
                            data.modulePath
                        }`,
                        e
                    );
                    return false;
                }
            });

            // Use low level IPC to assign the correct window ID
            ipcRenderer.once("WindowHandler.assignID", async (event, args) => {
                const windowID = args.ID;
                window.ID = IPC.ID = this.ID = windowID;

                // Notify the main process that the ID was assigned
                ipcRenderer.send("WindowHandler.assignedID", {ID: windowID});
            });

            // Use higher level IPC to finish the initiialisation
            IPC.once("WindowHandler.initialise", async event => {
                const windowID = this.ID;

                // Load the window settings
                const windowSettings = await SettingsHandler._create(
                    "windowCore"
                );
                const settings = windowSettings.get(`windows.${windowID}`);
                window.settings = settings;

                // TODO: setup GUI sections and load the modules
                console.log(settings);
            });
        }
    }
}
WindowHandler.__setup();
