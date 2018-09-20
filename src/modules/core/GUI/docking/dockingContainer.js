import {Registry} from "LM";
import GUIModule from "LM:GUIModule";

export default class DockingContainer extends GUIModule {
    constructor(request) {
        super(...arguments);
        const sections = request.data;

        // Get docking elements to put in this container
        this.__init(async () => {
            // Go through all sections
            var promises = Object.keys(sections).map(sectionID => {
                // Get the section, and attach its ID
                var section = sections[sectionID];
                section.ID = sectionID;

                // Request an element for this section
                return this.requestHandle({
                    type: "DockingElement",
                    data: section,
                    embedGUI: true,
                });
            });

            // Wait for all modules to return
            this.sections = await Promise.all(promises);
        });
    }
    $openModule(event, modulePath, sectionID) {
        const module = Registry._getModuleInstance(modulePath);
        console.log(module, arguments);
    }
    render() {
        return <span>{this.sections}</span>;
    }
}
