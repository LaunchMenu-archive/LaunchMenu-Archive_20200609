"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

require("source-map-support/register");

var _extendedJSON = require("../extendedJSON");

var _extendedJSON2 = _interopRequireDefault(_extendedJSON);

var _IPC = require("../IPC");

var _IPC2 = _interopRequireDefault(_IPC);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = async (process, sync) => {
    if (isWindow) {
        // Client side
        _IPC2.default.on("message", event => {
            _IPC2.default.send("message back");
        });
    }
    if (!isWindow) {
        // Server side
        _IPC2.default.on("message back", event => {
            _IPC2.default.send("some callback", "some data");
        });
    }
    if (isWindow) {
        _IPC2.default.on("some callback", event => {
            _IPC2.default.send("callback response", event.data);
        });
    }
    if (!isWindow) {
        _IPC2.default.on("callback response", event => {
            expect(event.data).toBe("some data");
        });
    }

    await sync();

    if (!isWindow) {
        // Invoke first client side listener
        _IPC2.default.send("message");
    }

    await new _promise2.default((res, rej) => {
        setTimeout(res, 5000);
    });
};

// // Test if recursive structures are properly turned into strings and back
// describe("ExtendedJSON: ", ()=>{
//     describe("Recursive structures", ()=>{
//         // Create an object to test with
//         const srcObject = {
//             f: "field",
//             obj1: {
//                 f: "field",
//                 obj2: {
//                     obj3: {
//                         obj2copy: null // Will be copied afterwards
//                     }
//                 }
//             },
//             obj2copy: null // Will be copied afterards
//         }
//         srcObject.obj1.obj2.obj3.obj2copy = srcObject.obj1.obj2;
//         srcObject.obj2copy = srcObject.obj1.obj2;
//
//         // Stringify the object
//         const stringObject = ExtendedJSON.stringify(srcObject);
//
//         it("should be serializable to data to a string", ()=>{
//             expect(typeof(stringObject)).toBe("number");
//         });
//         // t.true(typeof(stringObject)=="string", "ExtendedJSON stringify didn't output a string");
//
//         // Turn the string back into an object
//         const destObject = ExtendedJSON.parse(stringObject);
//
//         // Test if the data copies are in tact
//         it("should retain object references", ()=>{
//             expect(destObject.obj1.obj2.obj3.obj2copy==destObject.obj1.obj2).toBe(true);
//             expect(destObject.obj2copy==destObject.obj1.obj2).toBe(true);
//         });
//         // t.true(destObject.obj1.obj2.obj3.obj2copy==destObject.obj1.obj2, "ExtendedJSON didn't retain the circular structure");
//         // t.true(destObject.obj2copy==destObject.obj1.obj2, "ExtendedJSON didn't retain the copied object");
//
//         // Test if the destObject and srcObject are identical
//         it("should be serializable and reverseable", ()=>{
//             expect(srcObject).toEqual(destObject);
//         });
//         // t.deepEqual(srcObject, destObject, "ExtendedJSON didn't successfully convert object to string and back");
//     });
// });
//# sourceMappingURL=extendedJSON.js.map