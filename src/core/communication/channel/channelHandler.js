import ChannelReceiver from "./channelReceiver";
import ChannelSender from "./channelSender";

/**
 * @typedef {Object} ChannelHander~ChannelIdentifier
 * @property {(string|RequestPath)} ID - The unique identifier for the channel, or all the 3 channel fields in 1 object
 * @property {string} subChannelID - The subChannelID that will be used to access special subchannel methods
 * @property {(string|Module|RequestPath)} [senderID] - An ID that the reciever of this channel can respond to
 */

/**
 * @classdesc The public class to create channel senders and recievers, as the creation of a channel sender is asynchronous
 * @class
 * @hideconstructor
 */
export default class ChannelHandler {
    /**
     * Create a new channel sender, allowing to send messages to the channel
     * @param {(string|ChannelHander~ChannelIdentifier|RequestPath)} ID - The unique identifier for the channel, or all data at once
     * @param {string} subChannelID - The subChannelID that will be used to access special subchannel methods
     * @param {(string|Module|RequestPath)} [senderID] - An ID that the reciever of this channel can respond to
     * @returns {Promise<ChannelSender>} An instance of the ChannelSender class
     * @public
     * @async
     */
    static createSender(ID, subChannelID, senderID) {
        let sender;

        // Check if 'ID' is really ChannelIdentifier
        if (ID.ID) {
            // If so use the paramaters of it
            sender = new ChannelSender(ID.ID, ID.subChannelID, ID.senderID);
        } else {
            // Otherwise just use the 3 parameters as fields
            sender = new ChannelSender(ID, subChannelID, senderID);
        }

        // Return the result of the method setup
        return sender._setupMethods();
    }

    /**
     * Create a new channel reciever, allowing to recieve messages from the channel
     * @param {(string|RequestPath)} ID - The unique identifier for the channel
     * @param {Object} listeners - An object of functions to act on messages indexed by message type
     * @returns {Promise<ChannelReceiver>} An instance of the ChannelReceiver class
     * @public
     * @async
     */
    static createReceiver(ID, listeners) {
        return Promise.resolve(new ChannelReceiver(ID, listeners));
    }
}
