# Content Blog - Auto Structure Update

This document explains how to automatically update the `structure.json` file when files and folders are added or removed from the `src` directory.

## 🚀 Quick Start

### Method 1: Manual Generation
```bash
# Generate structure.json once
python generate_structure.py

# On Windows
update_structure.bat

# On Linux/Mac
./update_structure.sh
```

### Method 2: Watch Mode (Continuous Monitoring)
```bash
# Watch src directory for changes and auto-regenerate structure.json
python generate_structure.py --watch

# Watch with custom interval (default: 2 seconds)
python generate_structure.py --watch --interval 5
```

> **Note:** there is no browser-side polling. The site fetches `structure.json` once per load, so a
> regenerated file shows up on the next page load — there is no refresh button and no `structure-updater.js`.
> (An earlier revision of this document described such a feature; it was never part of `ng-src/`.)

## 📁 File Structure Generator

The `generate_structure.py` script scans your `src` directory and creates a JSON structure for the navigation tree.

### Features:
- ✅ **Automatic Discovery**: Finds all markdown, HTML, and text files
- ✅ **Directory Filtering**: Excludes build/cache directories (`.git`, `node_modules`, etc.)
- ✅ **Sorted Output**: Directories first, then files, alphabetically
- ✅ **Change Detection**: Only includes directories with content
- ✅ **Watch Mode**: Continuous monitoring for changes

### Supported File Types:
- `.md` (Markdown)
- `.html` (HTML)
- `.txt` (Text)
- `.json` (JSON)

### Command Line Options:
```
--src SRC              Source directory to scan (default: src)
--output OUTPUT        Output file (default: structure.json)
--watch               Watch directory for changes
--interval INTERVAL   Watch interval in seconds (default: 2)
```

## 🔧 Browser Integration

### StructureUpdater Class
The website includes a `StructureUpdater` class that monitors `structure.json` for changes:

```javascript
// Start monitoring
window.structureUpdater.startWatching();

// Stop monitoring
window.structureUpdater.stopWatching();

// Manual check
await window.structureUpdater.forceCheck();
```

### Features:
- **Change Detection**: Uses hash comparison to detect changes
- **Automatic Updates**: Refreshes the file tree when changes occur
- **Toast Notifications**: Shows user-friendly notifications
- **Manual Refresh**: Provides manual refresh capability

## 🎯 Use Cases

### 1. During Development
```bash
# Terminal 1: Run the website
python -m http.server 8000

# Terminal 2: Watch for changes
python generate_structure.py --watch
```

### 2. Content Management
- Add new markdown files to `src/`
- Structure updates automatically
- File tree refreshes in browser

### 3. CI/CD Integration
```bash
# In your build script
python generate_structure.py
git add structure.json
git commit -m "Update structure.json"
```

## 🐛 Console Error Fixes

The following console errors have been fixed:

### ✅ Fixed: querySelector Errors
- Added safe querySelector wrapper functions
- Validates selectors before use
- Prevents `Document.querySelector: '#' is not a valid selector` errors

### ✅ Fixed: Navbar Brand Click Errors
- Improved error handling for navigation clicks
- Safe element selection with fallbacks
- Proper breadcrumb updates

### ✅ Fixed: Scroll Behavior Issues
- Validates anchor href attributes
- Regex validation for anchor selectors
- Graceful error handling for invalid anchors

## 📝 Example Usage

### Adding New Content
1. Create a new file: `src/NewCategory/my-article.md`
2. Run: `python generate_structure.py`
3. Refresh the website to see the new file in the tree

### Removing Content
1. Delete files/folders from `src/`
2. Run: `python generate_structure.py`
3. The structure.json will be updated automatically

### Development Workflow
```bash
# Start watching in background
python generate_structure.py --watch &

# Make changes to src/
echo "# New Article" > src/test.md

# structure.json updates automatically (watch mode); reload the page to see the new tree
```

## ⚙️ Configuration

### Watch Interval
Pass `--interval` to watch mode (seconds between directory scans):
```bash
python generate_structure.py --watch --interval 5
```

### File Type Filtering
Edit `generate_structure.py` to include more file types:
```python
allowed_extensions = {'.md', '.txt', '.html', '.json', '.rst', '.adoc'}
```

### Directory Exclusions
Modify excluded directories in `generate_structure.py`:
```python
excluded_dirs = {'.git', '.vscode', '__pycache__', 'node_modules', 'bin', 'obj'}
```

## 🚨 Troubleshooting

### Structure.json Not Updating
- Check if `src/` directory exists
- Verify file permissions
- Run with verbose output: add debug prints to the script

### File Tree Not Showing New Content
- Confirm `structure.json` actually changed (`git diff structure.json`)
- Reload the page — the tree is fetched once per load, not polled
- Commit the regenerated `structure.json`; CI fails if the committed copy is stale

---

**Happy Coding! 🎉**