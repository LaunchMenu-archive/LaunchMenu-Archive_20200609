import Channel from "../communication/channel";
import Registry from "./registry";
import WindowHandler from "../window/windowHandler";
import RequestPath from "./requestPath";

export default class Module{
    constructor(request, canBeDirectlyInstantiated){
        let registerPromiseResolve = null;
        const registerPromise = new Promise((resolve, reject)=>{
            registerPromiseResolve = resolve;
        });
        this.core = {
            registered: false,
            registerPromise: registerPromise,
            registerPromiseResolve: registerPromiseResolve,
            initPromise: registerPromise, // Other methods may build upon this promise
            channelReceiver: null,
            request: request,
            channels: {
                source: null
            },
        };
        if(request){
            this.__register();
        }else if(!canBeDirectlyInstantiated){
            const error = Error("This module can only be instantiated from a handle request");
            reject(error);
            throw error;
        }

    }
    __register(){
        if(this.core.registered===false){
            this.core.registered = null; //adding
            if(this.core.request){
                const requestPath = new RequestPath(this.core.request.source);
                this.core.requestPath = requestPath.augmentPath(this.getClass().modulePath, 0);
                WindowHandler._registerModuleInstance(this);
                Registry._registerModuleInstance(this).then(ID=>{
                    Channel.createReceiver(
                        this.core.requestPath.toString(true),
                        this.__createChannelMethods()
                    ).then(receiver=>{
                        this.core.channelReceiver = receiver;
                        Channel.createSender(
                            this.core.request.source,
                            this.core.request.type,
                            this.core.requestPath.toString(true)
                        ).then(channel=>{
                            this.core.channels.source = channel;
                            window.channel = channel; // TODO remove (for testing);
                            this.core.registered = true;
                            this.core.registerPromiseResolve(this);
                        });
                    });
                });
            }else{
                this.core.requestPath = new RequestPath(this.getClass().modulePath);
                WindowHandler._registerModuleInstance(this);
                Registry._registerModuleInstance(this).then(ID=>{
                    Channel.createReceiver(
                        this.core.requestPath.toString(true),
                        this.__createChannelMethods()
                    ).then(receiver=>{
                        this.core.channelReceiver = receiver;
                        this.core.registered = true;
                        this.core.registerPromiseResolve(this);
                    });
                });
            }
        }
    }
    __init(method){
        return this.core.initPromise = this.core.initPromise.then(method);
    }
    __onRegister(then, ctch){
        return this.core.registerPromise.then(then).catch(ctch);
    }
    onInit(then, ctch){
        return this.core.initPromise.then(then).catch(ctch);
    }

    // Registry related methods
    toString(){
        return this.getClass().toString();
    }
    getClass(){
        return this.__proto__.constructor;
    }
    getPath(){
        return this.core.requestPath;
    }
    static toString(){
        return this.modulePath;
    }

    // Channel related methods
    __getMethods(){
        const output = {};
        const ignoreRegex = /constructor|^__/g;
        let nextProto = this.__proto__;
        while(nextProto && nextProto!=Module.prototype){
            const proto = nextProto;
            nextProto = proto.__proto__;

            Object.getOwnPropertyNames(proto).forEach(varName=>{
                const variable = this.__proto__[varName];
                if(variable instanceof Function && !ignoreRegex.test(varName)){
                    output[varName] = this.__proto__[varName];
                }
            });
        }
        return output;
    }
    __createChannelMethods(){
        const output = {};
        const methods = this.__getMethods();
        Object.keys(methods).forEach(methodName=>{
            const method = methods[methodName];
            output[methodName] = event=>{
                return method.apply(this, event.data);
            };
        });
        output.close = event=>{
            console.log("close", this);
            return this.dispose();
        };
        output.closeDescendant = event=>{
            return this.__disposeDescendant.apply(this, event.data);
        };
        return output;
    }
    __disposeDescendant(requestPath, type){
        const channels = this.core.channels[type];
        if(channels){
            if(channels instanceof Array){
                this.core.channels[type] = channels.filter(channel=>{
                    return channel._getID() != requestPath;
                });

                if(this.core.channels[type].length == 0)
                    delete this.core.channels[type];
            }else if(channels._getID() == requestPath){
                delete this.core.channels[type];
            }
        }
    }
    dispose(){
        if(this.core.registered){
            this.core.registered = undefined; // Removing
            const channelDisposalPromises = [];
            Object.keys(this.core.channels).forEach(type=>{
                if(type!="source"){
                    const channels = this.core.channels[type];
                    if(channels instanceof Array){
                        channelDisposalPromises.concat(channels.map(channel=>{
                            return channel.close();
                        }));
                    }else{
                        channelDisposalPromises.push(channels.close());
                    }
                }
            });

            return Promise.all(channelDisposalPromises).then(()=>{
                return this.core.channels.source.closeDescendant(this.getPath().toString(true), this.core.request.type);
            }).then(()=>{
                return Registry._deregisterModuleInstance(this);
            }).then(()=>{
                this.core.registered = false; // Removed
                return Promise.resolve(WindowHandler._deregisterModuleInstance(this));
            });
        }
    }

    /**
     * Request modules to handle the passed data and establish a connection with these modules
     * @param  {{type:String, execute:String|function, data:Object, source:Module, methods:Object}} request The information on how to handle the data
     * @return {Promise} The Promise that shall return the channels created to communicate with the modules
     */
    requestHandle(request){
        if(!this.registered) this.__register();
        return this.__onRegister(()=>{
            if(!request.methods)
            request.methods = {};
            request.source = this;

            if(this.core.channels[request.type])
            return this.core.channels[request.type];

            this.core.channelReceiver.createSubChannel(request.type, request.methods);
            return Registry.requestHandle(request).then(channels=>{
                this.core.channels[request.type] = channels;
                return channels;
            });
        });
    }
}
