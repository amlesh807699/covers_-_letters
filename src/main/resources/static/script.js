const form = document.getElementById("coverLetterForm");
const fieldIds = ["name", "email", "role", "company", "skills", "description", "experience"];
const fields = Object.fromEntries(fieldIds.map((id) => [id, document.getElementById(id)]));
const resumeInput = document.getElementById("resumeInput");
const dropzone = document.getElementById("dropzone");
const fileRow = document.getElementById("fileRow");
const fileName = document.getElementById("fileName");
const removeFileButton = document.getElementById("removeFileButton");
const generateButton = document.getElementById("generateButton");
const templateButton = document.getElementById("templateButton");
const copyButton = document.getElementById("copyButton");
const regenerateButton = document.getElementById("regenerateButton");
const clearLetterButton = document.getElementById("clearLetterButton");
const clearDetailsButton = document.getElementById("clearDetails");
const paper = document.getElementById("paper");
const statusBadge = document.getElementById("status");
const letterMeta = document.getElementById("letterMeta");
const toast = document.getElementById("toast");
const toneButtons = [...document.querySelectorAll("[data-tone]")];

let selectedTone = "Professional";
let selectedFile = null;
let currentLetter = "";
let variation = 0;
let busy = false;
let toastTimer = null;

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 3800);
}

function setStatus(label, isError = false) {
  statusBadge.textContent = label;
  statusBadge.classList.toggle("error", isError);
}

function setBusy(value) {
  busy = value;
  generateButton.disabled = value;
  templateButton.disabled = value;
  regenerateButton.disabled = value || !currentLetter;
  generateButton.innerHTML = value
    ? '<span class="loader" aria-hidden="true"></span> Generating…'
    : '<span aria-hidden="true">✦</span> Generate with Gemini';
  paper.setAttribute("aria-busy", String(value));
}

function getFormData() {
  return Object.fromEntries(fieldIds.map((id) => [id, fields[id].value.trim()]));
}

function validateForm() {
  const data = getFormData();
  for (const id of ["name", "role", "company", "skills"]) {
    if (!data[id]) {
      fields[id].focus();
      showToast(`Please fill in ${id === "name" ? "your full name" : id === "role" ? "the target role" : id === "company" ? "the company" : "your skills"}.`, true);
      return false;
    }
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    fields.email.focus();
    showToast("Please enter a valid email address, or leave it blank.", true);
    return false;
  }
  return true;
}

function clearPaper() {
  paper.replaceChildren();
  const empty = document.createElement("div");
  empty.className = "empty-state";
  const icon = document.createElement("div");
  icon.className = "empty-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "✧";
  const heading = document.createElement("h3");
  heading.textContent = "Your next chapter begins here.";
  const paragraph = document.createElement("p");
  paragraph.textContent = "Fill in your details, then generate your first cover letter. Your draft will appear here for review.";
  const list = document.createElement("ul");
  ["Tailored to your target role", "Built around your real skills", "Easy to copy and edit"].forEach((label) => {
    const item = document.createElement("li");
    item.textContent = label;
    list.append(item);
  });
  empty.append(icon, heading, paragraph, list);
  paper.append(empty);
  currentLetter = "";
  copyButton.disabled = true;
  regenerateButton.disabled = true;
  letterMeta.textContent = "Your draft will appear here";
  setStatus("Ready");
}

function showLoading() {
  paper.replaceChildren();
  const state = document.createElement("div");
  state.className = "empty-state";
  const spinner = document.createElement("div");
  spinner.className = "empty-icon";
  spinner.textContent = "…";
  const heading = document.createElement("h3");
  heading.textContent = "Crafting your letter";
  const paragraph = document.createElement("p");
  paragraph.textContent = "Reviewing your details and preparing a tailored draft. This may take a few seconds.";
  state.append(spinner, heading, paragraph);
  paper.append(state);
  setStatus("Working…");
}

