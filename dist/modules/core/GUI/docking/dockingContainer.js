"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

var _keys = require("babel-runtime/core-js/object/keys");

var _keys2 = _interopRequireDefault(_keys);

var Registry = require("LM").default.Registry;

require("source-map-support/register");

var _LM = require("LM");

var _LMGUIModule = Registry.requestModule("GUIModule");

var _LMGUIModule2 = _interopRequireDefault(_LMGUIModule);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var React = require("react");

class DockingContainer extends _LMGUIModule2.default {
    constructor(request) {
        super(...arguments);
        const sections = request.data;

        // Get docking elements to put in this container
        this.__init(async () => {
            // Go through all sections
            var promises = (0, _keys2.default)(sections).map(sectionID => {
                // Get the section, and attach its ID
                var section = sections[sectionID];
                section.ID = sectionID;

                // Request an element for this section
                return this.requestHandle({
                    type: "DockingElement",
                    data: section,
                    embedGUI: true
                });
            });

            // Wait for all modules to return
            this.sections = await _promise2.default.all(promises);
        });
    }
    $openModule(event, modulePath, sectionID) {
        const module = _LM.Registry._getModuleInstance(modulePath);
        console.log(module, arguments);
    }
    render() {
        return React.createElement(
            "span",
            null,
            this.sections
        );
    }
}
exports.default = DockingContainer;
//# sourceMappingURL=dockingContainer.js.map