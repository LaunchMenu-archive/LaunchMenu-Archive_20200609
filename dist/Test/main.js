"use strict";

require("source-map-support/register");

var _electron = require("electron");

var _url = require("url");

var _url2 = _interopRequireDefault(_url);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _IPC = require("../core/communication/IPC");

var _IPC2 = _interopRequireDefault(_IPC);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// var {app, BrowserWindow} = require('electron');
//this is merely some test code
var mainWindow;
_electron.app.on('window-all-closed', function () {
	if (process.platform != 'darwin') {
		_electron.app.quit();
	}
});
_electron.app.on('ready', function () {
	mainWindow = new _electron.BrowserWindow({ width: 1360, height: 800 });
	// mainWindow.loadURL(url.format({
	//   pathname: "www.google.com",
	//   protocol: 'https:',
	//   slashes: true
	// }));
	mainWindow.loadURL(_url2.default.format({
		pathname: _path2.default.join(process.cwd(), "dist", "Test", "index.html"),
		protocol: 'file:',
		slashes: true
	}));
	mainWindow.openDevTools();
	mainWindow.on('closed', function () {
		mainWindow = null;
	});
	_IPC2.default._registerWindow(mainWindow);
});

// IPC testing
_IPC2.default.on("ping", event => {
	console.log(event);
	_IPC2.default.send("pong", { data: 2 }, 1);
});
//# sourceMappingURL=main.js.map