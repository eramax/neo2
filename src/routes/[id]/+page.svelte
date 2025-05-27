<!-- This is a svelte v5 page for chat with llm models, using marked for markdown parsing and highlight.js for syntax highlighting. -->

<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import "../../app.scss";
  import {
    OllamaModelManager,
    ClipboardHelper,
    MarkdownHelper,
  } from "../../logic.js";
  import CheckmarkIcon from "../../components/CheckmarkIcon.svelte";
  import ModelLinkIcon from "../../components/ModelLinkIcon.svelte";

  // Instantiate helpers
  const markdownHelper = new MarkdownHelper();
  const clipboardHelper = new ClipboardHelper();
  const modelManager = new OllamaModelManager();

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

  // Replace marked usage with markdownHelper
  function parseMarkdown(content) {
    return markdownHelper.parse(content);
  }

  onMount(() => {
    // Ensure highlight.js is properly initialized
    markdownHelper.highlightAll();

    // Add global copy function
    window.copyCodeToClipboard = clipboardHelper.copyCodeToClipboard;

    // Load models from Ollama
    modelManager.loadOllamaModels({
      setAllowedModels: (models) => (allowedModels = models),
      setModelsLoading: (loading) => (modelsLoading = loading),
      setModelsError: (err) => (modelsError = err),
      selectedModel,
      setSelectedModel: (id) => (selectedModel = id),
    });
  });

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
                  <button
                    onclick={() =>
                      modelManager.loadOllamaModels({
                        setAllowedModels: (models) => (allowedModels = models),
                        setModelsLoading: (loading) =>
                          (modelsLoading = loading),
                        setModelsError: (err) => (modelsError = err),
                        selectedModel,
                        setSelectedModel: (id) => (selectedModel = id),
                      })}
                    class="retry-btn"
                  >
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
                            <CheckmarkIcon />
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
                            <ModelLinkIcon />
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
