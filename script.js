// ========================================
// GLOBAL ERROR HANDLING
// ========================================

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
    // Filter out extension-related errors and other non-critical errors
    const ignoredErrors = [
        'favicon.ico',
        'Non-Error promise rejection captured',
        'Script error',
        'onMessage',
        'chrome-extension',
        'moz-extension',
        'safari-extension',
        'ResizeObserver loop limit exceeded',
        'Background Chrome extension'
    ];
    
    const shouldIgnore = ignoredErrors.some(ignored => 
        event.message?.toLowerCase().includes(ignored.toLowerCase()) ||
        event.filename?.toLowerCase().includes(ignored.toLowerCase())
    );
    
    if (!shouldIgnore) {
        console.error('Global error caught:', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
        });
        
        if (window.Utils && window.Utils.showToast) {
            window.Utils.showToast('An unexpected error occurred. Please refresh the page.', 'error');
        }
    }
});

// Global promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    // Filter out extension-related promise rejections
    const extensionErrors = [
        'onMessage',
        'chrome-extension',
        'moz-extension', 
        'safari-extension',
        'Extension context invalidated',
        'Message port closed',
        'Promise response from onMessage listener went out of scope'
    ];
    
    const isExtensionError = extensionErrors.some(error => 
        event.reason?.toString().toLowerCase().includes(error.toLowerCase())
    );
    
    if (isExtensionError) {
        // Silently handle extension errors
        event.preventDefault();
        return;
    }
    
    console.error('Unhandled promise rejection:', event.reason);
    
    // Don't prevent default for network errors or expected failures
    const allowedRejections = [
        'fetch',
        'NetworkError',
        'Failed to fetch',
        'Load failed'
    ];
    
    const shouldPrevent = !allowedRejections.some(allowed => 
        event.reason?.toString().includes(allowed)
    );
    
    if (shouldPrevent) {
        event.preventDefault(); // Prevent the default browser behavior
    }
});

// ========================================
// MODERN JAVASCRIPT ENHANCEMENTS
// ========================================

// Global application state
const AppState = {
    currentTheme: localStorage.getItem('theme') || 'light',
    currentFile: null,
    searchResults: [],
    isLoading: false
};

// Safe querySelector wrapper to prevent errors
function safeQuerySelector(selector, context = document) {
    try {
        if (!selector || typeof selector !== 'string') {
            return null;
        }
        return context.querySelector(selector);
    } catch (error) {
        console.warn('Invalid selector:', selector, error);
        return null;
    }
}

// Safe querySelectorAll wrapper
function safeQuerySelectorAll(selector, context = document) {
    try {
        if (!selector || typeof selector !== 'string') {
            return [];
        }
        return Array.from(context.querySelectorAll(selector));
    } catch (error) {
        console.warn('Invalid selector:', selector, error);
        return [];
    }
}

// Utility functions
const Utils = {
    // Debounce function for search input
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Show loading state
    showLoading() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.style.display = 'flex';
            AppState.isLoading = true;
        }
    },
    
    // Hide loading state
    hideLoading() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.style.display = 'none';
            AppState.isLoading = false;
        } else {
            // Fallback: hide any loading spinners by class
            const spinners = document.querySelectorAll('.spinner-border, #loading-spinner, [id*="loading"], [class*="loading"]');
            spinners.forEach(s => {
                s.style.display = 'none';
                if (s.parentElement) {
                    s.parentElement.style.display = 'none';
                }
            });
            AppState.isLoading = false;
        }
    },
    
    // Add fade in animation
    fadeIn(element) {
        element.classList.add('fade-in');
        setTimeout(() => element.classList.remove('fade-in'), 500);
    },
    
    // Add slide up animation
    slideInUp(element) {
        element.classList.add('slide-in-up');
        setTimeout(() => element.classList.remove('slide-in-up'), 500);
    },
    
    // Show toast notification
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `alert alert-${type === 'error' ? 'danger' : type} position-fixed`;
        toast.style.cssText = 'top: 100px; right: 20px; z-index: 9999; opacity: 0; transition: opacity 0.3s ease;';
        toast.innerHTML = `
            <strong>${type === 'error' ? 'Error!' : type === 'success' ? 'Success!' : 'Info'}</strong>
            ${message}
            <button type="button" class="btn-close" aria-label="Close"></button>
        `;
        
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.style.opacity = '1', 100);
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);
        
        // Close button functionality
        toast.querySelector('.btn-close').addEventListener('click', () => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        });
    }
};

// Expose Utils globally for use by footer.js and other modules
window.Utils = Utils;

