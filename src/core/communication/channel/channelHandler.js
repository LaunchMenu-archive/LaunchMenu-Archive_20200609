import ChannelReceiver from "./ChannelReceiver";
import ChannelSender from "./ChannelSender";

/**
 * @classdesc The public class to create channel senders and recievers, as the creation of a channel sender is asynchronous
 * @class
 * @hideconstructor
 */
export default class ChannelHandler {
    /**
     * Create a new channel sender, allowing to send messages to the channel
     * @param {string} ID - The unique identifier for the channel
     * @param {string} subChannelID - The subChannelID that will be used to access special subchannel methods
     * @param {string} senderID - An ID that the reciever of this channel can respond to (can be left out)
     * @returns {Promise<ChannelSender>} An instance of the ChannelSender class
     * @public
     * @async
     */
    static createSender(ID, subChannelID, senderID) {
        return new ChannelSender(ID, subChannelID, senderID)._setupMethods();
    }
    /**
     * Create a new channel reciever, allowing to recieve messages from the channel
     * @param {string} ID - The unique identifier for the channel
     * @param {Object} listeners - An object of functions to act on messages indexed by message type
     * @returns {Promise<ChannelReceiver>} An instance of the ChannelReceiver class
     * @public
     * @async
     */
    static createReceiver(ID, listeners) {
        return Promise.resolve(new ChannelReceiver(ID, listeners));
    }
}
