import Channel from "../communication/channel";
import Registry from "./registry";
export default class Module{
    constructor(request, canBeDirectlyInstantiated){
        this.ready = new Promise((resolve, reject)=>{
            if(request){
                const requestPath = new RequestPath(request.origin);
                this.requestPath = requestPath.augmentPath(this.getClsas().modulePath, 0);
                    Registry._deregisterModuleInstance(this).then(ID=>{
                        Channel.createSender(
                            request.origin,
                            request.type,
                            this.requestPath.toString(true)
                        ).then(channel=>{
                            this.origin = channel;
                            resolve(this);
                        });
                    });
                })
            }else if(!canBeDirectlyInstantiated){
                const error = Error("This module can only be instantiated from a handle request");
                reject(error);
                throw error;
            }else{
                resolve(this);
            }
        });
    }
    toString(){
        return this.getClass().toString();
    }
    getClass(){
        return this.__proto__.constructor;
    }
    getPath(){
        return this.requestPath;
    }

    __ready(){
        return this.ready;
    }
    static toString(){
        return this.modulePath;
    }
}
