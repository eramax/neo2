<script>
  import { Markdown } from "svelte-exmarkdown";
  import { gfmPlugin } from "svelte-exmarkdown/gfm";
  const plugins = [gfmPlugin()];
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
      role: "ai",
      content: `This Svelte code sets up a markdown editor with HTML sanitization using DOMPurify. Here's a breakdown:

\`\`\`javascript
// Example code block
function sanitizeHTML(html) {
  return DOMPurify.sanitize(html);
}
\`\`\`

The code includes:
- **Markdown parsing** with \`svelte-exmarkdown\`
- **Syntax highlighting** for code blocks
- **Security** through HTML sanitization`,
      time: "Today at 4:03 PM",
    },
  ];

  function selectModel(modelId) {
    selectedModel = modelId;
    showModelSelector = false;
  }

  let currentModel = $derived(
    allowedModels.find((m) => m.id === selectedModel) || allowedModels[0]
  );
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
              <span class="sender">{selectedModel}</span>
              >
              <span class="time">{msg.time}</span>
            </div>
            <div class="thinking">Thought for 4 seconds ⌄</div>
            <div class="content">
              <Markdown md={msg.content} {plugins} />
            </div>
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
            on:click={() => (showModelSelector = !showModelSelector)}
          >
            <span class="model-icon">{currentModel.icon}</span>
            <span class="chevron" class:open={showModelSelector}>▼</span>
          </button>

          {#if showModelSelector}
            <div class="model-dropdown">
              {#each allowedModels as model}
                <div
                  class="model-card"
                  class:selected={model.id === selectedModel}
                  on:click={() => selectModel(model.id)}
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
                </div>
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

  .content :global(pre) {
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 8px;
    padding: 16px;
    overflow-x: auto;
    margin: 12px 0;
  }

  .content :global(code) {
    background: #2a2a2a;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
    font-size: 13px;
  }

  .content :global(pre code) {
    background: none;
    padding: 0;
  }

  .content :global(h1),
  .content :global(h2),
  .content :global(h3),
  .content :global(h4),
  .content :global(h5),
  .content :global(h6) {
    margin: 16px 0 8px 0;
    color: #fff;
  }

  .content :global(p) {
    margin: 8px 0;
  }

  .content :global(ul),
  .content :global(ol) {
    margin: 8px 0;
    padding-left: 20px;
  }

  .content :global(blockquote) {
    border-left: 4px solid #007acc;
    padding-left: 16px;
    margin: 12px 0;
    color: #ccc;
  }

  .content :global(strong) {
    color: #fff;
    font-weight: 600;
  }

  .content :global(em) {
    color: #ccc;
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
</style>
