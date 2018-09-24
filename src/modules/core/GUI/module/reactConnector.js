import React from "React";

/**
 * Creates a ReactConnector which is a React Component which will connect a module and use it's render method to determine the GUI
 * @class
 * @public
 */
export default class ReactConnector extends React.Component {
    componentDidMount() {
        // When this component mounts, connect to the attached module
        this.props.module._setElement(this);
    }
    componentWillUnmount() {
        // When this component unmounts, disconnect from the attached module
        this.props.module._setElement(null);
    }
    render() {
        // When the component renders, ask the module what to render
        return this.props.module.render();
    }
}
