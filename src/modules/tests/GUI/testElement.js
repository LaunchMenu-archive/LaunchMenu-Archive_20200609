import GUIModule from "LM:GUIModule";
import {runInThisContext} from "vm";
export default class TestElement extends GUIModule {
    constructor(request) {
        super(...arguments);
        this.name = "test";
        this.isCool = false;
        this.childElement = false;

        // Embed child for fun/testing
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
            settings.on("isCool", event => {
                this.isCool = event.value;
                this.requestElementUpdate();
            });

            // Load the default current settings
            this.isCool = settings.get("isCool");
            this.requestElementUpdate();

            // Log the settings for console debug interaction
            console.log(settings);
        });
    }
    $setName(event, name) {
        this.name = name;
        if (this.childElement) this.childElement.$setName(name);
        this.requestElementUpdate();
    }
    render() {
        return (
            <div>
                <h1>{this.name}</h1>
                {this.isCool && <span>I am cool man</span>}
                {this.childElement}
            </div>
        );
    }
}
