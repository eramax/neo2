import { marked } from "marked";
import hljs from "highlight.js";
import { MarkdownHelper } from "./markdown-helper.js";

export { MarkdownHelper };

export class ClipboardHelper {
    async copyCodeToClipboard(button, code) {
        try {
            // Find the nearest code element inside the same code block container
            const container = button.closest('.code-block-container');
            if (!container) throw new Error("No code block container found.");
            const codeElem = container.querySelector('pre.code-block > code');
            if (!codeElem) throw new Error("No code element found.");
            const codeText = codeElem.innerText || codeElem.textContent || "";

            await navigator.clipboard.writeText(codeText);

            button.classList.add("copied");
            const textSpan = button.querySelector(".copy-text");
            const originalText = textSpan.textContent;
            textSpan.textContent = "Copied!";

            setTimeout(() => {
                button.classList.remove("copied");
                textSpan.textContent = originalText;
            }, 2000);
        } catch (err) {
            console.error("Failed to copy:", err);

            button.classList.add("copy-error");
            const textSpan = button.querySelector(".copy-text");
            const originalText = textSpan.textContent;
            textSpan.textContent = "Error";

            setTimeout(() => {
                button.classList.remove("copy-error");
                textSpan.textContent = originalText;
            }, 2000);
        }
    }
}

export class OllamaModelManager {
    async loadOllamaModels({
        setAllowedModels,
        setModelsLoading,
        setModelsError,
        selectedModel,
        setSelectedModel
    }) {
        try {
            setModelsLoading(true);
            setModelsError(null);

            const response = await fetch("http://localhost:11434/api/tags");
            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status}`);
            }
            const data = await response.json();

            const allowedModels = data.models.map((ollamaModel) => {
                const originalOllamaName = ollamaModel.name;
                let baseNameForProcessing = originalOllamaName;
                const firstColonIndex = originalOllamaName.indexOf(":");
                if (firstColonIndex > 0) {
                    baseNameForProcessing = originalOllamaName.substring(0, firstColonIndex);
                }
                let displayName = baseNameForProcessing;
                let link;
                if (baseNameForProcessing.startsWith("hf.co/")) {
                    const hfPath = baseNameForProcessing.substring("hf.co/".length);
                    displayName = hfPath.substring(hfPath.lastIndexOf("/") + 1);
                    displayName = displayName.replace(/-GGUF$/i, "");
                    link = `https://huggingface.co/${hfPath}`;
                } else {
                    link = `https://ollama.com/library/${displayName}`;
                }
                return {
                    id: originalOllamaName,
                    name: displayName,
                    arch: ollamaModel.details?.family || "Unknown",
                    size: this.formatModelSize(ollamaModel.size),
                    format: ollamaModel.details?.format?.toUpperCase() || "Unknown",
                    link: link,
                    created: new Date(ollamaModel.modified_at).toLocaleDateString(),
                    details: ollamaModel.details || {},
                };
            });

            setAllowedModels(allowedModels);

            if (!allowedModels.find((m) => m.id === selectedModel)) {
                setSelectedModel(allowedModels[0]?.id || "");
            }
        } catch (error) {
            console.error("Failed to load Ollama models:", error);
            setModelsError(error.message);
        } finally {
            setModelsLoading(false);
        }
    }

    formatModelSize(bytes) {
        if (!bytes) return "Unknown";
        const gb = bytes / (1024 * 1024 * 1024);
        return gb >= 1
            ? `${gb.toFixed(1)}GB`
            : `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
    }
}

export class StorageHelper {
    static saveChats(chats) {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem("neo2_chats", JSON.stringify(chats));
        }
    }

    static loadChats() {
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem("neo2_chats");
            if (stored) {
                try {
                    return JSON.parse(stored);
                } catch { }
            }
        }
        return [
            { id: 1, title: "explain this code", category: "Today" },
            { id: 2, title: "explain this code - js /* Stream", category: "Yesterday" },
            { id: 3, title: "review this code", category: "Previous 30 days" },
            { id: 4, title: "review this markdown rules", category: "Previous 30 days" },
        ];
    }

    static saveChatMessages(chatMessages) {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem("neo2_chatMessages", JSON.stringify(chatMessages));
        }
    }

    static loadChatMessages() {
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem("neo2_chatMessages");
            if (stored) {
                try {
                    return JSON.parse(stored);
                } catch { }
            }
        }
        return {
            1: [
                {
                    metadata: { model: "gpt-4", id: "chatcmpl-1234567890" },
                    role: "ai",
                    content: "This Svelte code sets up a markdown editor with HTML sanitization using `DOMPurify`. Here's a breakdown:\n\n```javascript\n// Example code\nconst editor = new MarkdownEditor({\n  element: document.getElementById('editor'),\n  sanitize: true\n});\n```\n\nThe code includes:\n- **Markdown parsing** with marked\n- **Syntax highlighting** with highlight.js\n- **HTML sanitization** for security",
                    time: "Today at 4:03 PM",
                },
            ],
            2: [
                {
                    metadata: { model: "gpt-3.5-turbo", id: "chatcmpl-0987654321" },
                    role: "ai",
                    content: "Here's how JavaScript streams work:\n\n```javascript\nconst stream = new ReadableStream({\n  start(controller) {\n    controller.enqueue('Hello ');\n    controller.enqueue('World!');\n    controller.close();\n  }\n});\n```",
                    time: "Yesterday at 2:15 PM",
                },
            ],
        };
    }

    static saveSelectedModel(modelId) {
        if (modelId && typeof localStorage !== 'undefined') {
            localStorage.setItem("neo2_selectedModel", modelId);
        }
    }

    static loadSelectedModel() {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem("neo2_selectedModel");
        }
        return null;
    }
}