// Theme Management
const ThemeManager = {
    init() {
        this.applyTheme(AppState.currentTheme);
        this.setupThemeToggle();
    },
    
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        AppState.currentTheme = theme;
        localStorage.setItem('theme', theme);
        
        // Update theme toggle icon
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) {
            themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        
        // Update highlight.js theme
        const highlightTheme = document.getElementById('highlight-theme');
        if (highlightTheme) {
            highlightTheme.href = theme === 'dark' 
                ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github-dark.min.css'
                : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css';
        }
    },
    
    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const newTheme = AppState.currentTheme === 'light' ? 'dark' : 'light';
                this.applyTheme(newTheme);
                Utils.showToast(`Switched to ${newTheme} theme`, 'success');
            });
        }
    }
};

// Accessibility Manager
const AccessibilityManager = {
    init() {
        this.setupKeyboardNavigation();
        this.setupFocusManagement();
        this.setupScreenReaderSupport();
    },
    
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Escape key to close search results
            if (e.key === 'Escape') {
                this.clearSearchResults();
            }
            
            // Ctrl/Cmd + K to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('search-input').focus();
            }
            
            // Home key to scroll to top
            if (e.key === 'Home' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    },
    
    setupFocusManagement() {
        // Skip to main content link
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'visually-hidden-focusable btn btn-primary position-absolute';
        skipLink.style.cssText = 'top: 10px; left: 10px; z-index: 10000;';
        skipLink.textContent = 'Skip to main content';
        document.body.insertBefore(skipLink, document.body.firstChild);
        
        // Add main content id
        document.querySelector('.main-content').id = 'main-content';
    },
    
    setupScreenReaderSupport() {
        // Announce page changes to screen readers
        this.announceToScreenReader = (message) => {
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.setAttribute('aria-atomic', 'true');
            announcement.className = 'visually-hidden';
            announcement.textContent = message;
            document.body.appendChild(announcement);
            
            setTimeout(() => {
                if (announcement.parentNode) {
                    announcement.parentNode.removeChild(announcement);
                }
            }, 1000);
        };
    },
    
    clearSearchResults() {
        const searchResults = document.getElementById('search-results');
        searchResults.innerHTML = '';
        searchResults.style.display = 'none';
    }
};

// Scroll to Top Manager
const ScrollManager = {
    init() {
        this.setupScrollToTop();
        this.setupScrollBehavior();
    },
    
    setupScrollToTop() {
        const scrollToTopBtn = document.getElementById('scroll-to-top');
        
        if (scrollToTopBtn) {
            window.addEventListener('scroll', () => {
                if (window.pageYOffset > 300) {
                    scrollToTopBtn.classList.add('visible');
                } else {
                    scrollToTopBtn.classList.remove('visible');
                }
            });
            
            scrollToTopBtn.addEventListener('click', () => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }
    },
    
    setupScrollBehavior() {
        // Smooth scroll for anchor links
        document.addEventListener('click', (e) => {
            if (e.target.matches('a[href^="#"]')) {
                e.preventDefault();
                const href = e.target.getAttribute('href');
                // Validate the selector before using it
                if (href && href.length > 1 && href.match(/^#[a-zA-Z][\w-]*$/)) {
                    try {
                        const target = document.querySelector(href);
                        if (target) {
                            target.scrollIntoView({ behavior: 'smooth' });
                        }
                    } catch (error) {
                        console.warn('Invalid selector:', href, error);
                    }
                }
            }
        });
    }
};

// Breadcrumb Manager
const BreadcrumbManager = {
    init() {
        this.breadcrumbEl = document.getElementById('breadcrumb');
        
        // Add click handler to existing home breadcrumb
        if (this.breadcrumbEl) {
            // Set up delegation for all breadcrumb links
            this.breadcrumbEl.addEventListener('click', (e) => {
                if (e.target.tagName === 'A') {
                    e.preventDefault();
                    if (e.target.textContent.trim() === 'Home' || e.target.getAttribute('aria-label') === 'Home') {
                        showHomePage();
                        BreadcrumbManager.update([]);
                    }
                }
            });
            
            // Also set up the initial home breadcrumb if it exists
            const homeLink = this.breadcrumbEl.querySelector('a[aria-label="Home"]');
            if (homeLink) {
                homeLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    showHomePage();
                    BreadcrumbManager.update([]);
                });
            }
        }
    },
    
    update(path = []) {
        if (!this.breadcrumbEl) return;
        
        // Clear existing breadcrumbs and recreate home
        const homeItem = document.createElement('li');
        homeItem.className = 'breadcrumb-item';
        const homeLink = document.createElement('a');
        homeLink.href = '#';
        homeLink.setAttribute('aria-label', 'Home');
        homeLink.textContent = 'Home';
        
        // Add click handler to the new home link
        homeLink.addEventListener('click', (e) => {
            e.preventDefault();
            showHomePage();
            this.update([]);
        });
        
        homeItem.appendChild(homeLink);
        this.breadcrumbEl.innerHTML = '';
        this.breadcrumbEl.appendChild(homeItem);
        
        path.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'breadcrumb-item';
            
            if (index === path.length - 1) {
                li.className += ' active';
                li.setAttribute('aria-current', 'page');
                li.textContent = item.name;
            } else {
                const a = document.createElement('a');
                a.href = '#';
                a.textContent = item.name;
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (item.action) item.action();
                });
                li.appendChild(a);
            }
            
            this.breadcrumbEl.appendChild(li);
        });
    }
};

