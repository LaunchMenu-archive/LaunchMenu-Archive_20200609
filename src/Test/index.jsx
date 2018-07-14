import React from "react";
import ReactDOM from 'react-dom';
import importTest from "./importTest";
import Channel from "../core/communication/channel";
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
IPC.send("loaded", null, 0);

// IPC.send("ping", {data:1});
IPC.on("pong", (event)=>{
    console.log("pong", event);
    return 4;
});
IPC.on("ping", (event)=>{
    console.log("ping", event);
});
IPC.send("pong", null).then(data=>console.log("pong response", data));

// Module registry test
import Registry from "../core/registry/registry";
Registry.requestModule({type:"test"}).then(module=>{
    console.log(module);

    // Module instance transfer test
    var instance = new module("itsName");
    instance.setSomething("someValue");

    IPC.send("moduleInstanceTransfer", instance, 0);
});

// Channel test
Channel.createSender("TestName", "getColor", "crap").then(channel=>{
    console.log("set up connection");
    channel.doSomething("cheese");
    channel.doSomethingElse("crap");
    channel.onColor("purple");
});
var channel = Channel.createReceiver("crap", {
    smth: event=>{
        console.log("smth", event);
    }
});

//RequestPath testing
import RequestPath from "../core/registry/requestPath";
const rootRequestPath = new RequestPath("root");
rootRequestPath.augmentPath("test").then(requestPath=>{
	console.log(requestPath.toString(true));
    requestPath._attachModuleInstance("crap");
});

// Error message test with source mapping:
console.log(somethingThatDoesntExist.poop());
