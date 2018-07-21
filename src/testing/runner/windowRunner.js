import {ipcRenderer} from "electron";

let script;
let continueWindow;
ipcRenderer.on("TESTING.loadFile", (event, file)=>{
    script = require(file).default;
    script(1, ()=>{
        const promise = new Promise((resolve, reject)=>{
            continueWindow = resolve;
        });
        ipcRenderer.send("TESTING.completePhase");
        return promise;
    });
});
ipcRenderer.on("TESTING.nextPhase", ()=>{
    continueWindow();
});
ipcRenderer.send("TESTING.windowReady");
