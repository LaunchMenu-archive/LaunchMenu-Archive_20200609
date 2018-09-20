import React from "React";
export default class Component extends React.Component {
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