function appendInlineMarkdown(parent, text) {
  // Minimal, DOM-based formatting. Text is never assigned to innerHTML.
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) parent.append(document.createTextNode(text.slice(last, index)));
    const token = match[0];
    if (token.startsWith("**")) {
      const strong = document.createElement("strong");
      strong.textContent = token.slice(2, -2);
      parent.append(strong);
    } else if (token.startsWith("*")) {
      const em = document.createElement("em");
      em.textContent = token.slice(1, -1);
      parent.append(em);
    } else if (token.startsWith("`")) {
      const code = document.createElement("code");
      code.textContent = token.slice(1, -1);
      parent.append(code);
    } else {
      const parsed = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
      if (parsed) {
        try {
          const url = new URL(parsed[2]);
          if (url.protocol === "https:" || url.protocol === "http:") {
            const anchor = document.createElement("a");
            anchor.textContent = parsed[1];
            anchor.href = url.href;
            anchor.target = "_blank";
            anchor.rel = "noopener noreferrer";
            parent.append(anchor);
          } else parent.append(document.createTextNode(token));
        } catch {
          parent.append(document.createTextNode(token));
        }
      } else parent.append(document.createTextNode(token));
    }
    last = index + token.length;
  }
  if (last < text.length) parent.append(document.createTextNode(text.slice(last)));
}

