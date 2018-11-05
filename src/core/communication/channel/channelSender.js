import IPC from "../IPC";
import Registry from "../../registry/registry";

export default class ChannelSender {
    /**
     * Create a new channel sender, allowing to send messages to the channel
     * @param {(string|RequestPath)} ID - The unique identifier for the channel
     * @param {string} subChannelID - The subChannelID that will be used to access special subchannel methods
     * @param {(string|Module|RequestPath)} [senderID] - An ID that the reciever of this channel can respond to (can be left out)
     * @constructs ChannelSender
     * @hideconstructor
     */
    constructor(ID, subChannelID, senderID) {
        // Normalize the ID
        ID = ID.toString(true);

        // Normalize the senderID
        if (senderID) {
            if (senderID.getPath) senderID = senderID.getPath();
            senderID = senderID.toString(true);
        }

        // Store data in a seperate object such that it isn't confused with channel methods
        this.__data = {
            ID: ID,
            subChannelID: subChannelID,
            senderID: senderID,
            disabled: false,
            messageBuffer: [],
        };

        // Check if we can assign the receiver directly to improve efficiency
        this.__checkForReceiver();

        // Listen for the available message types being send
        this.__setupChannelMessageTypeListener();

        // Listen for state changes of the receiver
        this.__setupReceiverChangeListeners();
    }

    /**
     * Checks if there is a receiver for this channel in the window, and assigns it if there is
     * @returns {undefined}
     * @private
     */
    __checkForReceiver() {
        // Check if there is a module in the window with this channel ID
        const module = Registry._getModuleInstance(this.__data.ID);
        if (module) {
            // If there is a module, make direct connection for faster communication
            this.__data.channelReceiver = module.core.channelReceiver;
        } else {
            // Otherwise delete any potentiually previously assigned receiver
            delete this.__data.channelReceiver;
        }
    }

    /**
     * Either requests methods to be set up according to the available message types,
     * Or sets up the actual methods according to the passed data
     * @param  {Object} [types] - The available message types to set
     * @returns {undefined}
     * @protected
     * @async
     */
    _setupMethods(types) {
        // Check if this call is initiating the setup, or actually setting up the data
        if (!types) {
            // The call is initiating the setup
            // Check if the channel hasn't been set up already
            if (this.__data.initialised) {
                return new Promise.resolve(this);
            } else {
                // Broadcast a request for all message types of this channel
                IPC.send("channel.requestMessageTypes:" + this.__data.ID);

                // Returned a promise that will be resolved once this method is called with the methods provided as an argument (will happen automatically)
                return new Promise((resolve, reject) => {
                    this.__data.finishSetup = resolve;
                });
            }
        } else {
            // Call is actually setting up the data
            // Gather the relevant message types
            let messageTypes = types.globalListeners;
            const subChannelMessageTypes =
                types.subChannelListeners[this.__data.subChannelID];
            if (subChannelMessageTypes)
                messageTypes = messageTypes.concat(subChannelMessageTypes);

            // Setup the methods
            for (let key of messageTypes)
                this[key] = function() {
                    return this.__sendMessage(key, Array.from(arguments));
                };

            // Notify that the channel is ready
            this.__data.initialised = true;
            if (this.__data.finishSetup) this.__data.finishSetup(this);
        }
    }

    /**
     * Get the channel ID
     * @returns {string} The channel ID
     * @protected
     */
    _getID() {
        return this.__data.ID;
    }
    /**
     * Get the subchannel ID
     * @returns {string} The subchannel ID
     * @protected
     */
    _getSubChannelID() {
        return this.__data.subChannelID;
    }

    /**
     * Returns the identifier of the channelSender, including sub channel and senderID
     * @returns {ChannelHander~ChannelIdentifier} The channel identifier
     * @protected
     */
    _getChannelIdentifier() {
        return {
            ID: this.__data.ID,
            subChannelID: this.__data.subChannelID,
            senderID: this.__data.senderID,
        };
    }

