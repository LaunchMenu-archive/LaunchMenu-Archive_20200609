import {app, BrowserWindow, ipcMain, ipcRenderer} from "electron";
import Url from "url";
import Path from "path";
import SettingsHandler from "../communication/data/settings/settingsHandler";
import ChannelHandler from "../communication/channel";
import IPC from "../communication/IPC";
import RequestPath from "../registry/requestPath";
import Registry from "../registry/registry";
import isMain from "../isMain";

let windowSettings;
let settingsPromise;
function settingsLoaded() {
    if (!settingsPromise)
        settingsPromise = SettingsHandler._create(
            "windowCore",
            {
                windows: {},
            },
            0
        ).then(settings => {
            windowSettings = settings;
        });
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
        if (windowID < 1) {
            throw Error("Window IDs must start from 0");
        }

        if (!isMain) {
            return IPC.send("WindowHandler.open", {
                ID: windowID,
            });
        } else {
            if (this.openedWindows[windowID]) return;

            if (this.openingWindows[windowID])
                return this.openingWindows[windowID];

            return (this.openingWindows[windowID] = settingsLoaded().then(
                async () => {
                    let settings = windowSettings.get(`windows.${windowID}`);
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

                    const window = new BrowserWindow({
                        width: settings.width,
                        height: settings.height,
                    });
                    window.loadURL(
                        Url.format({
                            pathname: Path.join(__dirname, "windowIndex.html"),
                            protocol: "file:",
                            slashes: true,
                        })
                    );

                    window.openDevTools();

                    await new Promise((resolve, reject) => {
                        window.webContents.on("did-finish-load", () => {
                            resolve();
                        });
                    });

                    // Assign an ID to the window (LM IPC uses this, so we need to use lower level IPC until compelted)
                    await new Promise((resolve, reject) => {
                        const waitForAssignment = (event, args) => {
                            if (args.ID == windowID) {
                                ipcMain.removeListener(
                                    "WindowHandler.assignedID",
                                    waitForAssignment
                                );
                                resolve();
                            }
                        };
                        ipcMain.on(
                            "WindowHandler.assignedID",
                            waitForAssignment
                        );

                        // Send the ID assignment to complete initialisation
                        window.webContents.send("WindowHandler.assignID", {
                            ID: windowID,
                        });
                    });

                    IPC._registerWindow(window, windowID);
                    await IPC.send("WindowHandler.initialise", {}, windowID);

                    this.openedWindows[windowID] = window;
                    delete this.openingWindows[windowID];
                }
            ));
        }
    }

    /**
     * Close a window (Doesn't properly dispose the modules loaded inside it)
     * @param {number} windowID - The ID of the window to close
     * @returns {Promise} Resolves once the window has fulyl closed
     * @async
     * @protected
     */
    static async _close(windowID) {
        if (!windowID) windowID = this.ID;
        if (windowID < 1) {
            throw Error("Window IDs must start from 0");
        } else {
            if (!isMain) {
                return IPC.send("WindowHandler.close", {
                    ID: windowID,
                });
            } else {
                if (!this.openedWindows[windowID])
                    throw Error("Window must be opened in order to close");

                const window = this.openedWindows[windowID];
                this.openedWindows[windowID] = null;
                IPC._deregisterWindow(windowID);

                // Give stuff some time to properly finish
                // TODO do more research as to why it crashes on immediate close
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
        const windowID = moduleData.location.window;
        const sectionID = moduleData.location.section;
        await this.__open(windowID);
        const requestPath = (await IPC.send(
            "WindowHandler.openModule",
            {
                request: request,
                modulePath: modulePath,
                moduleData: moduleData,
            },
            windowID
        ))[0];

        if (requestPath) {
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
            this.ID = 0;
            IPC.on("WindowHandler.open", event => {
                const data = event.data;
                const ID = data.ID;
                return this.__open(ID);
            });
            IPC.on("WindowHandler.close", event => {
                const data = event.data;
                const ID = data.ID;
                this._close(ID != null ? ID : event.sourceID);
            });

            this.openedWindows = {};
            this.openingWindows = {};
        } else {
            // Methods for setup within the window
            IPC.on("WindowHandler.openModule", async event => {
                const data = event.data;
                try {
                    const moduleExport = Registry._loadModule(data.modulePath);
                    const ModuleClass = moduleExport.default;
                    const module = new ModuleClass(data.request);
                    await module.onInit();
                    return module.getPath().toString(true);
                } catch (e) {
                    console.error(
                        `Something went wrong while trying to instantiate ${
                            data.modulePath
                        }`,
                        e
                    );
                    return false;
                }
            });

            ipcRenderer.once("WindowHandler.assignID", async (event, args) => {
                const windowID = args.ID;
                window.ID = IPC.ID = this.ID = windowID;

                // Notify the main process that the ID was assigned
                ipcRenderer.send("WindowHandler.assignedID", {ID: windowID});
            });
            IPC.once("WindowHandler.initialise", async event => {
                const windowID = this.ID;

                // Load the window settings
                const windowSettings = await SettingsHandler._create(
                    "windowCore"
                );
                const settings = windowSettings.get(`windows.${windowID}`);
                window.settings = settings;

                // TODO setup GUI sections and load the modules
                console.log(settings);
            });
        }
    }
}
WindowHandler.__setup();
