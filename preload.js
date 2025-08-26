const os = require('os');
const path = require('path');
const Toastify = require('toastify-js');
const { contextBridge, ipcRenderer, clipboard } = require('electron');

contextBridge.exposeInMainWorld('os', {
  homedir: () => os.homedir(),
});

contextBridge.exposeInMainWorld('path', {
  join: (...args) => path.join(...args),
});

contextBridge.exposeInMainWorld('Toastify', {
  toast: (options) => Toastify(options).showToast(),
});

contextBridge.exposeInMainWorld('ipcRenderer', {
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, func) =>
    ipcRenderer.on(channel, (event, ...args) => func(...args)),
});

// Clipboard bridge (read image for paste)
contextBridge.exposeInMainWorld('electronClipboard', {
  readImage: async () => {
    // Returns null if no image is present
    const img = clipboard.readImage();
    if (!img || img.isEmpty()) return null;

    const { width, height } = img.getSize();
    const buf = img.toPNG(); // Electron NativeImage -> Buffer (PNG)
    // Convert Buffer to a clean ArrayBuffer slice for structured clone
    const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

    return {
      arrayBuffer,
      width,
      height,
      suggestedName: 'clipboard.png',
    };
  }
});
