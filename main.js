const path = require('path');
const os = require('os');
const fs = require('fs');
const resizeImg = require('resize-img');
const { app, BrowserWindow, Menu, ipcMain, shell, clipboard, nativeImage } = require('electron');
const { create } = require('domain');

const isDev = process.env.NODE_ENV !== 'production';

let mainWindow;

// check if OS is Mac
const isMac = process.platform === 'darwin';

// create the main window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: 'Image Resizer',
    width: isDev ? 1000 : 500,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js')
    },
  });

  //open devtools if in dev environement
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
}

//create 'about' window
function createAboutWindow() {
  const aboutWindow = new BrowserWindow({
    title: 'About Image Resizer',
    width: 300,
    height: 300
  });

  aboutWindow.loadFile(path.join(__dirname, './renderer/about.html'));
}

//app is ready
app.whenReady().then(() => {
  createMainWindow();

  //implement menu
  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
});

//menu template
const menu = [
  ...(isMac
    ? [
      {
        label: app.name,
        submenu: [
          {
            label: 'About',
            click: createAboutWindow,
          }
        ]
      }
    ] : []),
  {
    role: 'fileMenu',
  },
  ...(!isMac ? [{
    label: 'Help',
    submenu: [{
      label: 'About',
      click: createAboutWindow,
    }]
  }] : [])
];

// respond to ipcRenderer resize
ipcMain.on('image:resize', (e, options) => {
  const dest = path.join(os.homedir(), 'imageresizer');
  resizeImage({ ...options, dest });
});

async function resizeImage({ fileData, filename, imgPath, width, height, dest, outputMode }) {
  try {
    let inputBuffer;
    if (fileData instanceof ArrayBuffer) {
      inputBuffer = Buffer.from(new Uint8Array(fileData));
    } else if (fileData && fileData.type === 'Buffer' && Array.isArray(fileData.data)) {
      inputBuffer = Buffer.from(fileData.data);
    } else if (imgPath) {
      inputBuffer = fs.readFileSync(imgPath);
    } else {
      throw new Error('No image data provided.');
    }

    // Ensure numeric
    const W = +width;
    const H = +height;

    // Perform resize
    const resized = await resizeImg(inputBuffer, { width: W, height: H });

    // Clipboard output
    if (outputMode === 'clipboard') {
      const native = nativeImage.createFromBuffer(resized);
      if (native.isEmpty()) throw new Error('Failed to convert resized image for clipboard.');
      clipboard.writeImage(native);
      mainWindow.webContents.send('image:done');
      return;
    }

    // File output
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

    // Build output name with -W-H suffix before extension
    const baseName = filename || path.basename(imgPath || 'resized.png');
    const parsed = path.parse(baseName);
    const outName = `${parsed.name}-${W}-${H}${parsed.ext || '.png'}`;

    const outPath = path.join(dest, outName);
    fs.writeFileSync(outPath, resized);

    mainWindow.webContents.send('image:done');
    shell.openPath(dest);
  } catch (error) {
    console.error(error);
    mainWindow.webContents.send('image:error', error.message);
  }
}

// exit on close for non-mac
app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit()
  }
})
