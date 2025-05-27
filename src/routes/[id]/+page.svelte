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

    // Load models from Ollama
    loadOllamaModels();
  });

  let selectedChat = $state("explain this code");
  let message = $state("");
  let selectedModel = $state("gpt-4");
  let showModelSelector = $state(false);
  let sidebarCollapsed = $state(false);

  // Replace hardcoded models with reactive state
  let allowedModels = $state([]);
  let modelsLoading = $state(true);
  let modelsError = $state(null);

  // Add missing chats data
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

  // Use $derived for computed values to fix reactivity warnings
  let currentModel = $derived(
    allowedModels.find((m) => m.id === selectedModel) || allowedModels[0]
  );

  // Function to fetch models from Ollama
  async function loadOllamaModels() {
    try {
      modelsLoading = true;
      modelsError = null;

      const response = await fetch("http://localhost:11434/api/tags");

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();

      // Transform Ollama models to our format
      allowedModels = data.models.map((ollamaModel) => {
        const originalOllamaName = ollamaModel.name; // Full name like "codellama:7b-instruct" or "hf.co/user/model-gguf:Q4"

        let baseNameForProcessing = originalOllamaName;
        const firstColonIndex = originalOllamaName.indexOf(":");

        // If there's a colon and it's not at the start, consider the part before it as the base.
        if (firstColonIndex > 0) {
          baseNameForProcessing = originalOllamaName.substring(
            0,
            firstColonIndex
          );
        }
        // If no colon, baseNameForProcessing remains originalOllamaName.

        let displayName = baseNameForProcessing;
        let link;

        if (baseNameForProcessing.startsWith("hf.co/")) {
          const hfPath = baseNameForProcessing.substring("hf.co/".length); // "user/model-gguf"
          displayName = hfPath.substring(hfPath.lastIndexOf("/") + 1); // "model-gguf"
          displayName = displayName.replace(/-GGUF$/i, ""); // "model"
          link = `https://huggingface.co/${hfPath}`;
        } else {
          // For non-HF names, displayName is already baseNameForProcessing
          // e.g., "codellama" from "codellama:7b-instruct"
          // e.g., "Devstral-Small-2505" from "Devstral-Small-2505:Q4_K_XL"
          link = `https://ollama.com/library/${displayName}`;
        }

        return {
          id: originalOllamaName, // Use original full name as ID for selection
          name: displayName, // User-friendly display name
          arch: ollamaModel.details?.family || "Unknown",
          size: formatModelSize(ollamaModel.size),
          format: ollamaModel.details?.format?.toUpperCase() || "Unknown",
          link: link,
          created: new Date(ollamaModel.modified_at).toLocaleDateString(),
          details: ollamaModel.details || {},
        };
      });

      // Set default model if current selection is not available
      if (!allowedModels.find((m) => m.id === selectedModel)) {
        selectedModel = allowedModels[0]?.id || "";
      }
    } catch (error) {
      console.error("Failed to load Ollama models:", error);
      modelsError = error.message;
    } finally {
      modelsLoading = false;
    }
  }

  // Helper function to format model size
  function formatModelSize(bytes) {
    if (!bytes) return "Unknown";
    const gb = bytes / (1024 * 1024 * 1024);
    return gb >= 1
      ? `${gb.toFixed(1)}GB`
      : `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
  }

  // Reactive variables
  let currentChatId = $state();
  let currentMessages = $state([]);
  let currentChat = $state();
  let isNewChat = $state(false);

  // Add a state for the search term in the model selector
  let modelSearchTerm = $state("");

  // Derived state for filtered models
  let filteredModels = $derived(
    allowedModels.filter(
      (model) =>
        model.name.toLowerCase().includes(modelSearchTerm.toLowerCase()) || // Search by processed name
        model.id.toLowerCase().includes(modelSearchTerm.toLowerCase()) // Search by original ID (full name)
    )
  );

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
            disabled={modelsLoading}
          >
            <span class="model-name"
              >{currentModel?.name || "Select Model"}</span
            >
            <span class="chevron" class:open={showModelSelector}>▼</span>
          </button>

          {#if showModelSelector}
            <div class="model-dropdown">
              {#if modelsLoading}
                <div class="model-loading">
                  <div class="loading-spinner"></div>
                  <span>Loading models...</span>
                </div>
              {:else if modelsError}
                <div class="model-error">
                  <div class="error-icon">⚠️</div>
                  <div class="error-content">
                    <span class="error-title">Connection Failed</span>
                    <span class="error-message">{modelsError}</span>
                  </div>
                  <button onclick={loadOllamaModels} class="retry-btn">
                    <span>↻</span>
                    Retry
                  </button>
                </div>
              {:else}
                <div class="models-grid scrollable-model-list">
                  {#each filteredModels as model}
                    <button
                      class="model-card single-line"
                      class:selected={model.id === selectedModel}
                      onclick={() => selectModel(model.id)}
                      onkeydown={(e) =>
                        e.key === "Enter" && selectModel(model.id)}
                      type="button"
                      aria-label={`Select model ${model.name}`}
                      role="option"
                      aria-selected={model.id === selectedModel}
                    >
                      <span class="model-title-display" title={model.name}>
                        {model.name}
                      </span>
                      <span class="model-badges">
                        <span class="badge size" title="Size">{model.size}</span
                        >
                        <span class="badge format" title="Format"
                          >{model.format}</span
                        >
                        <span class="badge arch" title="Architecture"
                          >{model.arch}</span
                        >
                      </span>
                      <span class="model-actions">
                        {#if model.id === selectedModel}
                          <span class="selected-indicator" title="Selected">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="currentColor"
                            >
                              <path
                                d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"
                              />
                            </svg>
                          </span>
                        {/if}
                        {#if model.link}
                          <a
                            href={model.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="model-link-icon"
                            title={`Open ${model.name} details`}
                            onclick={(e) => e.stopPropagation()}
                            aria-label={`Open details for ${model.name} in a new tab`}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#888888"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <path
                                d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                              ></path>
                              <polyline points="15 3 21 3 21 9"></polyline>
                              <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                          </a>
                        {/if}
                      </span>
                    </button>
                  {/each}
                  {#if filteredModels.length === 0 && !modelsLoading}
                    <div class="no-models-found">
                      <p>No models match your search.</p>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          {/if}
        </div>
        <button class="mic-btn">🎤</button>
        <button class="send-btn">⬆</button>
      </div>
    </div>
  </main>
</div>
