<!-- This is a svelte v5 page for chat with llm models, using marked for markdown parsing and highlight.js for syntax highlighting. -->

<script>
  import { marked } from "marked";
  import hljs from "highlight.js";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import "../../app.scss";
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