// Enhanced File Loading
async function loadFile(filePath) {
    try {
        Utils.showLoading();
        
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`Failed to load file: ${filePath}`);
        let markdown = await response.text();

        // Correct image paths in the markdown content
        const basePath = filePath.substring(0, filePath.lastIndexOf('/') + 1);
        markdown = markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
            if (!src.startsWith('http') && !src.startsWith('/')) {
                src = basePath + src;
            }
            return `![${alt}](${src})`;
        });

        const htmlContent = marked.parse(markdown);
        const contentEl = document.getElementById('content');

        // Calculate reading time (approx. 200 words/minute)
        const markdownWithoutCodeBlocks = markdown.replace(/```[\s\S]*?```/g, '');
        const cleanedText = markdownWithoutCodeBlocks.replace(/[#*`[\]()!]/g, '');
        const words = cleanedText.split(/\s+/).filter(Boolean);
        const wordCount = words.length;
        const readingMinutes = Math.max(1, Math.round(wordCount / 200));
        const fileName = filePath.split('/').pop().replace('.md', '');
        
        contentEl.innerHTML = `
            <div class="content-meta-bar">
                <div class="meta-left">
                    <span><i class="fas fa-file-alt me-1"></i>${fileName}</span>
                </div>
                <div class="meta-right">
                    <span class="reading-time-badge">
                        <i class="fas fa-clock"></i>${readingMinutes} min read
                    </span>
                    <span class="text-muted" style="font-size:0.8rem">${wordCount.toLocaleString()} words</span>
                </div>
            </div>
            <div class="card-body"><div class="markdown-content">${htmlContent}</div></div>
        `;

        // Add enhanced code block functionality
        addEnhancedCodeActions();
        
        // Apply syntax highlighting
        hljs.highlightAll();
        
        // Store current file data
        AppState.currentFile = {
            path: filePath,
            name: filePath.split('/').pop(),
            markdown: markdown
        };

        // Update breadcrumb
        const pathParts = filePath.split('/').filter(part => part !== 'src');
        BreadcrumbManager.update([
            ...pathParts.slice(0, -1).map(part => ({ name: part })),
            { name: pathParts[pathParts.length - 1] }
        ]);

        // Show/hide appropriate UI elements
        showContentView();
        
        // Announce to screen readers
        if (AccessibilityManager.announceToScreenReader) {
            AccessibilityManager.announceToScreenReader(`Loaded ${AppState.currentFile.name}`);
        }
        
        // Add animation
        Utils.slideInUp(contentEl);
        // Scroll to top of content
        contentEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
    } catch (error) {
        console.error('Error loading file:', error);
        document.getElementById('content').innerHTML = `
            <div class="card-body">
                <div class="alert alert-danger" role="alert">
                    <h4 class="alert-heading">Error Loading File</h4>
                    <p>${error.message}</p>
                    <hr>
                    <p class="mb-0">Please try again or select a different file.</p>
                </div>
            </div>
        `;
        Utils.showToast('Failed to load file', 'error');
    } finally {
        Utils.hideLoading();
    }
}

