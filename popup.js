document.addEventListener("DOMContentLoaded", () => {
  // UI Elements
  const mainView = document.getElementById("mainView");
  const formContainer = document.getElementById("promptFormContainer");
  const addButton = document.getElementById("addPrompt");
  const editButton = document.getElementById("editMode");
  const deleteButton = document.getElementById("deleteMode");
  const saveButton = document.getElementById("savePrompt");
  const closeFormButton = document.getElementById("closeForm");
  const promptTitle = document.getElementById("promptTitle");
  const promptInput = document.getElementById("promptInput");
  const promptList = document.getElementById("promptList");
  const noPromptsMessage = document.getElementById("noPromptsMessage");
  const tagButton = document.getElementById("tagButton");
  const tagOptions = document.getElementById("tagOptions");
  const tagFilterContainer = document.getElementById("tagFilterContainer");
  const formTitle = document.getElementById("formTitle");

  let isDeleteMode = false;
  let isEditMode = false;
  let editingIndex = null;
  let selectedTag = "";
  let activeFilter = "";

  // Template variable handlers
  const templateVarButtons = document.querySelectorAll('.template-var');
  templateVarButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const variable = btn.dataset.var;
      if (variable === '{{custom}}') {
        const customVar = prompt('Enter variable name:');
        if (customVar) {
          insertAtCursor(promptInput, `{{${customVar}}}`);
        }
      } else {
        insertAtCursor(promptInput, variable);
      }
    });
  });

  function insertAtCursor(field, text) {
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const before = field.value.substring(0, start);
    const after = field.value.substring(end);
    field.value = before + text + after;
    field.focus();
    field.selectionStart = field.selectionEnd = start + text.length;
  }

  // Process template variables in text
  function processTemplate(text) {
    const now = new Date();
    return text.replace(/{{(\w+)}}/g, (match, variable) => {
      switch(variable.toLowerCase()) {
        case 'date':
          return now.toLocaleDateString();
        case 'time':
          return now.toLocaleTimeString();
        default:
          return match; // Keep custom variables as is
      }
    });
  }

  const getLightColor = color => {
    const colors = {
      red: "#e3655b",
      blue: "#BDD9F2",
      green: "#A7C957",
      yellow: "#F2E8CF"
    };
    return colors[color] || "";
  };

  // Show/hide form
  function toggleForm(show, isEdit = false) {
    if (show) {
      mainView.classList.add('hidden');
      formContainer.classList.remove('hidden');
      formTitle.textContent = isEdit ? 'Edit Snippet' : 'Add New Snippet';
    } else {
      mainView.classList.remove('hidden');
      formContainer.classList.add('hidden');
      promptTitle.value = '';
      promptInput.value = '';
      selectedTag = '';
      editingIndex = null;
      tagButton.style.backgroundColor = '';
      tagButton.textContent = 'Add a tag?';
    }
  }

  // Load and display prompts
  const loadPrompts = () => {
    chrome.storage.local.get(["prompts"], result => {
      const prompts = result.prompts || [];
      promptList.innerHTML = "";

      const tagSet = new Set();
      prompts.forEach(p => {
        if (p.color) tagSet.add(p.color);
      });
      updateTagFilter(Array.from(tagSet));

      const filteredPrompts = activeFilter 
        ? prompts.filter(p => p.color === activeFilter)
        : prompts;

      noPromptsMessage.style.display = filteredPrompts.length ? "none" : "block";
      
      // Display all prompts with scrolling
      filteredPrompts.forEach((prompt, index) => {
        const { title, text, color } = prompt;
        const li = document.createElement("li");
        li.className = "prompt-item";
        
        const container = document.createElement("div");
        container.className = "prompt-content";
        if (color) {
          container.style.backgroundColor = getLightColor(color);
        }
        
        const processedText = processTemplate(text);
        container.innerHTML = `
          <strong class="prompt-title">${title}</strong>
          <span class="prompt-text">${processedText}</span>
        `;
        
        li.appendChild(container);
        
        if (isDeleteMode) {
          const deleteIcon = document.createElement("span");
          deleteIcon.textContent = " – ";
          deleteIcon.className = "delete-icon";
          deleteIcon.addEventListener("click", e => {
            e.stopPropagation();
            deletePrompt(prompt);
          });
          li.appendChild(deleteIcon);
        } else if (isEditMode) {
          li.addEventListener("click", () => {
            editingIndex = prompts.findIndex(p => p.title === title && p.text === text);
            promptTitle.value = title;
            promptInput.value = text;
            selectedTag = color || "";
            if (selectedTag) {
              tagButton.style.backgroundColor = getLightColor(selectedTag);
              tagButton.textContent = "";
            } else {
              tagButton.style.backgroundColor = "";
              tagButton.textContent = "Add a tag?";
            }
            toggleForm(true, true);
          });
        } else {
          li.addEventListener("click", () => {
            const processedText = processTemplate(text);
            navigator.clipboard.writeText(processedText);
            li.classList.add("copied");
            setTimeout(() => li.classList.remove("copied"), 300);
          });
        }
        
        promptList.appendChild(li);
      });
    });
  };

  const deletePrompt = promptToDelete => {
    chrome.storage.local.get(["prompts"], result => {
      let prompts = result.prompts || [];
      prompts = prompts.filter(p => 
        p.title !== promptToDelete.title || p.text !== promptToDelete.text
      );
      chrome.storage.local.set({ prompts }, loadPrompts);
    });
  };

  function updateTagFilter(tags) {
    tagFilterContainer.innerHTML = '';
    if (tags.length) {
      const allButton = document.createElement('button');
      allButton.className = `btn tag-filter-btn ${!activeFilter ? 'active' : ''}`;
      allButton.textContent = 'All';
      allButton.addEventListener('click', () => {
        activeFilter = '';
        loadPrompts();
        document.querySelectorAll('.tag-filter-btn').forEach(btn => btn.classList.remove('active'));
        allButton.classList.add('active');
      });
      tagFilterContainer.appendChild(allButton);

      tags.forEach(color => {
        const button = document.createElement('button');
        button.className = `btn tag-filter-btn ${activeFilter === color ? 'active' : ''}`;
        button.style.backgroundColor = getLightColor(color);
        button.addEventListener('click', () => {
          activeFilter = activeFilter === color ? '' : color;
          loadPrompts();
          document.querySelectorAll('.tag-filter-btn').forEach(btn => btn.classList.remove('active'));
          if (activeFilter) button.classList.add('active');
        });
        tagFilterContainer.appendChild(button);
      });
    }
  }

  // Event Listeners
  addButton.addEventListener("click", () => {
    isEditMode = false;
    toggleForm(true);
  });

  closeFormButton.addEventListener("click", () => {
    toggleForm(false);
  });

  editButton.addEventListener("click", () => {
    isEditMode = !isEditMode;
    isDeleteMode = false;
    editButton.classList.toggle("active");
    deleteButton.classList.remove("active");
    loadPrompts();
  });

  deleteButton.addEventListener("click", () => {
    isDeleteMode = !isDeleteMode;
    isEditMode = false;
    deleteButton.classList.toggle("active");
    editButton.classList.remove("active");
    loadPrompts();
  });

  tagButton.addEventListener("click", () => {
    tagOptions.classList.toggle("hidden");
  });

  document.querySelectorAll(".tag-option").forEach(option => {
    option.addEventListener("click", () => {
      selectedTag = option.dataset.color;
      tagButton.style.backgroundColor = getLightColor(selectedTag);
      tagButton.textContent = "";
      tagOptions.classList.add("hidden");
    });
  });

  saveButton.addEventListener("click", () => {
    const title = promptTitle.value.trim();
    const text = promptInput.value.trim();
    
    if (!title || !text) {
      alert("Please fill in both title and content.");
      return;
    }

    chrome.storage.local.get(["prompts"], result => {
      let prompts = result.prompts || [];
      const newPrompt = { title, text, color: selectedTag };
      
      if (editingIndex !== null) {
        prompts[editingIndex] = newPrompt;
      } else {
        prompts.push(newPrompt);
      }
      
      chrome.storage.local.set({ prompts }, () => {
        toggleForm(false);
        loadPrompts();
      });
    });
  });

  // Initial load
  loadPrompts();
});
