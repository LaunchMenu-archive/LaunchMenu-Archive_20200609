import {ipcMain, ipcRenderer} from "electron";
// import ExtendedJSON from "./extendedJSON";
import ExtendedJSON from "../communication/extendedJSON";
class IPC{
    /**
     * Send data to another window or the main script
     * @param  {String} type The event type to send (preferbly prefixed with some module ID)
     * @param  {Object} data The data to send
     * @param  {String|[String, ...]} [dest="*"] The window ID(s) to send this data to
     * @return {Undefined} The method returns no useful information
     */
    static send(type, data, dest="*", source=0){
        var encodedData = ExtendedJSON.encode(data);
        if(this._isRenderer()){ // If the call is made from a renderer
            // Send the data to the main process such that it can spread it to the appropriate windows
            var forwardData = {dest:dest, type:type, sourceID:this.ID, data:encodedData};
            ipcRenderer.send("IPC.forward", forwardData);
        }else{
            // Send the data to the appropriate windows
            var windows = this._getWindows();

            // Format the destination
            if(dest=="*"){
                // If we want to target all windows (and the main thread), create a list of all destinations
                dest = [];
                for(var i in windows)
                    dest.push(i);
            }else if(!(dest instanceof Array))
                // If only a single destination is provided, still make sure it is an array
                dest = [dest];

            // Go through all destionations and send the data
            dest.forEach(id =>{
                if(id==0){ // Target the main process
                    // Emit the event if the main window is a destination of the event
                    this.__emitEvent(type, {sourceID:source, data:data});
                }else{ // Target a window
                    var window = windows[Number(id)];
                    if(window)
                        window.webContents.send("IPC.recieve", {type:type, sourceID:source, data:encodedData});
                }
            });
        }
    }
    /**
     * Listen for data being send by the main process or renderers
     * @param  {String} type The type of event to listen for
     * @param  {Function(event)} handler The function to handle the event occuring
     * @return {Undefined} The method returns no useful information
     */
    static on(type, handler){
        if(!this.listeners[type]) this.listeners[type] = [];
        var listeners = this.listeners[type];
        var index = listeners.indexOf(handler);
        if(index==-1) listeners.push(handler);
    }
    /**
     * Listen for data being send by the main process or renderers, but only listen for it once
     * @param  {String} type The type of event to listen for
     * @param  {Function(event)} handler The function to handle the event when occuring
     * @return {Undefined} The method returns no useful information
     */
    static once(type, handler){
        var orHandler = handler;
        handler = ()=>{
            this.off(type, handler);
            orHandler.apply(this, arguments);
        };
        this.on(type, handler);
    }
    /**
     * Stop listening for data being send by the main process or renderers
     * @param  {String} type The type of event that is being listened for
     * @param  {Function(event)} handler The function that handles the event when occuring
     * @return {Undefined} The method returns no useful information
     */
    static off(type, handler){
        var listeners = this.listeners[type];
        if(listeners){
            var index = listeners.indexOf(handler);
            if(index!=-1) listeners.splice(index, 1);
        }
    }

    /**
     * Gets the identifier of this process or renderer which other processes or renderers can use to communicate
     * @return {Number} The numeric identifier
     */
    static getID(){
        return this.ID;
    }

    // Protected methods
    /**
     * Get all the windows that are registered and can be communicated with (only works in the main process)
     * @return {[BrowserWindow]} The actual windows
     */
    static _getWindows(){
        return this.windows;
    }
    /**
     * Register a window such that it can start communicating with other processes and windows
     * @param  {BrowserWindow} window The window to register
     * @return {Undefined} The method returns no useful information
     */
    static _registerWindow(window){
        this.windows[window.id] = window;
    }
    /**
     * Deregister a window for when it is destroyed, such that it is no longer listed as a valid window
     * @param  {BrowserWindow} window The window to deregister
     * @return {Undefined} The method returns no useful information
     */
    static _deregisterWindow(window){
        var index = this.windows.indexOf(window);
        if(index!=-1) delete this.windows[index];
    }
    /**
     * A method to check whether this is the main process or a renderer
     * @return {Boolean} The boolean indicating whether this is a renderer
     */
    static _isRenderer(){
        return !!ipcRenderer;
    }

    // Private methods
    /**
     * Emit an event to all the registered listeners
     * @param  {String} type  The event type to invoke
     * @param  {Object} event The event data to pass to the listeners
     * @return {Undefined} The method returns no useful information
     */
    static __emitEvent(type, event){
        var listeners = this.listeners[type];
        if(listeners){
            listeners.forEach(listener=>{
                listener.call(this, event);
            });
        }
    }
    /**
     * The initial setup method to be called by this file itself, initialises the static fields of the class
     * @return {Undefined} The method returns no useful information
     */
    static __setup(){
        this.windows = [this];
        this.listeners = {};

        if(this._isRenderer()){
            this.ID = require('electron').remote.getCurrentWindow().id; // Starts from 1

            // Emit the event to all listeners whenever it is recieved
            ipcRenderer.on("IPC.recieve", (event, arg)=>{
                this.__emitEvent(arg.type, {sourceID:arg.sourceID, data:ExtendedJSON.decode(arg.data)});
            });
        }else{ // Means it runs in a renderer
            this.ID = 0;

            // Forward the call made by a renderer, and passing the sourceID to track the origin
            ipcMain.on("IPC.forward", (event, arg)=>{
                this.send(arg.type, ExtendedJSON.decode(arg.data), arg.dest, arg.sourceID);
            });
        }
    }
}
IPC.__setup();
export default IPC;
