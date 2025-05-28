import { marked } from "marked";
import hljs from "highlight.js";

export class MarkdownHelper {
    constructor() {
        const renderer = new marked.Renderer();

        renderer.codespan = function (code) {
            return `<code class="inline-code">${this.escapeHtml(code.text)}</code>`;
        };

        renderer.code = function (code) {
            // Map unsupported languages to supported alternatives
            let mappedLang = code.lang;
            if (code.lang === "svelte") {
                mappedLang = "html"; // Svelte uses HTML-like syntax
            }

            const validLang = hljs.getLanguage(mappedLang) ? mappedLang : "text";
            console.log("Rendering code block:", code.lang, code.text, validLang);

            const codeStr = code.text || "";

            let highlighted;
            try {
                highlighted = hljs.highlight(codeStr, { language: validLang }).value;
            } catch (err) {
                try {
                    highlighted = hljs.highlightAuto(codeStr).value;
                } catch (autoErr) {
                    highlighted = this.escapeHtml(codeStr);
                }
            }

            return `<div class="code-block-container">
        <div class="code-block-header">
          <span class="code-language">${code.lang}</span>
          <button class="copy-code-btn" onclick="copyCodeToClipboard(this)">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
              <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
            </svg>
            <span class="copy-text">Copy</span>
          </button>
        </div>
        <pre class="code-block"><code class="hljs language-${validLang}">${highlighted}</code></pre>
      </div>`;
        };

        // Bind the escapeHtml method to the renderer context
        renderer.escapeHtml = this.escapeHtml.bind(this);

        marked.setOptions({
            renderer: renderer,
            breaks: true,
            gfm: true,
            tables: true,
            sanitize: false,
            smartypants: false,
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    sanitizeHtml(html) {
        // Replace script tags and other potentially dangerous elements
        return html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, (match) => {
                return `<pre class="sanitized-script">${this.escapeHtml(match)}</pre>`;
            })
            .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, (match) => {
                return `<pre class="sanitized-iframe">${this.escapeHtml(match)}</pre>`;
            })
            .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, (match) => {
                return `<pre class="sanitized-object">${this.escapeHtml(match)}</pre>`;
            })
            .replace(/<embed[^>]*>/gi, (match) => {
                return `<pre class="sanitized-embed">${this.escapeHtml(match)}</pre>`;
            })
            // Remove javascript: URLs
            .replace(/javascript:/gi, 'javascript-disabled:')
        // Remove on* event handlers
        //.replace(/\son\w+\s*=/gi, (match) => ` data-removed-event="${match.trim().slice(1)}"=`);
    }

    preprocessCustomTags(content) {
        // Handle <think> tags - both complete and incomplete (for streaming)
        content = content.replace(
            /<think>([\s\S]*?)(?:<\/think>|$)/gi,
            (match, thinkContent, offset, string) => {
                const isComplete = match.endsWith('</think>');
                const processedContent = thinkContent.trim() ? marked.parse(thinkContent.trim()) : '<em>Thinking...</em>';
                const openAttribute = isComplete ? '' : ' open';

                return `<details class="think-accordion dark-mode"${openAttribute}>
<summary class="think-summary">💭 Thinking process (click to expand)</summary>
<div class="think-content">
${processedContent}
</div>
</details>`;
            }
        );

        // Handle <answer> tags - just remove the tags and keep content
        content = content.replace(
            /<answer>([\s\S]*?)<\/answer>/gi,
            (match, answerContent) => {
                return answerContent.trim();
            }
        );

        return content;
    }

    parse(content) {
        try {
            const contentStr = String(content || "");
            const preprocessed = this.preprocessCustomTags(contentStr);
            const parsed = marked.parse(preprocessed);
            return this.sanitizeHtml(parsed);
        } catch (err) {
            console.error("Markdown parse error:", err);
            return this.escapeHtml(String(content || ""));
        }
    }

    highlightAll() {
        hljs.highlightAll();
    }
}
