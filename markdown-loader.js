import { marked } from 'https://cdnjs.cloudflare.com/ajax/libs/marked/9.0.0/lib/marked.esm.js';

// Helper function to highlight URL parameters
function highlightUrlParams(code) {
    let processed = code;
    
    if (processed.includes('?start=') || processed.includes('?end=') || processed.includes('&start=') || processed.includes('&end=')) {
        processed = processed
            .replace(/([?&])(start|end)(=)/g, '<span class="url-param">$1$2$3</span>');

        if (processed.includes('T')) {
            processed = processed
                .replace(/(\d{4}-\d{2}-\d{2})/g, '<span class="url-date">$1</span>')
                .replace(/(?<=\d)(T)(?=\d)/g, '<span class="url-param">$1</span>')
                .replace(/(?<=T)(\d{2}:\d{2}:\d{2})/g, '<span class="url-time">$1</span>')
                .replace(/([-+]\d{2}:\d{2})/g, '<span class="url-timezone">$1</span>');
        } else {
            processed = processed.replace(/(\d{10,})/g, '<span class="url-posix">$1</span>');
        }
    }
    return processed;
}

// Custom tokenizer and renderer for GitHub alerts
const githubAlertExtension = {
    name: 'githubAlert',
    level: 'block',
    tokenizer(src) {
        const rule = /^> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n((?:> .*(?:\n|$))*)/;
        const match = rule.exec(src);
        if (match) {
            const [raw, type, content] = match;
            const text = content.replace(/^> /gm, '').trim();
            return {
                type: 'githubAlert',
                raw,
                text,
                alertType: type.toLowerCase()
            };
        }
    },
    renderer(token) {
        return `<div class="github-alert github-alert-${token.alertType}">
            <div class="github-alert-title">
                <span class="github-alert-icon"></span>
                ${token.alertType.charAt(0).toUpperCase() + token.alertType.slice(1)}
            </div>
            <div class="github-alert-content">
                ${marked.parse(token.text)}
            </div>
        </div>`;
    }
};

// Create custom renderer
const renderer = {
    code(code, language) {
        const validLanguage = !!(language && language.trim());
        const className = validLanguage ? ` class="language-${language}"` : '';
        const highlightedCode = language === 'datetime-url' ? 
            highlightUrlParams(code) : code;
        
        return `<pre><code${className}>${highlightedCode}</code></pre>`;
    },

    codespan(code) {
        if (code.includes('?start=') || code.includes('?end=') || 
            code.includes('&start=') || code.includes('&end=')) {
            const highlightedCode = highlightUrlParams(code);
            return `<code class="inline-url-params">${highlightedCode}</code>`;
        }
        return `<code>${code}</code>`;
    },

    blockquote(quote) {
        // First check if it's a GitHub alert
        const alertMatch = quote.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*([\s\S]*?)$/);
        if (alertMatch) {
            const [, type, content] = alertMatch;
            return `<div class="github-alert github-alert-${type.toLowerCase()}">
                <div class="github-alert-title">
                    <span class="github-alert-icon"></span>
                    ${type}
                </div>
                <div class="github-alert-content">
                    ${marked.parse(content.trim())}
                </div>
            </div>`;
        }

        // Handle regular blockquotes with headers
        const headerMatch = quote.match(/^###\s+(.*?)\s*\n([\s\S]*)$/);
        if (headerMatch) {
            const [, header, content] = headerMatch;
            return `<blockquote><h3>${header}</h3>${marked.parse(content.trim())}</blockquote>`;
        }
        
        // Regular blockquote processing
        return `<blockquote>${marked.parse(quote)}</blockquote>`;
    }
};

// Configure marked
marked.use({
    renderer,
    extensions: [githubAlertExtension],
    gfm: true,
    breaks: false,
    pedantic: false,
    mangle: false,
    headerIds: false
});

// Add a preprocessor for GitHub alerts
const originalParse = marked.parse;
marked.parse = function(markdown, options) {
    // Preprocess GitHub-style alerts to ensure proper blockquote handling
    const processed = markdown.replace(
        /^> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n((?:> .*(?:\n|$))*)/gm,
        (match, type, content) => {
            return `> [!${type}]\n${content}`;
        }
    );
    return originalParse.call(this, processed, options);
};

async function loadMarkdownContent() {
    try {
        const response = await fetch('content.md');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const text = await response.text();
        console.log('Raw markdown content:', text);
        
        const htmlContent = marked.parse(text);
        console.log('Parsed HTML content:', htmlContent);
        
        let markdownContainer = document.getElementById('markdown-content');
        if (!markdownContainer) {
            markdownContainer = document.createElement('div');
            markdownContainer.id = 'markdown-content';
            markdownContainer.className = 'markdown-container';
            document.querySelector('.container').appendChild(markdownContainer);
        }
        
        markdownContainer.innerHTML = htmlContent;
    } catch (error) {
        console.error('Error loading markdown content:', error);
    }
}

document.addEventListener('DOMContentLoaded', loadMarkdownContent);