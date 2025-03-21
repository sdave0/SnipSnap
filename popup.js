document.addEventListener("DOMContentLoaded", () => {
  const addButton = document.getElementById("addPrompt");
  const editButton = document.getElementById("editMode");
  const deleteButton = document.getElementById("deleteMode");
  const saveButton = document.getElementById("savePrompt");
  const promptTitle = document.getElementById("promptTitle");
  const promptInput = document.getElementById("promptInput");
  const promptList = document.getElementById("promptList");
  const promptFormContainer = document.getElementById("promptFormContainer");
  const noPromptsMessage = document.getElementById("noPromptsMessage");
  const tagButton = document.getElementById("tagButton");
  const tagOptions = document.getElementById("tagOptions");
  const tagFilterContainer = document.getElementById("tagFilterContainer");

  let isDeleteMode = false;
  let isEditMode = false;
  let editingIndex = null; // index of the prompt being edited (from the full list)
  let selectedTag = "";      // For saving prompt tag selection
  let activeFilter = "";     // For filtering prompts

  // Updated function: return a background that's roughly 30% lighter than the base tone
  // New posh muted colors for tags
  const getLightColor = color => {
    const colors = {
      red: "#D4A5A5",    // muted rose
      blue: "#A3BFD9",   // muted blue-gray
      green: "#A5D4B5",  // muted green
      yellow: "#D9D4A5"  // muted mustard
    };
    return colors[color] || "";
  };

  // Load prompts from storage and update the list and tag filter
  const loadPrompts = () => {
    chrome.storage.local.get(["prompts"], result => {
      const prompts = result.prompts || [];
      promptList.innerHTML = "";

      // Build set of tag colors that exist (non-empty) in prompts.
      const tagSet = new Set();
      prompts.forEach(p => {
        if (p.color) tagSet.add(p.color);
      });
      updateTagFilter(Array.from(tagSet));

      // Filter prompts if a filter is active
      const filteredPrompts = activeFilter 
        ? prompts.filter(p => p.color === activeFilter)
        : prompts;

      noPromptsMessage.style.display = filteredPrompts.length ? "none" : "block";
      filteredPrompts.forEach((prompt, index) => {
        const { title, text, color } = prompt;
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
        
        // In delete mode, show delete icon.
        if (isDeleteMode) {
          const deleteIcon = document.createElement("span");
          deleteIcon.textContent = " – ";
          deleteIcon.className = "delete-icon";
          deleteIcon.addEventListener("click", e => {
            e.stopPropagation();
            // Map filtered index back to actual index in full list.
            deletePrompt(prompt);
          });
          li.appendChild(deleteIcon);
        } else if (isEditMode) {
          // In edit mode, clicking a prompt loads it into the form for editing.
          li.addEventListener("click", () => {
            editingIndex = prompts.findIndex(p => p.title === title && p.text === text);
            promptTitle.value = title;
            promptInput.value = text;
            selectedTag = color || "";
            // Update tag button appearance based on the selected tag.
            if (selectedTag) {
              tagButton.style.backgroundColor = selectedTag;
              tagButton.textContent = "";
            } else {
              tagButton.style.backgroundColor = "";
              tagButton.textContent = "Add a tag?";
            }
            // Show the form (if not already visible)
            if (promptFormContainer.classList.contains("hidden")) {
              promptFormContainer.classList.remove("hidden");
            }
          });
        } else {
          // In normal mode, clicking copies the text.
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

  // Delete prompt by matching its data
  const deletePrompt = promptToDelete => {
    chrome.storage.local.get(["prompts"], result => {
      let prompts = result.prompts || [];
      const actualIndex = prompts.findIndex(p => p.title === promptToDelete.title && p.text === promptToDelete.text);
      if (actualIndex > -1) {
        prompts.splice(actualIndex, 1);
        chrome.storage.local.set({ prompts }, loadPrompts);
      }
    });
  };

  // Update tag filter buttons based on available tags in prompts
  const updateTagFilter = (tags) => {
    tagFilterContainer.innerHTML = "";
    tags.forEach(tag => {
      const btn = document.createElement("button");
      btn.className = "tag-filter-btn";
      btn.style.backgroundColor = getLightColor(tag);
      btn.title = tag;
      if (activeFilter === tag) {
        btn.style.border = "2px solid black";
      }
      btn.addEventListener("click", () => {
        activeFilter = activeFilter === tag ? "" : tag;
        loadPrompts();
      });
      tagFilterContainer.appendChild(btn);
    });
  };

  addButton.addEventListener("click", () => {
    // When adding a new prompt, exit edit mode.
    isEditMode = false;
    editingIndex = null;
    editButton.style.backgroundColor = "";
    promptFormContainer.classList.toggle("hidden");
    if (!promptFormContainer.classList.contains("hidden")) {
      promptTitle.focus();
      // Clear the form for new input.
      promptTitle.value = "";
      promptInput.value = "";
      selectedTag = "";
      tagButton.style.backgroundColor = "";
      tagButton.textContent = "Add a tag?";
    }
  });

  deleteButton.addEventListener("click", () => {
    // Exit edit mode when switching to delete mode.
    isEditMode = false;
    editButton.style.backgroundColor = "";
    editingIndex = null;
    isDeleteMode = !isDeleteMode;
    deleteButton.textContent = isDeleteMode ? "×" : "–";
    loadPrompts();
  });

  editButton.addEventListener("click", () => {
    // Toggle edit mode. When enabled, disable delete mode.
    isEditMode = !isEditMode;
    if (isEditMode) {
      isDeleteMode = false;
      deleteButton.textContent = "–";
      // Highlight the edit button to indicate active mode.
      editButton.style.backgroundColor = varAccent();
    } else {
      editButton.style.backgroundColor = "";
      editingIndex = null;
    }
    loadPrompts();
  });

  // Helper to get a slightly different accent shade for active mode.
  const varAccent = () => {
    // For example, darken the accent a bit.
    return "#555555";
  };

  // Toggle tag options when clicking the "Add a tag?" button
  tagButton.addEventListener("click", () => {
    tagOptions.classList.toggle("hidden");
  });

  // When a tag option is clicked, set the selected tag
  Array.from(tagOptions.children).forEach(option => {
    option.addEventListener("click", () => {
      selectedTag = option.getAttribute("data-color");
      tagButton.style.backgroundColor = selectedTag;
      tagButton.textContent = "";
      tagOptions.classList.add("hidden");
    });
  });

  saveButton.addEventListener("click", () => {
    const title = promptTitle.value.trim();
    const text = promptInput.value.trim();
    const color = selectedTag;
    if (!title || !text) return;
    
    chrome.storage.local.get(["prompts"], result => {
      let prompts = result.prompts || [];
      if (isEditMode && editingIndex !== null) {
        // Update the existing prompt.
        prompts[editingIndex] = { title, text, color };
        // Exit edit mode after update.
        isEditMode = false;
        editingIndex = null;
        editButton.style.backgroundColor = "";
      } else {
        // Add a new prompt.
        prompts.push({ title, text, color });
      }
      chrome.storage.local.set({ prompts }, () => {
        // Reset form fields and tag selector
        promptTitle.value = "";
        promptInput.value = "";
        selectedTag = "";
        tagButton.style.backgroundColor = "";
        tagButton.textContent = "Add a tag?";
        tagOptions.classList.add("hidden");
        loadPrompts();
      });
    });
    
    promptFormContainer.classList.add("hidden");
  });

  // Ensure form is hidden at startup and load prompts
  promptFormContainer.classList.add("hidden");
  loadPrompts();
});
