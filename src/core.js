import { marked } from "marked";
import hljs from "highlight.js";
import { Ollama } from "ollama/browser";

// Icons
const copyIcon = `<svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>`;

const modelLinkIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`;

// Storage utilities
const storage = {
    save: (key, data) => typeof localStorage !== 'undefined' && localStorage.setItem(`neo2_${key}`, JSON.stringify(data)),
    load: (key, fallback = null) => {
        if (typeof localStorage === 'undefined') return fallback;
        try { return JSON.parse(localStorage.getItem(`neo2_${key}`)) || fallback; }
        catch { return fallback; }
    }
};

// Markdown processor
class MarkdownProcessor {
    constructor() {
        const renderer = new marked.Renderer();
        renderer.codespan = (code) => `<code class="inline-code">${this.escapeHtml(code.text)}</code>`;
        renderer.code = (code) => {
            const lang = hljs.getLanguage(code.lang === "svelte" ? "html" : code.lang) ? (code.lang === "svelte" ? "html" : code.lang) : "text";
            let highlighted;
            try {
                highlighted = hljs.highlight(code.text || "", { language: lang }).value;
            } catch {
                highlighted = hljs.highlightAuto(code.text || "").value || this.escapeHtml(code.text || "");
            }
            return `<div class="code-block-container"><div class="code-block-header"><span class="code-language">${code.lang}</span><button class="copy-code-btn" onclick="copyCodeToClipboard(this)">${copyIcon}<span class="copy-text">Copy</span></button></div><pre class="code-block"><code class="hljs language-${lang}">${highlighted}</code></pre></div>`;
        };
        marked.setOptions({ renderer, breaks: true, gfm: true, tables: true, sanitize: false });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    parse(content) {
        try {
            const processed = String(content || "")
                .replace(/<think>([\s\S]*?)(?:<\/think>|$)/gi, (_, thinkContent) =>
                    `<details class="think-accordion dark-mode" ${!_.endsWith('</think>') ? 'open' : ''}><summary class="think-summary">💭 Thinking process (click to expand)</summary><div class="think-content">${thinkContent.trim() ? marked.parse(thinkContent.trim()) : '<em>Thinking...</em>'}</div></details>`)
                .replace(/<answer>([\s\S]*?)<\/answer>/gi, (_, answerContent) => answerContent.trim());

            return marked.parse(processed)
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, m => `<pre class="sanitized-script">${this.escapeHtml(m)}</pre>`)
                .replace(/javascript:/gi, 'javascript-disabled:');
        } catch {
            return this.escapeHtml(String(content || ""));
        }
    }
}

// Main app class
export class ChatApp {
    constructor() {
        this.chats = storage.load('chats', []);
        this.messages = storage.load('chatMessages', {});
        this.markdown = new MarkdownProcessor();
        this.ollama = new Ollama({ host: storage.load('ollamaUrl', 'http://localhost:11434') });
        this.abortController = null;

        // Bind clipboard function globally
        if (typeof window !== 'undefined') {
            window.copyCodeToClipboard = this.copyCode.bind(this);
        }
    }

    // Clipboard functionality
    async copyCode(button) {
        try {
            const container = button.closest('.code-block-container');
            const code = container?.querySelector('pre.code-block > code')?.textContent || '';
            await navigator.clipboard.writeText(code);

            const textSpan = button.querySelector('.copy-text');
            const originalText = textSpan.textContent;
            button.classList.add('copied');
            textSpan.textContent = 'Copied!';
            setTimeout(() => {
                button.classList.remove('copied');
                textSpan.textContent = originalText;
            }, 2000);
        } catch {
            button.classList.add('copy-error');
            setTimeout(() => button.classList.remove('copy-error'), 2000);
        }
    }    // Model management
    async loadModels() {
        try {
            const response = await this.ollama.list();
            return response.models.map(model => {
                const baseName = model.name.split(':')[0];
                let displayName = baseName;
                let link = `https://ollama.com/library/${displayName}`;

                if (baseName.startsWith('hf.co/')) {
                    const hfPath = baseName.substring(6);
                    displayName = hfPath.split('/').pop().replace(/-GGUF$/i, '');
                    link = `https://huggingface.co/${hfPath}`;
                }

                return {
                    id: model.name,
                    name: displayName,
                    arch: model.details?.family || 'Unknown',
                    size: this.formatSize(model.size),
                    format: model.details?.format?.toUpperCase() || 'Unknown',
                    link,
                    details: model.details || {}
                };
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }

    formatSize(bytes) {
        if (!bytes) return 'Unknown';
        const gb = bytes / (1024 * 1024 * 1024);
        return gb >= 1 ? `${gb.toFixed(1)}GB` : `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
    }    // Chat management
    static TITLE_PROMPT = "Generate a short, descriptive title for this conversation in exactly 7 words or fewer. Do not use any thinking tags or markdown formatting. Just respond with the title directly:";

    createChat() {
        const id = Date.now().toString();
        this.chats.unshift({ id, title: 'New Chat', category: 'Today' });
        this.messages[id] = [];
        this.save(); return id;
    }

    addMessage(chatId, message) {
        if (!this.messages[chatId]) this.messages[chatId] = [];
        this.messages[chatId].push(message);
        this.save();
        return this.messages[chatId];
    }

    // Generate title asynchronously and update chat immediately when ready
    async generateTitleAsync(chatId, userMessage, model) {
        if (!chatId || !userMessage || !model) return;

        try {
            const titlePrompt = `${ChatApp.TITLE_PROMPT} "${userMessage}"`;
            let lastValidTitle = 'New Chat';

            // Start title generation in the background
            this.streamResponse(model, [{ role: 'user', content: titlePrompt }],
                chunk => {
                    // Update title as we receive chunks
                    const cleaned = this.cleanTitleResponse(chunk);
                    if (cleaned && cleaned !== 'New Chat' && cleaned.trim().length > 0) {
                        lastValidTitle = cleaned;
                        // Update chat title immediately as we get valid content
                        this.updateChatTitle(chatId, lastValidTitle);
                    }
                },
                final => {
                    // Final update with the complete title
                    const cleaned = this.cleanTitleResponse(final);
                    const finalTitle = cleaned || lastValidTitle || 'New Chat';
                    this.updateChatTitle(chatId, finalTitle);
                },
                error => {
                    // On error, use the last valid title we had or fallback
                    console.warn('Title generation failed:', error);
                    this.updateChatTitle(chatId, lastValidTitle);
                }
            );
        } catch (error) {
            console.warn('Title generation error:', error);
            this.updateChatTitle(chatId, 'New Chat');
        }
    }

    addMessageWithTitleGeneration(chatId, message, model = null) {
        if (!this.messages[chatId]) this.messages[chatId] = [];

        const isFirstUserMessage = this.messages[chatId].length === 0 && message.role === 'user';

        this.messages[chatId].push(message);
        this.save();

        // Generate title asynchronously for first user message
        if (isFirstUserMessage && model && message.content) {
            // Use setTimeout to make this non-blocking
            setTimeout(() => {
                this.generateTitleAsync(chatId, message.content, model);
            }, 0);
        }

        return this.messages[chatId];
    }

    async generateTitle(userMessage, model) {
        try {
            let title = '';
            const titlePrompt = `${ChatApp.TITLE_PROMPT} "${userMessage}"`;

            await this.streamResponse(model, [{ role: 'user', content: titlePrompt }],
                chunk => {
                    // Process chunk in real-time to extract title
                    const cleaned = this.cleanTitleResponse(chunk);
                    title = cleaned;
                },
                final => {
                    // Final processing to ensure we have a clean title
                    const cleaned = this.cleanTitleResponse(final);
                    title = cleaned;
                });

            return title || 'New Chat';
        } catch {
            return 'New Chat';
        }
    }

    cleanTitleResponse(response) {
        if (!response) return 'New Chat';

        // Remove all thinking tags and their content completely
        let cleaned = response.replace(/<think>[\s\S]*?<\/think>/gi, '');

        // Remove any remaining incomplete thinking tags
        cleaned = cleaned.replace(/<think>[\s\S]*$/gi, '');

        // Remove any answer tags if present
        cleaned = cleaned.replace(/<\/?answer>/gi, '');

        // Remove markdown formatting
        cleaned = cleaned.replace(/[*_`#\[\]()]/g, '');

        // Clean up whitespace and get only the first 7 words
        cleaned = cleaned.trim();
        const words = cleaned.split(/\s+/).filter(word => word.length > 0);

        // Take only first 7 words and join them
        const titleWords = words.slice(0, 7);

        return titleWords.length > 0 ? titleWords.join(' ') : 'New Chat';
    }

    async updateChatTitle(chatId, title) {
        const chat = this.chats.find(c => c.id === chatId);
        if (chat) {
            chat.title = title;
            this.save();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('chatTitleUpdated', { detail: { chatId, newTitle: title } }));
            }
        }
    }

    // Streaming
    async streamResponse(model, messages, onChunk, onComplete, onError) {
        this.abortController = new AbortController();
        let content = '';

        try {
            const response = await this.ollama.chat({
                model,
                messages: messages.map(m => ({ role: m.role, content: m.content })),
                stream: true,
                signal: this.abortController.signal
            });

            for await (const chunk of response) {
                if (this.abortController.signal.aborted) throw new Error('Stream aborted');
                content += chunk.message.content || '';
                onChunk(content);
            }
            onComplete(content);
        } catch (err) {
            onError?.(err.name === 'AbortError' ? 'Stream cancelled' : `Error: ${err.message}`, err.name === 'AbortError');
        }
    }

    abort() {
        this.abortController?.abort();
        this.abortController = null;
    }

    // Storage
    save() {
        storage.save('chats', this.chats);
        storage.save('chatMessages', this.messages);
    }

    saveUrl(url) {
        storage.save('ollamaUrl', url);
        this.ollama = new Ollama({ host: url });
    }

    saveModel(model) {
        storage.save('selectedModel', model);
    }

    // Getters
    getChats() { return this.chats; }
    getMessages(chatId) { return this.messages[chatId] || []; }
    getChat(chatId) { return this.chats.find(c => c.id === chatId); }
    getStoredModel() { return storage.load('selectedModel'); }
    getStoredUrl() { return storage.load('ollamaUrl', 'http://localhost:11434'); }
    parseMarkdown(content) { return this.markdown.parse(content); }
}

export { modelLinkIcon };
