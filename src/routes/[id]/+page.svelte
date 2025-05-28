<!-- Ultra-compact Svelte 5 chat app which uses dark mode only and all styles are in app.scss and all logic in core.js and always uses very optimized code with least code lines -->
<script>
  import { onMount, onDestroy } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { browser } from "$app/environment";
  import { ChatApp, modelLinkIcon } from "../../core.js";
  import "../../app.scss";

  const app = new ChatApp();

  let selectedChat = $state("New Chat");
  let message = $state("");
  let selectedModel = $state(null);
  let showModelSelector = $state(false);
  let sidebarCollapsed = $state(false);
  let models = $state([]);
  let modelsLoading = $state(true);
  let modelsError = $state(null);
  let ollamaUrl = $state(app.getStoredUrl());
  let showUrlEditor = $state(false);
  let tempUrl = $state("");
  let connectionStatus = $state("checking");
  let chats = $state(app.getChats());
  let messages = $state({});
  let streamingMessage = $state("");
  let isStreaming = $state(false);
  let messagesContainer;
  let messageTextarea;

  let currentChatId = $state();
  let currentMessages = $state([]);
  let currentChat = $state();
  let isNewChat = $state(false);

  const currentModel = $derived(
    models.find((m) => m.id === selectedModel) || models[0]
  );
  const filteredModels = $derived(models);

  let newModelMode = $state(false);
  let newModelUrl = $state("");
  let newModelProgress = $state(null);
  let newModelError = $state(null);

  // Listen for background progress updates
  if (typeof window !== "undefined") {
    window.__ollamaPullProgress = (progress) => {
      // Only update if the model matches the current input
      if (progress && progress.model && progress.model === newModelUrl) {
        newModelProgress = progress;
        if (progress.error) newModelError = progress.error;
      }
    };
  }

  function scrollToBottom() {
    if (messagesContainer) {
      requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      });
    }
  }

  async function loadModels() {
    connectionStatus = "checking";
    modelsLoading = true;
    try {
      models = await app.loadModels();
      connectionStatus = models.length ? "connected" : "disconnected";
      if (!selectedModel && models.length) {
        selectedModel = app.getStoredModel() || models[0]?.id;
      }
    } catch (err) {
      modelsError = err.message;
      connectionStatus = "disconnected";
    }
    modelsLoading = false;
  }

  function selectModel(id) {
    selectedModel = id;
    showModelSelector = false;
    app.saveModel(id);
  }

  function createNewChat() {
    const id = app.createChat();
    chats = app.getChats();
    goto(`/${id}`);
  }

  function navigateToChat(id) {
    goto(`/${id}`);
  }

  async function sendMessage() {
    if (!message.trim() || isStreaming) return;

    const userMessage = message;
    message = "";
    const time = new Date().toLocaleTimeString();
    const userMsg = {
      role: "user",
      content: userMessage,
      time,
      metadata: { model: selectedModel },
    };

    // Use the new method that handles async title generation automatically
    currentMessages = app.addMessageWithTitleGeneration(
      currentChatId,
      userMsg,
      selectedModel
    );

    streamingMessage = "";
    isStreaming = true;
    await app.streamResponse(
      selectedModel,
      currentMessages.filter((m) => m.role === "user" || m.role === "ai"),
      (chunk) => {
        streamingMessage = chunk;
        scrollToBottom();
      },
      (final) => {
        const aiMsg = {
          role: "ai",
          content: final,
          time: new Date().toLocaleTimeString(),
          metadata: { model: selectedModel },
        };
        currentMessages = app.addMessage(currentChatId, aiMsg);
        streamingMessage = "";
        isStreaming = false;
        scrollToBottom();
      },
      (error, aborted) => {
        streamingMessage = aborted ? "" : error;
        isStreaming = false;
        scrollToBottom();
      }
    );
  }

  function abortStream() {
    isStreaming && app.abort();
  }

  function autoResize() {
    if (!messageTextarea) return;
    messageTextarea.style.height = "auto";
    const newHeight = Math.min(messageTextarea.scrollHeight, 240);
    messageTextarea.style.height = newHeight + "px";
  }

  function handleKeydown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function saveUrl() {
    if (tempUrl?.trim()) {
      ollamaUrl = tempUrl.trim();
      app.saveUrl(ollamaUrl);
      showUrlEditor = false;
      loadModels();
    }
  }

  async function saveNewModel() {
    if (!newModelUrl.trim()) return;
    newModelProgress = { status: "Starting...", percent: 0 };
    newModelError = null;
    try {
      await app.pullModel(
        newModelUrl.trim(),
        (progress) => (newModelProgress = progress)
      );
      newModelProgress = { status: "Done!", percent: 100 };
      setTimeout(() => {
        newModelMode = false;
        newModelUrl = "";
        newModelProgress = null;
        loadModels();
      }, 800);
    } catch (e) {
      newModelError = e.message || "Failed to pull model";
      newModelProgress = null;
    }
  }

  onMount(() => {
    loadModels();

    // Add event listener for chat title updates
    const handleTitleUpdate = (e) => {
      const { chatId, newTitle } = e.detail;
      chats = app.getChats();
      if (chatId === currentChatId) {
        selectedChat = newTitle;
        currentChat = app.getChat(chatId);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("chatTitleUpdated", handleTitleUpdate);

      // Store the cleanup function
      onDestroy(() => {
        window.removeEventListener("chatTitleUpdated", handleTitleUpdate);
      });
    }
  });

  $effect(() => {
    if (message !== undefined) setTimeout(autoResize, 0);
  });

  $effect(() => {
    if (isStreaming && streamingMessage) scrollToBottom();
  });

  $effect(() => {
    if (currentMessages.length > 0) setTimeout(scrollToBottom, 10);
  });

  $effect(() => {
    const chatId = $page.params.id;
    if (chatId !== currentChatId) {
      currentChatId = chatId;
      currentChat = app.getChat(chatId);
      currentMessages = app.getMessages(chatId);
      isNewChat = !currentChat;
      selectedChat = currentChat?.title || "New Chat";
      chats = app.getChats();
    }
  });
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
      <button
        class="toggle-sidebar-btn"
        onclick={() => (sidebarCollapsed = !sidebarCollapsed)}
      >
        {sidebarCollapsed ? "☰" : "✕"}
      </button>
      <h1 class="chat-title">{selectedChat}</h1>

      <div class="model-selector">
        <button
          class="model-trigger"
          onclick={() => (showModelSelector = !showModelSelector)}
          disabled={modelsLoading}
        >
          <span class="model-name">{currentModel?.name || "Select Model"}</span>
          <span class="chevron" class:open={showModelSelector}>▼</span>
        </button>
        {#if showModelSelector}
          <div class="model-dropdown">
            <div class="server-config-compact">
              {#if showUrlEditor}
                <div class="server-status-indicator status-editing"></div>
                <input
                  type="text"
                  bind:value={tempUrl}
                  placeholder="http://localhost:11434"
                  class="server-url-input"
                />
                <button
                  class="server-action-btn save"
                  onclick={saveUrl}
                  title="Save">✓</button
                >
                <button
                  class="server-action-btn cancel"
                  onclick={() => (showUrlEditor = false)}
                  title="Cancel">✕</button
                >
              {:else}
                <div
                  class="server-status-indicator status-{connectionStatus}"
                ></div>
                <span class="server-url-display">{ollamaUrl}</span>
                <button
                  class="server-action-btn edit"
                  onclick={() => {
                    showUrlEditor = true;
                    tempUrl = ollamaUrl;
                  }}
                  title="Edit">✎</button
                >
              {/if}
            </div>

            {#if modelsLoading}
              <div class="model-loading">
                <div class="loading-spinner"></div>
                <span>Loading models...</span>
              </div>
            {:else if models.length > 0}
              <div class="models-grid scrollable-model-list">
                {#each filteredModels as model}
                  <button
                    class="model-card single-line"
                    class:selected={model.id === selectedModel}
                    onclick={() => selectModel(model.id)}
                  >
                    <span class="model-title-display" title={model.name}
                      >{model.name}</span
                    >
                    <span class="model-badges">
                      <span class="badge size" title="Size">{model.size}</span>
                      <span class="badge format" title="Format"
                        >{model.format}</span
                      >
                      <span class="badge arch" title="Architecture"
                        >{model.arch}</span
                      >
                    </span>
                    {#if model.link}
                      <a
                        href={model.link}
                        target="_blank"
                        class="model-link-icon"
                        title="Open details"
                        onclick={(e) => e.stopPropagation()}
                      >
                        {@html modelLinkIcon}
                      </a>
                    {/if}
                  </button>
                {/each}
                <!-- New model item -->
                {#if newModelMode}
                  <div class="model-card single-line new-model-row">
                    <input
                      class="new-model-input"
                      type="text"
                      bind:value={newModelUrl}
                      placeholder="model name or URL (e.g. llama3)"
                      autofocus
                      onkeydown={(e) => {
                        if (e.key === "Enter") saveNewModel();
                        if (e.key === "Escape") {
                          newModelMode = false;
                          newModelUrl = "";
                          newModelProgress = null;
                          newModelError = null;
                        }
                      }}
                      disabled={!!newModelProgress}
                    />
                    <button
                      class="server-action-btn save"
                      onclick={saveNewModel}
                      disabled={!newModelUrl.trim() || !!newModelProgress}
                      title="Pull model">✓</button
                    >
                    <button
                      class="server-action-btn cancel"
                      onclick={() => {
                        newModelMode = false;
                        newModelUrl = "";
                        newModelProgress = null;
                        newModelError = null;
                      }}
                      title="Cancel">✕</button
                    >
                    {#if newModelProgress}
                      <span class="new-model-progress">
                        {newModelProgress.status}
                        {#if typeof newModelProgress.percent === "number"}
                          &nbsp;({newModelProgress.percent}%)
                        {/if}
                      </span>
                    {/if}
                    {#if newModelError}
                      <span class="new-model-error">{newModelError}</span>
                    {/if}
                  </div>
                {:else}
                  <button
                    class="model-card single-line new-model-row"
                    onclick={() => {
                      newModelMode = true;
                      newModelUrl = "";
                      newModelProgress = null;
                      newModelError = null;
                    }}
                    title="Pull new model"
                  >
                    <span class="model-title-display">+ New model</span>
                  </button>
                {/if}
              </div>
            {:else}
              <div class="no-connection">
                <div class="no-connection-icon">🔌</div>
                <span>No connection to Ollama</span>
                <button onclick={loadModels} class="retry-btn-compact"
                  >↻ Retry</button
                >
              </div>
            {/if}
          </div>
        {/if}
      </div>
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
            <div class="avatar">{msg.role === "ai" ? "🤖" : "👤"}</div>
            <div class="message-content">
              <div class="message-header">
                <span class="sender"
                  >{msg.role === "ai"
                    ? msg.metadata?.model || "AI"
                    : "User"}</span
                >
                <span class="time">{msg.time}</span>
              </div>
              <div class="content">{@html app.parseMarkdown(msg.content)}</div>
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
                  {@html app.parseMarkdown(streamingMessage)}
                </div>
              {:else}
                <div class="loading-dots">
                  <span class="dot"></span>
                  <span class="dot"></span>
                  <span class="dot"></span>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      {/if}
    </div>

    <div class="input-area">
      <div class="input-container">
        <textarea
          bind:this={messageTextarea}
          bind:value={message}
          placeholder="Send a Message"
          class="message-input"
          onkeydown={handleKeydown}
          oninput={autoResize}
          disabled={isStreaming}
          rows="1"
        ></textarea>
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