function renderLetter(letter, usedResume = false, source = "AI") {
  currentLetter = letter.trim();
  paper.replaceChildren();
  const content = document.createElement("div");
  content.className = "letter-content";
  // Render paragraphs and common Markdown blocks safely with DOM APIs.
  const normalized = currentLetter.replace(/\r\n?/g, "\n").trim();
  const blocks = normalized.split(/\n\s*\n/).filter(Boolean);
  for (const block of blocks) {
    const lines = block.split("\n");
    const isList = lines.every((line) => /^\s*[-*]\s+/.test(line));
    if (isList) {
      const ul = document.createElement("ul");
      lines.forEach((line) => {
        const li = document.createElement("li");
        appendInlineMarkdown(li, line.replace(/^\s*[-*]\s+/, ""));
        ul.append(li);
      });
      content.append(ul);
    } else if (/^#{1,3}\s+/.test(lines[0])) {
      const heading = document.createElement("h3");
      appendInlineMarkdown(heading, lines[0].replace(/^#{1,3}\s+/, ""));
      content.append(heading);
      if (lines.length > 1) {
        const p = document.createElement("p");
        appendInlineMarkdown(p, lines.slice(1).join("\n"));
        content.append(p);
      }
    } else {
      const p = document.createElement("p");
      appendInlineMarkdown(p, block);
      content.append(p);
    }
  }
  paper.append(content);
  copyButton.disabled = false;
  regenerateButton.disabled = false;
  letterMeta.textContent = `${source} draft${usedResume ? " · Resume text used" : ""} · ${currentLetter.split(/\s+/).filter(Boolean).length} words`;
  setStatus("Draft ready");
}

function showError(message) {
  paper.replaceChildren();
  const errorBox = document.createElement("p");
  errorBox.className = "letter-error";
  errorBox.textContent = message;
  paper.append(errorBox);
  const retry = document.createElement("p");
  retry.className = "letter-content";
  retry.textContent = "Check the form and server, then try again. Your details remain in the form.";
  paper.append(retry);
  setStatus("Needs attention", true);
}

function setSelectedFile(file) {
  if (!file) {
    selectedFile = null;
    resumeInput.value = "";
    fileRow.hidden = true;
    fileName.textContent = "";
    dropzone.hidden = false;
    return;
  }
  if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
    showToast("Please choose a PDF file.", true);
    resumeInput.value = "";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast("Your PDF must be 5 MB or smaller.", true);
    resumeInput.value = "";
    return;
  }
  selectedFile = file;
  fileName.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
  fileRow.hidden = false;
  dropzone.hidden = true;
}

function buildTemplate(data) {
  const intro = `Dear Hiring Manager,\n\nI am writing to express my interest in the ${data.role} position at ${data.company}. I am excited about the opportunity to contribute my skills and continue growing as part of your team.`;
  const skillParagraph = `My relevant skills include ${data.skills}. ${data.experience ? `Through my experience and projects, ${data.experience.replace(/[.!?]+$/, "")}.` : "I am committed to applying these skills thoughtfully, learning quickly, and delivering reliable work."}`;
  const roleParagraph = data.description
    ? `After reviewing the job description you shared, I am particularly interested in the role's focus on ${data.description.slice(0, 300).replace(/\s+/g, " ").replace(/[.!?]+$/, "")}. I would welcome the chance to discuss how my background aligns with your needs.`
    : `I would welcome the opportunity to learn more about your team's priorities and discuss how my skills and motivation could support ${data.company}.`;
  const closing = `Thank you for your time and consideration. I look forward to the possibility of speaking with you.\n\nSincerely,\n${data.name}${data.email ? `\n${data.email}` : ""}`;
  return [intro, skillParagraph, roleParagraph, closing].join("\n\n");
}

async function requestGeneration(useResume) {
  if (!validateForm() || busy) return;
  const data = getFormData();
  const payload = { ...data, tone: selectedTone, variation };
  setBusy(true);
  showLoading();
  try {
    let response;
    if (useResume && selectedFile) {
      const body = new FormData();
      Object.entries(payload).forEach(([key, value]) => body.append(key, String(value)));
      body.append("resume", selectedFile);
      response = await fetch("/api/generate-with-resume", { method: "POST", body });
    } else {
      response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Could not generate your cover letter.");
    if (typeof result.letter !== "string" || !result.letter.trim()) {
      throw new Error("The AI response was empty. Please try again.");
    }
    renderLetter(result.letter, Boolean(result.usedResume), "Gemini AI");
    showToast("Your cover letter is ready. Review it before applying.");
  } catch (error) {
    const message = error instanceof TypeError
      ? "Cannot connect to the server. Run npm start and open http://localhost:3000."
      : (error.message || "Something went wrong. Please try again.");
    showError(message);
    showToast(message, true);
  } finally {
    setBusy(false);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  variation = 0;
  requestGeneration(Boolean(selectedFile));
});

templateButton.addEventListener("click", () => {
  if (!validateForm() || busy) return;
  const letter = buildTemplate({ ...getFormData(), tone: selectedTone });
  renderLetter(letter, false, "Template");
  showToast("Template created. Edit it to make it your own.");
});

regenerateButton.addEventListener("click", () => {
  if (busy) return;
  variation += 1;
  requestGeneration(Boolean(selectedFile));
});

copyButton.addEventListener("click", async () => {
  if (!currentLetter) return;
  try {
    await navigator.clipboard.writeText(currentLetter);
    showToast("Cover letter copied to clipboard.");
  } catch {
    const textArea = document.createElement("textarea");
    textArea.value = currentLetter;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.append(textArea);
    textArea.select();
    const copied = document.execCommand("copy");
    textArea.remove();
    showToast(copied ? "Cover letter copied to clipboard." : "Copy failed. Select and copy the letter manually.", !copied);
  }
});

clearLetterButton.addEventListener("click", () => {
  if (busy) return;
  clearPaper();
  showToast("Preview cleared.");
});

clearDetailsButton.addEventListener("click", () => {
  if (busy) return;
  form.reset();
  selectedTone = "Professional";
  toneButtons.forEach((button) => {
    const active = button.dataset.tone === selectedTone;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  setSelectedFile(null);
  clearPaper();
  showToast("Form details cleared.");
});

toneButtons.forEach((button) => button.addEventListener("click", () => {
  selectedTone = button.dataset.tone;
  toneButtons.forEach((other) => {
    const active = other === button;
    other.classList.toggle("active", active);
    other.setAttribute("aria-pressed", String(active));
  });
}));

resumeInput.addEventListener("change", () => setSelectedFile(resumeInput.files?.[0] || null));
removeFileButton.addEventListener("click", () => setSelectedFile(null));

for (const eventName of ["dragenter", "dragover"]) {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("dragging");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragging");
  });
}
dropzone.addEventListener("drop", (event) => setSelectedFile(event.dataTransfer?.files?.[0] || null));

fetch("/api/health")
  .then((response) => response.ok ? response.json() : null)
  .then((health) => {
    if (health && !health.aiConfigured) {
      showToast("Server is running, but Gemini API key is not configured yet.", true);
    }
  })
  .catch(() => {
    // The page can still render, but generation needs the Express server.
  });
