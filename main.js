const { app, shell, clipboard, nativeImage, Menu, Tray, BrowserWindow, ipcMain } = require("electron");
const fetch = require("electron-fetch");
const path = require('path');

const onlineImagePath = path.join(process.resourcesPath, "online.png");
const offlineImagePath = path.join(process.resourcesPath, "offline.png");

const INITIALIZATION_DELAY = 3000;
const MENU_ACTION_DELAY = 200;
const REFRESH_DELAY = 800;

let onlineImage = nativeImage.createFromPath(onlineImagePath);
let offlineImage = nativeImage.createFromPath(offlineImagePath);
let initialized = false;
let showStatus = true;
let publicIP = null;

let mainWindow = null;
let tray = null;
let trayMenu = [
	{
		label: 'Refreshing',
		icon: offlineImage,
		enabled: false
	},
	{
		label: 'Copy IP Address to Clipboard',
		click: () => {
			copyToClipboard();
		},
		visible: false
	},
	{
		label: 'Refresh',
		click: () => {
			setTimeout(() => {
				getIpAddress();
			}, MENU_ACTION_DELAY);
		},
		enabled: false
	},
	{
		label: 'Launch on System Startup',
		enabled: false
	},
	{
		label: 'Show Status in Menu Bar',
		type: 'checkbox',
		checked: showStatus,
		click: () => {
			setTimeout(() => {
				showStatus = !showStatus;
				toggleStatus();
			}, MENU_ACTION_DELAY);
		}
	},
	{type: 'separator'},
	{
		label: 'About PubIP',
		click: () => {
			mainWindow.show();
		}
	},
	{
		label: 'Check for Updates...',
		enabled: false
	},
	{type: 'separator'},
	{
		label: 'Quit Public IP Tray',
		click: () => {
			app.quit();
		}
	}
];

function createTray() {
	tray = new Tray(nativeImage.createEmpty());
}

function createWindow () {
	mainWindow = new BrowserWindow({
		modal: true,
		width: 430,
		height: 270,
		// resizable: false,
		maximizable: false,
		minimizable: false,
		alwaysOnTop: true,
		center: true,
		show: false,
		titleBarStyle: "hidden"
	});
	mainWindow.loadFile("index.html");
	// mainWindow.loadURL("https://www.google.com/");

	// mainWindow.addEventListener('beforeunload', (e) => {
	// 	e.returnValue = true;
	// });

	mainWindow.on("close", (e) => {
		mainWindow.hide();
		e.preventDefault();
	});
}

function setInitialized() {
	setTimeout(() => {
		initialized = true;
	}, INITIALIZATION_DELAY);
}

function copyToClipboard() {
	if (publicIP) {
		clipboard.writeText(publicIP);
	}
}

function getIpAddress() {
	toggleStatus("refreshing");
	setTimeout(() => {
		fetch.default("https://api.ipify.org?format=json")
		.then(res => res.json())
		.then(json => {
			publicIP = json.ip
			toggleStatus("online");
			setInitialized();
		})
		.catch(() => {
			publicIP = null;
			toggleStatus("offline");
			setInitialized();
		});
	}, REFRESH_DELAY);
}

function toggleStatus(status) {
	if (status === "online") {
		tray.setTitle(publicIP);
		tray.setImage(onlineImage);
		trayMenu[0].label = `Online: ${publicIP}`;
		trayMenu[0].icon = onlineImage;
		trayMenu[1].visible = true;
		trayMenu[2].enabled = true;
	} else if (status === "refreshing") {
		tray.setTitle("Refreshing...");
		tray.setImage(offlineImage);
		trayMenu[0].label = `Refreshing`;
		trayMenu[0].icon = offlineImage;
		trayMenu[1].visible = false;
		trayMenu[2].enabled = false;
	} else if (status === "offline") {
		tray.setTitle("Offline");
		tray.setImage(offlineImage);
		trayMenu[0].label = `Offline`;
		trayMenu[0].icon = offlineImage;
		trayMenu[1].visible = false;
		trayMenu[2].enabled = true;
	} else {
		trayMenu[4].checked = showStatus;
		tray.setTitle(showStatus ? publicIP || "Offline" : "");
	}
	tray.setContextMenu(Menu.buildFromTemplate(trayMenu));
}

app.on("ready", (x) => {
	// Hide app dock icon.
	app.dock.hide();
	// Create Renderer Window
	createWindow();
	// Create System Tray entry and menu	
	createTray();
	// Retrieve IP Address
	getIpAddress();
});

ipcMain.on("online-status-changed", (event, status) => {
	if (initialized) {
		getIpAddress();
	}
});