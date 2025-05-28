import { marked } from "marked";
import hljs from "highlight.js";
import { Ollama } from "ollama/browser";

// Icons
const copyIcon = `<svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>`;
export const modelLinkIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`;

// Main app class
export class ChatApp {
    static TITLE_PROMPT = "Generate a short, descriptive title for this conversation in exactly 7 words or fewer. Do not use any thinking tags or markdown formatting. Just respond with the title directly:";

    constructor() {
        this.chats = this.load('chats', []);
        this.messages = this.load('chatMessages', {});
        this.ollama = new Ollama({ host: this.load('ollamaUrl', 'http://localhost:11434') });
        this.abortController = null;
        this.setupMarkdown();
        if (typeof window !== 'undefined') window.copyCodeToClipboard = this.copyCode.bind(this);
    }

    // Storage utilities
    save(key, data) {
        typeof localStorage !== 'undefined' && localStorage.setItem(`neo2_${key}`, JSON.stringify(data));
    }

    load(key, fallback = null) {
        if (typeof localStorage === 'undefined') return fallback;
        try { return JSON.parse(localStorage.getItem(`neo2_${key}`)) || fallback; }
        catch { return fallback; }
    }

    // Markdown setup
    setupMarkdown() {
        const renderer = new marked.Renderer();
        const escapeHtml = text => { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; };

        renderer.codespan = code => `<code class="inline-code">${escapeHtml(code.text)}</code>`;
        renderer.code = code => {
            const lang = hljs.getLanguage(code.lang === "svelte" ? "html" : code.lang) ? (code.lang === "svelte" ? "html" : code.lang) : "text";
            let highlighted;
            try { highlighted = hljs.highlight(code.text || "", { language: lang }).value; }
            catch { highlighted = hljs.highlightAuto(code.text || "").value || escapeHtml(code.text || ""); }
            return `<div class="code-block-container"><div class="code-block-header"><span class="code-language">${code.lang}</span><button class="copy-code-btn" onclick="copyCodeToClipboard(this)">${copyIcon}<span class="copy-text">Copy</span></button></div><pre class="code-block"><code class="hljs language-${lang}">${highlighted}</code></pre></div>`;
        };
        marked.setOptions({ renderer, breaks: true, gfm: true, tables: true, sanitize: false });
    }

    parseMarkdown(content) {
        try {
            const escapeHtml = text => { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; };
            const processed = String(content || "")
                .replace(/<think>([\s\S]*?)(?:<\/think>|$)/gi, (_, thinkContent) =>
                    `<details class="think-accordion dark-mode" ${!_.endsWith('</think>') ? 'open' : ''}><summary class="think-summary">💭 Thinking process (click to expand)</summary><div class="think-content">${thinkContent.trim() ? marked.parse(thinkContent.trim()) : '<em>Thinking...</em>'}</div></details>`)
                .replace(/<answer>([\s\S]*?)<\/answer>/gi, (_, answerContent) => answerContent.trim());

            return marked.parse(processed)
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, m => `<pre class="sanitized-script">${escapeHtml(m)}</pre>`)
                .replace(/javascript:/gi, 'javascript-disabled:');
        } catch { return this.escapeHtml(String(content || "")); }
    }

    // Clipboard functionality
    async copyCode(button) {
        try {
            const code = button.closest('.code-block-container')?.querySelector('pre.code-block > code')?.textContent || '';
            await navigator.clipboard.writeText(code);
            const textSpan = button.querySelector('.copy-text');
            const originalText = textSpan.textContent;
            button.classList.add('copied');
            textSpan.textContent = 'Copied!';
            setTimeout(() => { button.classList.remove('copied'); textSpan.textContent = originalText; }, 2000);
        } catch { button.classList.add('copy-error'); setTimeout(() => button.classList.remove('copy-error'), 2000); }
    }

    // Model management
    async loadModels() {
        try {
            const response = await this.ollama.list();
            return response.models.map(model => {
                const baseName = model.name.split(':')[0];
                let displayName = baseName, link = `https://ollama.com/library/${displayName}`;

                if (baseName.startsWith('hf.co/')) {
                    const hfPath = baseName.substring(6);
                    displayName = hfPath.split('/').pop().replace(/-GGUF$/i, '');
                    link = `https://huggingface.co/${hfPath}`;
                }

                return {
                    id: model.name, name: displayName, arch: model.details?.family || 'Unknown',
                    size: this.formatSize(model.size), format: model.details?.format?.toUpperCase() || 'Unknown',
                    link, details: model.details || {}
                };
            });
        } catch (error) { throw new Error(error.message); }
    }

    formatSize(bytes) {
        if (!bytes) return 'Unknown';
        const gb = bytes / (1024 ** 3);
        return gb >= 1 ? `${gb.toFixed(1)}GB` : `${(bytes / (1024 ** 2)).toFixed(0)}MB`;
    }

    // Chat management
    createChat() {
        const id = Date.now().toString();
        this.chats.unshift({ id, title: 'New Chat', category: 'Today' });
        this.messages[id] = [];
        this.saveState();
        return id;
    }

    addMessage(chatId, message, model = null) {
        if (!this.messages[chatId]) this.messages[chatId] = [];
        this.messages[chatId].push(message);
        this.saveState();
        return this.messages[chatId];
    }

    addMessageWithTitleGeneration(chatId, message, model = null) {
        if (!this.messages[chatId]) this.messages[chatId] = [];
        const isFirstUserMessage = this.messages[chatId].length === 0 && message.role === 'user';
        this.messages[chatId].push(message);
        this.saveState();

        if (isFirstUserMessage && model && message.content) {
            setTimeout(() => this.generateTitleAsync(chatId, message.content, model), 0);
        }
        return this.messages[chatId];
    }

    async generateTitleAsync(chatId, userMessage, model) {
        if (!chatId || !userMessage || !model) return;
        try {
            let lastValidTitle = 'New Chat';
            await this.streamResponse(model, [{ role: 'user', content: `${ChatApp.TITLE_PROMPT} "${userMessage}"` }],
                chunk => {
                    const cleaned = this.cleanTitleResponse(chunk);
                    if (cleaned && cleaned !== 'New Chat' && cleaned.trim()) {
                        lastValidTitle = cleaned;
                        this.updateChatTitle(chatId, lastValidTitle);
                    }
                },
                final => this.updateChatTitle(chatId, this.cleanTitleResponse(final) || lastValidTitle),
                () => this.updateChatTitle(chatId, lastValidTitle)
            );
        } catch { this.updateChatTitle(chatId, 'New Chat'); }
    }

    cleanTitleResponse(response) {
        if (!response) return 'New Chat';
        return response.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '')
            .replace(/<\/?answer>/gi, '')
            .replace(/[*_`#\[\]()]/g, '')
            .trim().split(/\s+/).filter(w => w.length).slice(0, 7).join(' ') || 'New Chat';
    }

    updateChatTitle(chatId, title) {
        const chat = this.chats.find(c => c.id === chatId);
        if (chat) {
            chat.title = title;
            this.saveState();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('chatTitleUpdated', { detail: { chatId, newTitle: title } }));
            }
        }
    }

    // Streaming
    async streamResponse(model, messages, onChunk, onComplete, onError) {
        let content = '';
        try {
            const response = await this.ollama.chat({
                model, messages: messages.map(m => ({ role: m.role, content: m.content })),
                stream: true
            });
            this.abortController = response;
            for await (const chunk of response) {
                content += chunk.message.content || '';
                onChunk(content);
            }
            onComplete(content);
        } catch (err) {
            onError?.(err.name === 'AbortError' ? 'Stream cancelled' : `Error: ${err.message}`, err.name === 'AbortError');
        }
    }

    abort() {
        if (this.abortController) {
            this.ollama.abort();
            this.abortController = null;
        }
    }

    // State management
    saveState() { this.save('chats', this.chats); this.save('chatMessages', this.messages); }
    saveUrl(url) { this.save('ollamaUrl', url); this.ollama = new Ollama({ host: url }); }
    saveModel(model) { this.save('selectedModel', model); }

    // Getters
    getChats() { return this.chats; }
    getMessages(chatId) { return this.messages[chatId] || []; }
    getChat(chatId) { return this.chats.find(c => c.id === chatId); }
    getStoredModel() { return this.load('selectedModel'); }
    getStoredUrl() { return this.load('ollamaUrl', 'http://localhost:11434'); }
}