// Enhanced Code Block Actions
function addEnhancedCodeActions() {
    const preBlocks = document.querySelectorAll('pre');
    preBlocks.forEach((pre, index) => {
        if (pre.closest('.code-block-wrapper')) return; // Already processed
        
        // Create wrapper with improved structure
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';

        // Create header
        const header = document.createElement('div');
        header.className = 'code-block-header';

        // Detect language
        const codeEl = pre.querySelector('code');
        const language = codeEl ? Array.from(codeEl.classList)
            .find(cls => cls.startsWith('language-'))?.replace('language-', '') || 'text' : 'text';

        // macOS-style dots + title
        const dotsEl = document.createElement('div');
        dotsEl.className = 'code-mac-dots';
        dotsEl.innerHTML = `<span class="dot-red"></span><span class="dot-yellow"></span><span class="dot-green"></span>`;

        const title = document.createElement('div');
        title.className = 'code-block-title';
        title.innerHTML = `<span class="badge bg-secondary">${language.toUpperCase()}</span>`;

        // Enhanced actions
        const actions = document.createElement('div');
        actions.className = 'code-actions';
        actions.innerHTML = `
            <button class="btn btn-sm copy-btn" title="Copy to clipboard" aria-label="Copy code to clipboard">
                <i class="fas fa-copy"></i>
            </button>
            <button class="btn btn-sm download-btn" title="Download as file" aria-label="Download code as file">
                <i class="fas fa-download"></i>
            </button>
            <button class="btn btn-sm view-raw-btn" title="View in new window" aria-label="View code in new window">
                <i class="fas fa-external-link-alt"></i>
            </button>
            <button class="btn btn-sm collapse-btn" title="Collapse/Expand" aria-label="Toggle code visibility">
                <i class="fas fa-compress"></i>
            </button>
        `;

        // Add event listeners
        const copyBtn = actions.querySelector('.copy-btn');
        const downloadBtn = actions.querySelector('.download-btn');
        const viewRawBtn = actions.querySelector('.view-raw-btn');
        const collapseBtn = actions.querySelector('.collapse-btn');

        // Copy functionality with enhanced feedback
        copyBtn.addEventListener('click', () => {
            // Use both modern and fallback clipboard methods
            const copyText = async () => {
                try {
                    if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.writeText(pre.textContent);
                    } else {
                        // Fallback for older browsers
                        const textArea = document.createElement('textarea');
                        textArea.value = pre.textContent;
                        textArea.style.position = 'fixed';
                        textArea.style.opacity = '0';
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        if (textArea.parentNode) {
                            textArea.parentNode.removeChild(textArea);
                        }
                    }
                    
                    // Update button state
                    copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                    copyBtn.className = 'btn btn-success btn-sm copy-btn';
                    
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Code copied to clipboard!', 'success');
                    }
                    
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
                        copyBtn.className = 'btn btn-outline-primary btn-sm copy-btn';
                    }, 2000);
                    
                } catch (err) {
                    console.error('Failed to copy:', err);
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Failed to copy code', 'error');
                    }
                }
            };
            
            // Call the async function but don't await it to avoid scope issues
            copyText();
        });

        // Download functionality
        downloadBtn.addEventListener('click', () => {
            const blob = new Blob([pre.textContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `code-block-${index + 1}.${language === 'text' ? 'txt' : language}`;
            document.body.appendChild(a);
            a.click();
            if (a.parentNode) {
                a.parentNode.removeChild(a);
            }
            URL.revokeObjectURL(url);
            Utils.showToast('Code downloaded successfully!', 'success');
        });

        // View raw functionality
        viewRawBtn.addEventListener('click', () => {
            const newWindow = window.open('', '_blank');
            newWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Code Block ${index + 1}</title>
                    <style>
                        body { font-family: monospace; padding: 20px; background: #f5f5f5; }
                        pre { background: white; padding: 20px; border-radius: 8px; overflow: auto; }
                    </style>
                </head>
                <body>
                    <h3>Code Block ${index + 1} (${language.toUpperCase()})</h3>
                    <pre><code>${pre.textContent}</code></pre>
                </body>
                </html>
            `);
            newWindow.document.close();
        });

        // Collapse functionality
        let isCollapsed = false;
        collapseBtn.addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            pre.style.maxHeight = isCollapsed ? '120px' : 'none';
            pre.style.overflow = isCollapsed ? 'hidden' : 'auto';
            collapseBtn.innerHTML = isCollapsed ? '<i class="fas fa-expand"></i>' : '<i class="fas fa-compress"></i>';
            collapseBtn.title = isCollapsed ? 'Expand' : 'Collapse';
        });

        // Assemble the code block
        header.appendChild(dotsEl);
        header.appendChild(title);
        header.appendChild(actions);
        wrapper.appendChild(header);
        
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);
    });
}

// Enhanced Search Functionality
const SearchManager = {
    init() {
        // Add a small delay to ensure DOM is fully ready
        setTimeout(() => {
            this.searchInput = document.getElementById('search-input');
            this.searchResults = document.getElementById('search-results');
            this.clearBtn = document.getElementById('clear-search');
            
            if (this.searchInput) {
                // Add debounced listener
                this.searchInput.addEventListener('input', 
                    Utils.debounce((e) => {
                        this.performSearch(e.target.value);
                    }, 300)
                );
                
                this.searchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && this.searchInput.value.trim()) {
                        this.performSearch(this.searchInput.value);
                    }
                });
            }
            
            if (this.clearBtn) {
                this.clearBtn.addEventListener('click', () => {
                    this.searchInput.value = '';
                    this.clearResults();
                });
            }
        }, 100);
    },
    
    async performSearch(query) {
        if (!query.trim()) {
            this.clearResults();
            return;
        }
        
        try {
            const structure = await fetchStructure();
            const results = this.searchFiles(query.toLowerCase(), structure);
            this.renderResults(results);
        } catch (error) {
            console.error('Search error:', error);
            Utils.showToast('Search failed', 'error');
        }
    },
    
    searchFiles(query, structure, results = []) {
        structure.children.forEach(item => {
            if (item.isDirectory) {
                this.searchFiles(query, item, results);
            } else if (item.name.toLowerCase().includes(query) || item.path.toLowerCase().includes(query)) {
                results.push(item);
            }
        });
        return results;
    },
    
    renderResults(results) {
        if (!results.length) {
            this.searchResults.innerHTML = `
                <div class="alert alert-info mb-0">
                    <i class="fas fa-search me-2"></i>No files found matching your search.
                </div>
            `;
        } else {
            const ul = document.createElement('ul');
            ul.className = 'list-group list-group-flush';
            
            results.forEach(item => {
                const li = document.createElement('li');
                li.className = 'list-group-item list-group-item-action d-flex align-items-center';
                li.innerHTML = `
                    <i class="fas fa-file-alt me-3 text-primary"></i>
                    <div>
                        <div class="fw-medium">${item.name}</div>
                        <small class="text-muted">${item.path}</small>
                    </div>
                `;
                li.addEventListener('click', () => {
                    loadFile(item.path);
                    this.clearResults();
                    this.searchInput.value = '';
                });
                ul.appendChild(li);
            });
            
            this.searchResults.innerHTML = '';
            this.searchResults.appendChild(ul);
        }
        
        this.searchResults.style.display = 'block';
        Utils.fadeIn(this.searchResults);
    },
    
    clearResults() {
        this.searchResults.innerHTML = '';
        this.searchResults.style.display = 'none';
    }
};

// Fetch structure.json with error handling
async function fetchStructure() {
    try {
        console.log('Fetching structure.json...');
        const response = await fetch('structure.json');
        
        if (!response.ok) {
            throw new Error(`Failed to fetch structure.json: ${response.status} ${response.statusText}`);
        }
        
        const structure = await response.json();
        console.log('Structure loaded successfully:', structure);
        return structure;
    } catch (error) {
        console.error('Error fetching structure:', error);
        
        // Return a minimal structure as fallback
        const fallbackStructure = {
            name: "root",
            isDirectory: true,
            children: [
                {
                    name: "Welcome",
                    isDirectory: false,
                    path: "#"
                }
            ]
        };
        
        console.log('Using fallback structure');
        return fallbackStructure;
    }
}

// Enhanced Navigation
function renderNavbar(structure) {
    const navItems = document.getElementById('nav-items');
    navItems.innerHTML = '';
    
    structure.children.forEach(item => {
        if (!item.isDirectory) {
            // Individual file
            const navItem = document.createElement('li');
            navItem.className = 'nav-item';
            
            const link = document.createElement('a');
            link.className = 'nav-link';
            link.textContent = item.name;
            link.href = '#';
            link.setAttribute('aria-label', `View ${item.name}`);
            link.addEventListener('click', (e) => {
                e.preventDefault();
                loadFile(item.path);
            });
            
            navItem.appendChild(link);
            navItems.appendChild(navItem);
        } else {
            // Dropdown for folders
            const dropdown = createEnhancedDropdown(item);
            navItems.appendChild(dropdown);
        }
    });
}

function createEnhancedDropdown(folder) {
    const dropdownItem = document.createElement('li');
    dropdownItem.className = 'nav-item dropdown';

    const button = document.createElement('a');
    button.className = 'nav-link dropdown-toggle';
    button.href = '#';
    button.id = `dropdown-${folder.name}`;
    button.setAttribute('role', 'button');
    button.setAttribute('data-bs-toggle', 'dropdown');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', `${folder.name} menu`);
    button.innerHTML = `<i class="fas fa-folder me-2"></i>${folder.name}`;

    const menu = document.createElement('ul');
    menu.className = 'dropdown-menu';
    menu.setAttribute('aria-labelledby', `dropdown-${folder.name}`);

    folder.children.forEach(item => {
        const listItem = document.createElement('li');
        const link = document.createElement('a');
        link.className = 'dropdown-item d-flex align-items-center';
        link.innerHTML = `
            <i class="fas ${item.isDirectory ? 'fa-folder' : 'fa-file-alt'} me-2"></i>
            ${item.name}
        `;

        if (!item.isDirectory) {
            link.href = '#';
            link.addEventListener('click', (e) => {
                e.preventDefault();
                loadFile(item.path);
            });
        }

        listItem.appendChild(link);
        menu.appendChild(listItem);
    });

    dropdownItem.appendChild(button);
    dropdownItem.appendChild(menu);
    return dropdownItem;
}

// Enhanced Tree View
function createEnhancedTreeView(structure, container) {
    const wrapper = container.querySelector('.card-body') || container;
    const ul = document.createElement('ul');
    ul.className = 'tree-view';

    structure.children.forEach(item => {
        const li = createTreeNode(item);
        ul.appendChild(li);
    });

    wrapper.innerHTML = '';
    wrapper.appendChild(ul);
}

function createTreeNode(item) {
    const li = document.createElement('li');
    li.className = item.isDirectory ? 'folder' : 'file';
    li.setAttribute('role', 'treeitem');
    li.setAttribute('tabindex', '0');
    
    const content = document.createElement('span');
    content.textContent = item.name;
    li.appendChild(content);
    
    if (item.isDirectory) {
        li.setAttribute('aria-expanded', 'false');
        
        const toggleFolder = (e) => {
            e.stopPropagation();
            const isExpanded = li.classList.contains('expanded');
            li.classList.toggle('expanded');
            li.setAttribute('aria-expanded', !isExpanded);
            
            const childUl = li.querySelector('ul');
            if (childUl) {
                childUl.style.display = isExpanded ? 'none' : 'block';
            }
        };
        
        li.addEventListener('click', toggleFolder);
        li.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleFolder(e);
            }
        });
        
        if (item.children && item.children.length > 0) {
            const childUl = document.createElement('ul');
            childUl.style.display = 'none';
            item.children.forEach(child => {
                childUl.appendChild(createTreeNode(child));
            });
            li.appendChild(childUl);
        }
    } else {
        li.addEventListener('click', (e) => {
            e.stopPropagation();
            loadFile(item.path);
        });
        
        li.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                loadFile(item.path);
            }
        });
    }
    
    return li;
}

// Enhanced Global Actions
function addEnhancedGlobalActions() {
    const container = safeQuerySelector('.global-buttons');
    if (!container) {
        console.warn('Global buttons container not found');
        return;
    }
    
    // Global theme toggle (already handled by ThemeManager)
    
    // Global view raw
    const viewRawBtn = document.createElement('button');
    viewRawBtn.className = 'btn btn-outline-info';
    viewRawBtn.innerHTML = '<i class="fas fa-eye me-2"></i>View Raw';
    viewRawBtn.setAttribute('aria-label', 'View raw markdown content');
    viewRawBtn.addEventListener('click', () => {
        if (AppState.currentFile) {
            const newWindow = window.open('', '_blank');
            newWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Raw Content - ${AppState.currentFile.name}</title>
                    <style>
                        body { font-family: monospace; padding: 20px; background: #f5f5f5; }
                        pre { background: white; padding: 20px; border-radius: 8px; white-space: pre-wrap; }
                    </style>
                </head>
                <body>
                    <h3>Raw Markdown - ${AppState.currentFile.name}</h3>
                    <pre>${AppState.currentFile.markdown}</pre>
                </body>
                </html>
            `);
            newWindow.document.close();
        }
    });
    
    // Global download
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn btn-outline-success';
    downloadBtn.innerHTML = '<i class="fas fa-download me-2"></i>Download';
    downloadBtn.setAttribute('aria-label', 'Download current file');
    downloadBtn.addEventListener('click', () => {
        if (AppState.currentFile) {
            const blob = new Blob([AppState.currentFile.markdown], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = AppState.currentFile.name;
            document.body.appendChild(a);
            a.click();
            if (a.parentNode) {
                a.parentNode.removeChild(a);
            }
            URL.revokeObjectURL(url);
            Utils.showToast('File downloaded successfully!', 'success');
        }
    });
    
    container.appendChild(viewRawBtn);
    container.appendChild(downloadBtn);
}

// ========================================
// READING PROGRESS BAR
// ========================================

const ReadingProgress = {
    progressBar: null,
    scrollHandler: null,

    init() {
        this.progressBar = document.getElementById('reading-progress');
    },

    show() {
        if (!this.progressBar) this.init();
        if (!this.progressBar) return;
        this.progressBar.style.display = 'block';
        this.progressBar.style.width = '0%';
        if (!this.scrollHandler) {
            this.scrollHandler = () => this.update();
            window.addEventListener('scroll', this.scrollHandler, { passive: true });
        }
        this.update();
    },

    hide() {
        if (this.progressBar) {
            this.progressBar.style.display = 'none';
            this.progressBar.style.width = '0%';
        }
        if (this.scrollHandler) {
            window.removeEventListener('scroll', this.scrollHandler);
            this.scrollHandler = null;
        }
    },

    update() {
        if (!this.progressBar) return;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const percent = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
        this.progressBar.style.width = percent + '%';
    }
};

// ========================================
// TOPIC CARD CONFIG
// ========================================

const TOPIC_CONFIG = {
    CSharp:          { icon: 'fas fa-hashtag',       gradient: 'linear-gradient(135deg,#6a11cb 0%,#2575fc 100%)', label: 'C#' },
    Azure:           { icon: 'fas fa-cloud',          gradient: 'linear-gradient(135deg,#0072c6 0%,#00b4f0 100%)', label: 'Azure' },
    AWS:             { icon: 'fab fa-aws',             gradient: 'linear-gradient(135deg,#ff9900 0%,#ff6600 100%)', label: 'AWS' },
    Containerization:{ icon: 'fab fa-docker',          gradient: 'linear-gradient(135deg,#0db7ed 0%,#066da5 100%)', label: 'Docker & K8s' },
    SQL:             { icon: 'fas fa-database',        gradient: 'linear-gradient(135deg,#11998e 0%,#38ef7d 100%)', label: 'SQL' },
    GOF:             { icon: 'fas fa-sitemap',         gradient: 'linear-gradient(135deg,#f953c6 0%,#b91d73 100%)', label: 'Design Patterns' },
    Networking:      { icon: 'fas fa-network-wired',   gradient: 'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)', label: 'Networking' },
    Extensions:      { icon: 'fas fa-puzzle-piece',    gradient: 'linear-gradient(135deg,#f7971e 0%,#ffd200 100%)', label: 'VS Code Ext.' },
};

function countFiles(node) {
    if (!node.isDirectory) return 1;
    return (node.children || []).reduce((sum, child) => sum + countFiles(child), 0);
}

function renderTopicCards(structure) {
    const cardsContainer = document.getElementById('cards-container');
    if (!cardsContainer) return;

    const topLevelDirs = (structure.children || []).filter(c => c.isDirectory);
    const totalFiles = (structure.children || []).reduce((sum, c) => sum + countFiles(c), 0);
    const topicCount = topLevelDirs.length;

    // Hero section
    const hero = document.createElement('div');
    hero.className = 'col-12 mb-2';
    hero.innerHTML = `
        <div class="home-hero slide-in-up">
            <h1><i class="fas fa-code me-3"></i>Content Blog</h1>
            <p>Comprehensive programming tutorials on C#, Azure, AWS, Docker, Kubernetes, and modern development practices.</p>
            <div class="home-stats">
                <div class="home-stat">
                    <span class="stat-number">${totalFiles}</span>
                    <span class="stat-label">Articles</span>
                </div>
                <div class="home-stat">
                    <span class="stat-number">${topicCount}</span>
                    <span class="stat-label">Topics</span>
                </div>
                <div class="home-stat">
                    <span class="stat-number">100%</span>
                    <span class="stat-label">Free</span>
                </div>
            </div>
        </div>
    `;

    // Topic cards section
    const cardsSection = document.createElement('div');
    cardsSection.className = 'col-12';

    const heading = document.createElement('div');
    heading.className = 'section-heading';
    heading.innerHTML = '<i class="fas fa-th-large text-primary"></i>Browse Topics';
    cardsSection.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'topic-cards-grid stagger-children';

    topLevelDirs.forEach(dir => {
        const cfg = TOPIC_CONFIG[dir.name] || {
            icon: 'fas fa-folder',
            gradient: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
            label: dir.name
        };
        const fileCount = countFiles(dir);

        const card = document.createElement('div');
        card.className = 'topic-card';
        card.style.background = cfg.gradient;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `Browse ${cfg.label} - ${fileCount} article${fileCount !== 1 ? 's' : ''}`);
        card.innerHTML = `
            <i class="${cfg.icon}"></i>
            <span class="topic-name">${cfg.label}</span>
            <span class="topic-count">${fileCount} article${fileCount !== 1 ? 's' : ''}</span>
        `;

        const activate = () => {
            // Expand the tree view node for this folder
            const treeView = document.getElementById('tree-view-container');
            if (treeView) {
                treeView.style.display = 'block';
                treeView.scrollIntoView({ behavior: 'smooth', block: 'start' });

                // Find and expand the matching folder node
                const folderNodes = treeView.querySelectorAll('.folder');
                folderNodes.forEach(node => {
                    const span = node.querySelector('span');
                    if (span && span.textContent.trim() === dir.name && !node.classList.contains('expanded')) {
                        node.click();
                    }
                });
            }
        };

        card.addEventListener('click', activate);
        card.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
        });

        grid.appendChild(card);
    });

    cardsSection.appendChild(grid);

    cardsContainer.innerHTML = '';
    cardsContainer.appendChild(hero);
    cardsContainer.appendChild(cardsSection);
    cardsContainer.className = 'row mt-2';
    Utils.fadeIn(cardsContainer);
}

