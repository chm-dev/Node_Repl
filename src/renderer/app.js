class NodeREPL {
    constructor() {
        this.editor = null;
        this.currentFile = null;
        this.isModified = false;
        this.outputContainer = document.getElementById('output');
        this.statusText = document.getElementById('statusText');
        this.cursorPosition = document.getElementById('cursorPosition');
        this.fileName = document.getElementById('fileName');
        
        this.init();
        this.setupEventListeners();
        this.setupMenuListeners();
    }    init() {
        // Initialize Monaco Editor
        require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
        
        require(['vs/editor/editor.main'], () => {
            this.editor = monaco.editor.create(document.getElementById('monacoEditor'), {
                value: `// Welcome to Node REPL!
// Write your JavaScript code here and press Ctrl+Enter to execute

console.log('Hello, World!');

// Basic JavaScript examples:
let numbers = [1, 2, 3, 4, 5];
console.log('Numbers:', numbers);
console.log('Sum:', numbers.reduce((a, b) => a + b, 0));

// Try some Node.js features (when running in Electron):
try {
    const os = require('os');
    const path = require('path');
    
    console.log('Platform:', os.platform());
    console.log('Node version:', process.version);
    console.log('Home directory:', os.homedir());
} catch (error) {
    console.log('Node.js modules not available - running in browser mode');
    console.log('Available mock modules: os, path, crypto');
    
    // Try the mock modules
    const os = require('os');
    console.log('Mock platform:', os.platform());
}

// You can use async/await:
async function example() {
    return new Promise(resolve => {
        setTimeout(() => resolve('Async operation completed!'), 1000);
    });
}

// Execute this:
example().then(console.log);`,
                language: 'javascript',
                theme: 'vs-dark',
                fontSize: 14,
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                minimap: { enabled: false },
                folding: true,
                lineDecorationsWidth: 10,
                lineNumbersMinChars: 3,
                renderWhitespace: 'boundary',
                tabSize: 2,
                insertSpaces: true,
                wordWrap: 'on',
                contextmenu: true,
                mouseWheelZoom: true,
                smoothScrolling: true,
                cursorStyle: 'line',
                cursorBlinking: 'blink',
                renderLineHighlight: 'all',
                selectOnLineNumbers: true,
                glyphMargin: false,
                fixedOverflowWidgets: true
            });

            // Add keyboard shortcuts
            this.editor.addAction({
                id: 'execute-code',
                label: 'Execute Code',
                keybindings: [
                    monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter
                ],
                run: () => this.executeCode()
            });

            this.editor.addAction({
                id: 'execute-selection',
                label: 'Execute Selection',
                keybindings: [
                    monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter
                ],
                run: () => this.executeSelection()
            });

            this.editor.addAction({
                id: 'save-file',
                label: 'Save File',
                keybindings: [
                    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS
                ],
                run: () => this.saveFile()
            });            this.editor.addAction({
                id: 'clear-output',
                label: 'Clear Output',
                keybindings: [
                    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK
                ],
                run: () => this.clearOutput()
            });

            this.editor.addAction({
                id: 'format-code',
                label: 'Format Code',
                keybindings: [
                    monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF
                ],
                run: () => this.formatCode()
            });

            // Update cursor position
            this.editor.onDidChangeCursorPosition((e) => {
                this.cursorPosition.textContent = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
            });

            // Track modifications
            this.editor.onDidChangeModelContent(() => {
                if (!this.isModified) {
                    this.isModified = true;
                    this.updateFileName();
                }
            });

            this.updateStatus('Ready');
        });
    }

    setupEventListeners() {        // Toolbar buttons
        document.getElementById('runBtn').addEventListener('click', () => this.executeCode());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearOutput());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveFile());
        document.getElementById('newFileBtn').addEventListener('click', () => this.newFile());
        document.getElementById('openFileBtn').addEventListener('click', () => this.openFile());
        document.getElementById('formatBtn').addEventListener('click', () => this.formatCode());
        document.getElementById('clearOutputBtn').addEventListener('click', () => this.clearOutput());

        // Keyboard shortcuts for buttons
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.executeCode();
            } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
                e.preventDefault();
                this.executeSelection();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.clearOutput();
            }
        });
    }

    setupMenuListeners() {
        if (window.electronAPI) {
            window.electronAPI.onMenuNewFile(() => this.newFile());
            window.electronAPI.onMenuOpenFile((event, data) => this.loadFile(data.path, data.content));
            window.electronAPI.onMenuSaveFile(() => this.saveFile());
            window.electronAPI.onMenuSaveAsFile(() => this.saveAsFile());            window.electronAPI.onMenuClearOutput(() => this.clearOutput());
            window.electronAPI.onMenuFormatCode(() => this.formatCode());
            window.electronAPI.onMenuExecuteCode(() => this.executeCode());
            window.electronAPI.onMenuExecuteSelection(() => this.executeSelection());
        }
    }    async executeCode(code = null) {
        const codeToExecute = code || this.editor.getValue();
        if (!codeToExecute.trim()) return;

        this.updateStatus('Executing...');

        try {
            // Send code to main process for execution via IPC
            if (window.electronAPI && window.electronAPI.executeCode) {
                const result = await window.electronAPI.executeCode(codeToExecute);
                  if (!result.success) {
                    throw new Error(result.error);
                }                // Display console output
                if (result.logs && result.logs.length > 0) {
                    result.logs.forEach(log => {
                        this.addOutput(log.type, log.message, log.line);
                    });
                }
                
                // Display return value if any
                if (result.value !== undefined) {
                    this.addOutput('result', this.formatOutput(result.value));
                }
                
                this.updateStatus('Execution completed');
            } else {
                // Fallback: execute in renderer context (limited functionality)
                const result = await this.evaluateInRenderer(codeToExecute);
                if (result !== undefined) {
                    this.addOutput('result', this.formatOutput(result));
                }
                this.updateStatus('Execution completed (browser mode)');
            }
        } catch (error) {
            this.addOutput('error', error.message);
            this.updateStatus('Execution failed');
        }
    }    async executeSelection() {
        const selection = this.editor.getModel().getValueInRange(this.editor.getSelection());
        if (selection.trim()) {
            await this.executeCode(selection);
        } else {
            // Execute current line if no selection
            const position = this.editor.getPosition();
            const line = this.editor.getModel().getLineContent(position.lineNumber);
            if (line.trim()) {
                await this.executeCode(line);
            }
        }
    }async evaluateCode(code) {
        // Send code to main process for execution via IPC
        if (window.electronAPI && window.electronAPI.executeCode) {
            try {
                const result = await window.electronAPI.executeCode(code);
                if (result.error) {
                    throw new Error(result.error);
                }
                
                // Display console output
                if (result.logs && result.logs.length > 0) {
                    result.logs.forEach(log => {
                        this.addOutput(log.type, log.message);
                    });
                }
                
                return result.value;
            } catch (error) {
                throw error;
            }
        } else {
            // Fallback: execute in renderer context (limited functionality)
            return this.evaluateInRenderer(code);
        }
    }

    async evaluateInRenderer(code) {
        // Create a new context for evaluation in renderer
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        
        // Create mock require function for common modules
        const mockRequire = (moduleName) => {
            const mocks = {
                'os': {
                    platform: () => navigator.platform,
                    homedir: () => 'Home directory not available in browser',
                    tmpdir: () => 'Temp directory not available in browser',
                    hostname: () => 'localhost',
                    type: () => navigator.userAgent,
                    arch: () => 'Browser environment',
                    release: () => 'Browser version',
                    cpus: () => [{model: 'Browser CPU', speed: 'Unknown'}],
                    totalmem: () => 'Unknown',
                    freemem: () => 'Unknown'
                },
                'path': {
                    join: (...args) => args.join('/'),
                    resolve: (...args) => '/' + args.join('/'),
                    basename: (path) => path.split('/').pop(),
                    dirname: (path) => path.split('/').slice(0, -1).join('/'),
                    extname: (path) => {
                        const parts = path.split('.');
                        return parts.length > 1 ? '.' + parts.pop() : '';
                    }
                },
                'fs': {
                    readFileSync: () => { throw new Error('File system not available in browser'); },
                    writeFileSync: () => { throw new Error('File system not available in browser'); },
                    existsSync: () => false
                },
                'crypto': {
                    randomBytes: (size) => {
                        const array = new Uint8Array(size);
                        crypto.getRandomValues(array);
                        return Array.from(array);
                    }
                }
            };
            
            if (mocks[moduleName]) {
                return mocks[moduleName];
            } else {
                throw new Error(`Module '${moduleName}' not available in browser environment. Available modules: ${Object.keys(mocks).join(', ')}`);
            }
        };

        // Mock process object
        const mockProcess = {
            version: 'Browser Environment',
            platform: navigator.platform,
            cwd: () => 'Browser working directory',
            env: {},
            argv: ['browser', 'repl'],
            exit: () => console.log('Process exit called'),
            nextTick: (callback) => setTimeout(callback, 0)
        };

        // Wrap the code in an async function to support await
        const wrappedCode = `
            return (async () => {
                ${code}
            })();
        `;

        try {
            const func = new AsyncFunction('require', 'console', 'process', 'global', '__dirname', '__filename', wrappedCode);
              // Create a custom console for capturing output
            const customConsole = {
                log: (...args) => {
                    const output = args.map(arg => this.formatOutput(arg)).join(' ');
                    this.addOutput('log', output);
                },
                error: (...args) => {
                    const output = args.map(arg => this.formatOutput(arg)).join(' ');
                    this.addOutput('error', output);
                },
                warn: (...args) => {
                    const output = args.map(arg => this.formatOutput(arg)).join(' ');
                    this.addOutput('log', `⚠️ ${output}`);
                },
                info: (...args) => {
                    const output = args.map(arg => this.formatOutput(arg)).join(' ');
                    this.addOutput('log', `ℹ️ ${output}`);
                }
            };

            // Execute the code with mocked Node.js context
            const result = await func(
                mockRequire,
                customConsole,
                mockProcess,
                window,
                'Browser environment',
                'Browser environment'
            );

            return result;
        } catch (error) {
            throw error;
        }
    }

    formatOutput(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') return value;
        if (typeof value === 'function') return value.toString();
        if (value instanceof Error) return `${value.name}: ${value.message}`;
        
        try {
            return JSON.stringify(value, null, 2);
        } catch (e) {
            return String(value);
        }
    }    addOutput(type, content, lineNumber = null) {
        const entry = document.createElement('div');
        entry.className = `output-entry ${type}`;
        
        const timestamp = document.createElement('span');
        timestamp.className = 'output-timestamp';
        timestamp.textContent = new Date().toLocaleTimeString();
        
        const lineInfo = document.createElement('span');
        lineInfo.className = 'output-line-info';
        if (lineNumber && lineNumber > 0) {
            lineInfo.textContent = `Line ${lineNumber}`;
        }
        
        const contentSpan = document.createElement('span');
        contentSpan.textContent = content;
        
        entry.appendChild(timestamp);
        if (lineNumber && lineNumber > 0) {
            entry.appendChild(lineInfo);
        }
        entry.appendChild(contentSpan);
        
        this.outputContainer.appendChild(entry);
        this.outputContainer.scrollTop = this.outputContainer.scrollHeight;
    }clearOutput() {
        this.outputContainer.innerHTML = '';
        this.updateStatus('Output cleared');
    }

    formatCode() {
        if (!this.editor) return;
        
        try {
            // Use Monaco Editor's built-in formatting action
            this.editor.getAction('editor.action.formatDocument').run();
            this.updateStatus('Code formatted');
        } catch (error) {
            console.error('Error formatting code:', error);
            this.updateStatus('Format failed');
        }
    }newFile() {
        if (this.isModified && !confirm('Discard unsaved changes?')) {
            return;
        }
        
        this.editor.setValue('');
        this.currentFile = null;
        this.isModified = false;
        this.updateFileName();
        this.updateStatus('New file created');
    }

    openFile() {
        // This would trigger the file dialog in Electron
        // For now, we'll just simulate it
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.js,.json,.txt';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.loadFile(file.name, e.target.result);
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }    loadFile(fileName, content) {
        if (this.isModified && !confirm('Discard unsaved changes?')) {
            return;
        }
        
        this.editor.setValue(content);
        this.currentFile = fileName;
        this.isModified = false;
        this.updateFileName();
        this.updateStatus(`Opened ${fileName}`);
    }

    async saveFile() {
        const content = this.editor.getValue();
        
        if (window.electronAPI) {
            const result = await window.electronAPI.saveFile({
                path: this.currentFile,
                content: content
            });
            
            if (result.success) {
                this.currentFile = result.path;
                this.isModified = false;
                this.updateFileName();
                this.updateStatus(`Saved ${this.currentFile}`);
            } else {
                this.updateStatus('Save failed');
            }
        } else {
            // Fallback for web version
            this.downloadFile(content, this.currentFile || 'untitled.js');
        }
    }

    async saveAsFile() {
        const content = this.editor.getValue();
        
        if (window.electronAPI) {
            const result = await window.electronAPI.saveFile({
                path: null, // Force save dialog
                content: content
            });
            
            if (result.success) {
                this.currentFile = result.path;
                this.isModified = false;
                this.updateFileName();
                this.updateStatus(`Saved as ${this.currentFile}`);
            }
        } else {
            // Fallback for web version
            this.downloadFile(content, 'untitled.js');
        }
    }

    downloadFile(content, fileName) {
        const blob = new Blob([content], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        this.updateStatus(`Downloaded ${fileName}`);
    }

    updateFileName() {
        const name = this.currentFile || 'untitled.js';
        const modified = this.isModified ? ' •' : '';
        this.fileName.textContent = name + modified;
    }

    updateStatus(message) {
        this.statusText.textContent = message;
        this.statusText.parentElement.classList.add('status-updated');
        setTimeout(() => {
            this.statusText.parentElement.classList.remove('status-updated');
        }, 300);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NodeREPL();
});
