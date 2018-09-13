"use strict";

var _keys = require("babel-runtime/core-js/object/keys");

var _keys2 = _interopRequireDefault(_keys);

var Registry = require("LM").default.Registry; // import Jasmine from "jasmine";
// import ElectronReporter from "./reporter";
//
// var jasmine = new Jasmine();
// jasmine.loadConfig({
//     spec_files: [
//         'dist/**/_tests/*.js',
//     ],
//     random: false
// });
// // jasmine.configureDefaultReporter({
// //     showColors: true
// // });
// jasmine.clearReporters();
// jasmine.addReporter(new ElectronReporter({}));
// // jasmine.execute(['dist/core/communication/_tests/extendedJSON.js']);
// // jasmine.execute(['dist/core/communication/_tests/extendedJSON.js']);
// // jasmine.onComplete(function(passed){
// //     process.exit();
// // });
// global.describe = describe;
// import ExtendedJSON from "../../dist/core/communication/_tests/extendedJSON";


require("source-map-support/register");

var _serverRunner = require("./runner/serverRunner");

var _serverRunner2 = _interopRequireDefault(_serverRunner);

var _madge = require("madge");

var _madge2 = _interopRequireDefault(_madge);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

require = function (module) {
    console.log(module);
};


const dir = "dist/";
const ordered = false; //Whether to order tests on their dependencies
if (ordered) {
    //TODO implement version that tries to perform tests of dependencies before own test
    // const madge = require('madge');
    (0, _madge2.default)("dist/").then(res => {
        const map = res.obj();
        const testFiles = (0, _keys2.default)(map).filter(file => {
            return file.match(/_tests\/.*\.jsx?/);
        });
        console.log(map, testFiles);
    });
} else {
    const walk = function (dirs, fileCallback, complete) {
        if (!(dirs instanceof Array)) dirs = [{ path: dirs, name: dirs }];
        var dir = dirs[dirs.length - 1];
        if (!dir) {
            if (complete) complete();
            return;
        }
        _fs2.default.stat(dir.path, (err, stats) => {
            var isDir = stats.isDirectory();
            if (!dir.handled) {
                dir.handled = true;
                if (isDir) {
                    _fs2.default.readdir(dir.path, (err, files) => {
                        files.reverse().forEach(file => {
                            var p = _path2.default.join(dir.path, file);
                            dirs.push({ path: p, name: file });
                        });
                        walk(dirs, fileCallback);
                    });
                } else {
                    fileCallback(dir.path, () => {
                        walk(dirs, fileCallback);
                    });
                }
            } else {
                dirs.pop();
                walk(dirs, fileCallback);
            }
        });
    };
    walk(dir, (file, callback) => {
        if (file.match(/_tests(\/|\\).*\.jsx?$/)) {
            var path = _path2.default.join("..", "..", "..", file);
            (0, _serverRunner2.default)(path, () => {
                callback();
            });
        } else callback();
    }, () => {
        process.exit();
    });
}

// runner("../../../dist/core/communication/_tests/extendedJSON");
//# sourceMappingURL=main.js.map