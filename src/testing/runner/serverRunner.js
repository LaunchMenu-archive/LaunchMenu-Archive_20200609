import {
    app,
    BrowserWindow,
    ipcMain
} from "electron";
import url from "url";
import path from "path";
import IPC from "../../core/communication/IPC";

let readyListeners = [];
let isReady = false;
const onReady = (callback)=>{
    if(isReady) callback();
    else readyListeners.push(callback);
};
app.on('ready', function(){
    isReady = true;
    readyListeners.forEach(listener=>{
        listener();
    })
});

let phaseAwaiting = 2;
let file;
let script;
let continueServer;
let window;
let complete;
const runNextPhase = function(){
    phaseAwaiting = 2;
    window.webContents.send("TESTING.nextPhase");
    continueServer();
};

export default function(inpFile, inpComplete){
    file = inpFile;
    script = require(file).default;

    onReady(()=>{
        window = new BrowserWindow({width: 1360, height: 800});
        window.loadURL(url.format({
            pathname: path.join(process.cwd(), "dist", "testing", "runner", "window.html"),
            protocol: "file:",
            slashes: true
        }));
        IPC._registerWindow(window);
        window.openDevTools();
        complete = ()=>{
            window.close();
            IPC._deregisterWindow(window);
            if(inpComplete)
                inpComplete();
        }
    })
};

ipcMain.once('TESTING.windowReady', ()=>{
    script(0, ()=>{
        const promise = new Promise((resolve, reject)=>{
            continueServer = resolve;
        });
        if(--phaseAwaiting==0)
            runNextPhase();
        return promise;
    }).then(complete);
    window.webContents.send("TESTING.loadFile", file);


    ipcMain.on("TESTING.completePhase", event=>{
        if(--phaseAwaiting==0)
            runNextPhase();
    });
});
