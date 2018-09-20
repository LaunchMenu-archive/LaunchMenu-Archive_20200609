import GUIModule from "LM:GUIModule";
import {runInThisContext} from "vm";
export default class TestElement extends GUIModule {
    constructor(request) {
        super(...arguments);
        this.name = "test";

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
    }
    $setName(event, name) {
        this.name = name;
        if (this.childElement) this.childElement.setName(name);
        this.requestElementUpdate();
    }
    render() {
        if (this.childElement) {
            return (
                <div>
                    <h1>{this.name}</h1>
                    {this.childElement}
                </div>
            );
        }
        return <span>{this.name}</span>;
    }
}
