"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ChannelReceiver = exports.ChannelSender = undefined;

var _keys = require("babel-runtime/core-js/object/keys");

var _keys2 = _interopRequireDefault(_keys);

var _from = require("babel-runtime/core-js/array/from");

var _from2 = _interopRequireDefault(_from);

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

var Registry = require("../../../dist/core/registry/registry").default;

require("source-map-support/register");

var _IPC = require("./IPC");

var _IPC2 = _interopRequireDefault(_IPC);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * A class to send certain messages on a channel
 */
class ChannelSender {
    /**
     * Create a new channel sender, allowing to send messages to the channel
     * @param {String} ID           The unique identifier for the channel
     * @param {String} subChannelID The subChannelID that will be used to access special subchannel methods
     * @param {String} senderID     An ID that the reciever of this channel can respond to (can be left out)
     */
    constructor(ID, subChannelID, senderID) {
        this.__data = {
            ID: ID,
            subChannelID: subChannelID,
            senderID: senderID
        };

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
    _setupMethods(types) {
        // Check if this call is initiating the setup, or actually setting up the data
        if (!types) {
            // The call is initiating the setup
            // Check if the channel hasn't been set up already
            if (this.__data.initialised) {
                return new _promise2.default.resolve(this);
            } else {
                // Broadcast a request for all message types of this channel
                _IPC2.default.send("channel.requestMessageTypes:" + this.__data.ID);
                return new _promise2.default((resolve, reject) => {
                    this.__data.finishSetup = resolve;
                });
            }
        } else {
            // Call is actually setting up the data
            // Gatyher the relevant message types
            let messageTypes = types.globalListeners;
            const subChannelMessageTypes = types.subChannelListeners[this.__data.subChannelID];
            if (subChannelMessageTypes) messageTypes = messageTypes.concat(subChannelMessageTypes);

            // Setup the methods
            for (let key of messageTypes) this[key] = function () {
                return this.__sendMessage(key, (0, _from2.default)(arguments));
            };

            // Notify that the channel is ready
            this.__data.initialised = true;
            if (this.__data.finishSetup) this.__data.finishSetup(this);
        }
    }
    /**
     * Get the channel ID
     * @return {String} The channel ID
     */
    _getID() {
        return this.__data.ID;
    }
    /**
     * Get the subchannel ID
     * @return {String} The subchannel ID
     */
    _getSubChannelID() {
        return this.__data.subChannelID;
    }

    // Private methods
    /**
     * Starts listening for the channel receiver to send its available message types
     * @return {Undefined} The method returns no useful information
     */
    __setupChannelMessageTypeListener() {
        _IPC2.default.once("channel.sendMessageTypes:" + this.__data.ID, event => {
            // Check if all the subchannel methods have already been defined
            if (!this.__data.subChannelID || event.data.subChannelListeners[this.__data.subChannelID]) {
                // Store the location to send the messages to
                this.__data.destProcessID = event.sourceID;

                // Setup the methods of this object
                this._setupMethods(event.data);
            } else {
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
    __sendMessage(message, args) {
        // Send the message and relevant data to the process/window that contains the channel receiver
        return _IPC2.default.send("channel.message:" + this.__data.ID, {
            message: message,
            subChannelID: this.__data.subChannelID,
            senderID: this.__data.senderID,
            data: args
        }, this.__data.destProcessID);
    }
}

/**
 * A class to listen for certain messages sent on a channel
 */
class ChannelReceiver {
    /**
     * Create a new channel reciever, allowing to recieve messages from the channel
     * @param {String} ID           The unique identifier for the channel
     * @param {Object} listeners    An object of functions to act on messages indexed by message type
     */
    constructor(ID, listeners) {
        this.ID = ID;

        // Create objects to store listeners
        this.globalListeners = listeners;
        this.subChannelListeners = {};

        this.IPClisteners = {
            // Forward IPC messages
            message: event => {
                let data = event.data;

                // Extract the data to build the event to emit in this channel
                const sender = data.senderID;
                const subChannelID = data.subChannelID;
                const message = data.message;
                data = data.data;

                // Emit the event
                return this.__emitEvent(message, {
                    senderID: sender,
                    data: data
                }, subChannelID);
            },
            // Send available message types on request
            requestMessageTypes: event => {
                this.__broadCastMessageTypes(event.sourceID);
            }
        };
        _IPC2.default.on("channel.message:" + ID, this.IPClisteners.message);
        _IPC2.default.on("channel.requestMessageTypes:" + ID, this.IPClisteners.requestMessageTypes);

        // Send available message types to all processes/renderers
        this.__broadCastMessageTypes("*");
    }
    /**
     * Create a subchannel that can overwrite certain listeners on the channel, or add listeners just for the sub channel
     * @param  {String} ID        The ID of the subchannel
     * @param  {Object} listeners An object of functions to act on messages indexed by message type
     * @return {Undefined}        The method returns no useful information
     */
    createSubChannel(ID, listeners) {
        this.subChannelListeners[ID] = listeners;
        this.__broadCastMessageTypes("*");
    }
    /**
     * Delete a subchannel
     * @param  {String} ID The subChannel to remove
     * @return {Undefined} The method returns no useful information
     */
    deleteSubChannel(ID) {
        delete this.subChannel[ID];
    }
    /**
     * Get the channel ID
     * @return {String} The channel ID
     */
    getID() {
        return this.ID;
    }

    /**
     * Dispose of all data
     * @return {Undefined} The method returns no useful information
     */
    close() {
        _IPC2.default.off("channel.message:" + this.ID, this.IPClisteners.message);
        _IPC2.default.off("channel.requestMessageTypes:" + this.ID, this.IPClisteners.requestMessageTypes);
    }

    // Private methods
    /**
     * Emit an event to the registered listener
     * @param  {String} message         The event type to invoke
     * @param  {Object} event           The event data to pass to the listener
     * @param  {[type]} subChannelID    The subchannel of which to take the listener if available
     * @return {Undefined} The method returns no useful information
     */
    __emitEvent(message, event, subChannelID) {
        if (subChannelID) {
            // Attempt to find message listeners on this subchannel
            const subChannel = this.subChannelListeners[subChannelID];
            const listener = subChannel && subChannel[message];

            // If listeners exist, call them and don't invoke any global listeners
            if (listener) return listener.call(this, event);
        }

        // Retrieve listeners
        const listener = this.globalListeners[message];

        // If listeners exist, call them
        if (listener) return listener.call(this, event);
    }
    /**
     * Broadcast all available message types to the specified renderers/processes
     * @param  {String|[String, ...]} [processes="*"] The renderers/processes to send the message types to
     * @return {Undefined} The method returns no useful information
     */
    __broadCastMessageTypes(processes = "*") {
        // Create object to broadcast to the requesting renderer/process
        const messageTypes = {
            globalListeners: (0, _keys2.default)(this.globalListeners),
            subChannelListeners: {
                // Will be filled by the for loop below
            }
        };

        // Add all the subChannel
        for (let key in this.subChannelListeners) messageTypes.subChannelListeners[key] = (0, _keys2.default)(this.subChannelListeners[key]);

        // Broadcast the messages
        _IPC2.default.send("channel.sendMessageTypes:" + this.ID, messageTypes, processes);
    }
}
exports.ChannelSender = ChannelSender;
exports.ChannelReceiver = ChannelReceiver;
/**
 * The public class to create channel senders and recievers, as the creation of a channel sender is asynchronous
 */

class Channel {
    /**
     * Create a new channel sender, allowing to send messages to the channel
     * @param {String} ID           The unique identifier for the channel
     * @param {String} subChannelID The subChannelID that will be used to access special subchannel methods
     * @param {String} senderID     An ID that the reciever of this channel can respond to (can be left out)
     */
    static createSender(ID, subChannelID, senderID) {
        return new ChannelSender(ID, subChannelID, senderID)._setupMethods();
    }
    /**
     * Create a new channel reciever, allowing to recieve messages from the channel
     * @param {String} ID           The unique identifier for the channel
     * @param {Object} listeners    An object of functions to act on messages indexed by message type
     */
    static createReceiver(ID, listeners) {
        return _promise2.default.resolve(new ChannelReceiver(ID, listeners));
    }
}
exports.default = Channel;
//# sourceMappingURL=channel.js.map