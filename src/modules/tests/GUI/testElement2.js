import GUIModule from "LM:GUIModule";

export default class TestElement extends GUIModule {
    constructor(request) {
        super(...arguments);

        this.text = "test-1";
    }

    // Example showing interaction with the module through the channel
    $setText(event, text) {
        this.text = text;
        this.requestElementUpdate();
    }

    // Render method
    render() {
        return (
            <div style={{padding: 10, backgroundColor: "white"}}>
                {this.text}
            </div>
        );
    }
}
