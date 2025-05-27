<script>
  import { marked } from "marked";
  import hljs from "highlight.js";
  import "highlight.js/styles/github-dark.css";
  import { onMount } from "svelte";

  // Configure marked with proper highlight.js setup
  const renderer = new marked.Renderer();

  // Override code span renderer for inline code (single backticks)
  renderer.codespan = function (code) {
    return `<code class="inline-code">${code.text}</code>`;
  };

  // Override code block renderer to add language label and copy functionality
  renderer.code = function (code) {
    const validLang = hljs.getLanguage(code.lang) ? code.lang : "text";

    // Ensure code is a string and properly escape it
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

  function parseMarkdown(content) {
    try {
      // Ensure content is a string
      const contentStr = String(content || "");
      return marked.parse(contentStr);
    } catch (err) {
      console.error("Markdown parse error:", err);
      return String(content || "");
    }
  }

  onMount(() => {
    // Ensure highlight.js is properly initialized
    hljs.highlightAll();

    // Add global copy function
    window.copyCodeToClipboard = async function (button, code) {
      try {
        // Unescape the code
        const unescapedCode = code
          .replace(/\\'/g, "'")
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r");

        await navigator.clipboard.writeText(unescapedCode);

        // Add copied effect
        button.classList.add("copied");
        const textSpan = button.querySelector(".copy-text");
        const originalText = textSpan.textContent;
        textSpan.textContent = "Copied!";

        // Remove effect after 2 seconds
        setTimeout(() => {
          button.classList.remove("copied");
          textSpan.textContent = originalText;
        }, 2000);
      } catch (err) {
        console.error("Failed to copy:", err);

        // Show error effect
        button.classList.add("copy-error");
        const textSpan = button.querySelector(".copy-text");
        const originalText = textSpan.textContent;
        textSpan.textContent = "Error";

        setTimeout(() => {
          button.classList.remove("copy-error");
          textSpan.textContent = originalText;
        }, 2000);
      }
    };
  });

  let selectedChat = "explain this code";
  let message = "";
  let selectedModel = "gpt-4";
  let showModelSelector = false;

  const allowedModels = [
    {
      id: "gpt-4",
      name: "GPT-4",
      arch: "Transformer",
      size: "1.7T",
      icon: "🤖",
      format: "API",
      link: "openai.com/gpt-4",
      created: "2023-03",
    },
    {
      id: "gpt-3.5-turbo",
      name: "GPT-3.5 Turbo",
      arch: "Transformer",
      size: "175B",
      icon: "⚡",
      format: "API",
      link: "openai.com/gpt-3.5",
      created: "2022-11",
    },
    {
      id: "claude-3-opus",
      name: "Claude 3 Opus",
      arch: "Constitutional AI",
      size: "Unknown",
      icon: "🎭",
      format: "API",
      link: "anthropic.com/claude",
      created: "2024-02",
    },
    {
      id: "qwen3",
      name: "Qwen 3",
      arch: "Qwen3",
      size: "32B",
      icon: "🦙",
      format: "GGUF",
      link: "hf/qwen/qwen3-32b",
      created: "2024-01",
    },
  ];

  const chats = [
    { id: 1, title: "explain this code", category: "Today" },
    { id: 2, title: "explain this code - js /* Stream", category: "Yesterday" },
    { id: 3, title: "review this code", category: "Previous 30 days" },
    {
      id: 4,
      title: "review this markdown rules",
      category: "Previous 30 days",
    },
  ];

  const messages = [
    {
      metadata: {
        model: "gpt-4",
        id: "chatcmpl-1234567890",
      },
      role: "ai",
      content:
        "This Svelte code sets up a markdown editor with HTML sanitization using `DOMPurify`. Here's a breakdown:\n\n```javascript\n// Example code\nconst editor = new MarkdownEditor({\n  element: document.getElementById('editor'),\n  sanitize: true\n});\n```\n\nThe code includes:\n- **Markdown parsing** with marked\n- **Syntax highlighting** with highlight.js\n- **HTML sanitization** for security",
      time: "Today at 4:03 PM",
    },
  ];

  function selectModel(modelId) {
    selectedModel = modelId;
    showModelSelector = false;
  }

  $: currentModel =
    allowedModels.find((m) => m.id === selectedModel) || allowedModels[0];
</script>

<div class="app">
  <aside class="sidebar">
    <div class="sidebar-header">
      <button class="menu-btn">☰</button>
      <button class="new-chat-btn">New Chat</button>
      <button class="edit-btn">✎</button>
    </div>

    <div class="chats-section">
      <div class="section-header">▼ Chats</div>

      {#each ["Today", "Yesterday", "Previous 30 days"] as category}
        <div class="category">
          <div class="category-title">{category}</div>
          {#each chats.filter((c) => c.category === category) as chat}
            <div class="chat-item" class:active={selectedChat === chat.title}>
              {chat.title}
            </div>
          {/each}
        </div>
      {/each}
    </div>

    <div class="user-settings">
      <div class="user-profile">
        <div class="user-avatar">👤</div>
        <div class="user-info">
          <div class="user-name">User</div>
          <div class="user-status">Online</div>
        </div>
        <button class="settings-btn">⚙️</button>
      </div>
    </div>
  </aside>

  <main class="main-content">
    <div class="chat-header">
      <h1 class="chat-title">{selectedChat}</h1>
    </div>

    <div class="messages">
      {#each messages as msg}
        <div class="message ai-message">
          <div class="avatar">🤖</div>
          <div class="message-content">
            <div class="message-header">
              <span class="sender">{msg.metadata.model}</span>
              >
              <span class="time">{msg.time}</span>
            </div>
            <div class="thinking">Thought for 4 seconds ⌄</div>
            <div class="content">{@html parseMarkdown(msg.content)}</div>
          </div>
        </div>
      {/each}
    </div>

    <div class="input-area">
      <div class="input-container">
        <button class="add-btn">+</button>
        <input
          bind:value={message}
          placeholder="Send a Message"
          class="message-input"
        />
        <div class="model-selector">
          <button
            class="model-trigger"
            onclick={() => (showModelSelector = !showModelSelector)}
          >
            <span class="model-icon">{currentModel.icon}</span>
            <span class="chevron" class:open={showModelSelector}>▼</span>
          </button>

          {#if showModelSelector}
            <div class="model-dropdown">
              {#each allowedModels as model}
                <button
                  class="model-card"
                  class:selected={model.id === selectedModel}
                  onclick={() => selectModel(model.id)}
                  onkeydown={(e) => e.key === "Enter" && selectModel(model.id)}
                  type="button"
                >
                  <div class="model-header">
                    <span class="model-icon">{model.icon}</span>
                    <div class="model-info">
                      <div class="model-title">{model.name}</div>
                      <div class="model-meta">{model.arch} • {model.size}</div>
                    </div>
                    <div class="model-format">{model.format}</div>
                  </div>
                  <div class="model-footer">
                    <span class="model-date">{model.created}</span>
                    <span class="model-link">{model.link}</span>
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </div>
        <button class="mic-btn">🎤</button>
        <button class="send-btn">⬆</button>
      </div>
    </div>
  </main>
</div>

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(html, body) {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .app {
    display: flex;
    height: 100vh;
    width: 100vw;
    background: #1a1a1a;
    color: #fff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 14px;
  }

  .sidebar {
    width: 280px;
    background: #0d1117;
    border-right: 1px solid #333;
    display: flex;
    flex-direction: column;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    padding: 12px;
    gap: 8px;
    border-bottom: 1px solid #333;
  }

  .menu-btn,
  .edit-btn {
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    padding: 8px;
  }

  .new-chat-btn {
    flex: 1;
    background: none;
    border: none;
    color: #fff;
    text-align: left;
    padding: 8px 12px;
    border-radius: 6px;
  }

  .new-chat-btn:hover {
    background: #333;
  }

  .chats-section {
    flex: 1;
    padding: 16px 12px;
    overflow-y: auto;
  }

  .section-header {
    color: #888;
    margin-bottom: 12px;
    font-size: 12px;
  }

  .category-title {
    color: #888;
    font-size: 12px;
    margin: 16px 0 8px 0;
  }

  .chat-item {
    padding: 8px 12px;
    margin: 2px 0;
    border-radius: 6px;
    cursor: pointer;
    color: #ccc;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chat-item:hover {
    background: #333;
  }

  .chat-item.active {
    background: #333;
    color: #fff;
  }

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .chat-header {
    display: flex;
    align-items: center;
    padding: 12px 20px;
    border-bottom: 1px solid #333;
  }

  .chat-title {
    font-size: 18px;
    font-weight: 500;
    color: #fff;
    margin: 0;
  }

  .model-selector {
    position: relative;
  }

  .model-trigger {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #444;
    border: none;
    color: #fff;
    padding: 6px 8px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
  }

  .chevron {
    transition: transform 0.2s;
    font-size: 12px;
  }

  .chevron.open {
    transform: rotate(180deg);
  }

  .model-dropdown {
    position: absolute;
    bottom: 100%;
    right: 0;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 12px;
    padding: 8px;
    min-width: 280px;
    z-index: 100;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    margin-bottom: 8px;
  }

  .model-card {
    padding: 12px;
    border-radius: 8px;
    cursor: pointer;
    margin-bottom: 4px;
    transition: background 0.2s;
    background: none;
    border: none;
    color: inherit;
    text-align: left;
    width: 100%;
    font-family: inherit;
    font-size: inherit;
  }

  .model-card:hover {
    background: #333;
  }

  .model-card.selected {
    background: #007acc;
  }

  .model-header {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 6px;
  }

  .model-info {
    flex: 1;
  }

  .model-title {
    font-weight: 500;
    margin-bottom: 2px;
  }

  .model-meta {
    font-size: 12px;
    color: #aaa;
  }

  .model-format {
    background: #444;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    color: #ccc;
  }

  .model-footer {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #888;
  }

  .model-link {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .messages {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
  }

  .message {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
  }

  .avatar {
    width: 32px;
    height: 32px;
    background: #333;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
  }

  .message-content {
    flex: 1;
  }

  .message-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 4px;
  }

  .sender {
    font-weight: 500;
    font-size: 13px;
  }

  .time {
    color: #888;
    font-size: 12px;
  }

  .thinking {
    color: #888;
    font-size: 12px;
    margin-bottom: 8px;
  }

  .content {
    line-height: 1.6;
  }

  /* Markdown styling */
  .content :global(h1),
  .content :global(h2),
  .content :global(h3),
  .content :global(h4),
  .content :global(h5),
  .content :global(h6) {
    margin: 16px 0 8px 0;
    font-weight: 600;
  }

  .content :global(p) {
    margin: 8px 0;
  }

  .content :global(pre) {
    background: #1e1e1e;
    border: 1px solid #444;
    border-radius: 8px;
    padding: 16px;
    margin: 12px 0;
    overflow-x: auto;
    font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas,
      "Courier New", monospace;
    font-size: 13px;
    line-height: 1.5;
  }

  /* Enhanced code block styling */
  .content :global(.code-block-container) {
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 12px;
    margin: 16px 0;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .content :global(.code-block-header) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #161b22;
    border-bottom: 1px solid #30363d;
    font-size: 12px;
  }

  .content :global(.code-language) {
    color: #7d8590;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .content :global(.copy-code-btn) {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #21262d;
    border: 1px solid #30363d;
    color: #f0f6fc;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
  }

  .content :global(.copy-code-btn:hover) {
    background: #30363d;
    border-color: #484f58;
  }

  .content :global(.copy-code-btn.copied) {
    background: #238636;
    border-color: #2ea043;
    color: #ffffff;
    transform: scale(0.95);
  }

  .content :global(.copy-code-btn.copy-error) {
    background: #da3633;
    border-color: #f85149;
    color: #ffffff;
    transform: scale(0.95);
  }

  .content :global(.copy-code-btn.copied::before) {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    animation: shimmer 0.6s ease-out;
  }

  .content :global(.copy-text) {
    transition: all 0.2s ease;
  }

  @keyframes shimmer {
    0% {
      left: -100%;
    }
    100% {
      left: 100%;
    }
  }

  .content :global(.code-block) {
    background: #0d1117 !important;
    margin: 0;
    padding: 20px;
    border-radius: 0;
    border: none;
    font-size: 14px;
    line-height: 1.6;
    overflow-x: auto;
  }

  .content :global(.code-block code) {
    background: none !important;
    padding: 0 !important;
    color: #e6edf3;
  }

  /* Override highlight.js github-dark theme for better contrast */
  .content :global(.hljs-keyword) {
    color: #ff7b72 !important;
  }

  .content :global(.hljs-string) {
    color: #a5d6ff !important;
  }

  .content :global(.hljs-comment) {
    color: #8b949e !important;
  }

  .content :global(.hljs-function) {
    color: #d2a8ff !important;
  }

  .content :global(.hljs-variable) {
    color: #ffa657 !important;
  }

  .content :global(.hljs-number) {
    color: #79c0ff !important;
  }

  .content :global(.hljs-built_in) {
    color: #ffa657 !important;
  }

  .content :global(.hljs-literal) {
    color: #79c0ff !important;
  }

  .content :global(.hljs-title) {
    color: #d2a8ff !important;
  }

  .content :global(.hljs-attr) {
    color: #79c0ff !important;
  }

  .input-area {
    padding: 20px;
    border-top: 1px solid #333;
  }

  .input-container {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #333;
    border-radius: 12px;
    padding: 8px 16px;
  }

  .add-btn,
  .mic-btn,
  .send-btn {
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    padding: 4px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .send-btn {
    background: #007acc;
    border-radius: 50%;
    color: #fff;
  }

  .message-input {
    flex: 1;
    background: none;
    border: none;
    color: #fff;
    outline: none;
    padding: 8px 0;
  }

  .message-input::placeholder {
    color: #888;
  }

  .user-settings {
    border-top: 1px solid #333;
    padding: 12px;
  }

  .user-profile {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
  }

  .user-profile:hover {
    background: #333;
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    background: #444;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
  }

  .user-info {
    flex: 1;
  }

  .user-name {
    font-size: 14px;
    font-weight: 500;
    color: #fff;
  }

  .user-status {
    font-size: 12px;
    color: #888;
  }

  .settings-btn {
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    padding: 4px;
    font-size: 16px;
  }

  .settings-btn:hover {
    color: #fff;
  }

  .content :global(code) {
    background: #2a2a2a;
    padding: 2px 4px;
    border-radius: 4px;
    font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas,
      "Courier New", monospace;
    font-size: 13px;
  }

  .content :global(.inline-code) {
    background: #1a472a;
    color: #7dd3fc;
    border: 1px solid #22c55e;
    padding: 2px 6px;
    border-radius: 6px;
    font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas,
      "Courier New", monospace;
    font-size: 13px;
    font-weight: 500;
  }

  .content :global(pre code) {
    background: none;
    padding: 0;
  }
</style>
