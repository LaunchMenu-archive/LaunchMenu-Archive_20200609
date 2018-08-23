import Channel from "../communication/channel";
import Registry from "./registry";
import WindowHandler from "../window/windowHandler";
import RequestPath from "./requestPath";
import BooleanProcess from "../utils/booleanProcess";

export default class Module{
    constructor(request, canBeDirectlyInstantiated){
        let registerPromiseResolve = null;
        const registerPromise = new Promise((resolve, reject)=>{
            registerPromiseResolve = resolve;
        });
        this.core = {
            registration: {
                registered: new BooleanProcess(0),
                registerPromise: registerPromise,
                registerPromiseResolve: registerPromiseResolve,
            },
            initPromise: registerPromise, // Other methods may build upon this promise
            handlers: {

            },
            source: {

            }
        };

        if(request){
            this.core.source = {
                request: request
            };
            this.__register();
        }else if(!canBeDirectlyInstantiated){
            const error = Error("This module can only be instantiated from a handle request");
            reject(error);
            throw error;
        }

    }
    async __register(){
        if(this.core.registration.registered.false()){
            this.core.registration.registered.turningTrue(true);
            const source = this.core.source;
            if(source.request){
                const requestPath = new RequestPath(source.request.source);
                source.requestPath = requestPath.augmentPath(this.getClass().modulePath, 0);
                const ID = await Registry._registerModuleInstance(this);

                this.core.channelReceiver = await Channel.createReceiver(
                    source.requestPath.toString(true),
                    this.__createChannelMethods()
                );
                source.channel = await Channel.createSender(
                    source.request.source,
                    source.request.type,
                    source.requestPath.toString(true)
                );

                this.core.registration.registered.true(true);
                this.core.registration.registerPromiseResolve(this);
            }else{
                source.requestPath = new RequestPath(this.getClass().modulePath);
                const ID = await Registry._registerModuleInstance(this);
                this.core.channelReceiver = await Channel.createReceiver(
                    source.requestPath.toString(true),
                    this.__createChannelMethods()
                );
                this.core.registration.registered.true(true);
                this.core.registration.registerPromiseResolve(this);
            }
        }
    }
    __init(method){
        return this.core.initPromise = this.core.initPromise.then(method);
    }
    __onRegister(then, ctch){
        return this.core.registration.registerPromise.then(then).catch(ctch);
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
        return this.core.source.requestPath;
    }
    static getPath(){
        return this.modulePath;
    }
    static toString(){
        return this.getPath();
    }

    // Channel related methods
    __getMethods(){
        const output = {};
        const channelMethodRegex = /^\$/g;
        let nextProto = this.__proto__;
        while(nextProto && nextProto!=Module.prototype){
            const proto = nextProto;
            nextProto = proto.__proto__;

            Object.getOwnPropertyNames(proto).forEach(varName=>{
                const variable = this.__proto__[varName];
                if(variable instanceof Function && channelMethodRegex.test(varName)){
                    output[varName.replace(channelMethodRegex, "")] = this.__proto__[varName];
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
                return method.apply(this, [event].concat(event.data));
            };
        });
        output.close = event=>{
            return this.dispose();
        };
        output.closeDescendant = event=>{
            return this.__disposeDescendant.apply(this, event.data);
        };
        return output;
    }
    __disposeDescendant(requestPath, type){
        const handler = this.core.handlers[type];
        if(handler){
            const channels = handler.channels;
            if(channels instanceof Array){
                handler.channels = channels.filter(channel=>{
                    return channel._getID() != requestPath;
                });

                if(handler.channels.length == 0)
                    delete this.core.handlers[type];
            }else if(channels._getID() == requestPath){
                delete this.core.handlers[type];
            }
        }
    }
    async dispose(){
        if(this.core.registration.registered.turningTrue())
            throw Error("Module is still registering");
        if(this.core.registration.registered.true()){
            this.core.registration.registered.turningFalse(true);
            const channelDisposalPromises = [];
            Object.keys(this.core.handlers).forEach(type=>{
                const handler = this.core.handlers[type];
                const channels = handler.channels;
                if(channels instanceof Array){
                    channelDisposalPromises.concat(channels.map(channel=>{
                        console.log(channel);
                        return channel.close();
                    }));
                }else{
                    console.log(channels);
                    channelDisposalPromises.push(channels.close());
                }
            });

            await Promise.all(channelDisposalPromises);
            if(this.core.source.channel){
                await this.core.source.channel.closeDescendant(this.getPath().toString(true), this.core.source.request.type)
            }

            this.core.registration.registered.false(true);
            this.core.channelReceiver.close();

            await Registry._deregisterModuleInstance(this);
        }
    }

    /**
     * Request modules to handle the passed data and establish a connection with these modules
     * @param  {{type:String, execute:String|function, data:Object, source:Module, methods:Object}} request The information on how to handle the data
     * @return {Promise} The Promise that shall return the channels created to communicate with the modules
     */
    async requestHandle(request){
        if(this.core.registration.registered.turningFalse())
            throw Error("Module is currently deregistering");

        if(this.core.registration.registered.false()){
            await this.__register();
            // await this.__onRegister();
        }else if(this.core.registration.registered.turningTrue()){
            await this.__onRegister();
        }

        if(!request.methods)
            request.methods = {};

        request.source = this;

        if(this.core.handlers[request.type])
            return this.core.handler[request.type].channels;

        this.core.channelReceiver.createSubChannel(request.type, request.methods);
        const channels = await Registry.requestHandle(request);
        this.core.handlers[request.type] = {
            request: request,
            channels: channels
        };
        return channels;
    }
}
