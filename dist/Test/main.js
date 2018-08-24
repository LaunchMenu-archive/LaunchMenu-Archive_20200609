"use strict";

var Registry = require("../../dist/core/registry/registry").default; //this is merely some test code


require("source-map-support/register");

var _electron = require("electron");

var _url = require("url");

var _url2 = _interopRequireDefault(_url);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _IPC = require("../core/communication/IPC");

var _IPC2 = _interopRequireDefault(_IPC);

var _registry = require("../core/registry/registry");

var _registry2 = _interopRequireDefault(_registry);

var _channel = require("../core/communication/channel");

var _channel2 = _interopRequireDefault(_channel);

var _requestPath = require("../core/registry/requestPath");

var _requestPath2 = _interopRequireDefault(_requestPath);

var _globalDataHandler = require("../core/communication/data/globalDataHandler");

var _globalDataHandler2 = _interopRequireDefault(_globalDataHandler);

var _settingsHandler = require("../core/communication/data/settings/settingsHandler");

var _settingsHandler2 = _interopRequireDefault(_settingsHandler);

var _windowHandler = require("../core/window/windowHandler");

var _windowHandler2 = _interopRequireDefault(_windowHandler);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// var {app, BrowserWindow} = require('electron');
// var mainWindow;
// app.on('window-all-closed', function() {
//   	if (process.platform != 'darwin') {
//     	app.quit();
//   	}
// });
// app.on('ready', function() {
// 	mainWindow = new BrowserWindow({width: 1360, height: 800});
// 	// mainWindow.loadURL(url.format({
// 	//   pathname: "www.google.com",
// 	//   protocol: 'https:',
// 	//   slashes: true
// 	// }));
// 	mainWindow.loadURL(url.format({
// 		pathname: path.join(process.cwd(), "dist", "Test", "index.html"),
// 		protocol: 'file:',
// 		slashes: true
// 	}))
// 	mainWindow.openDevTools();
// 	mainWindow.on('closed', function() {
// 		mainWindow = null;
// 	});
//
// 	// Register window
// 	IPC._registerWindow(mainWindow);
// });

// Module registry
_registry2.default._loadModule("alert");
_registry2.default._loadModule("multiAlert");
_registry2.default._loadModule("testModule2");
const TestModule2 = _registry2.default.requestModule({ type: "test2" });
const testModule2instance = new TestModule2();
const testModule2instance2 = new TestModule2();

// Open a window
_electron.app.on("ready", function () {
    testModule2instance.requestHandle({
        type: "multiAlert"
    }).then(channel => {
        channel.alert("poooopy pants").then(() => {
            return channel.alert("Nuts");
        }).then(() => {
            return channel.close();
        });
    });
    testModule2instance2.requestHandle({
        type: "multiAlert"
    }).then(channel => {
        channel.alert("testing").then(() => {
            return channel.close();
        });
    });
    testModule2instance2.requestHandle({
        type: "alert"
    }).then(channel => {
        channel.alert("single alert").then(() => {
            return channel.close();
        });
    });

    // WindowHandler.open(1).then(data=>{
    //     console.log("Window opened", data);
    //     Registry.requestHandle({
    //         type: "test",
    //         source: testModule2,
    //     }).then(result=>{
    //         console.log(result);
    //     });
    // }).catch(err=>{
    //     console.error(err);
    // });
});

_IPC2.default.once("loaded", event => {
    // IPC.on("pong", event=>{
    // 	return 3;
    // })
    //
    // // IPC testing
    // IPC.on("ping", (event)=>{
    // 	console.log("ping", event);
    // 	IPC.send("pong", {data:2}, 1).then(data=>{
    //         console.log("response", data);
    //     });
    // 	// IPC.send("module", TestModule, 1);
    // });
    // IPC.on("moduleInstanceTransfer", (event)=>{
    //     console.log(event);
    // });
    //
    // // Channel testing
    // var channel = Channel.createReceiver("TestName", {
    // 	doSomething: event=>{
    // 		console.log("smth", event);
    // 	},
    // 	doSomethingElse: event=>{
    // 		console.log("smthElse", event);
    // 	}
    // });
    // channel.createSubChannel("getColor", {
    // 	onColor: event=>{
    // 		console.log("color", event);
    // 	},
    // 	doSomethingElse: function(event){
    // 		console.log("smthElse Overwritten", event, event.senderID);
    // 		Channel.createSender(event.senderID, "", this.getID()).then(channel=>{
    // 			console.log("establish connection");
    // 			channel.smth("stuff");
    // 		});
    // 	}
    // });
    //
    // // GlobalData testing
    // GlobalData.create("test", {
    // 	someField: {
    // 		someData: 1,
    // 		someOtherData: true
    // 	},
    // 	someStuff: "message",
    // 	change: {
    // 		1: 5,
    // 		2: 5
    // 	}
    // }).then(globalData=>{
    // 	console.log(globalData, globalData.get("someField.someData"));
    // 	globalData.on("someField.update", event=>{
    // 		console.log(event);
    // 		globalData.change({
    // 			someStuff: {
    // 				crap: 3
    // 			}
    // 		});
    // 	});
    // });
    //
    // return 4;
});
//# sourceMappingURL=main.js.map