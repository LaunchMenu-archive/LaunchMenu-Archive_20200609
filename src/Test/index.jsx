import React from "react";
import ReactDOM from 'react-dom';
import importTest from "./importTest";

var el = (
    <div className="test">
      Click me (though nothing will happen)
    </div>
);
console.log(document.getElementById('root'));
ReactDOM.render(el, document.getElementById('root'));

//extendedJSON testing
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

//IPC testing
import IPC from "../core/communication/IPC";
IPC.send("ping", {data:1}, 0);
IPC.on("pong", (event)=>{
    console.log("pong", event);
});
IPC.on("ping", (event)=>{
    console.log("ping", event);
});


//error message test with source mapping:
console.log(somethingThatDoesntExist.poop());