    /**
     * Send a message to the channel receiver
     * @param  {string} message - The message type
     * @param  {Object[]} args - The data to send as an argument array
     * @returns {undefined}
     * @async
     * @private
     */
    async __sendMessage(message, args) {
        // Check if the receiver is not temprorarly disabled
        if (this.__data.disabled) {
            // Create a promise, and store the resolver
            let resolver;
            const promise = new Promise(resolve => {
                resolver = resolve;
            });

            // Store the message and attach the resolver
            this.__data.messageBuffer.push({
                message: message,
                args: args,
                resolve: resolver,
            });

            // Return the promise
            return promise;
        }

        // Check whether to make an IPC call or direct message to a module
        if (this.__data.channelReceiver) {
            // Emit an event on the channel sender directly
            let response = this.__data.channelReceiver._emitEvent(
                message,
                {
                    senderID: this.__data.senderID,
                    data: args,
                },
                this.__data.subChannelID
            );

            // Normalize the response to a promise
            if (!(response instanceof Promise))
                response = Promise.resolve(response);

            // Return the result
            return response;
        } else {
            // Send the message and relevant data to the process/window that contains the channel receiver
            const responses = await IPC.send(
                "channel.message:" + this.__data.ID,
                {
                    message: message,
                    subChannelID: this.__data.subChannelID,
                    senderID: this.__data.senderID,
                    data: args,
                },
                this.__data.destProcessID
            );

            // We should only get a response from a single receiver, so return that
            return responses[0];
        }
    }

    /**
     * Empties the messageBuffer
     * @returns {undefined}
     * @private
     */
    __sendMessagesFromBuffer() {
        // Get the message buffer
        const messageBuffer = this.__data.messageBuffer;

        // Clear the stored buffer
        this.__data.messageBuffer = [];

        // Go through all messages in the buffer and send them
        messageBuffer.forEach(item => {
            // Send the message and store the result
            const result = this.__sendMessage(item.message, item.args);

            // Resolve the promise using the result
            item.resolve(result);
        });
    }

    // IPC listener methods
    /**
     * Starts listening for the channel receiver to send its available message types
     * @returns {undefined}
     * @private
     */
    __setupChannelMessageTypeListener() {
        IPC.once("channel.sendMessageTypes:" + this.__data.ID, event => {
            // Check if all the subchannel methods have already been defined
            const containsSubchannel =
                !this.__data.subChannelID ||
                event.data.subChannelListeners[this.__data.subChannelID];
            if (containsSubchannel) {
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
     * Starts listening for moving of the channel receiver
     * @returns {undefined}
     * @private
     */
    __setupReceiverChangeListeners() {
        // Define and store the listeners
        this.__data.IPClisteners = {
            // Check when the receiver is moved to another process
            processChange: event => {
                // Get the process that the channel moved to
                const ID = event.data;

                // Set the new destionation process ID
                this.__data.destProcessID = ID;

                // Check if we can assign the receiver directly to improve efficiency
                this.__checkForReceiver();
            },

            // Check for when the receiver temporarely can't receive messages
            receiverDisabled: event => {
                // Check whether we switched to enabled or disabled
                const disabled = event.data;

                // Store the new state
                this.__data.disabled = disabled;

                // If we switched to enabled again, send all messages
                if (!disabled) {
                    this.__sendMessagesFromBuffer();
                }
            },
        };

        // Set up the message listeners
        IPC.on(
            "channel.sendProcessChange:" + this.__data.ID,
            this.__data.IPClisteners.processChange
        );
        IPC.on(
            "channel.sendDisabled:" + this.__data.ID,
            this.__data.IPClisteners.receiverDisabled
        );
    }

    /**
     * Disposes of all data
     * @returns {undefined}
     * @public
     */
    dispose() {
        // Clear the IPC listeners
        IPC.off(
            "channel.sendProcessChange:" + this.__data.ID,
            this.__data.IPClisteners.processChange
        );
        IPC.off(
            "channel.sendDisabled:" + this.__data.ID,
            this.__data.IPClisteners.receiverDisabled
        );
    }
}
