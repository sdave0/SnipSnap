document.addEventListener("DOMContentLoaded", () => {
  const addButton = document.getElementById("addPrompt");
  const deleteButton = document.getElementById("deleteMode");
  const saveButton = document.getElementById("savePrompt");
  const promptTitle = document.getElementById("promptTitle");
  const promptInput = document.getElementById("promptInput");
  const promptColor = document.getElementById("promptColor");
  const promptList = document.getElementById("promptList");
  const promptFormContainer = document.getElementById("promptFormContainer");
  const noPromptsMessage = document.getElementById("noPromptsMessage");
  let isDeleteMode = false;

  // Function to return a light background color for a given color value
  const getLightColor = color => {
    const colors = {
      red: "#ffe5e5",
      blue: "#e5f0ff",
      green: "#e5ffe5",
      yellow: "#ffffe5"
    };
    return colors[color] || "";
  };

  const loadPrompts = () => {
    chrome.storage.local.get(["prompts"], result => {
      const prompts = result.prompts || [];
      promptList.innerHTML = "";
      noPromptsMessage.style.display = prompts.length ? "none" : "block";
      prompts.forEach(({ title, text, color }, index) => {
        const li = document.createElement("li");
        li.className = "prompt-item";
        // Create container for prompt content with optional background color
        const container = document.createElement("div");
        container.className = "prompt-content";
        if (color) {
          container.style.backgroundColor = getLightColor(color);
        }
        container.innerHTML = `<strong class="prompt-title">${title}</strong>
                               <span class="prompt-text">${text}</span>`;
        li.appendChild(container);
        
        if (isDeleteMode) {
          const deleteIcon = document.createElement("span");
          deleteIcon.textContent = " – ";
          deleteIcon.className = "delete-icon";
          deleteIcon.addEventListener("click", e => {
            e.stopPropagation();
            deletePrompt(index);
          });
          li.appendChild(deleteIcon);
        } else {
          li.addEventListener("click", () => {
            navigator.clipboard.writeText(text);
            li.classList.add("copied");
            setTimeout(() => li.classList.remove("copied"), 1000);
          });
        }
        promptList.appendChild(li);
      });
    });
  };

  const deletePrompt = index => {
    chrome.storage.local.get(["prompts"], result => {
      const prompts = result.prompts || [];
      prompts.splice(index, 1);
      chrome.storage.local.set({ prompts }, loadPrompts);
    });
  };

  addButton.addEventListener("click", () => {
    promptFormContainer.classList.toggle("hidden");
    if (!promptFormContainer.classList.contains("hidden")) {
      promptTitle.focus();
    }
  });

  deleteButton.addEventListener("click", () => {
    isDeleteMode = !isDeleteMode;
    deleteButton.textContent = isDeleteMode ? "×" : "–";
    loadPrompts();
  });

  saveButton.addEventListener("click", () => {
    const title = promptTitle.value.trim();
    const text = promptInput.value.trim();
    const color = promptColor.value; // color is optional; if empty, remains white.
    if (!title || !text) return;
    
    chrome.storage.local.get(["prompts"], result => {
      const prompts = result.prompts || [];
      prompts.push({ title, text, color });
      chrome.storage.local.set({ prompts }, loadPrompts);
    });
    
    // Reset form fields and hide form
    promptTitle.value = "";
    promptInput.value = "";
    promptColor.value = "";
    promptFormContainer.classList.add("hidden");
  });

  // Ensure form is hidden at startup and load prompts
  promptFormContainer.classList.add("hidden");
  loadPrompts();
});
