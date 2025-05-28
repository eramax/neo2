import { marked } from "marked";
import hljs from "highlight.js";

export class MarkdownHelper {
    constructor() {
        const renderer = new marked.Renderer();

        renderer.codespan = function (code) {
            return `<code class="inline-code">${code.text}</code>`;
        };

        renderer.code = function (code) {
            const validLang = hljs.getLanguage(code.lang) ? code.lang : "text";
            const codeStr = code.text || "";
            const escapedCode = codeStr
                .replace(/'/g, "\\'")
                .replace(/\n/g, "\\n")
                .replace(/\r/g, "\\r");

            let highlighted;
            try {
                highlighted = hljs.highlight(codeStr, { language: validLang }).value;
            } catch (err) {
                try {
                    highlighted = hljs.highlightAuto(codeStr).value;
                } catch (autoErr) {
                    highlighted = codeStr;
                }
            }

            return `<div class="code-block-container">
        <div class="code-block-header">
          <span class="code-language">${validLang}</span>
          <button class="copy-code-btn" onclick="copyCodeToClipboard(this, '${escapedCode}')">
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

        marked.setOptions({
            renderer: renderer,
            breaks: true,
            gfm: true,
            sanitize: false,
            smartypants: false,
        });
    }

    parse(content) {
        try {
            const contentStr = String(content || "");
            return marked.parse(contentStr);
        } catch (err) {
            console.error("Markdown parse error:", err);
            return String(content || "");
        }
    }

    highlightAll() {
        hljs.highlightAll();
    }
}
