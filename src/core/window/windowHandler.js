import {app as app, BrowserWindow as BrowserWindow} from "electron";
import Url from "url";
import Path from "path";
import SettingsHandler from '../communication/data/settingsHandler';
import Channel from "../communication/channel";
import IPC from "../communication/IPC";
import RequestPath from "../registry/requestPath";
import Registry from "../registry/registry";
import isMain from "../isMain";


let windowSettings;
const settingsLoaded = SettingsHandler._create("windowCore", {
    windows: {},
}).then(settings=>{
    windowSettings = settings;
});

export default class WindowHandler{
    static __open(windowID){
        if(windowID<1){
            return Promise.reject(Error("Window IDs must start from 0"));
        }

        if(!isMain){
            return IPC.send("WindowHandler.open", {
                ID: windowID
            });
        }else{
            if(this.openedWindows[windowID])
                return Promise.resolve();

            return settingsLoaded.then(()=>{
                return new Promise((res, rej)=>{
                    const settings = windowSettings.get(`windows.${windowID}`);
                    if(settings){
                        res(settings);
                    }else{
                        windowSettings.change({
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
                        }).then(result=>{
                            res(windowSettings.get(`windows.${windowID}`));
                        });
                    }
                }).then(settings=>{
                    return new Promise((res, rej)=>{
                        try{
                            const window = new BrowserWindow({
                                width: settings.width,
                                height: settings.height
                            });
                            window.loadURL(Url.format({
                                pathname: Path.join(__dirname, "windowIndex.html"),
                                protocol: 'file:',
                                slashes: true
                            }));

                            window.openDevTools();
                            this.openedWindows[windowID] = window;
                            IPC._registerWindow(window, windowID);

                            window.webContents.on("did-finish-load", ()=>{
                                const finishedSetup = IPC.send("WindowHandler.assignID", {ID: windowID}, windowID);
                                finishedSetup.then(()=>{
                                    res();
                                });
                            });
                        }catch(error){
                            rej({
                                message: "The window data seems to have been corrupted ",
                                error: error
                            });
                        }
                    });
                });
            });
        }
    }
    static __close(windowID){
        if(windowID<1){
            return Promise.reject(Error("Window IDs must start from 0"));
        }else if(!this.openedWindows[windowID]){
            return Promise.reject(Error("Window must be opened in order to close"));
        }else{
            const window = this.openedWindows[windowID];
            IPC._deregisterWindow(window, windowID);
            window.close();
            this.openedWindows[windowID] = null;
        }
    }
    static openModuleInstance(moduleData, request, modulePath){
        const windowID = moduleData.location.window;
        const sectionID = moduleData.location.section;
        return this.__open(windowID).then(()=>{
            return IPC.send("WindowHandler.openModule", {
                request: request,
                modulePath: modulePath,
                moduleData: moduleData
            }, windowID).then(responses=>{
                if(responses[0]){
                    return Channel.createSender(responses[0], undefined, request.source);
                }else{
                    return false;
                }
            });
        });
    }

    static _registerModuleInstance(module){
        this.openedModules.push(module);
    }
    static _deregisterModuleInstance(module){
        const index = this.openedModules.indexOf(module);
        if(index!==-1) this.openedModules.splice(index, 1);
        if(this.openedModules.length==0){
            IPC.send("WindowHandler.close");
        }
    }

    static __setup(){
        this.openedModules = [];
        if(isMain){
            IPC.on("WindowHandler.open", event=>{
                const data = event.data;
                const ID = data.ID;
                return this.__open(ID);
            });
            IPC.on("WindowHandler.close", event=>{
                this.__close(event.sourceID);
            });

            this.openedWindows = {};
        }else{ // Methods for setup within the window
            IPC.on("WindowHandler.openModule", event=>{
                const data = event.data;
                try{
                    const moduleExport = Registry._loadModule(data.modulePath);
                    const ModuleClass = moduleExport.default;
                    return new Promise((res, rej)=>{
                        const module = new ModuleClass(data.request);
                        module.onInit(()=>{
                            res(module.getPath().toString(true));
                        });
                    });
                }catch(e){
                    console.error(`Something went wrong while trying to instantiate ${data.modulePath}`, e);
                    return false;
                }
            });

            IPC.on("WindowHandler.assignID", event=>{
                const data = event.data;
                const windowID = data.ID;
                window.ID = windowID;

                return SettingsHandler._create("windowCore").then(windowSettings=>{
                    const settings = windowSettings.get(`windows.${windowID}`);
                    window.settings = settings;
                    console.log(settings);

                    // TODO setup GUI sections and load the modules
                    return new Promise((res, rej)=>{

                        // Indicate the setup has completed
                        res();
                    });
                });
            });
        }
    }
}
WindowHandler.__setup();
