import IPC from "../communication/IPC";
class RequestPath{
    constructor(path){
        if(typeof(path)=="string"){
            path = path
                    .split("->")
                    .map(module=>{
                        module = module.split(":");
                        return {
                            module: module[0],
                            ID: module[1]||0
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
        const requestPath = new RequestPath(this.toString(true));
        requestPath.modules.push({
            module: module,
            ID: ID
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
