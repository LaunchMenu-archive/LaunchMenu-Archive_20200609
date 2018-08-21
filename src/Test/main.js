//this is merely some test code
import {app as app, BrowserWindow as BrowserWindow} from "electron";
import url from "url";
import path from "path";
import IPC from "../core/communication/IPC";
import Registry from "../core/registry/registry";
import Channel from "../core/communication/channel";
import RequestPath from "../core/registry/requestPath";
import GlobalDataHandler from "../core/communication/data/globalDataHandler";
import SettingsHandler from "../core/communication/data/settingsHandler";
import WindowHandler from "../core/window/windowHandler";

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
Registry._loadModule("alert");
Registry._loadModule("multiAlert");
Registry._loadModule("testModule2");
const TestModule2 = Registry.requestModule({type:"test2"});
const testModule2 = new TestModule2();


// Open a window
app.on('ready', function(){


    testModule2.requestHandle({
        type: "multiAlert"
    }).then(channel=>{
        channel.alert("poooopy pants")
            .then(()=>{
                return channel.alert("Nuts");
            }).then(()=>{
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

IPC.once("loaded", (event)=>{

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
