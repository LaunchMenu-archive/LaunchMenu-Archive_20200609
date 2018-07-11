import React from "react";
import ReactDOM from 'react-dom';
import importTest from "./importTest";
importTest();

var el = (
    <div className="test">
      Click me (though nothing will happen)
    </div>
);
console.log(document.getElementById('root'));
ReactDOM.render(el, document.getElementById('root'));

// ExtendedJSON testing
import ExtendedJSON from "../core/communication/ExtendedJSON";
var obj = {
    test: 5,
    stuff: "test",
    obj: {
        value: 3
    },
};
obj.obj.n = obj.obj;
console.log(ExtendedJSON.decode(ExtendedJSON.encode(obj)), obj);

// IPC testing
import IPC from "../core/communication/IPC";
IPC.send("ping", {data:1}, 0);
IPC.on("pong", (event)=>{
    console.log("pong", event);
});
IPC.on("ping", (event)=>{
    console.log("ping", event);
});

// Module registry test
import Registry from "../core/registry/registry";
Registry.requestModule({type:"test"}).then(module=>{
    console.log(module);

    // Module instance transfer test
    var instance = new module("itsName");
    instance.setSomething("someValue");

    IPC.send("moduleInstanceTransfer", instance, 0);
});


// Error message test with source mapping:
console.log(somethingThatDoesntExist.poop());
