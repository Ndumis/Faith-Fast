class Prayers {
    constructor() {
        this.prayers = [];
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.editingPrayerId = null;
        this.isFormVisible = false;
        this.eventListenersBound = false; // Track if events are bound
    }

    async init() {
        console.log('Initializing Prayers tab...');
    
        if (!this.isPrayersPage()) {
            console.log('Not on prayers page, skipping initialization');
            return;
        }
        
        try {
            await this.loadPrayers();
            this.bindEvents();
            this.renderPrayers();
            this.hideForm();
            this.createInlineSearchFilter();
            console.log('✅ Prayers tab initialized successfully');
        } catch (error) {
            console.error('❌ Prayers initialization failed:', error);
            this.loadDemoPrayers();
        }
    }

    isPrayersPage() {
        return !!document.getElementById('prayersList');
    }

    // Create inline search and filter controls
    createInlineSearchFilter() {
        const sectionHeader = document.querySelector('.prayers-list .section-header');
        if (!sectionHeader) return;

        // Remove existing filter controls if they exist
        const existingControls = sectionHeader.querySelector('.filter-controls');
        if (existingControls) {
            existingControls.remove();
        }

        // Create new inline controls
        const filterControls = document.createElement('div');
        filterControls.className = 'filter-controls';
        filterControls.innerHTML = `
            <div class="search-filter-container">
                <input type="text" id="prayerSearch" class="form-control" 
                       placeholder="🔍 Search prayers..." value="${this.searchQuery}">
                <select id="prayerFilter" class="form-select">
                    <option value="all" ${this.currentFilter === 'all' ? 'selected' : ''}>All Prayers</option>
                    <option value="active" ${this.currentFilter === 'active' ? 'selected' : ''}>Active</option>
                    <option value="answered" ${this.currentFilter === 'answered' ? 'selected' : ''}>Answered</option>
                </select>
            </div>
        `;

        sectionHeader.appendChild(filterControls);
        this.bindSearchFilterEvents();
    }

    bindSearchFilterEvents() {
        const searchInput = document.getElementById('prayerSearch');
        const filterSelect = document.getElementById('prayerFilter');

        if (searchInput) {
            // Remove any existing listeners
            searchInput.replaceWith(searchInput.cloneNode(true));
            const newSearchInput = document.getElementById('prayerSearch');
            
            let searchTimeout;
            newSearchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchQuery = e.target.value.toLowerCase();
                    this.renderPrayers();
                }, 300);
            });
        }

        if (filterSelect) {
            // Remove any existing listeners
            filterSelect.replaceWith(filterSelect.cloneNode(true));
            const newFilterSelect = document.getElementById('prayerFilter');
            
            newFilterSelect.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.renderPrayers();
            });
        }
    }

    bindEvents() {
        console.log('Binding prayers events...');
        
        // Only bind events once
        if (this.eventListenersBound) {
            console.log('Events already bound, skipping...');
            return;
        }

        // Clean up any existing elements by cloning them
        this.cleanupEventElements();

        // Bind save prayer button with proper prevention
        const saveButton = document.getElementById('savePrayer');
        if (saveButton) {
            saveButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
                console.log('Save prayer button clicked');
                this.savePrayer();
            }, { once: false }); // Allow multiple clicks but handle properly
        }

        // Bind new prayer button
        const newPrayerButton = document.getElementById('newPrayerRequest');
        if (newPrayerButton) {
            newPrayerButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
                console.log('New prayer button clicked');
                this.showForm();
            });
        }

        this.eventListenersBound = true;
        console.log('Prayers events bound successfully');
    }

    cleanupEventElements() {
        // Clean up buttons by cloning to remove duplicate event listeners
        const elementsToCleanup = ['savePrayer', 'newPrayerRequest'];
        
        elementsToCleanup.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const newElement = element.cloneNode(true);
                element.parentNode.replaceChild(newElement, element);
            }
        });
    }

    showForm() {
        const editor = document.querySelector('.prayer-editor');
        if (editor) {
            editor.style.display = 'block';
            this.isFormVisible = true;
            
            // Add cancel button if it doesn't exist
            if (!document.getElementById('cancelPrayer')) {
                const saveButton = document.getElementById('savePrayer');
                const cancelButton = document.createElement('button');
                cancelButton.type = 'button';
                cancelButton.id = 'cancelPrayer';
                cancelButton.className = 'btn btn-secondary';
                cancelButton.innerHTML = '<i class="fas fa-times"></i> Cancel';
                cancelButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    this.hideForm();
                });
                
                saveButton.parentNode.insertBefore(cancelButton, saveButton.nextSibling);
            }
            
            editor.scrollIntoView({ behavior: 'smooth' });
        }
    }

    hideForm() {
        const editor = document.querySelector('.prayer-editor');
        if (editor) {
            editor.style.display = 'none';
            this.isFormVisible = false;
            this.clearForm();
        }
    }

    async loadPrayers() {
        try {
            const response = await AuthHelper.apiCall('prayers/list.php');
            this.prayers = response.prayers || [];
            console.log('Loaded prayers:', this.prayers.length);
        } catch (error) {
            console.error('Error loading prayers:', error);
            throw error;
        }
    }

    async savePrayer() {
        console.log('savePrayer method called');
        
        // Prevent multiple simultaneous saves
        if (this.isSaving) {
            console.log('Save already in progress, skipping...');
            return;
        }

        this.isSaving = true;

        try {
            // If we're editing an existing prayer, call update instead
            if (this.editingPrayerId) {
                await this.updatePrayer(this.editingPrayerId);
                return;
            }

            const titleInput = document.getElementById('prayerTitle');
            const categoryInput = document.getElementById('prayerCategory');
            const descriptionInput = document.getElementById('prayerDescription');
            
            if (!titleInput || !categoryInput || !descriptionInput) {
                this.showNotification('Prayer form elements not found', 'error');
                this.isSaving = false;
                return;
            }

            const title = titleInput.value.trim();
            const category = categoryInput.value;
            const description = descriptionInput.value.trim();

            if (!title || !description) {
                this.showNotification('Please fill in title and description', 'error');
                this.isSaving = false;
                return;
            }

            console.log('Saving prayer:', { title, category, description });

            const response = await AuthHelper.apiCall('prayers/save.php', 'POST', {
                title: title,
                description: description,
                category: category
            });

            if (response.success) {
                this.showNotification('Prayer request saved successfully', 'success');
                this.hideForm();
                await this.loadPrayers();
                this.renderPrayers();
            } else {
                this.showNotification(response.message || 'Error saving prayer', 'error');
            }
        } catch (error) {
            console.error('Save error:', error);
            this.showNotification('Error saving prayer', 'error');
        } finally {
            this.isSaving = false;
        }
    }

    renderPrayers() {
        const container = document.getElementById('prayersList');
        if (!container) {
            console.error('Prayers container not found');
            return;
        }
        
        const filteredPrayers = this.getFilteredPrayers();
        console.log('Rendering prayers:', filteredPrayers.length);

        if (filteredPrayers.length === 0) {
            container.innerHTML = `
                <div class="no-data-message">
                    <i class="fas fa-praying-hands"></i>
                    <h3>No Prayer Requests Found</h3>
                    <p>${this.searchQuery || this.currentFilter !== 'all' ? 
                        'Try adjusting your search or filter criteria.' : 
                        'Start by adding your first prayer request!'}</p>
                    ${!this.searchQuery && this.currentFilter === 'all' ? 
                        `<button class="btn btn-primary mt-3" id="addFirstPrayer">
                            <i class="fas fa-plus"></i> Add First Prayer
                        </button>` : ''}
                </div>
            `;

            // Bind the add first prayer button
            const addFirstButton = document.getElementById('addFirstPrayer');
            if (addFirstButton) {
                addFirstButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showForm();
                });
            }

            return;
        }

        container.innerHTML = filteredPrayers.map(prayer => `
            <div class="prayer-item card ${prayer.status}" data-prayer-id="${prayer.id}">
                <div class="card-body">
                    <div class="prayer-header">
                        <div class="prayer-title">
                            <h4>${this.escapeHtml(prayer.title)}</h4>
                            <span class="prayer-category badge ${prayer.category}">${prayer.category}</span>
                        </div>
                        <div class="prayer-status ${prayer.status}">
                            <span class="status-badge">${prayer.status}</span>
                        </div>
                    </div>
                    
                    <div class="prayer-meta">
                        <span class="prayer-date">
                            <i class="fas fa-calendar"></i>
                            ${new Date(prayer.created_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                        </span>
                        ${prayer.status === 'answered' ? `
                            <span class="answered-date">
                                <i class="fas fa-check-circle"></i>
                                Answered on ${new Date(prayer.updated_at).toLocaleDateString()}
                            </span>
                        ` : ''}
                    </div>
                    
                    <div class="prayer-description">
                        ${this.formatPrayerContent(prayer.description)}
                    </div>
                    
                    <div class="prayer-actions">
                        ${prayer.status === 'active' ? `
                            <button class="btn btn-success btn-small mark-answered" data-prayer-id="${prayer.id}">
                                <i class="fas fa-check"></i> Mark Answered
                            </button>
                        ` : `
                            <span class="answered-badge">
                                <i class="fas fa-check-circle"></i> Answered
                            </span>
                        `}
                        <button class="btn btn-outline btn-small edit-prayer" data-prayer-id="${prayer.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-outline btn-small delete-prayer" data-prayer-id="${prayer.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        this.bindPrayerActions();
    }

    bindPrayerActions() {
        // Mark as answered buttons
        document.querySelectorAll('.mark-answered').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
                const prayerId = parseInt(e.currentTarget.getAttribute('data-prayer-id'));
                console.log('Mark answered for prayer:', prayerId);
                this.markPrayerAnswered(prayerId);
            });
        });

        // Edit buttons
        document.querySelectorAll('.edit-prayer').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
                const prayerId = parseInt(e.currentTarget.getAttribute('data-prayer-id'));
                console.log('Edit prayer:', prayerId);
                this.editPrayer(prayerId);
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-prayer').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
                const prayerId = parseInt(e.currentTarget.getAttribute('data-prayer-id'));
                console.log('Delete prayer:', prayerId);
                this.deletePrayer(prayerId);
            });
        });
    }

    async markPrayerAnswered(prayerId) {
        if (confirm('Mark this prayer as answered?')) {
            try {
                const response = await AuthHelper.apiCall('prayers/update.php', 'PUT', {
                    id: prayerId,
                    status: 'answered'
                });

                if (response.success) {
                    this.showNotification('Prayer marked as answered! 🙏', 'success');
                    await this.loadPrayers();
                    this.renderPrayers();
                } else {
                    this.showNotification(response.message || 'Error updating prayer', 'error');
                }
            } catch (error) {
                console.error('Mark answered error:', error);
                this.showNotification('Error updating prayer', 'error');
            }
        }
    }

    editPrayer(prayerId) {
        console.log('Editing prayer:', prayerId);
        const prayer = this.prayers.find(p => p.id === prayerId);
        if (prayer) {
            const titleInput = document.getElementById('prayerTitle');
            const categoryInput = document.getElementById('prayerCategory');
            const descriptionInput = document.getElementById('prayerDescription');
            const saveButton = document.getElementById('savePrayer');
            
            if (titleInput) titleInput.value = prayer.title;
            if (categoryInput) categoryInput.value = prayer.category;
            if (descriptionInput) descriptionInput.value = prayer.description;
            
            this.editingPrayerId = prayerId;
            
            if (saveButton) {
                saveButton.innerHTML = '<i class="fas fa-save"></i> Update Prayer';
                saveButton.classList.add('editing');
            }

            this.showForm();
            this.showNotification(`Editing: "${prayer.title}"`, 'info');
        }
    }

    async updatePrayer(prayerId) {
        console.log('Updating prayer:', prayerId);
        
        if (this.isSaving) {
            console.log('Save already in progress, skipping update...');
            return;
        }

        this.isSaving = true;

        try {
            const titleInput = document.getElementById('prayerTitle');
            const categoryInput = document.getElementById('prayerCategory');
            const descriptionInput = document.getElementById('prayerDescription');
            
            if (!titleInput || !categoryInput || !descriptionInput) {
                this.showNotification('Form elements not found', 'error');
                this.isSaving = false;
                return;
            }

            const title = titleInput.value.trim();
            const category = categoryInput.value;
            const description = descriptionInput.value.trim();

            if (!title || !description) {
                this.showNotification('Please fill in title and description', 'error');
                this.isSaving = false;
                return;
            }

            const response = await AuthHelper.apiCall('prayers/update.php', 'PUT', {
                id: prayerId,
                title: title,
                category: category,
                description: description
            });

            if (response.success) {
                this.showNotification('Prayer updated successfully', 'success');
                this.editingPrayerId = null;
                await this.loadPrayers();
                this.renderPrayers();
                this.hideForm();
            } else {
                this.showNotification(response.message || 'Error updating prayer', 'error');
            }
        } catch (error) {
            console.error('Update error:', error);
            this.showNotification('Error updating prayer', 'error');
        } finally {
            this.isSaving = false;
        }
    }

    async deletePrayer(prayerId) {
        console.log('Deleting prayer:', prayerId);
        if (confirm('Are you sure you want to delete this prayer request? This action cannot be undone.')) {
            try {
                const response = await AuthHelper.apiCall(`prayers/delete.php?id=${prayerId}`, 'DELETE');
                
                if (response.success) {
                    this.showNotification('Prayer deleted successfully', 'success');
                    this.prayers = this.prayers.filter(prayer => prayer.id !== prayerId);
                    this.renderPrayers();
                } else {
                    this.showNotification(response.message || 'Error deleting prayer', 'error');
                }
            } catch (error) {
                console.error('Delete error:', error);
                this.showNotification('Error deleting prayer', 'error');
            }
        }
    }

    getFilteredPrayers() {
        if (!Array.isArray(this.prayers)) {
            return [];
        }
        
        let filtered = [...this.prayers];
        
        // Apply status filter
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(prayer => prayer.status === this.currentFilter);
        }
        
        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(prayer => 
                prayer.title.toLowerCase().includes(this.searchQuery) ||
                prayer.description.toLowerCase().includes(this.searchQuery) ||
                (prayer.category && prayer.category.toLowerCase().includes(this.searchQuery))
            );
        }
        
        // Sort by date (newest first)
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        return filtered;
    }

    clearForm() {
        const titleInput = document.getElementById('prayerTitle');
        const categoryInput = document.getElementById('prayerCategory');
        const descriptionInput = document.getElementById('prayerDescription');
        const saveButton = document.getElementById('savePrayer');
        
        if (titleInput) titleInput.value = '';
        if (categoryInput) categoryInput.value = 'personal';
        if (descriptionInput) descriptionInput.value = '';
        
        this.editingPrayerId = null;
        
        if (saveButton) {
            saveButton.innerHTML = '<i class="fas fa-save"></i> Save Prayer';
            saveButton.classList.remove('editing');
        }

        const cancelButton = document.getElementById('cancelPrayer');
        if (cancelButton) {
            cancelButton.remove();
        }
    }

    formatPrayerContent(content) {
        return content.replace(/\n/g, '<br>');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    loadDemoPrayers() {
        const existingIds = new Set(this.prayers.map(prayer => prayer.id));
        const demoPrayers = [
            {
                id: existingIds.has(1) ? Math.max(...existingIds) + 1 : 1,
                title: 'Healing for Family Member',
                description: 'Praying for complete healing and recovery for my mother who is undergoing treatment. May God grant her strength and the medical team wisdom.',
                category: 'family',
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: existingIds.has(2) ? Math.max(...existingIds) + 2 : 2,
                title: 'Thankful for New Job Opportunity',
                description: 'God provided an amazing new job opportunity! Thanking Him for His faithfulness and provision during this season of transition.',
                category: 'thanksgiving',
                status: 'answered',
                created_at: new Date(Date.now() - 86400000).toISOString(),
                updated_at: new Date().toISOString()
            }
        ].filter(prayer => !existingIds.has(prayer.id));

        this.prayers = [...this.prayers, ...demoPrayers];
        this.renderPrayers();
    }

    showNotification(message, type) {
        if (window.app && window.app.showGlobalNotification) {
            window.app.showGlobalNotification(message, type);
        } else {
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Make prayers instance globally available
const prayers = new Prayers();