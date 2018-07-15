"use strict";

require("source-map-support/register");

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _reactDom = require("react-dom");

var _reactDom2 = _interopRequireDefault(_reactDom);

var _importTest = require("./importTest");

var _importTest2 = _interopRequireDefault(_importTest);

var _channel = require("../core/communication/channel");

var _channel2 = _interopRequireDefault(_channel);

var _ExtendedJSON = require("../core/communication/ExtendedJSON");

var _ExtendedJSON2 = _interopRequireDefault(_ExtendedJSON);

var _IPC = require("../core/communication/IPC");

var _IPC2 = _interopRequireDefault(_IPC);

var _registry = require("../core/registry/registry");

var _registry2 = _interopRequireDefault(_registry);

var _requestPath = require("../core/registry/requestPath");

var _requestPath2 = _interopRequireDefault(_requestPath);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _importTest2.default)();

var el = _react2.default.createElement(
    "div",
    { className: "test" },
    "Click me (though nothing will happen)"
);
console.log(document.getElementById('root'));
_reactDom2.default.render(el, document.getElementById('root'));

// ExtendedJSON testing

var obj = {
    test: 5,
    stuff: "test",
    obj: {
        value: 3
    }
};
obj.obj.n = obj.obj;
console.log(_ExtendedJSON2.default.decode(_ExtendedJSON2.default.encode(obj)), obj);

// IPC testing

_IPC2.default.send("loaded", null, 0);

// IPC.send("ping", {data:1});
_IPC2.default.on("pong", event => {
    console.log("pong", event);
    return 4;
});
_IPC2.default.on("ping", event => {
    console.log("ping", event);
});
_IPC2.default.send("pong", null).then(data => console.log("pong response", data));

// Module registry test

_registry2.default.requestModule({ type: "test" }).then(module => {
    console.log(module);

    // Module instance transfer test
    var instance = new module("itsName");
    instance.setSomething("someValue");

    _IPC2.default.send("moduleInstanceTransfer", instance, 0);
});

// Channel test
_channel2.default.createSender("TestName", "getColor", "crap").then(channel => {
    console.log("set up connection");
    channel.doSomething("cheese");
    channel.doSomethingElse("crap");
    channel.onColor("purple");
});
var channel = _channel2.default.createReceiver("crap", {
    smth: event => {
        console.log("smth", event);
    }
});

//RequestPath testing

const rootRequestPath = new _requestPath2.default("root");
rootRequestPath.augmentPath("test").then(requestPath => {
    console.log(requestPath.toString(true));
    requestPath._attachModuleInstance("crap");
});

// Error message test with source mapping:
console.log(somethingThatDoesntExist.poop());
//# sourceMappingURL=index.js.map