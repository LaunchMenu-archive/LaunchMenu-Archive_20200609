import isMain from "../../isMain";
import IPC from "../IPC";

class GlobalData{
    constructor(ID){
        this.ID = ID;
        this.dataListener = event=>{
            const data = event.data;
            this.__setField(data.path, data.value, data.type);
        };
        this.listeners = {};
        IPC.on("GlobalData.notifyChange."+ID, this.dataListener);
    }
    change(data){
        return IPC.send("GlobalData.change", {
            ID: this.ID,
            data: data
        });
    }
    get(path){
        if(!path) path = "";
        let pathParts = path.split(".");
        let data = this.data;
        let variable;
        while((variable = pathParts.shift()) && data && variable.length>0)
            data = data[variable];
        return data;
    }

    on(type, listener){
        let listeners = this.listeners[type];
        if(!listeners)
            listeners = this.listeners[type] = [];
        if(listeners){
            const index = listeners.indexOf(listener);
            if(index==-1) listeners.push(listener);
        }
    }
    off(type, listener){
        const listeners = this.listeners[type];
        if(listeners){
            const index = listeners.indexOf(listener);
            if(index!=-1) listeners.splice(index, 1);
            if(listeners.length==0) delete this.listeners[type];
        }
    }
    dispose(){
        IPC.off("GlobalData.notifyChange."+ID, this.dataListener);
    }

    _setData(data){
        this.data = data;
    }
    __setField(path, value, type){
        let pathParts = path.split(".");
        let field = pathParts.pop();
        const data = this.get(pathParts.join("."));
        if(data){
            if(type=="delete"){
                delete data[field];
                this.__emitEvent(type, path);
                this.__emitEvent("update", path, {
                    type: "delete"
                });
            }else{
                data[field] = value;
                this.__emitEvent(type, path, {
                    value: value
                });
                this.__emitEvent("update", path, {
                    type: type,
                    value: value
                });
            }
        }
    }
    __emitEvent(type, path, event){
        if(!event) event = {};
        event.fullPath = path;
        if(!event.type) event.type = type;
        event.allData = this.data;

        const pathParts = path.split(".");
        let subPath = "";
        while(true){
            let listeners = this.listeners[subPath+type];
            if(listeners){
                event.path = pathParts.join(".");
                listeners.forEach(listener=>{
                    listener.call(this, event);
                });
            }

            if(pathParts.length==0) break;
            subPath += pathParts.shift()+".";
        }
    }
}
class GlobalDataHandler{
    static create(ID, defaultData){
        return IPC.send("GlobalData.retrieve", {
            ID: ID,
            defaultData: defaultData
        }, 0).then(responses=>{
            console.log(responses);
            const globalData = new GlobalData(ID);
            globalData._setData(responses[0]);
            return globalData;
        });
    }
    static __changeField(ID, currentData, newData, path){
        if(currentData && currentData.__proto__==Object.prototype){
            if(newData && newData.__proto__==Object.prototype){
                for(let key in newData)
                    currentData[key] = this.__changeField(ID, currentData[key], newData[key], path?path+"."+key:key);
                return currentData;
            }else{
                if(newData===undefined){
                    IPC.send("GlobalData.notifyChange."+ID, {
                        type: "delete",
                        path: path
                    });
                }else{
                    IPC.send("GlobalData.notifyChange."+ID, {
                        type: "change",
                        path: path,
                        value: newData
                    });
                }
            }
        }else{
            if(newData===undefined){
                IPC.send("GlobalData.notifyChange."+ID, {
                    type: "delete",
                    path: path
                });
            }else if(newData && newData.__proto__==Object.prototype){
                IPC.send("GlobalData.notifyChange."+ID, {
                    type: currentData?"change":"create",
                    path: path,
                    value: {}
                });
                for(let key in newData)
                    this.__changeField(ID, undefined, newData[key], path?path+"."+key:key);
            }else if(currentData===undefined){
                IPC.send("GlobalData.notifyChange."+ID, {
                    type: "create",
                    path: path,
                    value: newData
                });
            }else{
                IPC.send("GlobalData.notifyChange."+ID, {
                    type: "change",
                    path: path,
                    value: newData
                });
            }
        }
        return newData;
    }
    static __setup(){
        if(isMain){
            this.globalDataInstances = {};

            IPC.on("GlobalData.change", event=>{
                const data = event.data;
                let instance = this.globalDataInstances[data.ID];
                if(instance)
                    this.__changeField(data.ID, instance, data.data, "");
                return false;
            });
            IPC.on("GlobalData.retrieve", event=>{
                if(!this.globalDataInstances[event.data.ID])
                    this.globalDataInstances[event.data.ID] = event.data.defaultData;
                return this.globalDataInstances[event.data.ID];
            });
        }
    }
}
GlobalDataHandler.__setup();
export default GlobalDataHandler;
