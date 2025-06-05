const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false
  });

  // Load the app
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-file');
          }
        },
        {
          label: 'Open',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'JavaScript', extensions: ['js'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            }).then(result => {
              if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                const content = fs.readFileSync(filePath, 'utf8');
                mainWindow.webContents.send('menu-open-file', { path: filePath, content });
              }
            });
          }
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu-save-file');
          }
        },
        {
          label: 'Save As',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            mainWindow.webContents.send('menu-save-as-file');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' },
        { type: 'separator' },        {
          label: 'Clear Output',
          accelerator: 'CmdOrCtrl+K',
          click: () => {
            mainWindow.webContents.send('menu-clear-output');
          }
        },
        {
          label: 'Format Code',
          accelerator: 'Shift+Alt+F',
          click: () => {
            mainWindow.webContents.send('menu-format-code');
          }
        }
      ]
    },
    {
      label: 'Run',
      submenu: [
        {
          label: 'Execute Code',
          accelerator: 'CmdOrCtrl+Enter',
          click: () => {
            mainWindow.webContents.send('menu-execute-code');
          }
        },
        {
          label: 'Execute Selection',
          accelerator: 'CmdOrCtrl+Shift+Enter',
          click: () => {
            mainWindow.webContents.send('menu-execute-selection');
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Node REPL',
              message: 'Node REPL v1.0.0',
              detail: 'Interactive Node.js REPL built with Electron'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers for file operations
ipcMain.handle('save-file', async (event, { path, content }) => {
  try {
    if (path) {
      fs.writeFileSync(path, content, 'utf8');
      return { success: true, path };
    } else {
      const result = await dialog.showSaveDialog(mainWindow, {
        filters: [
          { name: 'JavaScript', extensions: ['js'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (!result.canceled) {
        fs.writeFileSync(result.filePath, content, 'utf8');
        return { success: true, path: result.filePath };
      }
      return { success: false };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC handler for code execution
ipcMain.handle('execute-code', async (event, code) => {
  try {
    const vm = require('vm');
    const util = require('util');
      // Capture console output
    const logs = [];
    let currentLine = 1;
    
    // Function to estimate line number from stack trace
    function getCurrentLineFromStack() {
      const stack = new Error().stack;
      const lines = stack.split('\n');
      // Look for the line that contains our eval context
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('<anonymous>:')) {
          const match = lines[i].match(/:(\d+):/);
          if (match) {
            // Subtract 3 to account for the wrapper function lines
            return Math.max(1, parseInt(match[1]) - 3);
          }
        }
      }
      return currentLine;
    }
    
    // Create a custom console
    const customConsole = {
      log: (...args) => {
        const message = args.map(arg => 
          typeof arg === 'object' ? util.inspect(arg, { colors: false, depth: 3 }) : String(arg)
        ).join(' ');
        const lineNum = getCurrentLineFromStack();
        logs.push({ type: 'log', message, line: lineNum });
      },
      error: (...args) => {
        const message = args.map(arg => 
          typeof arg === 'object' ? util.inspect(arg, { colors: false, depth: 3 }) : String(arg)
        ).join(' ');
        const lineNum = getCurrentLineFromStack();
        logs.push({ type: 'error', message, line: lineNum });
      },
      warn: (...args) => {
        const message = args.map(arg => 
          typeof arg === 'object' ? util.inspect(arg, { colors: false, depth: 3 }) : String(arg)
        ).join(' ');
        const lineNum = getCurrentLineFromStack();
        logs.push({ type: 'warn', message, line: lineNum });
      },
      info: (...args) => {
        const message = args.map(arg => 
          typeof arg === 'object' ? util.inspect(arg, { colors: false, depth: 3 }) : String(arg)
        ).join(' ');
        const lineNum = getCurrentLineFromStack();
        logs.push({ type: 'info', message, line: lineNum });
      }
    };// Create execution context
    const context = vm.createContext({
      console: customConsole,
      require: require,
      process: process,
      global: global,
      Buffer: Buffer,
      __dirname: __dirname,
      __filename: __filename,
      setTimeout: setTimeout,
      setInterval: setInterval,
      clearTimeout: clearTimeout,
      clearInterval: clearInterval
    });

    // Execute the code without line instrumentation to avoid syntax issues
    const result = vm.runInContext(`
      (async () => {
        try {
          ${code}
        } catch (error) {
          console.error(error.message);
          throw error;
        }
      })()
    `, context, {
      timeout: 10000,
      displayErrors: true
    });

    // Handle promises
    const finalResult = await Promise.resolve(result);
    
    return {
      success: true,
      logs: logs,
      value: finalResult
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      logs: []
    };
  }
});

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
