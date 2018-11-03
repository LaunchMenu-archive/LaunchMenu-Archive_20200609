import IPC from "../IPC";

/**
 * An object to store data of a sent message
 * @typedef {object} ChannelReceiver~ChannelEvent
 * @property {number} senderID - The ID of the channel that sent the message
 * @property {*} data - The data that was sent with the event
 */

export default class ChannelReceiver {
    /**
     * Create a new channel reciever, allowing to recieve messages from the channel
     * @param {string} ID - The unique identifier for the channel
     * @param {Object} listeners - An object of functions to act on messages indexed by message type
     * @constructs ChannelReceiver
     * @hideconstructor
     */
    constructor(ID, listeners) {
        this.ID = ID;

        // Create objects to store listeners
        this.globalListeners = listeners;
        this.subChannelListeners = {};

        this.IPClisteners = {
            // Forward IPC messages to channel listeners
            message: event => {
                let data = event.data;

                // Extract the data to build the event to emit in this channel
                const sender = data.senderID;
                const subChannelID = data.subChannelID;
                const message = data.message;
                data = data.data;

                // Emit the event
                return this._emitEvent(
                    message,
                    {
                        senderID: sender,
                        data: data,
                    },
                    subChannelID
                );
            },
            // Send available message types on request
            requestMessageTypes: event => {
                this.__broadCastMessageTypes(event.sourceID);
            },
        };

        // Set up the message listeners
        IPC.on("channel.message:" + ID, this.IPClisteners.message);
        IPC.on(
            "channel.requestMessageTypes:" + ID,
            this.IPClisteners.requestMessageTypes
        );

        // Send available message types to all processes/renderers
        this.__broadCastMessageTypes("*");
    }
    /**
     * Create a subchannel that can overwrite certain listeners on the channel, or add listeners just for the sub channel
     * @param  {string} ID - The ID of the subchannel
     * @param  {Object} listeners - An object of functions to act on messages indexed by message type
     * @returns {undefined}
     * @public
     */
    createSubChannel(ID, listeners) {
        this.subChannelListeners[ID] = listeners;
        this.__broadCastMessageTypes("*");
    }

    /**
     * Delete a subchannel
     * @param  {string} ID - The subChannel to remove
     * @returns {undefined}
     * @public
     */
    deleteSubChannel(ID) {
        delete this.subChannel[ID];
    }
    /**
     * Get the channel ID
     * @return {string} The channel ID
     * @public
     */
    getID() {
        return this.ID;
    }

    /**
     * Dispose of all data
     * @returns {undefined}
     * @public
     */
    dispose() {
        // Clear the IPC listeners
        IPC.off("channel.message:" + this.ID, this.IPClisteners.message);
        IPC.off(
            "channel.requestMessageTypes:" + this.ID,
            this.IPClisteners.requestMessageTypes
        );
    }

    /**
     * Emit an event to the registered listener
     * @param  {string} message - The event type to invoke
     * @param  {ChannelReceiver~ChannelEvent} event - The event data to pass to the listener
     * @param  {(string|undefined)} subChannelID - The subchannel of which to take the listener if available
     * @returns {undefined}
     * @protected
     */
    _emitEvent(message, event, subChannelID) {
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

    // Methods to broadcast data to all the possible senders that exist for this receiver
    /**
     * Broadcasts all available message types to the specified processes/windows
     * @param  {(string|string[])} [processes="*"] The processes/windows to send the message types to
     * @returns {undefined}
     * @async
     * @private
     */
    __broadCastMessageTypes(processes = "*") {
        // Get the message types
        const messageTypes = this._getMessageTypes();

        // Broadcast the messages
        return IPC.send(
            "channel.sendMessageTypes:" + this.ID,
            messageTypes,
            processes
        );
    }

    /**
     * Get a single object with all available messages types
     * @returns {Object} The object containing all the available message types
     * @protected
     */
    _getMessageTypes() {
        // Create object to broadcast to the requesting renderer/process
        const messageTypes = {
            globalListeners: Object.keys(this.globalListeners),
            subChannelListeners: {
                // Will be filled by the for loop below
            },
        };

        // Add all the subChannel
        for (let key in this.subChannelListeners)
            messageTypes.subChannelListeners[key] = Object.keys(
                this.subChannelListeners[key]
            );

        // Return the message types
        return messageTypes;
    }

    /**
     * Broadcasts the new process ID that this receiver is in to the specified processes/windows
     * @param  {(string|string[])} [processes="*"] The processes/windows to send the new process location to
     * @returns {undefined}
     * @async
     * @protected
     */
    _broadCastProcessChange(processes = "*") {
        // Get the process ID that this receiver is located in
        const ID = IPC.getID();

        // Broadcast the new process ID
        return IPC.send("channel.sendProcessChange:" + this.ID, ID, processes);
    }

    /**
     * Broadcasts whether or not this receiver is disabled to the specified processes/windows
     * @param {boolean} disabled - Whether or not the receiver is disabled
     * @param  {(string|string[])} [processes="*"] The processes/windows to send the state to
     * @returns {undefined}
     * @async
     * @protected
     */
    _broadCastDisabled(disabled, processes = "*") {
        // Broadcast the state
        return IPC.send("channel.sendDisabled:" + this.ID, disabled, processes);
    }
}
