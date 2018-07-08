"use strict";

require("source-map-support/register");

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _reactDom = require("react-dom");

var _reactDom2 = _interopRequireDefault(_reactDom);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var el = _react2.default.createElement(
  "div",
  { className: "test" },
  "Click Me"
);
console.log(document.getElementById('root'));
_reactDom2.default.render(el, document.getElementById('root'));

//error message test with source mapping:
console.log(somethingThatDoesntExist.poop());
//# sourceMappingURL=index.js.map