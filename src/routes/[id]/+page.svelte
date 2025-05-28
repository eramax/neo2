<!-- This is a svelte v5 page for chat with llm models, using marked for markdown parsing and highlight.js for syntax highlighting. -->

<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { browser } from "$app/environment";
  import "../../app.scss";
  import {
    OllamaModelManager,
    ClipboardHelper,
    MarkdownHelper,
    ChatManager,
    StorageHelper,
    StreamingHelper,
    ModelHelper,
  } from "../../logic.js";
  import CheckmarkIcon from "../../components/CheckmarkIcon.svelte";
  import ModelLinkIcon from "../../components/ModelLinkIcon.svelte";
  import ollama from "ollama/browser";

  // Instantiate helpers
  const markdownHelper = new MarkdownHelper();
  const clipboardHelper = new ClipboardHelper();
  const modelManager = new OllamaModelManager();
  let chatManager;
  const streamingHelper = new StreamingHelper(ollama);

  let selectedChat = $state("explain this code");
  let message = $state("");
  let selectedModel = $state(null);
  let showModelSelector = $state(false);
  let sidebarCollapsed = $state(false);

  // Replace hardcoded models with reactive state
  let allowedModels = $state([]);
  let modelsLoading = $state(true);
  let modelsError = $state(null);

  // Use chat manager data - initialize with defaults for SSR
  let chats = $state([]);
  let chatMessages = $state({});

  // Use $derived for computed values
  let currentModel = $derived(
    ModelHelper.getCurrentModel(allowedModels, selectedModel)
  );

  // Add a state for the search term in the model selector
  let modelSearchTerm = $state("");

  // Derived state for filtered models
  let filteredModels = $derived(
    ModelHelper.filterModels(allowedModels, modelSearchTerm)
  );

  function parseMarkdown(content) {
    return markdownHelper.parse(content);
  }

  onMount(() => {
    // Initialize ChatManager only in browser
    chatManager = new ChatManager();
    chats = chatManager.getChats();
    chatMessages = chatManager.getChatMessages();

    markdownHelper.highlightAll();
    window.copyCodeToClipboard = clipboardHelper.copyCodeToClipboard;

    // Listen for chat title updates
    window.addEventListener("chatTitleUpdated", (event) => {
      const { chatId, newTitle } = event.detail;
      // Update local chats state
      chats = chatManager.getChats();
      // Update current chat title if it's the active chat
      if (chatId == currentChatId) {
        selectedChat = newTitle;
        currentChat = chatManager.getCurrentChat(chatId);
      }
    });

    // Load models from Ollama
    modelManager.loadOllamaModels({
      setAllowedModels: (models) => (allowedModels = models),
      setModelsLoading: (loading) => (modelsLoading = loading),
      setModelsError: (err) => (modelsError = err),
      selectedModel,
      setSelectedModel: (id) => (selectedModel = id),
    });
  });

  // Ensure selectedModel is always a valid model after models are loaded
  $effect(() => {
    if (allowedModels.length > 0 && browser) {
      const storedSelectedModel = StorageHelper.loadSelectedModel();
      selectedModel = ModelHelper.selectValidModel(
        allowedModels,
        storedSelectedModel,
        selectedModel
      );
    }
  });

  let currentChatId = $state();
  let currentMessages = $state([]);
  let currentChat = $state();
  let isNewChat = $state(false);

  // Update current chat data when route changes
  $effect(() => {
    const chatId = $page.params.id;
    if (chatId !== currentChatId && chatManager) {
      currentChatId = chatId;
      currentChat = chatManager.getCurrentChat(chatId);
      currentMessages = chatManager.getCurrentMessages(chatId);
      isNewChat = !currentChat;
      selectedChat = currentChat?.title || "New Chat";

      // Update local state with manager data
      chats = chatManager.getChats();
      chatMessages = chatManager.getChatMessages();
    }
  });

  // Save selectedModel to localStorage whenever it changes
  $effect(() => {
    if (browser) {
      StorageHelper.saveSelectedModel(selectedModel);
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
    if (!chatManager) return;
    const newChatId = chatManager.createNewChat();
    chats = chatManager.getChats();
    chatMessages = chatManager.getChatMessages();
    goto(`/${newChatId}`);
  }

  let streamingMessage = $state("");
  let isStreaming = $state(false);

  // Add reference for messages container
  let messagesContainer;

  // Auto-scroll function
  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Auto-scroll when streaming message updates or when messages change
  $effect(() => {
    if (isStreaming && streamingMessage) {
      requestAnimationFrame(scrollToBottom);
    }
  });

  $effect(() => {
    if (currentMessages.length > 0) {
      setTimeout(scrollToBottom, 10);
    }
  });

  function sendMessage() {
    if (!message.trim() || isStreaming || !chatManager) return;

    const userMessage = message;
    message = "";

    const userMsg = {
      role: "user",
      content: userMessage,
      time: new Date().toLocaleTimeString(),
      metadata: { model: selectedModel },
    };

    currentMessages = chatManager.addMessage(
      currentChatId,
      userMsg,
      streamingHelper,
      selectedModel
    );
    chatMessages = chatManager.getChatMessages();

    streamingMessage = "";
    isStreaming = true;
    setTimeout(scrollToBottom, 10);

    const messagesToSend = currentMessages.filter(
      (m) => m.role === "user" || m.role === "ai"
    );

    streamingHelper.streamResponse(
      selectedModel,
      messagesToSend,
      (chunk) => {
        streamingMessage = chunk;
      },
      (finalMessage) => {
        const aiMsg = {
          role: "ai",
          content: finalMessage,
          time: new Date().toLocaleTimeString(),
          metadata: { model: selectedModel },
        };
        currentMessages = chatManager.addMessage(currentChatId, aiMsg);
        chatMessages = chatManager.getChatMessages();
        streamingMessage = "";
        isStreaming = false;
        setTimeout(scrollToBottom, 10);
      },
      (error, wasAborted) => {
        if (wasAborted) {
          streamingMessage = "";
        } else {
          streamingMessage = error;
        }
        isStreaming = false;
        setTimeout(scrollToBottom, 10);
      }
    );
  }

  function abortStream() {
    if (isStreaming) {
      streamingHelper.abort();
    }
  }

  function handleInputKeydown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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

    <div class="messages" bind:this={messagesContainer}>
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
          <div
            class="message {msg.role === 'ai' ? 'ai-message' : 'user-message'}"
          >
            <div class="avatar">{msg.role === "ai" ? "🤖" : "🧑"}</div>
            <div class="message-content">
              <div class="message-header">
                <span class="sender">{msg.metadata?.model || msg.role}</span>
                <span class="time">{msg.time}</span>
              </div>
              <div class="content">{@html parseMarkdown(msg.content)}</div>
            </div>
          </div>
        {/each}
        {#if isStreaming}
          <div class="message ai-message streaming">
            <div class="avatar">🤖</div>
            <div class="message-content">
              <div class="message-header">
                <span class="sender">{selectedModel}</span>
                <span class="time">{new Date().toLocaleTimeString()}</span>
              </div>
              {#if streamingMessage}
                <div class="content">
                  {@html parseMarkdown(streamingMessage)}
                </div>
              {:else}
                <div class="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      {/if}
    </div>

    <div class="input-area">
      <div class="input-container">
        <button class="add-btn">+</button>
        <input
          bind:value={message}
          placeholder="Send a Message"
          class="message-input"
          onkeydown={handleInputKeydown}
          disabled={isStreaming}
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
        <button
          class="send-btn"
          class:abort={isStreaming}
          onclick={isStreaming ? abortStream : sendMessage}
          disabled={!isStreaming && !message.trim()}
          title={isStreaming ? "Cancel" : "Send"}
        >
          {isStreaming ? "⏹" : "⬆"}
        </button>
      </div>
    </div>
  </main>
</div>
