<!-- This is a svelte v5 page for chat with llm models, using marked for markdown parsing and highlight.js for syntax highlighting. -->

<script>
  import { marked } from "marked";
  import hljs from "highlight.js";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  //import "highlight.js/styles/github-dark.css";

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

  let selectedChat = $state("explain this code");
  let message = $state("");
  let selectedModel = $state("gpt-4");
  let showModelSelector = $state(false);
  let sidebarCollapsed = $state(false);

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

  const chatMessages = {
    1: [
      {
        metadata: { model: "gpt-4", id: "chatcmpl-1234567890" },
        role: "ai",
        content:
          "This Svelte code sets up a markdown editor with HTML sanitization using `DOMPurify`. Here's a breakdown:\n\n```javascript\n// Example code\nconst editor = new MarkdownEditor({\n  element: document.getElementById('editor'),\n  sanitize: true\n});\n```\n\nThe code includes:\n- **Markdown parsing** with marked\n- **Syntax highlighting** with highlight.js\n- **HTML sanitization** for security",
        time: "Today at 4:03 PM",
      },
    ],
    2: [
      {
        metadata: { model: "gpt-3.5-turbo", id: "chatcmpl-0987654321" },
        role: "ai",
        content:
          "Here's how JavaScript streams work:\n\n```javascript\nconst stream = new ReadableStream({\n  start(controller) {\n    controller.enqueue('Hello ');\n    controller.enqueue('World!');\n    controller.close();\n  }\n});\n```",
        time: "Yesterday at 2:15 PM",
      },
    ],
    // Other chats have empty arrays or no entries
  };

  // Reactive variables
  let currentChatId = $state();
  let currentMessages = $state([]);
  let currentChat = $state();
  let isNewChat = $state(false);

  // Update current chat data when route changes
  $effect(() => {
    const chatId = $page.params.id;
    if (chatId !== currentChatId) {
      currentChatId = chatId;
      currentChat = chats.find((c) => c.id == chatId);
      currentMessages = chatMessages[chatId] || [];
      isNewChat = !currentChat;
      selectedChat = currentChat?.title || "New Chat";
    }
  });

  function selectModel(modelId) {
    selectedModel = modelId;
    showModelSelector = false;
  }

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
  }

  function navigateToChat(chatId) {
    goto(`/${chatId}`);
  }

  function createNewChat() {
    // Generate a new chat ID and navigate to it
    const newChatId = Date.now().toString();
    goto(`/${newChatId}`);
  }

  let currentModel = $state(
    allowedModels.find((m) => m.id === selectedModel) || allowedModels[0]
  );
</script>

