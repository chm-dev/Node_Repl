# Node REPL - Electron App

A powerful interactive Node.js REPL built with Electron, inspired by RunJS. This application provides a modern IDE-like interface for writing, executing, and testing JavaScript/Node.js code.

## Features

- **Interactive Code Editor**: Monaco Editor with syntax highlighting, auto-completion, and multiple themes
- **Live Code Execution**: Execute JavaScript and Node.js code with real-time output
- **Code Formatting**: Built-in code formatter with Prettier-style formatting
- **File Management**: Create, open, save, and manage JavaScript files
- **Modern UI**: Dark theme with professional layout similar to VS Code
- **Keyboard Shortcuts**: Comprehensive shortcuts for productivity
- **Error Handling**: Detailed error messages and stack traces
- **Console Output**: Captured console.log, error, warn, and info messages
- **Line Tracking**: Shows which line generated each output
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   npm start
   ```

## Development

To run in development mode with DevTools:
```bash
npm run dev
```

To build the application:
```bash
npm run build
```

## Keyboard Shortcuts

- `Ctrl+Enter` / `Cmd+Enter` - Execute code
- `Ctrl+Shift+Enter` / `Cmd+Shift+Enter` - Execute selection or current line
- `Ctrl+S` / `Cmd+S` - Save file
- `Ctrl+Shift+S` / `Cmd+Shift+S` - Save as
- `Ctrl+N` / `Cmd+N` - New file
- `Ctrl+O` / `Cmd+O` - Open file
- `Ctrl+K` / `Cmd+K` - Clear output
- `Shift+Alt+F` - Format code
- `F5` - Execute code

## Usage

1. **Writing Code**: Use the left panel to write JavaScript/Node.js code with Monaco Editor
2. **Executing Code**: Press `Ctrl+Enter` to execute the entire code or `Ctrl+Shift+Enter` to execute selected text
3. **Formatting Code**: Press `Shift+Alt+F` or click the format button (✨) to format your code
4. **Viewing Output**: The right panel shows execution results, console output, and errors with line tracking
5. **File Operations**: Use the toolbar or menu to create, open, and save files
6. **Node.js Modules**: You can require and use any Node.js built-in modules

## Example Code

```javascript
// Basic Node.js example
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('Platform:', os.platform());
console.log('Node version:', process.version);

// Async/await support
async function fetchData() {
    return new Promise(resolve => {
        setTimeout(() => resolve('Data fetched!'), 1000);
    });
}

fetchData().then(console.log);

// File system operations
console.log('Current directory:', process.cwd());
console.log('Home directory:', os.homedir());
```

## Architecture

- **Main Process** (`src/main.js`): Electron main process handling window management and file operations
- **Preload Script** (`src/preload.js`): Secure bridge between main and renderer processes
- **Renderer Process** (`src/renderer/`): Frontend UI with CodeMirror editor and execution engine
- **Styles** (`src/renderer/styles.css`): Modern dark theme styling

## Technologies Used

- **Electron**: Desktop application framework
- **CodeMirror**: Code editor with syntax highlighting
- **Node.js**: JavaScript runtime for code execution
- **HTML/CSS/JavaScript**: Frontend technologies

## Security

This application uses Electron's security best practices:
- Context isolation enabled
- Node integration disabled in renderer
- Secure preload script for IPC communication

## License

MIT License - feel free to use and modify as needed.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Future Enhancements

- [ ] NPM package management
- [ ] Multiple tabs/files
- [ ] Code snippets library
- [ ] Export options (HTML, PDF)
- [ ] Plugin system
- [ ] Remote execution
- [ ] Collaborative editing
- [ ] Git integration
