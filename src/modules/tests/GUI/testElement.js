import GUIModule from "LM:GUIModule";

export default class TestElement extends GUIModule {
    constructor(request) {
        super(...arguments);
        // Set default values
        this.name = "test";
        this.someSetting = false;
        this.childElement = false;
        this.textElement = false;

        // If the request indicates that the element should repeat (embed a child instance in itself)
        if (request.data.repeat) {
            this.__init(async () => {
                return this.requestHandle({
                    type: "testElement",
                    embedGUI: "true",
                }).then(channel => {
                    this.childElement = channel;
                    channel.$setName(this.name);
                });
            });

            this.__init(async () => {
                return this.requestHandle({
                    type: "testElement2",
                }).then(channel => {
                    console.log(channel);
                    this.textElement = channel;
                });
            });
        }

        // Listen for changes in the settings
        this.__init(() => {
            const settings = this.getSettings();

            // Listen for settings changes
            settings.on("someSetting", event => {
                this.someSetting = event.value;
                this.requestElementUpdate();
            });

            // Load the default current settings
            this.someSetting = settings.get("someSetting");
            this.requestElementUpdate();

            // Log the settings for console debug interaction
            console.log(settings);
        });
    }

    // Example showing interaction with the module through the channel
    $setName(event, name) {
        this.name = name;
        if (this.childElement) this.childElement.$setName(name);
        if (this.textElement) this.textElement.$setText(name + " text");
        this.requestElementUpdate();
    }

    // Serialization and deserialization
    __serialize() {
        const data = super.__serialize();
        data.name = this.name;
        return data;
    }
    __deserialize(data) {
        this.$setName(null, data.name);
        super.__deserialize(data);
    }

    // Render method
    render() {
        const move = () => {
            if (window.ID == 1) {
                this.move({
                    window: 2,
                    section: 0,
                });
            } else {
                this.move({
                    window: 1,
                    section: 1,
                });
            }
        };
        const changeNameRequest = () => {
            this.getSource().changeName(this.name + 1);
        };

        return (
            <div style={{padding: 10}}>
                <h2 onClick={move}>{this.name}</h2>
                <span onClick={changeNameRequest}>
                    The setting has value: {JSON.stringify(this.someSetting)}
                </span>
                {this.childElement && (
                    <div style={{backgroundColor: "white"}}>
                        {this.childElement}
                    </div>
                )}
            </div>
        );
    }
}
