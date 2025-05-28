<script>
  import { onMount } from "svelte";

  let { content = $bindable(""), markdownHelper } = $props();

  let container = $state();
  let lastRenderedLength = $state(0);
  let lastParsedContent = $state("");

  function renderContent() {
    if (!container || !content) return;

    // Only update if content has actually changed
    if (content === lastParsedContent) return;

    // If content is shorter than last time (new message), reset
    if (content.length < lastRenderedLength) {
      container.innerHTML = "";
      lastRenderedLength = 0;
    }

    // If we have new content to add
    if (content.length > lastRenderedLength) {
      const newContent = content.slice(lastRenderedLength);
      const fullParsed = markdownHelper.parse(content);

      // For incremental updates, we need to replace the entire content
      // but preserve scroll position and avoid flickering
      const scrollParent = container.closest(".messages");
      const wasAtBottom = scrollParent
        ? scrollParent.scrollTop + scrollParent.clientHeight >=
          scrollParent.scrollHeight - 1
        : false;

      container.innerHTML = fullParsed;

      // Highlight any new code blocks
      const codeBlocks = container.querySelectorAll(
        "pre code:not([data-highlighted])"
      );
      codeBlocks.forEach((block) => {
        markdownHelper.highlightElement(block);
        block.setAttribute("data-highlighted", "true");
      });

      // Maintain scroll position if user was at bottom
      if (wasAtBottom && scrollParent) {
        scrollParent.scrollTop = scrollParent.scrollHeight;
      }
    }

    lastRenderedLength = content.length;
    lastParsedContent = content;
  }

  onMount(() => {
    renderContent();
  });

  $effect(() => {
    renderContent();
    console.log("IncrementalMarkdown content updated:", content);
  });
</script>

<div bind:this={container} class="incremental-markdown"></div>

<style>
  .incremental-markdown {
    /* Inherit styles from parent */
    width: 100%;
  }
</style>
