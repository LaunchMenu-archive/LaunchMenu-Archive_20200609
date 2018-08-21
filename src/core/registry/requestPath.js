import IPC from "../communication/IPC";
import Module from "./module";
class RequestPath{
    constructor(path){
        if(typeof(path)!="string" && !(path instanceof Array))
            path = path.toString();
        if(typeof(path)=="string"){
            path = path
                    .split("->")
                    .map(module=>{
                        module = module.split(":");
                        return {
                            module: module[0],
                            ID: Number(module[1]||0)
                        };
                    });
        }

        this.modules = path;
    }
    toString(unique){
        return this.modules
            .map(module=>{
                if(unique)
                    return module.module+":"+module.ID;
                return module.module+"";
            })
            .join("->");
    }
    getSubPath(removeCount){
        const requestPath = new RequestPath(this.toString(true));
        const modules = requestPath.modules;
        modules.splice(modules.length-removeCount, removeCount);
        return requestPath;
    }
    augmentPath(module, ID){
        if(typeof(module)!="string")
            module = module.toString();
        const requestPath = new RequestPath(this.toString(true));
        requestPath.modules.push({
            module: module,
            ID: Number(ID||0)
        });
        return requestPath;
    }
    getModuleID(index){
        if(index==undefined)
            index = this.modules.length-1;
        return this.modules[index];
    }
}
export default RequestPath;
