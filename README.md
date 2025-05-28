---
title: Neo2 Chat
emoji: 🤖
colorFrom: blue
colorTo: purple
sdk: static
pinned: false
---

# Neo2 Chat

A modern chat interface for LLM models built with Svelte 5. This application provides a clean, responsive interface for chatting with various language models through Ollama.

## Features

- 💬 Real-time streaming chat interface
- 🎨 Modern, responsive design
- 🔄 Multiple model support via Ollama
- 📝 Markdown rendering with syntax highlighting
- 💾 Chat history management
- 📱 Mobile-friendly interface

## Usage

This Space hosts a Svelte application that connects to Ollama for language model inference. The interface allows you to:

1. Select from available models
2. Start new conversations
3. View chat history
4. Copy code snippets
5. Stream responses in real-time

## Technical Stack

- **Frontend**: Svelte 5
- **Styling**: SCSS
- **Markdown**: marked.js
- **Syntax Highlighting**: highlight.js
- **LLM Backend**: Ollama
- **Deployment**: Static hosting on Hugging Face Spaces

## Development

```bash
bun i
bun dev
```

## Build

```bash
bun run build
```

The built files will be in the `build` directory, which Hugging Face Spaces will serve automatically.
