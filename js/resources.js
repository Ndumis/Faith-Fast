class Resources {
    constructor() {
        this.resources = [];
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.editingResourceId = null;
        this.isFormVisible = false;
    }

    async init() {
        console.log('Initializing Resources tab...');
        
        if (!this.isResourcesPage()) {
            console.log('Not on resources page, skipping initialization');
            return;
        }
        
        try {
            await this.loadResources();
            this.renderResources();
            this.bindEvents();
            this.hideForm(); // Start with form hidden
            console.log('✅ Resources tab initialized successfully');
        } catch (error) {
            console.error('❌ Resources initialization failed:', error);
            this.loadDemoResources();
        }
    }

    isResourcesPage() {
        return !!document.getElementById('resources-tab');
    }

    async loadResources() {
        try {
            // Using AuthHelper for API calls instead of direct fetch
            const response = await AuthHelper.apiCall('resources/list.php');
            this.resources = response.resources || [];
            console.log('Loaded resources:', this.resources.length);
        } catch (error) {
            console.error('Error loading resources:', error);
            throw error;
        }
    }

    showForm() {
        const editor = document.querySelector('.resource-editor');
        if (editor) {
            editor.style.display = 'block';
            this.isFormVisible = true;
            
            // Add cancel button if it doesn't exist
            const saveButton = document.getElementById('saveResource');
            if (saveButton && !document.getElementById('cancelResource')) {
                const cancelButton = document.createElement('button');
                cancelButton.type = 'button';
                cancelButton.id = 'cancelResource';
                cancelButton.className = 'btn btn-secondary';
                cancelButton.innerHTML = '<i class="fas fa-times"></i> Cancel';
                cancelButton.addEventListener('click', () => this.hideForm());
                
                saveButton.parentNode.appendChild(cancelButton);
            }
            
            // Scroll to form
            editor.scrollIntoView({ behavior: 'smooth' });
        }
    }

    hideForm() {
        const editor = document.querySelector('.resource-editor');
        if (editor) {
            editor.style.display = 'none';
            this.isFormVisible = false;
            this.clearForm();
        }
    }

    renderResources() {
        const container = document.getElementById('resourcesContainer');
        if (!container) {
            console.error('Resources container not found');
            return;
        }
        
        const filteredResources = this.getFilteredResources();
        console.log('Rendering resources:', filteredResources.length);

        if (filteredResources.length === 0) {
            if (this.resources.length === 0) {
                container.innerHTML = `
                    <div class="no-data-message text-center py-5">
                        <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                        <h3>No Resources Found</h3>
                        <p class="text-muted">Start by adding your first resource!</p>
                        <button class="btn btn-primary mt-2" onclick="resourcesApp.showForm()">
                            <i class="fas fa-plus"></i> Add First Resource
                        </button>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="no-data-message text-center py-5">
                        <i class="fas fa-search fa-3x text-muted mb-3"></i>
                        <h3>No Matching Resources</h3>
                        <p class="text-muted">Try a different search term or category.</p>
                        <button class="btn btn-outline-primary mt-2" onclick="resourcesApp.clearFilters()">
                            <i class="fas fa-times"></i> Clear Search & Filters
                        </button>
                    </div>
                `;
            }
            return;
        }

        container.innerHTML = filteredResources.map(resource => `
            <div class="resource-item card" data-resource-id="${resource.id}">
                <div class="card-body">
                    <div class="resource-card-header d-flex justify-content-between align-items-start mb-3">
                        <div class="resource-author d-flex align-items-center">
                            <div class="user-avatar resource-author-avatar me-3">${(resource.author_name || '?').charAt(0).toUpperCase()}</div>
                            <div>
                                <h6 class="mb-0">${resource.author_name}</h6>
                                <small class="text-muted">${new Date(resource.created_at).toLocaleDateString()}</small>
                            </div>
                        </div>
                        <div class="resource-actions">
                            <button class="btn btn-sm btn-outline-primary edit-resource" data-resource-id="${resource.id}">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-resource" data-resource-id="${resource.id}">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>

                    <h5 class="card-title resource-title">${this.escapeHtml(resource.title)}</h5>
                    <div class="card-text resource-description">${resource.description ? RichTextEditor.contentToHtml(resource.description) : 'No description provided.'}</div>

                    ${this.renderMediaPreview(resource)}

                    <div class="resource-card-footer d-flex justify-content-between align-items-center mt-3">
                        <span class="badge resource-category-badge">${resource.category}</span>
                        <div class="d-flex align-items-center">
                            <button class="btn btn-sm btn-outline-danger like-btn ${resource.is_liked ? 'liked' : ''}"
                                    data-resource-id="${resource.id}">
                                <i class="fas fa-heart${resource.is_liked ? '' : '-outline'}"></i>
                                <span class="like-count">${resource.like_count || 0}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        this.bindResourceActions();
    }

    renderMediaPreview(resource) {
        if (!resource.file_url) return '';
        
        const fileExtension = resource.file_url.split('.').pop().toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);
        const isVideo = ['mp4', 'webm', 'ogg'].includes(fileExtension);
        const isAudio = ['mp3', 'wav', 'ogg'].includes(fileExtension);
        const isDocument = ['pdf', 'doc', 'docx', 'txt'].includes(fileExtension);
        
        let previewHtml = '';
        
        if (isImage) {
            previewHtml = `
                <div class="media-preview image-preview mb-3">
                    <img src="${resource.file_url}" alt="${resource.title}" class="img-fluid rounded" 
                         style="max-height: 300px; cursor: pointer;" 
                         onclick="resourcesApp.openMediaModal('${resource.file_url}', 'image')">
                    <div class="preview-actions mt-2">
                        <a href="${resource.file_url}" class="btn btn-primary btn-sm" target="_blank" download>
                            <i class="fas fa-download"></i> Download
                        </a>
                        <small class="text-muted ms-2">${resource.file_type || 'Image'} • ${this.formatFileSize(resource.file_size)}</small>
                    </div>
                </div>
            `;
        } else if (isVideo) {
            previewHtml = `
                <div class="media-preview video-preview mb-3">
                    <video controls class="w-100 rounded" style="max-height: 300px;">
                        <source src="${resource.file_url}" type="video/${fileExtension}">
                        Your browser does not support the video tag.
                    </video>
                    <div class="preview-actions mt-2">
                        <a href="${resource.file_url}" class="btn btn-primary btn-sm" target="_blank" download>
                            <i class="fas fa-download"></i> Download
                        </a>
                        <small class="text-muted ms-2">${resource.file_type || 'Video'} • ${this.formatFileSize(resource.file_size)}</small>
                    </div>
                </div>
            `;
        } else if (isAudio) {
            previewHtml = `
                <div class="media-preview audio-preview mb-3">
                    <audio controls class="w-100">
                        <source src="${resource.file_url}" type="audio/${fileExtension}">
                        Your browser does not support the audio tag.
                    </audio>
                    <div class="preview-actions mt-2">
                        <a href="${resource.file_url}" class="btn btn-primary btn-sm" target="_blank" download>
                            <i class="fas fa-download"></i> Download
                        </a>
                        <small class="text-muted ms-2">${resource.file_type || 'Audio'} • ${this.formatFileSize(resource.file_size)}</small>
                    </div>
                </div>
            `;
        } else if (isDocument) {
            previewHtml = `
                <div class="media-preview document-preview mb-3">
                    <div class="document-placeholder p-4 border rounded text-center bg-light">
                        <i class="fas fa-file-alt fa-3x text-muted mb-2"></i>
                        <p class="mb-2">Document: ${resource.title}</p>
                        <div class="preview-actions">
                            <a href="${resource.file_url}" class="btn btn-primary btn-sm" target="_blank" download>
                                <i class="fas fa-download"></i> Download
                            </a>
                            <a href="${resource.file_url}" class="btn btn-outline-primary btn-sm" target="_blank">
                                <i class="fas fa-eye"></i> View
                            </a>
                            <small class="text-muted ms-2">${resource.file_type || 'Document'} • ${this.formatFileSize(resource.file_size)}</small>
                        </div>
                    </div>
                </div>
            `;
        } else {
            previewHtml = `
                <div class="media-preview other-preview mb-3">
                    <div class="preview-actions">
                        <a href="${resource.file_url}" class="btn btn-primary btn-sm" target="_blank" download>
                            <i class="fas fa-download"></i> Download File
                        </a>
                        <small class="text-muted ms-2">${resource.file_type || 'File'} • ${this.formatFileSize(resource.file_size)}</small>
                    </div>
                </div>
            `;
        }
        
        return previewHtml;
    }

    openMediaModal(url, type) {
        // Simple image modal implementation
        if (type === 'image') {
            const modal = document.createElement('div');
            modal.className = 'modal-backdrop';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            `;
            modal.innerHTML = `
                <div style="position: relative;">
                    <img src="${url}" style="max-height: 90vh; max-width: 90vw;">
                    <button onclick="this.closest('.modal-backdrop').remove()" 
                            style="position: absolute; top: 10px; right: 10px; background: red; color: white; border: none; border-radius: 50%; width: 30px; height: 30px;">×</button>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Close on backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }
    }

    bindEvents() {
        console.log('Binding resources events...');
        
        // Create resource button
        const createResourceBtn = document.getElementById('createResourceBtn');
        if (createResourceBtn) {
            createResourceBtn.addEventListener('click', () => this.showForm());
        }

        // Resource form submission
        const resourceForm = document.getElementById('resourceForm');
        if (resourceForm) {
            resourceForm.addEventListener('submit', (e) => this.handleSaveResource(e));
        }

        // Category filter
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentCategory = e.target.value;
                this.renderResources();
            });
        }

        // Search by title or description
        const searchInput = document.getElementById('resourceSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.trim().toLowerCase();
                this.renderResources();
            });
        }

        this.bindToolbar();

        console.log('Resources events bound successfully');
    }

    bindToolbar() {
        const toolbar = document.querySelector('.resource-editor .richtext-toolbar');
        const content = document.getElementById('resourceDescription');
        RichTextEditor.bindToolbar(toolbar, content);
    }

    bindResourceActions() {
        // Like buttons
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const resourceId = parseInt(e.currentTarget.getAttribute('data-resource-id'));
                this.toggleLike(resourceId, e.currentTarget);
            });
        });

        // Edit buttons
        document.querySelectorAll('.edit-resource').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const resourceId = parseInt(e.currentTarget.getAttribute('data-resource-id'));
                this.editResource(resourceId);
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-resource').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const resourceId = parseInt(e.currentTarget.getAttribute('data-resource-id'));
                this.deleteResource(resourceId);
            });
        });
    }

    async toggleLike(resourceId, button) {
        try {
            const response = await AuthHelper.apiCall('resources/like.php', 'POST', {
                resource_id: resourceId
            });
            
            if (response.success) {
                const likeCount = button.querySelector('.like-count');
                const heartIcon = button.querySelector('i');
                
                if (response.action === 'liked') {
                    button.classList.add('liked');
                    heartIcon.className = 'fas fa-heart';
                    likeCount.textContent = parseInt(likeCount.textContent) + 1;
                } else {
                    button.classList.remove('liked');
                    heartIcon.className = 'fas fa-heart-outline';
                    likeCount.textContent = Math.max(0, parseInt(likeCount.textContent) - 1);
                }
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            this.showNotification('Error toggling like', 'error');
        }
    }

    editResource(resourceId) {
        console.log('Editing resource:', resourceId);
        const resource = this.resources.find(r => r.id === resourceId);
        if (resource) {
            const titleInput = document.getElementById('resourceTitle');
            const descriptionInput = document.getElementById('resourceDescription');
            const categoryInput = document.getElementById('resourceCategory');
            const urlInput = document.getElementById('resourceUrl');
            const saveButton = document.getElementById('saveResource');
            
            if (titleInput) titleInput.value = resource.title;
            if (descriptionInput) descriptionInput.innerHTML = RichTextEditor.contentToHtml(resource.description || '');
            if (categoryInput) categoryInput.value = resource.category;
            if (urlInput) urlInput.value = resource.file_url || '';
            
            this.editingResourceId = resourceId;
            
            if (saveButton) {
                saveButton.textContent = 'Update Resource';
                saveButton.classList.add('editing');
            }

            this.showForm();
            this.showNotification(`Editing: "${resource.title}"`, 'info');
        } else {
            console.error('Resource not found:', resourceId);
        }
    }

    async handleSaveResource(e) {
        e.preventDefault();
        
        if (this.editingResourceId) {
            await this.updateResource(this.editingResourceId);
            return;
        }

        const titleInput = document.getElementById('resourceTitle');
        const categoryInput = document.getElementById('resourceCategory');
        
        if (!titleInput || !categoryInput) {
            this.showNotification('Resource form elements not found', 'error');
            return;
        }

        const title = titleInput.value.trim();
        const category = categoryInput.value;
        const description = RichTextEditor.sanitizeHtml(document.getElementById('resourceDescription').innerHTML);

        if (!title || !category) {
            this.showNotification('Please fill in title and category', 'error');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('category', category);

            const fileInput = document.getElementById('resourceFile');
            if (fileInput.files[0]) {
                formData.append('file', fileInput.files[0]);
            }

            const urlInput = document.getElementById('resourceUrl');
            if (urlInput.value.trim()) {
                formData.append('url', urlInput.value.trim());
            }

            // Using AuthHelper for API call with FormData
            const response = await AuthHelper.apiCall('resources/create.php', 'POST', formData, true);
            
            if (response.success) {
                this.showNotification('Resource created successfully', 'success');
                this.hideForm();
                await this.loadResources();
                this.renderResources();
            } else {
                this.showNotification(response.message || 'Error saving resource', 'error');
            }
        } catch (error) {
            console.error('Save error:', error);
            this.showNotification('Error saving resource', 'error');
        }
    }

    async updateResource(resourceId) {
        console.log('Updating resource:', resourceId);
        const titleInput = document.getElementById('resourceTitle');
        const categoryInput = document.getElementById('resourceCategory');
        
        if (!titleInput || !categoryInput) {
            this.showNotification('Form elements not found', 'error');
            return;
        }

        const title = titleInput.value.trim();
        const category = categoryInput.value;
        const description = RichTextEditor.sanitizeHtml(document.getElementById('resourceDescription').innerHTML);

        if (!title || !category) {
            this.showNotification('Please fill in title and category', 'error');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('id', resourceId);
            formData.append('title', title);
            formData.append('description', description);
            formData.append('category', category);
            
            const fileInput = document.getElementById('resourceFile');
            if (fileInput.files[0]) {
                formData.append('file', fileInput.files[0]);
            }
            
            const urlInput = document.getElementById('resourceUrl');
            if (urlInput.value.trim()) {
                formData.append('url', urlInput.value.trim());
            }

            const response = await AuthHelper.apiCall('resources/update.php', 'POST', formData, true);
            
            if (response.success) {
                this.showNotification('Resource updated successfully', 'success');
                this.editingResourceId = null;
                await this.loadResources();
                this.renderResources();
                this.hideForm();
            } else {
                this.showNotification(response.message || 'Error updating resource', 'error');
            }
        } catch (error) {
            console.error('Update error:', error);
            this.showNotification('Error updating resource', 'error');
        }
    }

    async deleteResource(resourceId) {
        console.log('Deleting resource:', resourceId);
        if (confirm('Are you sure you want to delete this resource? This action cannot be undone.')) {
            try {
                const response = await AuthHelper.apiCall('resources/delete.php', 'POST', {
                    id: resourceId
                });
                
                if (response.success) {
                    this.showNotification('Resource deleted successfully', 'success');
                    // Remove from local array immediately for better UX
                    this.resources = this.resources.filter(resource => resource.id !== resourceId);
                    this.renderResources();
                } else {
                    this.showNotification(response.message || 'Error deleting resource', 'error');
                }
            } catch (error) {
                console.error('Delete error:', error);
                this.showNotification('Error deleting resource', 'error');
            }
        }
    }

    clearFilters() {
        this.currentCategory = 'all';
        this.searchQuery = '';

        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) categoryFilter.value = 'all';

        const searchInput = document.getElementById('resourceSearch');
        if (searchInput) searchInput.value = '';

        this.renderResources();
    }

    getFilteredResources() {
        let filtered = [...this.resources];

        // Apply category filter
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(resource => resource.category === this.currentCategory);
        }

        // Apply search query (title or description)
        if (this.searchQuery) {
            filtered = filtered.filter(resource =>
                resource.title.toLowerCase().includes(this.searchQuery) ||
                RichTextEditor.getPlainText(resource.description).toLowerCase().includes(this.searchQuery)
            );
        }

        // Sort by date (newest first)
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return filtered;
    }

    clearForm() {
        const titleInput = document.getElementById('resourceTitle');
        const descriptionInput = document.getElementById('resourceDescription');
        const categoryInput = document.getElementById('resourceCategory');
        const fileInput = document.getElementById('resourceFile');
        const urlInput = document.getElementById('resourceUrl');
        const saveButton = document.getElementById('saveResource');
        
        if (titleInput) titleInput.value = '';
        if (descriptionInput) descriptionInput.innerHTML = '';
        if (categoryInput) categoryInput.value = '';
        if (fileInput) fileInput.value = '';
        if (urlInput) urlInput.value = '';
        
        this.editingResourceId = null;
        
        if (saveButton) {
            saveButton.textContent = 'Upload Resource';
            saveButton.classList.remove('editing');
        }

        // Remove cancel button if it exists
        const cancelButton = document.getElementById('cancelResource');
        if (cancelButton) {
            cancelButton.remove();
        }
    }

    formatFileSize(bytes) {
        if (!bytes) return 'Unknown size';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    loadDemoResources() {
        const existingIds = new Set(this.resources.map(resource => resource.id));
        const demoResources = [
            {
                id: existingIds.has(1) ? Math.max(...existingIds) + 1 : 1,
                title: 'Fasting Guide PDF',
                description: 'A comprehensive guide to spiritual fasting practices and benefits.',
                category: 'document',
                file_url: 'assets/documents/fasting-guide.pdf',
                file_type: 'application/pdf',
                file_size: 2048576,
                author_name: 'Admin',
                author_avatar: 'assets/images/default-avatar.png',
                created_at: new Date().toISOString(),
                like_count: 5,
                is_liked: false
            },
            {
                id: existingIds.has(2) ? Math.max(...existingIds) + 2 : 2,
                title: 'Prayer Meditation Audio',
                description: 'Guided prayer meditation for spiritual reflection.',
                category: 'audio',
                file_url: 'assets/audio/prayer-meditation.mp3',
                file_type: 'audio/mpeg',
                file_size: 1024576,
                author_name: 'Admin',
                author_avatar: 'assets/images/default-avatar.png',
                created_at: new Date(Date.now() - 86400000).toISOString(),
                like_count: 3,
                is_liked: true
            }
        ].filter(resource => !existingIds.has(resource.id));

        this.resources = [...this.resources, ...demoResources];
        this.renderResources();
    }

    showNotification(message, type) {
        if (window.app && window.app.showGlobalNotification) {
            window.app.showGlobalNotification(message, type);
        } else {
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Initialize when resources tab is shown
document.addEventListener('DOMContentLoaded', function() {
    let resourcesInstance = null;
    
    document.addEventListener('click', function(e) {
        if (e.target.closest('[data-tab="resources"]')) {
            if (!resourcesInstance) {
                resourcesInstance = new Resources();
                window.resourcesApp = resourcesInstance;
            }
        }
    });
});