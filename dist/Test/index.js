"use strict";

var Registry = require("LM").default.Registry;

require("source-map-support/register");

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _reactDom = require("react-dom");

var _reactDom2 = _interopRequireDefault(_reactDom);

var _importTest = require("./importTest");

var _importTest2 = _interopRequireDefault(_importTest);

var _channel = require("../core/communication/channel");

var _channel2 = _interopRequireDefault(_channel);

var _IPC = require("../core/communication/IPC");

var _IPC2 = _interopRequireDefault(_IPC);

var _LMTest = Registry.requestModule("test");

var _LMTest2 = _interopRequireDefault(_LMTest);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _importTest2.default)();

var el = _react2.default.createElement(
  "div",
  { className: "test" },
  "Click me (though nothing will happen)"
);
_reactDom2.default.render(el, document.getElementById('root'));

// IPC testing

_IPC2.default.sendSync("loaded", null);

// Module registry test
// import Registry from "../core/registry/registry";
// const {test:something, crap:somethingElse} = Registry.requestModule("test", "crap");

console.log(_LMTest2.default);

const something = new _LMTest2.default();

// import SettingsHandler from "../core/communication/data/settingsHandler";
// SettingsHandler.create(something, {stuff:1}).then(settings=>{
//     settings.change({
//         crap: 3
//     }).then(()=>{
//         settings.save();
//     })
// });

//
// // ExtendedJSON testing
// import ExtendedJSON from "../core/communication/ExtendedJSON";
// var obj = {
//     test: 5,
//     stuff: "test",
//     obj: {
//         value: 3
//     },
// };
// obj.obj.n = obj.obj;
// console.log(ExtendedJSON.decode(ExtendedJSON.encode(obj)), obj);
// // IPC.send("ping", {data:1});
// IPC.on("pong", (event)=>{
//     console.log("pong", event);
//     return 4;
// });
// IPC.on("ping", (event)=>{
//     console.log("ping", event);
// });
// IPC.send("pong", null).then(data=>console.log("pong response", data));
//
// // Module instance transfer test
// console.log(module);
// var instance = new module("itsName");
// instance.setSomething("someValue");
//
// IPC.send("moduleInstanceTransfer", instance, 0);
//
// // Channel test
// Channel.createSender("TestName", "getColor", "crap").then(channel=>{
//     console.log("set up connection");
//     channel.doSomething("cheese");
//     channel.doSomethingElse("crap");
//     channel.onColor("purple");
// });
// var channel = Channel.createReceiver("crap", {
//     smth: event=>{
//         console.log("smth", event);
//     }
// });
//
// // GlobalData testing
// import GlobalData from "../core/communication/data/globalData";
// GlobalData.create("test", {
//
// }).then(globalData=>{
//     console.log(globalData, globalData.get());
//     globalData.on("someStuff.update", event=>{
//         console.log(event);
//     });
//     globalData.change({
//         someField: {
//             someOtherData: false
//         }
//     });
//     globalData.on("change.update", event=>{
//         console.log(event);
//     });
//     globalData.change({
//         change: {
//             1: "test",
//             2: 4
//         }
//     });
// });
//
// // Error message test with source mapping:
// console.log(somethingThatDoesntExist.poop());
//# sourceMappingURL=index.js.map