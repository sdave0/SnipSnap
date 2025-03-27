// Storage operations for SnipSnap extension

/**
 * Storage operations for managing snippets
 */
export const Storage = {
    /**
     * Get all snippets from storage
     * @returns {Promise<Array>} Array of snippets
     */
    async getSnippets() {
        return new Promise(resolve => {
            chrome.storage.local.get(['prompts'], result => {
                resolve(result.prompts || []);
            });
        });
    },

    /**
     * Save snippets to storage
     * @param {Array} snippets - Array of snippet objects
     * @returns {Promise} Promise that resolves when save is complete
     */
    async saveSnippets(snippets) {
        return new Promise(resolve => {
            chrome.storage.local.set({ prompts: snippets }, resolve);
        });
    },

    /**
     * Add a new snippet
     * @param {Object} snippet - Snippet object with title, text, and color
     * @returns {Promise<Array>} Updated array of snippets
     */
    async addSnippet(snippet) {
        const snippets = await this.getSnippets();
        snippets.push(snippet);
        await this.saveSnippets(snippets);
        return snippets;
    },

    /**
     * Delete a snippet
     * @param {Object} snippetToDelete - Snippet to delete
     * @returns {Promise<Array>} Updated array of snippets
     */
    async deleteSnippet(snippetToDelete) {
        const snippets = await this.getSnippets();
        const updatedSnippets = snippets.filter(s => 
            s.title !== snippetToDelete.title || s.text !== snippetToDelete.text
        );
        await this.saveSnippets(updatedSnippets);
        return updatedSnippets;
    },

    /**
     * Update a snippet
     * @param {number} index - Index of snippet to update
     * @param {Object} updatedSnippet - New snippet data
     * @returns {Promise<Array>} Updated array of snippets
     */
    async updateSnippet(index, updatedSnippet) {
        const snippets = await this.getSnippets();
        snippets[index] = updatedSnippet;
        await this.saveSnippets(snippets);
        return snippets;
    }
};
