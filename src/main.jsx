//this is merely some test code
import Window from "./GUI/window/Window.js";
import {app as app, BrowserWindow as BrowserWindow} from "electron";
import url from "url";
import path from "path";


// var {app, BrowserWindow} = require('electron');
var mainWindow;
app.on('window-all-closed', function() {
  	if (process.platform != 'darwin') {
    	app.quit();
  	}
});
app.on('ready', function() {
	  mainWindow = new BrowserWindow({width: 1360, height: 800});
	  // mainWindow.loadURL(url.format({
		//   pathname: "www.google.com",
		//   protocol: 'https:',
		//   slashes: true
	  // }));
      mainWindow.loadURL(url.format({
		  pathname: path.join(process.cwd(), "dist", "Test", "index.html"),
		  protocol: 'file:',
		  slashes: true
	  }))
	  mainWindow.openDevTools();
	  mainWindow.on('closed', function() {
	    	mainWindow = null;
	  });
});
