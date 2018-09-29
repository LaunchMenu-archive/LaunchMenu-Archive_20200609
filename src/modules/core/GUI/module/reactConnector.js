import React from "React";

/**
 * An object that can be used to identify specific elements
 * @typedef {object} ReactConnector~ElementIdentifier
 * @property {string} type - The type of the element
 * @property {ReactConnector~ElementIdentifier} [parent] - The identifier of the parent of the element
 * @property {string} [class] - The class name of the element
 * @property {number} [index] - The index of the element within its parent
 */

/**
 * Creates a ReactConnector which is a React Component which will connect a module and use it's render method to determine the GUI
 * @class
 * @public
 */
export default class ReactConnector extends React.Component {
    /**
     * The default react mount method, gets called when the component mounted
     * @returns {undefined}
     * @public
     */
    componentDidMount() {
        // When this component mounts, connect to the attached module
        this.props.module._setElement(this);
    }

    /**
     * The default react un mount method, gets called just before the component will unmount
     * @returns {undefined}
     * @public
     */
    componentWillUnmount() {
        // When this component unmounts, disconnect from the attached module
        this.props.module._setElement(null);
    }

    /**
     * Gets the identifier for an element to be used in a selector path
     * @param {Object} element - The react element
     * @param {ReactConnector~ElementIdentifier} [parent] - The identifier of the parent
     * @param {number} [index] - A numeric ID for the element index
     * @returns {ReactConnector~ElementIdentifier} An object that only contains information that can be used for identification
     * @private
     */
    __getElementIdentifier(element, parent, index) {
        const ret = {
            // The element type
            type: element.type,
        };

        // A class name if provided by the element
        if (element.props.className) ret.class = element.props.className;

        // An index if provided
        if (index) ret.index = index;

        // The parent identifier if provided
        if (parent) ret.parent = parent;

        // Return the result
        return ret;
    }

    /**
     * Recursively goes through a react element, and replaces the static style by a dynamic version
     * @param {Object} element - The react element to get the dynamic style for
     * @param {ReactConnector~ElementIdentifier} [identifier] - The identifier of the element
     * @return {undefined}
     * @private
     */
    __setDynamicStyle(element, identifier) {
        // Make sure a identifier exists, otherwise define it
        if (!identifier) identifier = this.__getElementIdentifier(element);

        // Check if the element has a style to adapt, otherwise create an empty style
        const curStyle = element.props.style;

        // Get the new style of the element
        const newStyle = this.props.module._getStyle(curStyle, identifier);

        // Replace the current style by the new style (element.props.style is read only)
        // Delete all currenty fields
        Object.keys(curStyle).forEach(key => {
            if (newStyle[key] === undefined) delete curStyle[key];
        });
        // Assign all new fields
        Object.assign(curStyle, newStyle);

        // Check if the element has any children that requires their style to be made dynamic
        if (element.props.children && element.props.children instanceof Array)
            element.props.children.forEach((child, index) => {
                // Make sure it is a plain html element
                if (typeof child.type == "string")
                    // Recursively get the dynamic style for each child
                    this.__setDynamicStyle(
                        child,
                        this.__getElementIdentifier(child, identifier, index)
                    );
            });
    }

    /**
     * The default react render method
     * @returns {Object} the React element to render
     * @public
     */
    render() {
        // When the component renders, ask the module what to render
        const element = this.props.module.render();

        // Replace the element's style by a dynamic style (alterable by the settings)
        this.__setDynamicStyle(element);

        // Return the element to be rendered
        return element;
    }
}
