class Journal {
    constructor() {
        this.entries = [];
        this.currentFilter = 'recent';
        this.searchQuery = '';
        this.editingEntryId = null;
        this.activeFasts = [];
    }

    async init() {
        console.log('Initializing Journal tab...');

        if (!this.isJournalPage()) {
            console.log('Not on journal page, skipping initialization');
            return;
        }

        try {
            await this.loadEntries();
            await this.loadActiveFasts();
            this.bindEvents();
            this.renderEntries();
            this.populateFastDropdown();
            this.hideForm();
            console.log('✅ Journal tab initialized successfully');
        } catch (error) {
            console.error('❌ Journal initialization failed:', error);
            this.loadDemoEntries();
        }
    }

    isJournalPage() {
        return !!document.getElementById('journalEntriesList');
    }

    bindEvents() {
        console.log('Binding journal events...');

        const saveButton = document.getElementById('saveJournalEntry');
        const filterSelect = document.getElementById('journalFilter');
        const searchInput = document.getElementById('journalSearch');
        const newEntryButton = document.getElementById('newJournalEntry');

        if (saveButton) {
            saveButton.replaceWith(saveButton.cloneNode(true));
            document.getElementById('saveJournalEntry').addEventListener('click', () => this.saveEntry());
        }

        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => this.filterEntries(e.target.value));
        }

        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.searchEntries(e.target.value));
        }

        if (newEntryButton) {
            newEntryButton.addEventListener('click', () => {
                this.clearForm();
                this.showForm();
            });
        }

        this.bindToolbar();

        console.log('Journal events bound successfully');
    }

    bindToolbar() {
        const toolbar = document.querySelector('.journal-editor .richtext-toolbar');
        const content = document.getElementById('journalContent');
        RichTextEditor.bindToolbar(toolbar, content);
    }

    async loadEntries() {
        try {
            const response = await AuthHelper.apiCall('journal/entries.php');
            const entriesArray = response.entries || [];
            const uniqueEntries = Array.from(new Map(
                entriesArray.map(entry => [entry.id, entry])
            ).values());
            this.entries = uniqueEntries;
            console.log('Loaded journal entries:', this.entries.length);
        } catch (error) {
            console.error('Error loading journal entries:', error);
            throw error;
        }
    }

    async loadActiveFasts() {
        try {
            const response = await AuthHelper.apiCall('fasting/active.php');
            this.activeFasts = response.success ? (response.fasts || []) : [];
        } catch (error) {
            console.error('Error loading active fasts:', error);
            this.activeFasts = [];
        }
    }

    populateFastDropdown() {
        const select = document.getElementById('journalFast');
        if (!select) return;

        const currentValue = select.value;
        select.innerHTML = '<option value="">None</option>';

        this.activeFasts.forEach(fast => {
            const option = document.createElement('option');
            option.value = fast.id;
            const startDate = new Date(fast.start_date).toLocaleDateString();
            const endDate = new Date(fast.end_date).toLocaleDateString();
            option.textContent = `${fast.plan_name || 'Custom Fast'} (${startDate} - ${endDate})`;
            select.appendChild(option);
        });

        select.value = currentValue;
    }

    showForm() {
        const editor = document.querySelector('.journal-editor');

        if (!document.getElementById('cancelJournalEntry')) {
            const saveButton = document.getElementById('saveJournalEntry');
            const cancelButton = document.createElement('button');
            cancelButton.type = 'button';
            cancelButton.id = 'cancelJournalEntry';
            cancelButton.className = 'btn btn-secondary';
            cancelButton.innerHTML = '<i class="fas fa-times"></i> Cancel';
            cancelButton.addEventListener('click', () => this.hideForm());

            saveButton.parentNode.insertBefore(cancelButton, saveButton.nextSibling);
        }

        if (editor) {
            editor.style.display = 'block';
            editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        const titleInput = document.getElementById('journalTitle');
        if (titleInput) titleInput.focus();
    }

    hideForm() {
        const editor = document.querySelector('.journal-editor');
        if (editor) editor.style.display = 'none';
        this.clearForm();
    }

    async saveEntry() {
        if (this.editingEntryId) {
            await this.updateEntry(this.editingEntryId);
            return;
        }

        const titleInput = document.getElementById('journalTitle');
        const contentInput = document.getElementById('journalContent');
        const fastInput = document.getElementById('journalFast');

        if (!titleInput || !contentInput) {
            this.showNotification('Journal form elements not found', 'error');
            return;
        }

        const title = titleInput.value.trim();
        const content = RichTextEditor.sanitizeHtml(contentInput.innerHTML);
        const userFastId = fastInput && fastInput.value ? parseInt(fastInput.value) : null;

        if (!title || !RichTextEditor.getPlainText(content)) {
            this.showNotification('Please fill in both title and content', 'error');
            return;
        }

        try {
            const response = await AuthHelper.apiCall('journal/save.php', 'POST', {
                title: title,
                content: content,
                entry_date: new Date().toISOString().split('T')[0],
                user_fast_id: userFastId
            });

            if (response.success) {
                this.showNotification('Journal entry saved successfully', 'success');
                this.hideForm();
                await this.loadEntries();
                this.renderEntries();
            } else {
                this.showNotification(response.message || 'Error saving entry', 'error');
            }
        } catch (error) {
            console.error('Save error:', error);
            this.showNotification('Error saving journal entry', 'error');
        }
    }

    renderEntries() {
        const container = document.getElementById('journalEntriesList');
        if (!container) {
            console.error('Journal entries container not found');
            return;
        }

        const filteredEntries = this.getFilteredEntries();
        console.log('Rendering entries:', filteredEntries.length);

        if (filteredEntries.length === 0) {
            container.innerHTML = `
                <div class="no-data-message">
                    <i class="fas fa-book-open"></i>
                    <p>No journal entries found. Start writing your first entry!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredEntries.map(entry => {
            const plainText = RichTextEditor.getPlainText(entry.content);
            return `
            <div class="journal-entry card" data-entry-id="${entry.id}">
                <div class="card-body">
                    <div class="entry-header">
                        <h4>${RichTextEditor.escapeHtml(entry.title)}</h4>
                        <div class="entry-actions">
                            <button class="btn-icon edit-entry" title="Edit" data-entry-id="${entry.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon delete-entry" title="Delete" data-entry-id="${entry.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="entry-meta">
                        <span class="entry-date">
                            <i class="fas fa-calendar"></i>
                            ${new Date(entry.entry_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </span>
                        <span class="entry-length">
                            <i class="fas fa-file-alt"></i>
                            ${plainText.length} characters
                        </span>
                    </div>
                    <div class="entry-content">
                        ${this.formatContent(entry.content)}
                    </div>
                    ${plainText.length > 200 ? `
                    <div class="entry-footer">
                        <button class="btn btn-outline btn-small read-more" onclick="journal.toggleReadMore(this)">
                            Read More
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        }).join('');

        this.bindEntryActions();
    }

    // Toggle Read More / Read Less for long entries
    toggleReadMore(button) {
        const entry = button.closest('.journal-entry');
        const content = entry.querySelector('.entry-content');
        const isExpanded = content.classList.contains('expanded');

        content.classList.toggle('expanded');
        button.textContent = isExpanded ? 'Read More' : 'Read Less';

        // Smooth scroll to maintain reading position
        if (!isExpanded) {
            setTimeout(() => {
                entry.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
    }

    bindEntryActions() {
        // Edit buttons
        document.querySelectorAll('.edit-entry').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const entryId = parseInt(e.currentTarget.getAttribute('data-entry-id'));
                this.editEntry(entryId);
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-entry').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const entryId = parseInt(e.currentTarget.getAttribute('data-entry-id'));
                this.deleteEntry(entryId);
            });
        });
    }

    editEntry(entryId) {
        const entry = this.entries.find(e => e.id === entryId);
        if (entry) {
            const titleInput = document.getElementById('journalTitle');
            const contentInput = document.getElementById('journalContent');
            const fastInput = document.getElementById('journalFast');
            const saveButton = document.getElementById('saveJournalEntry');

            if (titleInput) titleInput.value = entry.title;
            if (contentInput) contentInput.innerHTML = RichTextEditor.contentToHtml(entry.content);
            if (fastInput) fastInput.value = entry.user_fast_id || '';

            this.editingEntryId = entryId;

            if (saveButton) {
                saveButton.innerHTML = '<i class="fas fa-save"></i> Update Entry';
                saveButton.classList.add('editing');
            }

            this.showForm();
            this.showNotification(`Editing: "${entry.title}"`, 'info');
        }
    }

    async updateEntry(entryId) {
        const titleInput = document.getElementById('journalTitle');
        const contentInput = document.getElementById('journalContent');
        const fastInput = document.getElementById('journalFast');

        if (!titleInput || !contentInput) {
            this.showNotification('Form elements not found', 'error');
            return;
        }

        const title = titleInput.value.trim();
        const content = RichTextEditor.sanitizeHtml(contentInput.innerHTML);
        const userFastId = fastInput && fastInput.value ? parseInt(fastInput.value) : null;

        if (!title || !RichTextEditor.getPlainText(content)) {
            this.showNotification('Please fill in both title and content', 'error');
            return;
        }

        try {
            const response = await AuthHelper.apiCall('journal/update.php', 'PUT', {
                id: entryId,
                title: title,
                content: content,
                user_fast_id: userFastId
            });

            if (response.success) {
                this.showNotification('Entry updated successfully', 'success');
                await this.loadEntries();
                this.renderEntries();
                this.hideForm();
            } else {
                this.showNotification(response.message || 'Error updating entry', 'error');
            }
        } catch (error) {
            console.error('Update error:', error);
            this.showNotification('Error updating entry', 'error');
        }
    }

    async deleteEntry(entryId) {
        if (confirm('Are you sure you want to delete this journal entry? This action cannot be undone.')) {
            try {
                const response = await AuthHelper.apiCall(`journal/delete.php?id=${entryId}`, 'DELETE');

                if (response.success) {
                    this.showNotification('Entry deleted successfully', 'success');
                    this.entries = this.entries.filter(entry => entry.id !== entryId);
                    this.renderEntries();
                } else {
                    this.showNotification(response.message || 'Error deleting entry', 'error');
                }
            } catch (error) {
                console.error('Delete error:', error);
                this.showNotification('Error deleting entry', 'error');
            }
        }
    }

    filterEntries(filter) {
        this.currentFilter = filter;
        this.renderEntries();
    }

    searchEntries(query) {
        this.searchQuery = query.toLowerCase();
        this.renderEntries();
    }

    getFilteredEntries() {
        let filtered = [...this.entries];

        if (this.searchQuery) {
            filtered = filtered.filter(entry =>
                entry.title.toLowerCase().includes(this.searchQuery) ||
                RichTextEditor.getPlainText(entry.content).toLowerCase().includes(this.searchQuery)
            );
        }

        if (this.currentFilter === 'recent') {
            filtered.sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date));
        } else if (this.currentFilter === 'oldest') {
            filtered.sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date));
        }

        return filtered;
    }

    clearForm() {
        const titleInput = document.getElementById('journalTitle');
        const contentInput = document.getElementById('journalContent');
        const fastInput = document.getElementById('journalFast');
        const saveButton = document.getElementById('saveJournalEntry');

        if (titleInput) titleInput.value = '';
        if (contentInput) contentInput.innerHTML = '';
        if (fastInput) fastInput.value = '';

        this.editingEntryId = null;

        if (saveButton) {
            saveButton.innerHTML = '<i class="fas fa-save"></i> Save Entry';
            saveButton.classList.remove('editing');
        }

        const cancelButton = document.getElementById('cancelJournalEntry');
        if (cancelButton) {
            cancelButton.remove();
        }

        document.querySelectorAll('.journal-editor .richtext-toolbar .toolbar-btn.active').forEach(btn => {
            btn.classList.remove('active');
        });
    }

    formatContent(content) {
        const html = RichTextEditor.contentToHtml(content);
        const plainText = RichTextEditor.getPlainText(content);

        if (plainText.length > 200) {
            return `
                <div class="content-preview">${RichTextEditor.truncateHtml(html, 200)}...</div>
                <div class="content-full">${html}</div>
            `;
        }

        return html;
    }

    loadDemoEntries() {
        const existingIds = new Set(this.entries.map(entry => entry.id));
        const demoEntries = [
            {
                id: existingIds.has(1) ? Math.max(...existingIds) + 1 : 1,
                title: 'My First Fasting Experience',
                content: 'Today I started my first fast. It was challenging but rewarding. I felt closer to God throughout the day. The hunger pangs reminded me to pray and focus on spiritual nourishment rather than physical sustenance.',
                entry_date: new Date().toISOString().split('T')[0]
            },
            {
                id: existingIds.has(2) ? Math.max(...existingIds) + 2 : 2,
                title: 'Spiritual Breakthrough',
                content: 'During my prayer time today, I experienced a significant breakthrough. The scripture from Isaiah 40:31 really spoke to me.\n\n"but those who hope in the LORD will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint."\n\nThis verse gave me the strength to continue my fast with renewed purpose and determination.',
                entry_date: new Date(Date.now() - 86400000).toISOString().split('T')[0]
            }
        ].filter(entry => !existingIds.has(entry.id));

        this.entries = [...this.entries, ...demoEntries];
        this.renderEntries();
    }

    showNotification(message, type) {
        if (window.app && window.app.showGlobalNotification) {
            window.app.showGlobalNotification(message, type);
        } else {
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Make journal instance globally available
const journal = new Journal();
