import Module from "LM:Module";
import ReactConnector from "./reactConnector";

export default class GUIModule extends Module {
    /**
     * Create a GUI module instance which is the core GUI building block for LM
     * This indirectly makes use of React components for rendering
     * @param {Request} request - The request that caused this module to be instantiated
     * @param {boolean} canBeDirectlyInstantiated - Whether or not this module should be instantiatable without a request
     * @constructs GUIModule
     * @public
     */
    constructor(request, canBeDirectlyInstantiated) {
        super(...arguments);

        // Any GUI module should be registered
        if (!request) {
            this.core.initPromise = this.core.registration.registerPromise;

            // Register the module in the registry
            this.__register();
        }

        // Create an element creator for this module. Any element created by this will automatically connect by calling the _setElement method
        this.__init(() => {
            // Extract the unique string representation of this path
            var modulePath = this.getPath().toString(true);

            // set the element creator to an react element that auto connects to this module
            this.core.elementCreator = (
                <ReactConnector module={this} key={Math.random()} />
            );
        });
    }

    /**
     * Checks the settings for associated styling data
     * @param {Object} style - The json representation of the default style
     * @param {ReactConnector~ElementIdentifier} [identifier] - The identifier of the element
     * @returns {Object} The customised json representation of the style
     * @protected
     */
    _getStyle(style, identifier) {
        //TODO: customise the style by checking settings
        return style;
    }

    /**
     * Attaches the React component to this module, will get called by ReactConnecter once a connection is established
     * @param {React.Component} element - The element instance that will render this module's GUI
     * @return {undefined}
     * @protected
     */
    _setElement(element) {
        // Attach the react element such that we can request state changes
        this.core.element = element;
    }

    /**
     * Requests the React component to update its GUI by forcing its state to change
     * @return {undefined}
     * @public
     */
    requestElementUpdate() {
        // If there is an element to update, try to update it by changing the react state
        if (this.core.element)
            this.core.element.setState({
                n: Math.random(), //Just force some change
            });
    }

    /**
     * The method that specifies what the GUI should look like, this should be overriden by any module extending this module
     * @return {undefined}
     * @public
     */
    render() {
        // This render method will get invoked by the react element
        return <div>Not yet added</div>;
    }
}

// Overwrite standard React createElement, such that it allows channelSenders to be passed as elements
const originalCreateElement = React.createElement;
React.createElement = function(type, props, child) {
    // Go through all elements in the array
    for (let i = 2; i < arguments.length; i++) {
        var child = arguments[i];

        // Check if the child contains data with an element creator (ChannelSenders might contain these)
        if (child && child.__data && child.__data.elementCreator) {
            // If it contains an element creator, use that as the child
            arguments[i] = child.__data.elementCreator;

            // If the child is an array, map all items in said array
        } else if (child instanceof Array) {
            arguments[i] = child.map(item => {
                // Check if the child contains data with an element creator (ChannelSenders might contain these)
                if (item && item.__data && item.__data.elementCreator)
                    // If it contains an element creator, use that as the child
                    return item.__data.elementCreator;

                // Otherwise keep the item itself
                return item;
            });
        }
    }

    // Make sure props is defined
    if (!props) props = arguments[1] = {};

    // Create a copy of the style, such that the original style won't be altered if transformed
    props.style = Object.assign({}, props.style);

    // Apply the arguments with channelSenders replaced with their elements, to the original createElement method
    return originalCreateElement.apply(this, arguments);
};
