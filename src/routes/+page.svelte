<script>
  let selectedChat = "explain this code";
  let message = "";
  let selectedModel = "gpt-4";

  const allowedModels = [
    "gpt-4",
    "gpt-3.5-turbo",
    "claude-3-opus",
    "claude-3-sonnet",
    "gemini-pro",
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
      role: "ai",
      content:
        "This Svelte code sets up a markdown editor with HTML sanitization using DOMPurify. Here's a breakdown:",
      time: "Today at 4:03 PM",
    },
  ];
</script>

<div class="app">
  <aside class="sidebar">
    <div class="sidebar-header">
      <button class="menu-btn">☰</button>
      <button class="new-chat-btn">New Chat</button>
      <button class="edit-btn">✎</button>
    </div>

    <div class="search-section">
      <div class="search-item">🔍 Search</div>
      <div class="search-item">📝 Notes</div>
      <div class="search-item">💼 Workspace</div>
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
  </aside>

  <main class="main-content">
    <div class="chat-header">
      <select class="model-select" bind:value={selectedModel}>
        {#each allowedModels as model}
          <option value={model}>{model}</option>
        {/each}
      </select>
      <div class="header-actions">
        <button>⋯</button>
        <button>☰</button>
      </div>
    </div>

    <div class="messages">
      {#each messages as msg}
        <div class="message ai-message">
          <div class="avatar">🤖</div>
          <div class="message-content">
            <div class="message-header">
              <span class="sender">{selectedModel}</span>
              >
              <span class="time">{msg.time}</span>
            </div>
            <div class="thinking">Thought for 4 seconds ⌄</div>
            <div class="content">{msg.content}</div>
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

  .search-section {
    padding: 16px 12px;
    border-bottom: 1px solid #333;
  }

  .search-item {
    padding: 8px 12px;
    margin: 2px 0;
    border-radius: 6px;
    cursor: pointer;
  }

  .search-item:hover {
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
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    border-bottom: 1px solid #333;
  }

  .model-name {
    font-weight: 500;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .header-actions button {
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    padding: 4px;
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

  .input-area {
    padding: 20px;
    border-top: 1px solid #333;
  }

  .input-container {
    display: flex;
    align-items: center;
    gap: 12px;
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
</style>
