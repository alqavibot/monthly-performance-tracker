const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

const userDataPath = path.join(os.homedir(), '.monthly-perf-tracker');

if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath, {recursive:true});

contextBridge.exposeInMainWorld('electronAPI', {
  readLocalFile: (fileName) => {
    const p = path.join(userDataPath, fileName);
    if (!fs.existsSync(p)) return null;
    return fs.readFileSync(p, 'utf8');
  },
  writeLocalFile: (fileName, data) => {
    const p = path.join(userDataPath, fileName);
    fs.writeFileSync(p, data, 'utf8');
    return true;
  },
  getUserDataPath: () => userDataPath,
});
