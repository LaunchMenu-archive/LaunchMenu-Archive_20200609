"use strict";

var _Window = require("./GUI/window/Window.js");

var _Window2 = _interopRequireDefault(_Window);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

console.log("react");
var React = require("react");
var ReactDOM = require('react-dom');

console.log("Main", React.createElement(
  "div",
  { color: "blue", shadowSize: 2 },
  "Click Me"
));