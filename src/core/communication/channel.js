import IPC from "./IPC";

/**
 * A class to send certain messages on a channel
 */
class ChannelSender{
    /**
     * Create a new channel sender, allowing to send messages to the channel
     * @param {String} ID           The unique identifier for the channel
     * @param {String} subChannelID The subChannelID that will be used to access special subchannel methods
     * @param {String} senderID     An ID that the reciever of this channel can respond to (can be left out)
     */
    constructor(ID, subChannelID, senderID){
        this.ID = ID;
        this.subChannelID = subChannelID;
        this.senderID = senderID;

        // Listen for the available message types being send
        this.__setupChannelMessageTypeListener();
    }

    // Protected methods
    /**
     * Either requests methods to be set up according to the available message types,
     * Or sets up the actual methods according to the passed data
     * @param  {Object} types The available message types
     * @return {Undefined} The method returns no useful information
     */
    _setupMethods(types){
        // Check if this call is initiating the setup, or actually setting up the data
        if(!types){ // The call is initiating the setup
            // Check if the channel hasn't been set up already
            if(this.initialised){
                return new Promise((resolve, reject)=>{
                    resolve(this);
                });
            }else{
                // Broadcast a request for all message types of this channel
                IPC.send("channel.requestMessageTypes:"+this.ID);
                return new Promise((resolve, reject)=>{
                    this.finishSetup = resolve;
                });
            }
        }else{ // Call is actually setting up the data
            // Gatyher the relevant message types
            var messageTypes = types.globalListeners;
            var subChannelMessageTypes = types.subChannelListeners[this.subChannelID];
            if(subChannelMessageTypes)
                messageTypes = messageTypes.concat(subChannelMessageTypes);

            // Setup the methods
            for(let key of messageTypes)
                this[key] = function(){
                    this.__sendMessage(key, Array.from(arguments));
                };

            // Notify that the channel is ready
            this.initialised = true;
            if(this.finishSetup) this.finishSetup(this);
        }
    }
    /**
     * Get the channel ID
     * @return {String} The channel ID
     */
    _getID(){
        return this.ID;
    }
    /**
     * Get the subchannel ID
     * @return {String} The subchannel ID
     */
    _getSubChannelID(){
        return this.subChannelID;
    }

    // Private methods
    /**
     * Starts listening for the channel receiver to send its available message types
     * @return {Undefined} The method returns no useful information
     */
    __setupChannelMessageTypeListener(){
        IPC.once("channel.sendMessageTypes:"+this.ID, event=>{
            // Check if all the subchannel methods have already been defined
            if(!this.subChannelID || event.data.subChannelListeners[this.subChannelID]){
                // Store the location to send the messages to
                this.destProcessID = event.sourceID;

                // Setup the methods of this object
                this._setupMethods(event.data);
            }else{
                // Continue listening for message types if the subchannel hadn't been set up yet
                this.__setupChannelMessageTypeListener();
            }
        });
    }
    /**
     * Send a message to the channel receiver
     * @param  {[type]} message The message type
     * @param  {[type]} args    The data to send as an argment array
     * @return {Undefined}      The method returns no useful information
     */
    __sendMessage(message, args){
        // Send the message and relevant data to the process/window that contains the channel receiver
        IPC.send("channel.message:"+this.ID, {
            message: message,
            subChannelID: this.subChannelID,
            senderID: this.senderID,
            data: args
        }, this.destProcessID);
    }
}

/**
 * A class to listen for certain messages sent on a channel
 */
class ChannelReciever{
    /**
     * Create a new channel reciever, allowing to recieve messages from the channel
     * @param {String} ID           The unique identifier for the channel
     * @param {Object} listeners    An object of functions to act on messages indexed by message type
     */
    constructor(ID, listeners){
        this.ID = ID;

        // Create objects to store listeners
        this.globalListeners = listeners;
        this.subChannelListeners = {};

        // Forward IPC messages
        IPC.on("channel.message:"+ID, event=>{
            var data = event.data;

            // Extract the data to build the event to emit in this channel
            var sender = data.senderID;
            var subChannelID = data.subChannelID;
            var message = data.message;
            data = data.data;

            // Emit the event
            this.__emitEvent(message, {
                senderID: sender,
                data: data
            }, subChannelID);
        });

        // Send available message types on request
        IPC.on("channel.requestMessageTypes:"+ID, event=>{
            this.__broadCastMessageTypes(event.sourceID);
        });

        // Send available message types to all processes/renderers
        this.__broadCastMessageTypes("*");
    }
    /**
     * Create a subchannel that can overwrite certain listeners on the channel, or add listeners just for the sub channel
     * @param  {String} ID        The ID of the subchannel
     * @param  {Object} listeners An object of functions to act on messages indexed by message type
     * @return {Undefined}        The method returns no useful information
     */
    createSubChannel(ID, listeners){
        this.subChannelListeners[ID] = listeners;
        this.__broadCastMessageTypes("*");
    }
    /**
     * Delete a subchannel
     * @param  {String} ID The subChannel to remove
     * @return {Undefined} The method returns no useful information
     */
    deleteSubChannel(ID){
        delete this.subChannel[ID];
    }
    /**
     * Get the channel ID
     * @return {String} The channel ID
     */
    getID(){
        return this.ID;
    }

    // Private methods
    /**
     * Emit an event to the registered listener
     * @param  {String} message         The event type to invoke
     * @param  {Object} event           The event data to pass to the listener
     * @param  {[type]} subChannelID    The subchannel of which to take the listener if available
     * @return {Undefined} The method returns no useful information
     */
    __emitEvent(message, event, subChannelID){
        if(subChannelID){
            // Attempt to find message listeners on this subchannel
            var subChannel = this.subChannelListeners[subChannelID];
            var listener = subChannel && subChannel[message];

            // If listeners exist, call them and don't invoke any global listeners
            if(listener){
                listener.call(this, event);
                return;
            }
        }

        // Retrieve listeners
        var listener = this.globalListeners[message];

        // If listeners exist, call them
        if(listener)
            listener.call(this, event);
    }
    /**
     * Broadcast all available message types to the specified renderers/processes
     * @param  {String|[String, ...]} [processes="*"] The renderers/processes to send the message types to
     * @return {Undefined} The method returns no useful information
     */
    __broadCastMessageTypes(processes="*"){
        // Create object to broadcast to the requesting renderer/process
        var messageTypes = {
            globalListeners: Object.keys(this.globalListeners),
            subChannelListeners: {
                // Will be filled by the for loop below
            }
        };

        // Add all the subChannel
        for(var key in this.subChannelListeners)
            messageTypes.subChannelListeners[key] = Object.keys(this.subChannelListeners[key]);

        // Broadcast the messages
        IPC.send("channel.sendMessageTypes:"+this.ID, messageTypes, processes);
    }
}

/**
 * The public class to create channel senders and recievers, as the creation of a channel sender is asynchronous
 */
export default class Channel{
    /**
     * Create a new channel sender, allowing to send messages to the channel
     * @param {String} ID           The unique identifier for the channel
     * @param {String} subChannelID The subChannelID that will be used to access special subchannel methods
     * @param {String} senderID     An ID that the reciever of this channel can respond to (can be left out)
     */
    static createSender(ID, subChannelID, senderID){
        return new ChannelSender(ID, subChannelID, senderID)._setupMethods();
    }
    /**
     * Create a new channel reciever, allowing to recieve messages from the channel
     * @param {String} ID           The unique identifier for the channel
     * @param {Object} listeners    An object of functions to act on messages indexed by message type
     */
    static createReceiver(ID, listeners){
        return new ChannelReciever(ID, listeners);
    }
}