export class ChatManager {
    constructor() {
        this.chats = StorageHelper.loadChats();
        this.chatMessages = StorageHelper.loadChatMessages();
    }

    getChats() {
        return this.chats;
    }

    getChatMessages() {
        return this.chatMessages;
    }

    getCurrentChat(chatId) {
        return this.chats.find((c) => c.id == chatId);
    }

    getCurrentMessages(chatId) {
        if (!this.chatMessages[chatId]) {
            this.chatMessages = { ...this.chatMessages, [chatId]: [] };
        }
        return this.chatMessages[chatId];
    }

    createNewChat() {
        const newChatId = Date.now().toString();
        this.chats.push({
            id: newChatId,
            title: "New Chat",
            category: "Today",
        });
        this.chatMessages = { ...this.chatMessages, [newChatId]: [] };
        this.saveData();
        return newChatId;
    }

    async generateChatTitle(userMessage, streamingHelper, selectedModel) {
        const titlePrompt = "no_think generate a title for such user request with max 7 words";
        const titleMessages = [
            { role: "user", content: `${titlePrompt}: "${userMessage}"` }
        ];

        return new Promise((resolve) => {
            let titleContent = "";
            streamingHelper.streamResponse(
                selectedModel,
                titleMessages,
                (chunk) => { titleContent = chunk; },
                (finalTitle) => {
                    let cleanTitle = finalTitle.trim();
                    // Check if response contains </think> tag and extract content after it
                    const thinkEndIndex = cleanTitle.indexOf('</think>');
                    if (thinkEndIndex !== -1) {
                        cleanTitle = cleanTitle.substring(thinkEndIndex + '</think>'.length).trim();
                    }
                    resolve(cleanTitle || "New Chat");
                },
                (error) => { resolve("New Chat"); } // Fallback title
            );
        });
    }

    addMessage(chatId, message, streamingHelper = null, selectedModel = null) {
        if (!this.chatMessages[chatId]) {
            this.chatMessages[chatId] = [];
        }

        const isFirstUserMessage = this.chatMessages[chatId].length === 0 && message.role === "user";

        this.chatMessages = {
            ...this.chatMessages,
            [chatId]: [...this.chatMessages[chatId], message]
        };

        // Save immediately to return current messages
        this.saveData();

        // Generate title for new chats after first user message (async, non-blocking)
        if (isFirstUserMessage && streamingHelper && selectedModel) {
            // Use setTimeout to make this truly non-blocking
            setTimeout(() => {
                this.generateChatTitle(message.content, streamingHelper, selectedModel)
                    .then(newTitle => {
                        const chatIndex = this.chats.findIndex(c => c.id == chatId);
                        if (chatIndex !== -1) {
                            this.chats[chatIndex].title = newTitle;
                            this.saveData();
                            // Trigger a custom event to notify the UI of the title change
                            if (typeof window !== 'undefined') {
                                window.dispatchEvent(new CustomEvent('chatTitleUpdated', {
                                    detail: { chatId, newTitle }
                                }));
                            }
                        }
                    })
                    .catch(error => {
                        console.error("Failed to generate chat title:", error);
                    });
            }, 0);
        }

        return this.chatMessages[chatId];
    }

    saveData() {
        StorageHelper.saveChats(this.chats);
        StorageHelper.saveChatMessages(this.chatMessages);
    }
}

export class StreamingHelper {
    constructor(ollama) {
        this.ollama = ollama;
        this.abortController = null;
    }

    async streamResponse(model, messages, onChunk, onComplete, onError) {
        this.abortController = new AbortController();
        let streamingMessage = "";

        try {
            const response = await this.ollama.chat({
                model,
                messages: messages.map((m) => ({ role: m.role, content: m.content })),
                stream: true,
                signal: this.abortController.signal,
            });

            for await (const chunk of response) {
                if (this.abortController.signal.aborted) {
                    throw new Error("Stream aborted");
                }
                streamingMessage += chunk.message.content || "";
                onChunk(streamingMessage);
            }

            onComplete(streamingMessage);
        } catch (err) {
            if (err.name === "AbortError" || err.message === "Stream aborted") {
                onError("Stream cancelled", true);
            } else {
                onError("Error: " + err.message, false);
            }
        }
    }

    abort() {
        if (this.abortController) {
            this.abortController.abort();
        }
    }
}

export class ModelHelper {
    static selectValidModel(allowedModels, storedModel, currentModel) {
        if (allowedModels.length === 0) return null;

        // If we have a stored model and it exists in allowedModels, use it
        if (storedModel && allowedModels.some((m) => m.id === storedModel)) {
            return storedModel;
        }

        // If no valid currentModel is set, pick the first one
        if (!currentModel || !allowedModels.some((m) => m.id === currentModel)) {
            return allowedModels[0]?.id;
        }

        return currentModel;
    }

    static getCurrentModel(allowedModels, selectedModel) {
        return allowedModels.find((m) => m.id === selectedModel) || allowedModels[0];
    }

    static filterModels(allowedModels, searchTerm) {
        return allowedModels.filter(
            (model) =>
                model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                model.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
}
