import GUIModule from "LM:GUIModule";

export default class TestElement extends GUIModule {
    constructor(request) {
        super(...arguments);

        this.text = "test-2";
    }

    // Serialization and deserialization methods
    __serialize() {
        const data = super.__serialize();
        data.text = this.text;
        console.log(">text", this.text);
        return data;
    }
    __deserialize(data) {
        this.$setText(null, data.text);
        super.__deserialize(data);
    }

    // Example showing interaction with the module through the channel
    $setText(event, text) {
        this.text = text;
        this.requestElementUpdate();
    }

    // Render method
    render() {
        return (
            <div style={{padding: 10, backgroundColor: "lightblue"}}>
                {this.text}
            </div>
        );
    }
}
