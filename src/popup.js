// Import utilities and storage
import { debounce, processTemplate, getLightColor } from './utils.js';
import { Storage } from './storage.js';

document.addEventListener("DOMContentLoaded", () => {
    // Cache DOM elements
    const elements = {
        mainView: document.getElementById("mainView"),
        formContainer: document.getElementById("promptFormContainer"),
        addButton: document.getElementById("addPrompt"),
        editButton: document.getElementById("editMode"),
        deleteButton: document.getElementById("deleteMode"),
        saveButton: document.getElementById("savePrompt"),
        closeFormButton: document.getElementById("closeForm"),
        promptTitle: document.getElementById("promptTitle"),
        promptInput: document.getElementById("promptInput"),
        promptList: document.getElementById("promptList"),
        noPromptsMessage: document.getElementById("noPromptsMessage"),
        tagButton: document.getElementById("tagButton"),
        tagOptions: document.getElementById("tagOptions"),
        tagFilterContainer: document.getElementById("tagFilterContainer"),
        formTitle: document.getElementById("formTitle")
    };

    // State
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
                    insertAtCursor(elements.promptInput, `{{${customVar}}}`);
                }
            } else {
                insertAtCursor(elements.promptInput, variable);
            }
        });
    });

    function insertAtCursor(field, text) {
        const start = field.selectionStart;
        const end = field.selectionEnd;
        field.value = field.value.substring(0, start) + text + field.value.substring(end);
        field.focus();
        field.selectionStart = field.selectionEnd = start + text.length;
    }

    // Show/hide form
    function toggleForm(show, isEdit = false) {
        if (show) {
            elements.mainView.classList.add('hidden');
            elements.formContainer.classList.remove('hidden');
            elements.formTitle.textContent = isEdit ? 'Edit Snippet' : 'Add New Snippet';
        } else {
            elements.mainView.classList.remove('hidden');
            elements.formContainer.classList.add('hidden');
            elements.promptTitle.value = '';
            elements.promptInput.value = '';
            selectedTag = '';
            editingIndex = null;
            elements.tagButton.style.backgroundColor = '';
            elements.tagButton.textContent = 'Add a tag?';
        }
    }

    // Create prompt elements using DocumentFragment for better performance
    const createPromptElements = (prompts) => {
        const fragment = document.createDocumentFragment();
        
        const filteredPrompts = activeFilter 
            ? prompts.filter(p => p.color === activeFilter)
            : prompts;

        filteredPrompts.forEach(prompt => {
            const li = document.createElement("li");
            li.className = "prompt-item";
            
            const container = document.createElement("div");
            container.className = "prompt-content";
            if (prompt.color) {
                container.style.backgroundColor = getLightColor(prompt.color);
            }
            
            const processedText = processTemplate(prompt.text);
            container.innerHTML = `
                <strong class="prompt-title">${prompt.title}</strong>
                <span class="prompt-text">${processedText}</span>
            `;
            
            li.appendChild(container);
            
            if (isDeleteMode) {
                const deleteIcon = document.createElement("span");
                deleteIcon.textContent = " – ";
                deleteIcon.className = "delete-icon";
                deleteIcon.addEventListener("click", async e => {
                    e.stopPropagation();
                    await Storage.deleteSnippet(prompt);
                    loadPrompts();
                });
                li.appendChild(deleteIcon);
            } else if (isEditMode) {
                li.addEventListener("click", () => {
                    editingIndex = prompts.findIndex(p => 
                        p.title === prompt.title && p.text === prompt.text
                    );
                    elements.promptTitle.value = prompt.title;
                    elements.promptInput.value = prompt.text;
                    selectedTag = prompt.color || "";
                    if (selectedTag) {
                        elements.tagButton.style.backgroundColor = getLightColor(selectedTag);
                        elements.tagButton.textContent = "";
                    } else {
                        elements.tagButton.style.backgroundColor = "";
                        elements.tagButton.textContent = "Add a tag?";
                    }
                    toggleForm(true, true);
                });
            } else {
                li.addEventListener("click", () => {
                    const processedText = processTemplate(prompt.text);
                    navigator.clipboard.writeText(processedText);
                    li.classList.add("copied");
                    setTimeout(() => li.classList.remove("copied"), 300);
                });
            }
            
            fragment.appendChild(li);
        });

        return fragment;
    };

    // Load and display prompts
    const loadPrompts = async () => {
        const prompts = await Storage.getSnippets();
        
        // Clear and update in one batch
        while (elements.promptList.firstChild) {
            elements.promptList.firstChild.remove();
        }
        
        const fragment = createPromptElements(prompts);
        elements.promptList.appendChild(fragment);
        
        // Update UI state
        elements.noPromptsMessage.style.display = 
            prompts.length ? "none" : "block";
        
        // Update tag filter
        const tags = new Set(prompts.map(p => p.color).filter(Boolean));
        updateTagFilter(tags);
    };

    function updateTagFilter(tags) {
        elements.tagFilterContainer.innerHTML = '';
        if (tags.size) {
            const allButton = document.createElement('button');
            allButton.className = `btn tag-filter-btn ${!activeFilter ? 'active' : ''}`;
            allButton.textContent = 'All';
            allButton.addEventListener('click', () => {
                activeFilter = '';
                document.querySelectorAll('.tag-filter-btn')
                    .forEach(btn => btn.classList.remove('active'));
                allButton.classList.add('active');
                loadPrompts();
            });
            elements.tagFilterContainer.appendChild(allButton);

            tags.forEach(color => {
                const button = document.createElement('button');
                button.className = `btn tag-filter-btn ${color === activeFilter ? 'active' : ''}`;
                button.style.backgroundColor = getLightColor(color);
                button.addEventListener('click', () => {
                    activeFilter = activeFilter === color ? '' : color;
                    document.querySelectorAll('.tag-filter-btn')
                        .forEach(btn => btn.classList.remove('active'));
                    if (activeFilter) button.classList.add('active');
                    loadPrompts();
                });
                elements.tagFilterContainer.appendChild(button);
            });
        }
    }

    // Event Listeners
    elements.addButton.addEventListener("click", () => {
        isEditMode = false;
        toggleForm(true);
    });

    elements.closeFormButton.addEventListener("click", () => {
        toggleForm(false);
    });

    elements.editButton.addEventListener("click", () => {
        isEditMode = !isEditMode;
        isDeleteMode = false;
        elements.editButton.classList.toggle("active");
        elements.deleteButton.classList.remove("active");
        loadPrompts();
    });

    elements.deleteButton.addEventListener("click", () => {
        isDeleteMode = !isDeleteMode;
        isEditMode = false;
        elements.deleteButton.classList.toggle("active");
        elements.editButton.classList.remove("active");
        loadPrompts();
    });

    elements.tagButton.addEventListener("click", () => {
        elements.tagOptions.classList.toggle("hidden");
    });

    document.querySelectorAll(".tag-option").forEach(option => {
        option.addEventListener("click", () => {
            selectedTag = option.dataset.color;
            elements.tagButton.style.backgroundColor = getLightColor(selectedTag);
            elements.tagButton.textContent = "";
            elements.tagOptions.classList.add("hidden");
        });
    });

    elements.saveButton.addEventListener("click", async () => {
        const title = elements.promptTitle.value.trim();
        const text = elements.promptInput.value.trim();
        
        if (!title || !text) {
            alert("Please fill in both title and content.");
            return;
        }

        const snippet = { title, text, color: selectedTag };
        
        if (editingIndex !== null) {
            await Storage.updateSnippet(editingIndex, snippet);
        } else {
            await Storage.addSnippet(snippet);
        }

        toggleForm(false);
        loadPrompts();
    });

    // Initial load
    loadPrompts();
});