// View Management
function showContentView() {
    const content = document.getElementById('content');
    const cardsContainer = document.getElementById('cards-container');
    const searchBar = safeQuerySelector('.search-bar');
    const searchResults = document.getElementById('search-results');
    const treeView = document.getElementById('tree-view-container');
    const globalButtons = safeQuerySelector('.global-buttons');
    
    if (content) content.style.display = 'block';
    if (cardsContainer) cardsContainer.style.display = 'none';
    if (searchBar) searchBar.style.display = 'none';
    if (searchResults) searchResults.style.display = 'none';
    if (treeView) treeView.style.display = 'none';
    if (globalButtons) globalButtons.style.display = 'flex';

    ReadingProgress.show();
}

function showHomePage() {
    const searchBar = safeQuerySelector('.search-bar');
    const searchResults = document.getElementById('search-results');
    const treeView = document.getElementById('tree-view-container');
    const content = document.getElementById('content');
    const globalButtons = safeQuerySelector('.global-buttons');
    const cardsContainer = document.getElementById('cards-container');

    if (searchBar) searchBar.style.display = 'block';
    if (searchResults) searchResults.style.display = 'none';
    if (treeView) treeView.style.display = 'block';
    if (content) content.style.display = 'none';
    if (globalButtons) globalButtons.style.display = 'none';
    if (cardsContainer) cardsContainer.style.display = 'flex';

    ReadingProgress.hide();

    // Clear breadcrumb
    BreadcrumbManager.update([]);

    // Render topic cards if structure is cached
    if (window._cachedStructure) {
        renderTopicCards(window._cachedStructure);
    }
}

