"use strict";

require("source-map-support/register");

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _reactDom = require("react-dom");

var _reactDom2 = _interopRequireDefault(_reactDom);

var _importTest = require("./importTest");

var _importTest2 = _interopRequireDefault(_importTest);

var _ExtendedJSON = require("../core/communication/ExtendedJSON");

var _ExtendedJSON2 = _interopRequireDefault(_ExtendedJSON);

var _IPC = require("../core/communication/IPC");

var _IPC2 = _interopRequireDefault(_IPC);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var el = _react2.default.createElement(
    "div",
    { className: "test" },
    "Click me (though nothing will happen)"
);
console.log(document.getElementById('root'));
_reactDom2.default.render(el, document.getElementById('root'));

//extendedJSON testing

var obj = {
    test: 5,
    stuff: "test",
    obj: {
        value: 3
    }
};
obj.obj.n = obj.obj;
console.log(_ExtendedJSON2.default.decode(_ExtendedJSON2.default.encode(obj)), obj);

//IPC testing

_IPC2.default.send("ping", { data: 1 }, 0);
_IPC2.default.on("pong", event => {
    console.log("pong", event);
});
_IPC2.default.on("ping", event => {
    console.log("ping", event);
});

//error message test with source mapping:
console.log(somethingThatDoesntExist.poop());
//# sourceMappingURL=index.js.map