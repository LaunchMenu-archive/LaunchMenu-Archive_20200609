"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _from = require("babel-runtime/core-js/array/from");

var _from2 = _interopRequireDefault(_from);

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

require("source-map-support/register");

var _IPC = require("../IPC");

var _IPC2 = _interopRequireDefault(_IPC);

var _registry = require("../../registry/registry");

var _registry2 = _interopRequireDefault(_registry);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class ChannelSender {
    /**
     * Create a new channel sender, allowing to send messages to the channel
     * @param {string} ID - The unique identifier for the channel
     * @param {string} subChannelID - The subChannelID that will be used to access special subchannel methods
     * @param {string} senderID - An ID that the reciever of this channel can respond to (can be left out)
     * @constructs ChannelSender
     * @hideconstructor
     */
    constructor(ID, subChannelID, senderID) {
        // Store data in a seperate object such that it isn't confused with channel methods
        this.__data = {
            ID: ID,
            subChannelID: subChannelID,
            senderID: senderID
        };

        // Check if there is a module in the window with this channel ID
        const module = _registry2.default._getModuleInstance(ID);
        if (module) {
            // If there is a module, make direct connection for faster communication
            this.__data.channelReceiver = module.core.channelReceiver;
        }

        // Listen for the available message types being send
        this.__setupChannelMessageTypeListener();
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
                return new _promise2.default.resolve(this);
            } else {
                // Broadcast a request for all message types of this channel
                _IPC2.default.send("channel.requestMessageTypes:" + this.__data.ID);

                // Returned a promise that will be resolved once this method is called with the methods provided as an argument (will happen automatically)
                return new _promise2.default((resolve, reject) => {
                    this.__data.finishSetup = resolve;
                });
            }
        } else {
            // Call is actually setting up the data
            // Gather the relevant message types
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
     * Starts listening for the channel receiver to send its available message types
     * @returns {undefined}
     * @private
     */
    __setupChannelMessageTypeListener() {
        _IPC2.default.once("channel.sendMessageTypes:" + this.__data.ID, event => {
            // Check if all the subchannel methods have already been defined
            const containsSubchannel = !this.__data.subChannelID || event.data.subChannelListeners[this.__data.subChannelID];
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
     * Send a message to the channel receiver
     * @param  {string} message - The message type
     * @param  {Object[]} args - The data to send as an argument array
     * @returns {undefined}
     * @async
     * @private
     */
    __sendMessage(message, args) {
        // Check whether to make an IPC call or direct message to a module
        if (this.__data.channelReceiver) {
            // Emit an event on the channel sender directly
            const response = this.__data.channelReceiver._emitEvent(message, {
                senderID: this.__data.senderID,
                data: args
            }, this.__data.subChannelID);

            // Check if the response is a promise already
            if (response instanceof _promise2.default) {
                return response.then(data => {
                    // Mimick the expected IPC response
                    return [data];
                });
            } else {
                // Mimick the expected IPC response
                return _promise2.default.resolve([response]);
            }
        } else {
            // Send the message and relevant data to the process/window that contains the channel receiver
            return _IPC2.default.send("channel.message:" + this.__data.ID, {
                message: message,
                subChannelID: this.__data.subChannelID,
                senderID: this.__data.senderID,
                data: args
            }, this.__data.destProcessID);
        }
    }
}
exports.default = ChannelSender;
//# sourceMappingURL=channelSender.js.map