// Initialize the application
function initializeApp() {
    // Always ensure loading is shown at start
    Utils.showLoading();
    
    // Set a fallback timeout to hide loading spinner
    const fallbackTimeout = setTimeout(() => {
        Utils.hideLoading();
    }, 10000); // 10 seconds fallback
    
    // Initialize all managers first
    try {
        ThemeManager.init();
        AccessibilityManager.init();
        ScrollManager.init();
        BreadcrumbManager.init();
        SearchManager.init();
        ReadingProgress.init();
        
        // Initialize structure updater if available
        if (window.StructureUpdater && typeof window.structureUpdater === 'undefined') {
            window.structureUpdater = new window.StructureUpdater();
        }
        
        
    } catch (error) {
        console.error('Failed to initialize managers:', error);
        clearTimeout(fallbackTimeout);
        Utils.hideLoading();
        return;
    }
    
    // Fetch and render structure
    fetchStructure()
        .then(structure => {
            if (structure) {
                try {
                    window._cachedStructure = structure;
                    renderNavbar(structure);
                    createEnhancedTreeView(structure, document.getElementById('tree-view-container'));
                    addEnhancedGlobalActions();
                    
                    // Setup home page navigation
                    const navBrand = safeQuerySelector('.navbar-brand');
                    if (navBrand) {
                        navBrand.addEventListener('click', (e) => {
                            e.preventDefault();
                            try {
                                showHomePage();
                                BreadcrumbManager.update([]);
                            } catch (err) {
                                console.error('Error navigating to home:', err);
                            }
                        });
                    }
                    
                    // Show home page by default
                    showHomePage();
                    
                    // Apply syntax highlighting
                    if (window.hljs) {
                        hljs.highlightAll();
                    }
                } catch (error) {
                    console.error('Error during app initialization:', error);
                }
            } else {
                throw new Error('No structure data received');
            }
        })
        .catch(error => {
            console.error('Initialization error:', error);
            if (window.Utils && window.Utils.showToast) {
                window.Utils.showToast('Failed to load application structure', 'error');
            }
        })
        .finally(() => {
            clearTimeout(fallbackTimeout);
            Utils.hideLoading();
        });
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
    // Also add a backup timeout in case DOMContentLoaded doesn't fire
    setTimeout(() => {
        if (AppState.isLoading) {
            initializeApp();
        }
    }, 2000);
} else {
    // DOM is already ready, initialize immediately
    initializeApp();
}

// Emergency fallback - hide loading spinner after 5 seconds no matter what.
// Direct style manipulation is intentional here: this code runs as an absolute
// last resort when the normal application init has failed, so no class-based
// abstractions can be relied upon.
setTimeout(() => {
    const spinner = document.getElementById('loading-spinner');
    if (spinner && spinner.style.display !== 'none') {
        spinner.style.display = 'none';
        
        // Show error message
        const content = document.getElementById('content');
        if (content) {
            content.innerHTML = `
                <div class="card-body text-center py-5">
                    <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                    <h4 class="text-muted mb-3">Loading Issue</h4>
                    <p class="text-muted">The application failed to load properly.</p>
                    <button class="btn btn-primary" onclick="location.reload()">Reload Page</button>
                </div>
            `;
            content.style.display = 'block';
        }
    }
}, 5000);