<div class="app">
  <aside class="sidebar" class:collapsed={sidebarCollapsed}>
    <div class="sidebar-header">
      <div class="brand-section">
        <h2 class="brand-title">Neo2</h2>
        <button class="new-chat-btn" onclick={createNewChat} title="New Chat"
          >+</button
        >
      </div>
    </div>

    <div class="chats-section">
      {#each ["Today", "Yesterday", "Previous 30 days"] as category}
        <div class="category">
          <div class="category-title">{category}</div>
          {#each chats.filter((c) => c.category === category) as chat}
            <button
              class="chat-item"
              class:active={$page.params.id == chat.id}
              onclick={() => navigateToChat(chat.id)}
            >
              {chat.title}
            </button>
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

  <main class="main-content" class:sidebar-collapsed={sidebarCollapsed}>
    <div class="chat-header">
      <button class="toggle-sidebar-btn" onclick={toggleSidebar}>
        {sidebarCollapsed ? "☰" : "✕"}
      </button>
      <h1 class="chat-title">{selectedChat}</h1>
    </div>

    <div class="messages">
      {#if isNewChat}
        <div class="welcome-screen">
          <div class="welcome-content">
            <h2>Start a new conversation</h2>
            <p>
              Ask me anything, and I'll help you with coding, explanations, or
              general questions.
            </p>
          </div>
        </div>
      {:else if currentMessages.length === 0}
        <div class="empty-state">
          <div class="empty-content">
            <p>No messages in this chat yet.</p>
          </div>
        </div>
      {:else}
        {#each currentMessages as msg}
          <div class="message ai-message">
            <div class="avatar">🤖</div>
            <div class="message-content">
              <div class="message-header">
                <span class="sender">{msg.metadata.model}</span>
                <span class="time">{msg.time}</span>
              </div>
              <div class="thinking">Thought for 4 seconds ⌄</div>
              <div class="content">{@html parseMarkdown(msg.content)}</div>
            </div>
          </div>
        {/each}
      {/if}
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

<style lang="scss">
  // Variables
  $bg-primary: #1a1a1a;
  $bg-secondary: #0a0a0a;
  $bg-tertiary: #333;
  $bg-code: #0d1117;
  $bg-code-header: #161b22;
  $border: #222;
  $border-light: #444;
  $text: #fff;
  $text-muted: #888;
  $text-dim: #666;
  $accent: #007acc;
  $accent-hover: #0086d6;
  $green: #238636;
  $red: #da3633;
  $radius: 8px;
  $radius-lg: 12px;

  // Mixins
  @mixin btn-base {
    background: none;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @mixin flex-center {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  // Global reset
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(html, body) {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .app {
    display: flex;
    height: 100vh;
    width: 100vw;
    background: $bg-primary;
    color: $text;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 14px;
  }

  // Sidebar
  .sidebar {
    width: 280px;
    background: $bg-secondary;
    border-right: 1px solid $border;
    display: flex;
    flex-direction: column;
    transition: all 0.3s ease;

    &.collapsed {
      width: 0;
      min-width: 0;
      overflow: hidden;
    }

    .sidebar-header {
      border-bottom: 1px solid $border;
      padding: 16px;
    }

    .brand-section {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .brand-title {
      font-size: 20px;
      font-weight: 700;
      margin: 0;
      background: linear-gradient(135deg, $accent, #00d4ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .new-chat-btn {
      @include btn-base;
      background: $accent;
      color: $text;
      width: 32px;
      height: 32px;
      border-radius: $radius;
      font-size: 18px;
      font-weight: bold;

      &:hover {
        background: $accent-hover;
        transform: scale(1.05);
      }
    }

    .chats-section {
      flex: 1;
      padding: 16px 12px;
      overflow-y: auto;
    }

    .category-title {
      color: $text-dim;
      font-size: 12px;
      margin: 16px 0 8px 0;
      font-weight: 500;
    }

    .chat-item {
      @include btn-base;
      padding: 10px 12px;
      margin: 2px 0;
      border-radius: $radius;
      color: #bbb;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-family: inherit;
      font-size: inherit;
      width: 100%;
      text-align: left;
      justify-content: flex-start;

      &:hover {
        background: $bg-primary;
        color: $text;
      }

      &.active {
        background: $accent;
        color: $text;
      }
    }

    .user-settings {
      border-top: 1px solid $border;
      padding: 12px;
    }

    .user-profile {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border-radius: $radius;
      cursor: pointer;
      transition: background 0.2s ease;

      &:hover {
        background: $bg-primary;
      }
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      background: $bg-tertiary;
      border-radius: 50%;
      @include flex-center;
      font-size: 16px;
    }

    .user-name {
      font-size: 14px;
      font-weight: 500;
      color: $text;
    }

    .user-status {
      font-size: 12px;
      color: $text-dim;
    }

    .settings-btn {
      @include btn-base;
      color: $text-dim;
      padding: 4px;
      font-size: 16px;
      margin-left: auto;

      &:hover {
        color: $text;
      }
    }
  }

  // Main content
  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    transition: all 0.3s ease;

    &.sidebar-collapsed {
      margin-left: 0;
    }

    .chat-header {
      display: flex;
      align-items: center;
      padding: 12px 20px;
      border-bottom: 1px solid $bg-tertiary;
      gap: 16px;
    }

    .toggle-sidebar-btn {
      @include btn-base;
      color: $text-muted;
      padding: 8px;
      border-radius: 6px;
      font-size: 16px;

      &:hover {
        background: $bg-tertiary;
        color: $text;
      }
    }

    .chat-title {
      font-size: 18px;
      font-weight: 500;
      color: $text;
      margin: 0;
    }
  }

  // Model selector
  .model-selector {
    position: relative;

    .model-trigger {
      @include btn-base;
      gap: 4px;
      background: $border-light;
      color: $text;
      padding: 6px 8px;
      border-radius: 6px;
      font-size: 12px;
    }

    .chevron {
      transition: transform 0.2s;
      font-size: 12px;

      &.open {
        transform: rotate(180deg);
      }
    }

    .model-dropdown {
      position: absolute;
      bottom: 100%;
      right: 0;
      background: #2a2a2a;
      border: 1px solid $border-light;
      border-radius: $radius-lg;
      padding: 8px;
      min-width: 280px;
      z-index: 100;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      margin-bottom: 8px;
    }

    .model-card {
      @include btn-base;
      padding: 12px;
      border-radius: $radius;
      margin-bottom: 4px;
      text-align: left;
      width: 100%;
      font-family: inherit;
      font-size: inherit;
      color: inherit;

      &:hover {
        background: $bg-tertiary;
      }

      &.selected {
        background: $accent;
      }
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
      background: $border-light;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      color: #ccc;
    }

    .model-footer {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: $text-muted;
    }

    .model-link {
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  // Messages
  .messages {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
  }

  .message {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;

    .avatar {
      width: 32px;
      height: 32px;
      background: $bg-tertiary;
      border-radius: 50%;
      @include flex-center;
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
      color: $text-muted;
      font-size: 12px;
    }

    .thinking {
      color: $text-muted;
      font-size: 12px;
      margin-bottom: 8px;
    }

    .content {
      line-height: 1.6;

      :global(h1),
      :global(h2),
      :global(h3),
      :global(h4),
      :global(h5),
      :global(h6) {
        margin: 16px 0 8px 0;
        font-weight: 600;
      }

      :global(p) {
        margin: 8px 0;
      }

      :global(code) {
        background: #2a2a2a;
        padding: 2px 4px;
        border-radius: 4px;
        font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas,
          "Courier New", monospace;
        font-size: 13px;
      }

      :global(.inline-code) {
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

      :global(.code-block-container) {
        background: $bg-code;
        border: 1px solid #30363d;
        border-radius: $radius-lg;
        margin: 16px 0;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }

      :global(.code-block-header) {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 2px 16px;
        background: $bg-code-header;
        border-bottom: 1px solid #30363d;
        font-size: 12px;
      }

      :global(.code-language) {
        color: #7d8590;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      :global(.copy-code-btn) {
        @include btn-base;
        gap: 6px;
        background: #21262d;
        border: 1px solid #30363d;
        color: #f0f6fc;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 12px;
        position: relative;
        overflow: hidden;

        &:hover {
          background: #30363d;
          border-color: #484f58;
        }

        &.copied {
          background: $green;
          border-color: #2ea043;
          color: $text;
          transform: scale(0.95);

          &::before {
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
        }

        &.copy-error {
          background: $red;
          border-color: #f85149;
          color: $text;
          transform: scale(0.95);
        }
      }

      :global(.copy-text) {
        transition: all 0.2s ease;
      }

      :global(.code-block) {
        background: $bg-code !important;
        margin: 0;
        padding: 20px;
        border-radius: 0;
        border: none;
        font-size: 14px;
        line-height: 1.6;
        overflow-x: auto;

        :global(code) {
          background: none !important;
          padding: 0 !important;
          color: #e6edf3;
        }
      }

      // Syntax highlighting
      :global(.hljs-keyword) {
        color: #ff7b72 !important;
      }
      :global(.hljs-string) {
        color: #a5d6ff !important;
      }
      :global(.hljs-comment) {
        color: #8b949e !important;
      }
      :global(.hljs-function) {
        color: #d2a8ff !important;
      }
      :global(.hljs-variable) {
        color: #ffa657 !important;
      }
      :global(.hljs-number) {
        color: #79c0ff !important;
      }
      :global(.hljs-built_in) {
        color: #ffa657 !important;
      }
      :global(.hljs-literal) {
        color: #79c0ff !important;
      }
      :global(.hljs-title) {
        color: #d2a8ff !important;
      }
      :global(.hljs-attr) {
        color: #79c0ff !important;
      }
    }
  }

  // Input area
  .input-area {
    padding: 20px;
    border-top: 1px solid $bg-tertiary;

    .input-container {
      display: flex;
      align-items: center;
      gap: 8px;
      background: $bg-tertiary;
      border-radius: $radius-lg;
      padding: 8px 16px;
    }

    .add-btn,
    .mic-btn,
    .send-btn {
      @include btn-base;
      color: $text-muted;
      padding: 4px;
      width: 24px;
      height: 24px;
    }

    .send-btn {
      background: $accent;
      border-radius: 50%;
      color: $text;
    }

    .message-input {
      flex: 1;
      background: none;
      border: none;
      color: $text;
      outline: none;
      padding: 8px 0;

      &::placeholder {
        color: $text-muted;
      }
    }
  }

  // Welcome/empty states
  .welcome-screen,
  .empty-state {
    flex: 1;
    @include flex-center;
  }

  .welcome-content,
  .empty-content {
    text-align: center;
    max-width: 500px;
    padding: 40px 20px;

    h2 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 12px;
      color: $text;
    }

    p {
      color: $text-muted;
      font-size: 16px;
      line-height: 1.5;
    }
  }

  @keyframes shimmer {
    0% {
      left: -100%;
    }
    100% {
      left: 100%;
    }
  }
</style>
