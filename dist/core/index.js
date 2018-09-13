"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _assign = require("babel-runtime/core-js/object/assign");

var _assign2 = _interopRequireDefault(_assign);

require("source-map-support/register");

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const classes = {};
function scanDir(path) {
    // Get the files in the directory
    const files = _fs2.default.readdirSync(path);

    // Go through all files
    files.forEach(file => {
        // Get the path of the file
        const filePath = _path2.default.join(path, file);

        // Check if path is a directory
        if (_fs2.default.lstatSync(filePath).isDirectory() && !file.match(/\bnode_modules\b/)) {
            // Recurse if this path is also a directory
            scanDir(filePath);
        } else if (filePath.match(/\.js(x?)$/)) {
            // If the file is a script, require it
            const Class = require(filePath).default;

            if (Class && Class.prototype) {
                const name = Class.prototype.constructor.name;

                // Store the class
                classes[name] = Class;
            }
        }
    });
}
scanDir(__dirname);

(0, _assign2.default)(exports, classes);
exports.default = classes;
//# sourceMappingURL=index.js.map