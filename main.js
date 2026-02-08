const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let historyPath;

function createWindow() {

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false // Keeping it simple for this script wrapper
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1e1e1e',
    show: false, // Don't show until ready-to-show
    movable: true,
    resizable: true,
    center: true
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  historyPath = path.join(app.getPath('userData'), 'history.json');
  createWindow();


  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers

// Transcribe Video
ipcMain.handle('transcribe-video', async (event, url) => {
  return new Promise((resolve, reject) => {
    // Determine python path: prefer venv if it exists
    let pythonPath = 'python3';
    const venvPath = path.join(__dirname, 'venv', 'bin', 'python');
    if (fs.existsSync(venvPath)) {
        pythonPath = venvPath;
        console.log('Using venv python:', pythonPath);
    } else {
        console.log('Using global python:', pythonPath);
    }

    const pythonProcess = spawn(pythonPath, ['get_transcript.py', '--json', url]);

    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
    });

    pythonProcess.on('close', (code) => {
      console.log(`Child process exited with code ${code}`);
      
      try {
          // Attempt to parse JSON from stdout
          // There might be extra newlines or logs if something slipped through, so we look for the JSON object
          // For simplicity, we assume the script outputs valid JSON as the last line or entirely.
          const jsonMatch = dataString.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
              const result = JSON.parse(jsonMatch[0]);
              resolve(result);
          } else {
              // If no JSON found, return error
               resolve({ status: 'error', message: 'Invalid response from Python script', details: dataString || errorString });
          }
      } catch (e) {
        resolve({ status: 'error', message: 'Failed to parse script output', details: e.message, raw: dataString });
      }
    });
  });
});

// History Management
ipcMain.handle('get-history', () => {
  if (fs.existsSync(historyPath)) {
    try {
      return JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch (e) {
      return [];
    }
  }
  return [];
});

ipcMain.handle('save-history', (event, item) => {
  let history = [];
  if (fs.existsSync(historyPath)) {
    try {
        history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch(e) {}
  }
  // Add new item to top, limit to 20
  history.unshift(item);
  if (history.length > 20) history = history.slice(0, 20);
  
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  return history;
});
