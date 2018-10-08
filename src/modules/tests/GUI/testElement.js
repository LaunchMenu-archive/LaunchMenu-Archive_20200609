import GUIModule from "LM:GUIModule";

export default class TestElement extends GUIModule {
    constructor(request) {
        super(...arguments);
        // Set default values
        this.name = "test";
        this.someSetting = false;
        this.childElement = false;

        // If the request indicates that the element should repeat (embed a child instance in itself)
        if (request.data.repeat) {
            this.__init(async () => {
                return this.requestHandle({
                    type: "testElement",
                    embedGUI: "true",
                }).then(channel => {
                    this.childElement = channel;
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
        this.requestElementUpdate();
    }

    // Render method
    render() {
        return (
            <div style={{padding: 10}}>
                <h2>{this.name}</h2>
                <span>
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
