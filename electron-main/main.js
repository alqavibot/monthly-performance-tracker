function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    // 👇 Add this line to ignore preload errors in dev
    win.webContents.on('did-fail-load', () => {
      console.log('Dev server not ready yet — retrying...');
      setTimeout(() => win.loadURL('http://localhost:5173'), 1000);
    });
  } else {
    win.loadFile(path.join(__dirname, '../renderer/dist/index.html'));
  }
}
