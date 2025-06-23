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
ipcMain.handle('execute-code', async (event, originalCode) => {
  try {
    const vm = require('vm');
    const util = require('util');
    const acorn = require('acorn');

    let resolveCompletionSignal;
    const completionSignalPromise = new Promise(resolve => {
        resolveCompletionSignal = resolve;
        // console.log('completionSignalPromise created'); // Debug
    });

    let codeToExecute = originalCode;
    const logs = [];
    
    // Function to estimate line number from stack trace (fallback)
    function getCurrentLineFromStack() {
      const stack = new Error().stack;
      const lines = stack.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('<anonymous>:')) {
          const match = lines[i].match(/:(\d+):/);
          if (match) {
            return Math.max(1, parseInt(match[1]) - 3); // Adjust for wrapper
          }
        }
      }
      return null; // Fallback if line not found
    }

    // Create a custom console
    // It will be updated in the next step to accept line numbers.
    // For now, the structure remains similar, but lineNum will be derived
    // from injected arguments if available.
    const customConsole = {
      log: (...args) => {
        let lineNumber = args[args.length -1];
        let messageArgs = args;
        if (typeof lineNumber === 'number' && args[args.length-2] === '__LINE_NUMBER_MARKER__') {
          messageArgs = args.slice(0, -2);
        } else {
          lineNumber = getCurrentLineFromStack();
          // If using fallback, ensure lineNumber is not the message itself if it's a number
          if (typeof messageArgs[messageArgs.length -1] === 'number' && lineNumber === messageArgs[messageArgs.length -1]) {
             //This case needs careful handling; for now, we assume injected line numbers are distinct
          }
        }
        const message = messageArgs.map(arg =>
          typeof arg === 'object' ? util.inspect(arg, { colors: false, depth: 3 }) : String(arg)
        ).join(' ');
        logs.push({ type: 'log', message, line: lineNumber });
      },
      error: (...args) => {
        let lineNumber = args[args.length -1];
        let messageArgs = args;
        if (typeof lineNumber === 'number' && args[args.length-2] === '__LINE_NUMBER_MARKER__') {
          messageArgs = args.slice(0, -2);
        } else {
          lineNumber = getCurrentLineFromStack();
        }
        const message = messageArgs.map(arg =>
          typeof arg === 'object' ? util.inspect(arg, { colors: false, depth: 3 }) : String(arg)
        ).join(' ');
        logs.push({ type: 'error', message, line: lineNumber });
      },
      warn: (...args) => {
        let lineNumber = args[args.length -1];
        let messageArgs = args;
        if (typeof lineNumber === 'number' && args[args.length-2] === '__LINE_NUMBER_MARKER__') {
          messageArgs = args.slice(0, -2);
        } else {
          lineNumber = getCurrentLineFromStack();
        }
        const message = messageArgs.map(arg =>
          typeof arg === 'object' ? util.inspect(arg, { colors: false, depth: 3 }) : String(arg)
        ).join(' ');
        logs.push({ type: 'warn', message, line: lineNumber });
      },
      info: (...args) => {
        let lineNumber = args[args.length -1];
        let messageArgs = args;
        if (typeof lineNumber === 'number' && args[args.length-2] === '__LINE_NUMBER_MARKER__') {
          messageArgs = args.slice(0, -2);
        } else {
          lineNumber = getCurrentLineFromStack();
        }
        const message = messageArgs.map(arg =>
          typeof arg === 'object' ? util.inspect(arg, { colors: false, depth: 3 }) : String(arg)
        ).join(' ');
        logs.push({ type: 'info', message, line: lineNumber });
      }
    };

    try {
      const ast = acorn.parse(originalCode, { locations: true, ecmaVersion: 'latest' });
      const patches = [];

      function visit(node) {
        if (!node) return;

        if (node.type === 'CallExpression' &&
            node.callee && node.callee.type === 'MemberExpression' &&
            node.callee.object && node.callee.object.type === 'Identifier' && node.callee.object.name === 'console' &&
            node.callee.property && node.callee.property.type === 'Identifier' &&
            ['log', 'error', 'warn', 'info'].includes(node.callee.property.name)) {

          const lineNumber = node.loc.start.line;
          const endParenIndex = node.end - 1; // Index of the closing parenthesis

          patches.push({
            position: endParenIndex,
            text: `, '__LINE_NUMBER_MARKER__', ${lineNumber}`
          });
        }

        for (const key in node) {
          if (node.hasOwnProperty(key)) {
            const child = node[key];
            if (typeof child === 'object' && child !== null) {
              if (Array.isArray(child)) {
                child.forEach(visit);
              } else {
                visit(child);
              }
            }
          }
        }
      }

      visit(ast);

      // Apply patches from the end of the code to the beginning
      patches.sort((a, b) => b.position - a.position);
      let tempCode = originalCode;
      patches.forEach(patch => {
        tempCode = tempCode.slice(0, patch.position) + patch.text + tempCode.slice(patch.position);
      });
      codeToExecute = tempCode;

    } catch (parseOrTransformError) {
      console.error("Error transforming code for line numbers:", parseOrTransformError);
      // If transformation fails, use original code. Logging might be inaccurate.
      codeToExecute = originalCode;
    }

    const vmContextObject = {
      console: customConsole,
      require: require,
      process: process,
      global: global,
      Buffer: Buffer,
      __dirname: __dirname,
      __filename: __filename,
      setTimeout: global.setTimeout,
      setInterval: global.setInterval,
      clearTimeout: global.clearTimeout,
      clearInterval: global.clearInterval,
      __$REPL_COMPLETE$: () => {
        if (resolveCompletionSignal) {
          // console.log('__$REPL_COMPLETE$__ called from VM'); // Debug
          resolveCompletionSignal();
          resolveCompletionSignal = null; // Prevent multiple resolutions
        }
      },
    };
    const context = vm.createContext(vmContextObject);

    const wrappedUserCode = `
      (async () => {
        try {
          // The user's actual code (already transformed for line numbers) goes here.
          // If it's an expression, its result will be awaited.
          return await (async () => { ${codeToExecute} })();
        } catch (err) {
          // This will ensure the error is logged if not already by user code
          if (typeof console !== 'undefined' && typeof console.error === 'function') {
            console.error(String(err.stack || err.message || err), '__LINE_NUMBER_MARKER__', -1); // -1 for internal/wrapper errors
          }
          throw err; // Rethrow for outer handler
        } finally {
          // Ensure completion is signaled
          if (typeof __$REPL_COMPLETE$__ === 'function') {
            __$REPL_COMPLETE$__();
          }
        }
      })();
    `;

    let finalResult;
    try {
      const resultFromVM = vm.runInContext(wrappedUserCode, context, {
        timeout: 10000, // VM execution timeout
        displayErrors: true
      });
      finalResult = await Promise.resolve(resultFromVM);

      // Wait for the completion signal or a timeout
      // console.log('Waiting for completion signal or 10s timeout...'); // Debug
      await Promise.race([
        completionSignalPromise,
        new Promise(resolve => setTimeout(() => {
          // console.log('Race: Signal wait timed out after 10s'); // Debug
          if (resolveCompletionSignal) { // If __$REPL_COMPLETE$__ was never called
            resolveCompletionSignal(); // Resolve the signal promise anyway to proceed
            resolveCompletionSignal = null;
          }
          resolve();
        }, 10000)) // Overall operation timeout for signal
      ]);
      // console.log('Proceeding after signal or timeout.'); // Debug

      return { success: true, logs: logs, value: finalResult };

    } catch (error) {
      // console.error('Outer catch in execute-code:', error.message); // Debug
      if (resolveCompletionSignal) { // Ensure signal promise resolves if an error occurs
        resolveCompletionSignal();
        resolveCompletionSignal = null;
      }
      // The logs array will contain whatever was logged before the error
      return { success: false, error: error.message, logs: logs };
    }
  } catch (error) { // Catch for the outermost try block
    console.error("Critical error in execute-code handler:", error);
    // Ensure the completion signal is resolved in case of unexpected top-level error
    if (resolveCompletionSignal) {
      resolveCompletionSignal();
      resolveCompletionSignal = null;
    }
    return {
      success: false,
      error: "A critical error occurred in the execution engine: " + error.message,
      logs: logs // logs might be populated from earlier stages
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
