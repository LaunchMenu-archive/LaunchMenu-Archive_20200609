//this is merely some test code
import {app, BrowserWindow} from "electron";
// import url from "url";
// import path from "path";
// import IPC from "../core/communication/IPC";
// import Registry from "../core/registry/registry";
// import RequestPath from "../core/registry/requestPath";
// import SettingsHandler from "../core/communication/data/settings/settingsHandler";
// import WindowHandler from "../core/window/windowHandler";
import LM from "LM";
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
// Registry._loadModule("alerts.config");
// Registry._loadModule("multiAlert");
// Registry._loadModule("testModule2.config");

// Open a window
// console.log(LM);
app.on("ready", function() {
    LM.Registry._loadAllConfigs()
        .then(data => {
            // Request a module to have a start point
            const TestModule2 = LM.Registry.requestModule({type: "test2"});
            const testModule2instance = new TestModule2();
            const testModule2instance2 = new TestModule2();

            // testModule2instance
            //     .requestHandle({
            //         type: "multiAlert",
            //     })
            //     .then(channel => {
            //         channel
            //             .$alert("poooopy pants")
            //             .then(() => {
            //                 return channel.$alert("Nuts");
            //             })
            //             .then(() => {
            //                 return channel.close();
            //             });
            //     });
            // testModule2instance2
            //     .requestHandle({
            //         type: "multiAlert",
            //     })
            //     .then(channel => {
            //         channel.$alert("testing").then(() => {
            //             return channel.close();
            //         });
            //     });
            // testModule2instance2
            //     .requestHandle({
            //         type: "alert",
            //     })
            //     .then(channel => {
            //         channel.$alert("single alert").then(() => {
            //             return channel.close();
            //         });
            //     });

            const target = "*->#testElement";
            Registry.awaitModuleCreation(target).then(modulePath => {
                console.log(modulePath);
                Registry.moveModuleTo(target, {
                    window: 1,
                    section: 0,
                }).then(modules => {
                    console.log(modules);
                });
            });

            testModule2instance
                .requestHandle({
                    type: "testElement3",
                })
                .then(channel => {
                    channel.$setText("Just something");
                    // Check if the connection wasn't altered by the embed
                    setTimeout(() => {
                        channel.$setText("Just something else");
                    }, 4000);
                });

            testModule2instance
                .requestHandle({
                    type: "testElement",
                    methods: {
                        changeName: function(event, name) {
                            event.sender.$setName(name);
                        },
                    },
                    data: {
                        repeat: true,
                    },
                })
                .then(channel => {
                    // Just as an example, change the name after 2 seconds
                    setTimeout(() => {
                        channel.$setName("A new name");
                    }, 2000);
                })
                .catch(e => console.error(e));

            setTimeout(() => {
                testModule2instance2
                    .requestHandle({
                        type: "testElement",
                        data: {
                            repeat: true,
                        },
                    })
                    .then(channel => {
                        channel.$setName("second request");
                    })
                    .catch(e => console.error(e));
            }, 4000);

            // testModule2instance
            //     .requestHandle({type: "stress"})
            //     .then(channel => {
            //         channel.test();
            //     });

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
        })
        .catch(e => {
            console.error(e);
        });
});
