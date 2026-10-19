document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");
  const fileNameDisplay = document.getElementById("file-name-display");
  const form = document.getElementById("btc-generator-form");
  const generateBtn = document.getElementById("generate-btn");
  const btnText = generateBtn.querySelector(".btn-text");
  const spinner = generateBtn.querySelector(".spinner");

  const previewContainer = document.getElementById("preview-render-container");
  const editorContainer = document.getElementById("editor-container");
  const markdownEditor = document.getElementById("markdown-editor");
  const viewModeBtn = document.getElementById("view-mode-btn");
  const editModeBtn = document.getElementById("edit-mode-btn");
  const downloadDocxBtn = document.getElementById("download-docx-btn");

  let currentMarkdown = "";

  // 1. Tab Switching
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      tabContents.forEach(tc => tc.classList.remove("active"));

      btn.classList.add("active");
      const targetId = btn.getAttribute("data-tab");
      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.classList.add("active");
      }
    });
  });

  // 2. Drag & Drop File Handling
  if (dropzone && fileInput) {
    dropzone.addEventListener("click", () => fileInput.click());

    ["dragenter", "dragover"].forEach(eventName => {
      dropzone.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add("dragover");
      });
    });

    ["dragleave", "drop"].forEach(eventName => {
      dropzone.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove("dragover");
      });
    });

    dropzone.addEventListener("drop", e => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        fileInput.files = files;
        updateFileDisplay(files[0].name);
      }
    });

    fileInput.addEventListener("change", () => {
      if (fileInput.files.length > 0) {
        updateFileDisplay(fileInput.files[0].name);
      }
    });
  }

  function updateFileDisplay(name) {
    fileNameDisplay.textContent = `Selected: ${name}`;
  }

  // 3. Render Markdown & LaTeX equations with KaTeX
  function renderContent(md) {
    currentMarkdown = md;
    markdownEditor.value = md;

    if (!md.trim()) {
      previewContainer.innerHTML = `
        <div class="placeholder-state">
          <div class="placeholder-icon">📐</div>
          <h4>No Lesson Generated Yet</h4>
          <p>Fill out the topic or upload a worksheet on the left, then click <strong>Generate BTC Lesson Packet</strong>.</p>
        </div>`;
      downloadDocxBtn.disabled = true;
      return;
    }

    // Parse Markdown to HTML
    const rawHtml = marked.parse(md);
    previewContainer.innerHTML = rawHtml;

    // Render LaTeX equations via KaTeX auto-render
    if (window.renderMathInElement) {
      window.renderMathInElement(previewContainer, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\[", right: "\\]", display: true },
          { left: "\\(", right: "\\)", display: false }
        ],
        throwOnError: false
      });
    }

    downloadDocxBtn.disabled = false;
  }

  // Synchronize when editing raw markdown
  markdownEditor.addEventListener("input", () => {
    currentMarkdown = markdownEditor.value;
    const rawHtml = marked.parse(currentMarkdown);
    previewContainer.innerHTML = rawHtml;
    if (window.renderMathInElement) {
      window.renderMathInElement(previewContainer, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\[", right: "\\]", display: true },
          { left: "\\(", right: "\\)", display: false }
        ],
        throwOnError: false
      });
    }
  });

  // 4. View / Edit Mode Toggles
  viewModeBtn.addEventListener("click", () => {
    viewModeBtn.classList.add("active");
    editModeBtn.classList.remove("active");
    previewContainer.classList.remove("hidden");
    editorContainer.classList.add("hidden");
  });

  editModeBtn.addEventListener("click", () => {
    editModeBtn.classList.add("active");
    viewModeBtn.classList.remove("active");
    previewContainer.classList.add("hidden");
    editorContainer.classList.remove("hidden");
  });

  // 5. Submit Form to /btc/generate
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);

    // Validate input
    const promptVal = formData.get("prompt")?.trim();
    const fileVal = fileInput.files[0];

    if (!promptVal && !fileVal) {
      alert("Please enter a lesson prompt or choose a file to upload.");
      return;
    }

    // Set UI loading state
    generateBtn.disabled = true;
    btnText.textContent = "Generating Lesson Packet...";
    spinner.classList.remove("hidden");

    try {
      const response = await fetch("/btc/generate", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      renderContent(data.markdown);

      // Default back to rendered view if previously in edit mode
      viewModeBtn.click();
    } catch (err) {
      alert(`Error generating lesson: ${err.message}`);
    } finally {
      generateBtn.disabled = false;
      btnText.textContent = "⚡ Generate BTC Lesson Packet";
      spinner.classList.add("hidden");
    }
  });

  // 6. Download .docx via Pandoc
  downloadDocxBtn.addEventListener("click", async () => {
    const markdownToSend = currentMarkdown || markdownEditor.value;
    if (!markdownToSend.trim()) return;

    downloadDocxBtn.disabled = true;
    const originalText = downloadDocxBtn.innerHTML;
    downloadDocxBtn.innerHTML = `<span>Exporting .docx...</span>`;

    try {
      const response = await fetch("/btc/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: markdownToSend })
      });

      if (!response.ok) {
        const errorJson = await response.json();
        throw new Error(errorJson.error || "DOCX generation failed");
      }

      // Convert response blob to downloadable file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = "BTC_Lesson_Output.docx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      downloadDocxBtn.disabled = false;
      downloadDocxBtn.innerHTML = originalText;
    }
  });
});
