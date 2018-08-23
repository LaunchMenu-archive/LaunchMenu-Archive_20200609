import {default as GlobalDataHandler, GlobalData}  from './globalDataHandler';
import isMain from "../../isMain";
import IPC from "../IPC";
import Path from "path";
import FS from "fs";

function escapePath(path){
    return path.replace(/\>/g, "").replace(/\\\//g, "_");
}
const dataDir = Path.resolve(__dirname, "../../../../data/settings");
const prefix = "Settings:";
export class Settings extends GlobalData{
    constructor(ID, fileName){
        super(ID);
        this.fileName = fileName;
    }
    dispose(dontSave){
        if(!dontSave) this.save();
        return super.dispose();
    }
    save(){
        return IPC.send("Settings.save", {
            ID: this.ID,
            fileName: this.fileName
        });
    }
    reload(){
        return IPC.send("Settings.reload", {
            ID: this.ID,
            fileName: this.fileName
        });
    }
}
class SettingsHandler{
    static create(module, defaultData){
        const path = module.getPath().toString();
        const ID = prefix+path;
        return this._create(ID, defaultData, path);
    }
    static async _create(ID, defaultData, fileName){
        if(!fileName) fileName = ID;
        const data = (async IPC.send("Settings.retrieve", {
            ID: ID,
            fileName: fileName,
            defaultData: defaultData
        }, 0))[0];

        const settings = new Settings(ID, prefix);
        settings._setData(data);
        return settings;
    }

    // Some file manipulation methods
    static __getFile(path){
        if(FS.existsSync(path)){
            try{
                const data = JSON.parse(FS.readFileSync(path));
                return data;
            }catch(e){
                console.error(`Something went wrong while retrieving ${path}:`, e);
            }
        }
    }
    static __setFile(path, data){
        return FS.writeFileSync(path, JSON.stringify(data, null, 4));
    }
    static __getPath(fileName){
        return Path.join(dataDir, escapePath(fileName))+".json";
    }
    static _getModuleFile(requestPath){
        return this.__getFile(Path.join(dataDir, escapePath(requestPath.toString()))+".json");
    }

    // All the listeners that are required in the main process
    static __setup(){
        if(isMain){
            IPC.on("Settings.save", event=>{
                const ID = event.data.ID;
                const fileName = event.data.fileName;
                const instance = GlobalDataHandler.globalDataInstances[ID];
                if(instance){
                    return this.__setFile(this.__getPath(fileName), instance);
                }
                return false;
            });
            IPC.on("Settings.reload", event=>{
                const ID = event.data.ID;
                const fileName = event.data.fileName;
                const instance = GlobalDataHandler.globalDataInstances[ID];
                const data = this.__getFile(this.__getPath(fileName));
                if(instance && data){
                    // Set undefined fields literally to undefined such that they will be deleted
                    Object.keys(instance).forEach(field=>{
                        if(data[field]===undefined)
                            data[field]=undefined;
                    });

                    // Change all the data
                    GlobalDataHandler._changeField(ID, instance, data, "");
                    return data;
                }
                return false;
            });

            // Add dedicated retrieve method that checks if data is stored in a file first
            IPC.on("Settings.retrieve", event=>{
                const ID = event.data.ID;
                const fileName = event.data.fileName;
                if(!GlobalDataHandler.globalDataInstances[ID]){
                    const data = this.__getFile(this.__getPath(fileName));
                    if(data){
                        GlobalDataHandler.globalDataInstances[ID] = data;
                    }else{
                        GlobalDataHandler.globalDataInstances[ID] = event.data.defaultData;
                    }
                }
                return GlobalDataHandler.globalDataInstances[ID];
            });
        }
    }
}
SettingsHandler.__setup();
export default SettingsHandler;
