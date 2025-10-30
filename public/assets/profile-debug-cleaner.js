// Tesla-Grade Profile Page Debug Cleaner
// Removes any debug output that appears at bottom of profile page

class ProfileDebugCleaner {
    constructor() {
        this.debugPatterns = [
            /function\s*\(/,
            /addEventListener/,
            /console\./,
            /document\./,
            /window\./,
            /var\s+/,
            /let\s+/,
            /const\s+/
        ];
    }

    cleanDebugOutput() {
        console.log('🧹 ProfileDebugCleaner: Starting debug output cleanup');
        
        // Remove any orphaned text nodes with code
        this.cleanTextNodes();
        
        // Remove any script-generated content after main content
        this.cleanOrphanedElements();
        
        // Prevent future debug leakage
        this.preventDebugLeakage();
        
        console.log('✅ ProfileDebugCleaner: Cleanup complete');
    }

    cleanTextNodes() {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const nodesToRemove = [];
        let node;

        while (node = walker.nextNode()) {
            const text = node.textContent.trim();
            if (text && this.looksLikeDebugOutput(text)) {
                console.log('🗑️ Removing debug text node:', text.substring(0, 50) + '...');
                nodesToRemove.push(node);
            }
        }

        nodesToRemove.forEach(node => {
            node.parentNode?.removeChild(node);
        });
    }

    cleanOrphanedElements() {
        // Look for elements that might contain debug output
        const suspiciousElements = document.querySelectorAll('div:empty, span:empty, p:empty');
        
        suspiciousElements.forEach(element => {
            if (!element.id && !element.className && element.textContent.trim() === '') {
                console.log('🗑️ Removing orphaned element');
                element.remove();
            }
        });
    }

    looksLikeDebugOutput(text) {
        return this.debugPatterns.some(pattern => pattern.test(text));
    }

    preventDebugLeakage() {
        // Override any methods that might leak to DOM
        const originalWrite = document.write;
        document.write = function(content) {
            console.log('🚫 Blocked document.write:', content);
            return;
        };

        const originalWriteln = document.writeln;
        document.writeln = function(content) {
            console.log('🚫 Blocked document.writeln:', content);
            return;
        };
    }

    // Continuous monitoring for new debug leaks
    startMonitoring() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.TEXT_NODE && 
                            this.looksLikeDebugOutput(node.textContent)) {
                            console.log('🚫 Intercepted debug leak:', node.textContent.substring(0, 50));
                            node.remove();
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('👁️ ProfileDebugCleaner: Continuous monitoring started');
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const cleaner = new ProfileDebugCleaner();
        cleaner.cleanDebugOutput();
        cleaner.startMonitoring();
    });
} else {
    const cleaner = new ProfileDebugCleaner();
    cleaner.cleanDebugOutput();
    cleaner.startMonitoring();
}

// Also run cleanup after a delay to catch late-loading content
setTimeout(() => {
    const cleaner = new ProfileDebugCleaner();
    cleaner.cleanDebugOutput();
}, 2000);