class Fasting {
    constructor() {
        this.plans = [];
        this.userFasts = [];
        this.activeFasts = [];
        this.upcomingFasts = [];
        this.isAuthenticated = false;
        this.isTabActive = false;
        this.activeSubtab = 'active';
        this.historyPage = 1;
        this.historyPageSize = 5;
        this.planSearchQuery = '';
        this.historySearchQuery = '';
        this.reminderThresholds = [3600000, 900000]; // 1 hour, 15 minutes (ms)
        this.dailyReminderHour = 9;
        this.streakRiskHour = 18;
    }

    async init() {
        this.isTabActive = window.location.hash === '#fasting' ||
                          document.getElementById('fasting-tab')?.classList.contains('active');

        if (!this.isTabActive) {
            console.log('Fasting tab not active, skipping initialization');
            return;
        }

        this.isAuthenticated = AuthHelper.isAuthenticated();

        await this.loadPlans();
        
        if (this.isAuthenticated) {
            await this.loadUserFasts();
            this.categorizeFasts();
        }
        
        this.render();
        this.bindEvents();
        this.startTimers();
    }
	
    shouldRender() {
        const fastingTab = document.getElementById('fasting-tab');
        return fastingTab && fastingTab.classList.contains('active') && 
               window.location.hash === '#fasting';
    }
	
	updatePlansVisibility() {
        const container = document.getElementById('fastingPlansContainer');
        const noPlansEl = document.getElementById('noPlansMessage');

        if (!container || !noPlansEl) return;

        if (this.plans.length > 0) {
            container.style.display = 'block';
            noPlansEl.style.display = 'none';
            this.renderFastingPlans();
        } else {
            container.style.display = 'none';
            noPlansEl.style.display = 'block';
        }
    }

    async loadPlans() {
        try {
            const response = await fetch('api/fasting/plans.php');
            if (!response.ok) {
                throw new Error('Failed to fetch fasting plans');
            }
            
            const data = await response.json();
            if (data.success) {
                this.plans = data.plans;
            } else {
                console.error('Error loading plans:', data.message);
                this.plans = [];
            }
        } catch (error) {
            console.error('Error loading fasting plans:', error);
            this.plans = [];
        }
    }

    async loadUserFasts() {
        try {
            if (!AuthHelper.isAuthenticated()) {
                this.handleUnauthorized();
                return;
            }

            const response = await AuthHelper.apiCall('fasting/user-fasts.php');
            
            if (response.success) {
                this.userFasts = response.fasts || [];
            } else {
                console.error('Error loading user fasts:', response.message);
                this.userFasts = [];
            }
        } catch (error) {
            console.error('Error loading user fasts:', error);
            this.userFasts = [];
        }
    }

    handleUnauthorized() {
        AuthHelper.clearAuthData();
        this.isAuthenticated = false;
        this.userFasts = [];
        this.activeFasts = [];
        this.upcomingFasts = [];
        this.render();
    }

    categorizeFasts() {
        const now = new Date();
        this.activeFasts = this.userFasts.filter(fast => {
            const start = new Date(fast.start_date);
            const end = new Date(fast.end_date);
            return fast.status === 'active' && start <= now && end >= now;
        });

        this.upcomingFasts = this.userFasts.filter(fast => {
            const start = new Date(fast.start_date);
            return fast.status === 'active' && start > now;
        });
    }

    render() {
        if (!this.shouldRender()) {
            console.log('Fasting tab not active, skipping render');
            return;
        }

        this.renderIntroBanner();
        this.renderSubtabs();
        this.updatePlansVisibility();
        this.renderUserSpecificContent();
    }

    // Three-way toggle for the Fasting tab: "Active Fast" (active + upcoming
    // fasts) is shown by default, with "Fasting Plan" and "Fasting History"
    // as alternate views so the tab isn't overwhelming on first load.
    switchFastingSubtab(subtab) {
        this.activeSubtab = subtab;
        this.renderSubtabs();
    }

    renderSubtabs() {
        document.querySelectorAll('.fasting-subtab-panel').forEach(panel => {
            panel.style.display = panel.id === `fastingSubtab-${this.activeSubtab}` ? '' : 'none';
        });
        document.querySelectorAll('[data-fasting-subtab]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.fastingSubtab === this.activeSubtab);
        });
    }

    // Shown only to users who have never started a fast, so they know what
    // to do on this tab.
    renderIntroBanner() {
        const messages = document.getElementById('fastingMessages');
        if (!messages) return;

        const existing = document.getElementById('fastingIntroBanner');
        if (existing) existing.remove();

        if (!this.isAuthenticated || this.userFasts.length > 0) return;

        const banner = document.createElement('div');
        banner.id = 'fastingIntroBanner';
        banner.className = 'alert alert-info fasting-intro';
        banner.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <div>
                <strong>Ready to begin?</strong> Open the <strong>Fasting Plan</strong> tab, pick a plan, and click
                <strong>Start This Fast</strong>. Starting it now will show it here under
                <strong>Active Fasts</strong>; scheduling it for later will show it under
                <strong>Upcoming Fasts</strong>.
                <div class="mt-2">
                    <button class="btn btn-sm btn-primary" onclick="fastingApp.showFastingPlans()">
                        <i class="fas fa-list-alt"></i> Browse Fasting Plans
                    </button>
                </div>
            </div>
        `;
        messages.appendChild(banner);
    }

    renderFastingPlans() {
		if (!this.shouldRender()) return;

		const container = document.getElementById('fastingPlansContainer');
		if (!container) return;

		const query = this.planSearchQuery;
		const filteredPlans = query
			? this.plans.filter(plan =>
				(plan.name && plan.name.toLowerCase().includes(query)) ||
				(plan.description && plan.description.toLowerCase().includes(query)))
			: this.plans;

		if (filteredPlans.length === 0) {
			container.innerHTML = `
				<div class="text-center py-5">
					<i class="fas fa-search fa-2x text-muted mb-3"></i>
					<h5>No Plans Match Your Search</h5>
					<p class="text-muted">Try a different search term.</p>
				</div>
			`;
			return;
		}

		// Use CSS Grid instead of Bootstrap columns
		container.innerHTML = `
			<div class="fasting-plans-grid">
				${filteredPlans.map(plan => `
					<div class="fasting-plan-item">
						<div class="card h-100 fasting-plan-card shadow-sm">
							<div class="card-header bg-light">
								<h5 class="card-title mb-0 text-primary">${this.escapeHtml(plan.name)}</h5>
							</div>
							<div class="card-body d-flex flex-column">
								<p class="card-text text-muted flex-grow-1">${this.escapeHtml(plan.description)}</p>
								
								<div class="fasting-plan-meta mb-3">
									<span class="badge bg-${this.getDifficultyColor(plan.difficulty)} me-2">
										<i class="fas fa-${this.getDifficultyIcon(plan.difficulty)}"></i>
										${plan.difficulty}
									</span>
									<span class="badge bg-secondary">
										<i class="fas fa-calendar-day"></i>
										${plan.duration_days} day${plan.duration_days !== 1 ? 's' : ''}
									</span>
								</div>
								
								<div class="plan-details small text-muted mb-3">
									<div class="d-flex justify-content-between">
										<span><strong>Duration:</strong></span>
										<span>${plan.duration_days} days</span>
									</div>
									<div class="d-flex justify-content-between">
										<span><strong>Level:</strong></span>
										<span>${plan.difficulty}</span>
									</div>
								</div>
							</div>
							<div class="card-footer bg-transparent border-top-0">
								${this.isAuthenticated ? `
									<button class="btn btn-dark w-100 start-fast-btn" 
											data-plan-id="${plan.id}"
											data-plan-name="${this.escapeHtml(plan.name)}">
										<i class="fas fa-play-circle"></i> Start This Fast
									</button>
								` : `
									<button class="btn btn-outline-dark w-100" 
											onclick="fastingApp.showLoginPrompt()">
										<i class="fas fa-sign-in-alt"></i> Login to Start Fast
									</button>
								`}
							</div>
						</div>
					</div>
				`).join('')}
			</div>
		`;

		this.bindStartFastButtons();
	}

	renderUserSpecificContent() {
        this.renderActiveFasts();
        this.renderUpcomingFasts();
        this.renderFastHistory();
    }
	
	getDifficultyIcon(difficulty) {
        const icons = {
            'beginner': 'seedling',
            'intermediate': 'mountain',
            'advanced': 'fire'
        };
        return icons[difficulty] || 'star';
    }

	// Add this method to bind event listeners to the buttons
	bindStartFastButtons() {
		const startButtons = document.querySelectorAll('.start-fast-btn');
		startButtons.forEach(button => {
			button.addEventListener('click', (e) => {
				e.preventDefault();
				const planId = button.getAttribute('data-plan-id');
				if (planId) {
					this.showStartFastModal(parseInt(planId));
				}
			});
		});
	}

    renderActiveFasts() {
        if (!this.shouldRender()) return;
        
        const container = document.getElementById('activeFastsContainer');
        const section = document.getElementById('activeFastsSection');
        const badge = document.getElementById('activeFastsBadge');
        
        if (!container || !section) return;

        if (!this.isAuthenticated) {
            section.style.display = 'none';
            return;
        }
        
        section.style.display = 'block';

        if (badge) {
            badge.textContent = this.activeFasts.length;
        }

        if (this.activeFasts.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="card">
                        <div class="card-body text-center py-5">
                            <i class="bi bi-clock fa-3x text-muted mb-3" style="font-size: 3rem;"></i>
                            <h5>No Active Fasts</h5>
                            <p class="text-muted">Start a fast to begin tracking your journey.</p>
                            <button class="btn btn-primary" onclick="fastingApp.showFastingPlans()">
                                Browse Fasting Plans
                            </button>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = this.activeFasts.map(fast => {
            const plan = this.plans.find(p => p.id == fast.plan_id) || {};
            const endDate = new Date(fast.end_date);
            const now = new Date();
            const timeRemaining = endDate - now;

            return `
                <div class="col-lg-6 col-md-12 mb-4">
                    <div class="card h-100 active-fast-card">
                        <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">${plan.name || 'Custom Fast'}</h6>
                            <span class="badge bg-light text-primary">${fast.progress_percent || 0}%</span>
                        </div>
                        <div class="card-body">
                            <div class="text-center mb-3">
                                <div class="countdown-clock display-6 text-primary" 
                                     data-end="${fast.end_date}">
                                    ${this.formatTimeRemaining(timeRemaining)}
                                </div>
                                <small class="text-muted">Time Remaining</small>
                            </div>
                            
                            <div class="fast-progress mb-3">
                                <div class="progress" style="height: 8px;">
                                    <div class="progress-bar" role="progressbar" 
                                         style="width: ${fast.progress_percent || 0}%">
                                    </div>
                                </div>
                                <small class="text-muted">Progress: ${fast.progress_percent || 0}% Complete</small>
                            </div>

                            <div class="fast-details small">
                                <p><strong>Started:</strong> ${new Date(fast.start_date).toLocaleDateString()}</p>
                                <p><strong>Ends:</strong> ${endDate.toLocaleDateString()}</p>
                                ${fast.intention ? `<p><strong>Intention:</strong> ${RichTextEditor.contentToHtml(fast.intention)}</p>` : ''}
                                <p><strong>Status:</strong> <span class="badge bg-success">Active</span></p>
                            </div>
                        </div>
                        <div class="card-footer">
                            <div class="btn-group w-100">
                                <button class="btn btn-success btn-sm"
                                        onclick="fastingApp.endFast(${fast.id})"
                                        title="Mark this fast as complete now, before its scheduled end time">
                                    <i class="bi bi-check-circle"></i> Complete Now
                                </button>
                                <button class="btn btn-outline-danger btn-sm"
                                        onclick="fastingApp.cancelFast(${fast.id})"
                                        title="Cancel this fast - it will not count as completed">
                                    <i class="bi bi-x-circle"></i> Cancel
                                </button>
                                <button class="btn btn-outline-primary btn-sm"
                                        onclick="fastingApp.viewFastDetails(${fast.id})">
                                    <i class="bi bi-eye"></i> Details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderUpcomingFasts() {
        const container = document.getElementById('upcomingFastsContainer');
        const section = document.getElementById('upcomingFastsSection');
        const badge = document.getElementById('upcomingFastsBadge');
        
        if (!container || !section) return;

        if (!this.isAuthenticated || this.upcomingFasts.length === 0) {
            section.style.display = 'none';
            return;
        }
        
        section.style.display = 'block';
        
        if (badge) {
            badge.textContent = this.upcomingFasts.length;
        }
        
        container.innerHTML = this.upcomingFasts.map(fast => {
            const plan = this.plans.find(p => p.id == fast.plan_id) || {};
            const startDate = new Date(fast.start_date);
            const now = new Date();
            const timeUntilStart = startDate - now;

            return `
                <div class="col-lg-6 col-md-12 mb-4">
                    <div class="card h-100">
                        <div class="card-header bg-warning text-dark">
                            <h6 class="mb-0">${plan.name || 'Custom Fast'}</h6>
                        </div>
                        <div class="card-body">
                            <div class="countdown-clock text-warning display-6 mb-2" 
                                 data-start="${fast.start_date}">
                                ${this.formatTimeRemaining(timeUntilStart)}
                            </div>
                            <p class="mb-1"><strong>Starts:</strong> ${startDate.toLocaleString()}</p>
                            <p class="mb-1"><strong>Duration:</strong> ${plan.duration_days} days</p>
                            ${fast.intention ? `<p class="mb-2"><strong>Intention:</strong> ${RichTextEditor.contentToHtml(fast.intention)}</p>` : ''}
                        </div>
                        <div class="card-footer">
                            <button class="btn btn-outline-danger btn-sm w-100" 
                                    onclick="fastingApp.cancelFast(${fast.id})">
                                <i class="bi bi-x-circle"></i> Cancel Fast
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderFastHistory() {
        const container = document.getElementById('fastHistoryContainer');
        const section = document.getElementById('fastHistorySection');
        if (!container || !section) return;

        if (!this.isAuthenticated) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';

        const completedFasts = this.userFasts
            .filter(fast => fast.status === 'completed' || fast.status === 'cancelled')
            .filter(fast => {
                if (!this.historySearchQuery) return true;
                const intention = (fast.intention || '').toLowerCase();
                const status = (fast.status || '').toLowerCase();
                return intention.includes(this.historySearchQuery) || status.includes(this.historySearchQuery);
            })
            .sort((a, b) => new Date(b.end_date) - new Date(a.end_date));

        if (completedFasts.length === 0) {
            container.innerHTML = this.historySearchQuery
                ? '<div class="col-12 text-center text-muted py-4">No fast history matches your search.</div>'
                : '';
            return;
        }

        const totalPages = Math.max(1, Math.ceil(completedFasts.length / this.historyPageSize));
        this.historyPage = Math.min(Math.max(this.historyPage, 1), totalPages);

        const startIndex = (this.historyPage - 1) * this.historyPageSize;
        const pageFasts = completedFasts.slice(startIndex, startIndex + this.historyPageSize);

        container.innerHTML = `
            <div class="col-12 mt-4">
                <h5>Fast History</h5>
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Fast</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Duration</th>
                                <th>Status</th>
                                <th>Progress</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pageFasts.map(fast => {
                                const plan = this.plans.find(p => p.id == fast.plan_id) || {};
                                const start = new Date(fast.start_date);
                                const end = new Date(fast.end_date);
                                const duration = Math.round((end - start) / (1000 * 60 * 60 * 24));

                                return `
                                    <tr>
                                        <td>${plan.name || 'Custom Fast'}</td>
                                        <td>${start.toLocaleDateString()}</td>
                                        <td>${end.toLocaleDateString()}</td>
                                        <td>${duration} days</td>
                                        <td>
                                            <span class="badge bg-${fast.status === 'completed' ? 'success' : 'secondary'}">
                                                ${fast.status}
                                            </span>
                                        </td>
                                        <td>${fast.progress_percent || 0}%</td>
                                        <td>
                                            <button class="btn btn-sm btn-outline-primary"
                                                    onclick="fastingApp.viewFastDetails(${fast.id})">
                                                Details
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                ${totalPages > 1 ? `
                    <div class="d-flex justify-content-between align-items-center">
                        <button class="btn btn-sm btn-outline-secondary"
                                onclick="fastingApp.changeHistoryPage(-1)"
                                ${this.historyPage <= 1 ? 'disabled' : ''}>
                            <i class="fas fa-chevron-left"></i> Previous
                        </button>
                        <span class="text-muted">Page ${this.historyPage} of ${totalPages}</span>
                        <button class="btn btn-sm btn-outline-secondary"
                                onclick="fastingApp.changeHistoryPage(1)"
                                ${this.historyPage >= totalPages ? 'disabled' : ''}>
                            Next <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    changeHistoryPage(delta) {
        this.historyPage += delta;
        this.renderFastHistory();
    }

    getDifficultyColor(difficulty) {
        const colors = {
            'beginner': 'success',
            'intermediate': 'warning',
            'advanced': 'danger'
        };
        return colors[difficulty] || 'secondary';
    }

    getStatusColor(status) {
        const colors = {
            'active': 'success',
            'completed': 'primary',
            'cancelled': 'secondary',
            'paused': 'warning'
        };
        return colors[status] || 'secondary';
    }

    formatTimeRemaining(milliseconds) {
        if (milliseconds <= 0) return '00:00:00';
        
        const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
        const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
        
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        }
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    showLoginPrompt() {
        if (confirm('You need to be logged in to start a fast. Would you like to login now?')) {
            window.location.href = 'index.html';
        }
    }


    showStartFastModal(planId) {
		if (!AuthHelper.isAuthenticated()) {
			this.showLoginPrompt();
			return;
		}

		const plan = this.plans.find(p => p.id == planId);
		if (!plan) {
			console.error('Plan not found with ID:', planId);
			return;
		}

		// Remove existing modal if any
		const existingModal = document.getElementById('startFastModal');
		if (existingModal) {
			existingModal.remove();
		}

		const modalHtml = `
			<div class="modal fade" id="startFastModal" tabindex="-1" aria-hidden="true">
				<div class="modal-dialog">
					<div class="modal-content">
						<div class="modal-header">
							<h5 class="modal-title">Start ${this.escapeHtml(plan.name)}</h5>
							<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
						</div>
						<div class="modal-body">
							<form id="startFastForm">
								<input type="hidden" name="plan_id" value="${plan.id}">
								
								<div class="mb-3">
									<label for="startDate" class="form-label">Start Date & Time</label>
									<input type="datetime-local" class="form-control" id="startDate" name="start_date" 
										   value="${this.getDefaultStartTime()}" required>
								</div>

								<div class="mb-3">
									<label for="intention" class="form-label">Intention/Purpose</label>
									<div class="richtext-toolbar" role="toolbar" aria-label="Text formatting">
										<button type="button" class="toolbar-btn" data-command="bold" title="Bold"><i class="fas fa-bold"></i></button>
										<button type="button" class="toolbar-btn" data-command="italic" title="Italic"><i class="fas fa-italic"></i></button>
										<button type="button" class="toolbar-btn" data-command="underline" title="Underline"><i class="fas fa-underline"></i></button>
										<span class="toolbar-divider"></span>
										<button type="button" class="toolbar-btn" data-command="insertUnorderedList" title="Bulleted List"><i class="fas fa-list-ul"></i></button>
										<button type="button" class="toolbar-btn" data-command="insertOrderedList" title="Numbered List"><i class="fas fa-list-ol"></i></button>
										<span class="toolbar-divider"></span>
										<button type="button" class="toolbar-btn" data-command="removeFormat" title="Clear Formatting"><i class="fas fa-eraser"></i></button>
									</div>
									<div id="intention" class="form-control richtext-content" contenteditable="true"
										 data-placeholder="Why are you starting this fast? What are you seeking God for?"></div>
								</div>

								<div class="mb-3">
									<label for="notes" class="form-label">Additional Notes</label>
									<div class="richtext-toolbar" role="toolbar" aria-label="Text formatting">
										<button type="button" class="toolbar-btn" data-command="bold" title="Bold"><i class="fas fa-bold"></i></button>
										<button type="button" class="toolbar-btn" data-command="italic" title="Italic"><i class="fas fa-italic"></i></button>
										<button type="button" class="toolbar-btn" data-command="underline" title="Underline"><i class="fas fa-underline"></i></button>
										<span class="toolbar-divider"></span>
										<button type="button" class="toolbar-btn" data-command="insertUnorderedList" title="Bulleted List"><i class="fas fa-list-ul"></i></button>
										<button type="button" class="toolbar-btn" data-command="insertOrderedList" title="Numbered List"><i class="fas fa-list-ol"></i></button>
										<span class="toolbar-divider"></span>
										<button type="button" class="toolbar-btn" data-command="removeFormat" title="Clear Formatting"><i class="fas fa-eraser"></i></button>
									</div>
									<div id="notes" class="form-control richtext-content" contenteditable="true"
										 data-placeholder="Any specific guidelines or personal rules for this fast?"></div>
								</div>
							</form>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
							<button type="button" class="btn btn-primary" id="startFastSubmitBtn">Start Fast</button>
						</div>
					</div>
				</div>
			</div>
		`;

		// Insert modal into DOM
		document.body.insertAdjacentHTML('beforeend', modalHtml);
		
		// Initialize Bootstrap modal
		const modalElement = document.getElementById('startFastModal');
		const modal = new bootstrap.Modal(modalElement);

		// Wire up the rich-text formatting toolbars for intention/notes
		RichTextEditor.bindAll(modalElement);
		
		// Add event listener to the submit button
		const submitBtn = document.getElementById('startFastSubmitBtn');
		if (submitBtn) {
			submitBtn.addEventListener('click', (e) => {
				e.preventDefault();
				this.startFast(modal);
			});
		}
		
		// Also allow form submission with Enter key
		const form = document.getElementById('startFastForm');
		if (form) {
			form.addEventListener('submit', (e) => {
				e.preventDefault();
				this.startFast(modal);
			});
		}
		
		// Show the modal
		modal.show();
		
		// Add event listener for when modal is hidden
		modalElement.addEventListener('hidden.bs.modal', () => {
			modalElement.remove();
		});
	}
	
	escapeHtml(unsafe) {
		return unsafe
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}

    getDefaultStartTime() {
        // datetime-local inputs expect local time with no timezone info, but
        // toISOString() always returns UTC - converting first keeps the
        // default in sync with the user's actual local "now".
        const now = new Date();
        const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        return localNow.toISOString().slice(0, 16);
    }

    async startFast(modal) {
		const form = document.getElementById('startFastForm');
		if (!form) {
			this.showMessage('Form not found', 'error');
			return;
		}
		
		const formData = new FormData(form);
		const startDate = formData.get('start_date');

		// Allow starting "now" - datetime-local inputs are only precise to
		// the minute, so the selected time can be a few seconds behind the
		// clock by the time the form is submitted. Only reject dates that
		// are clearly in the past.
		const selectedDate = new Date(startDate);
		const now = new Date();
		if (selectedDate.getTime() < now.getTime() - 60000) {
			this.showMessage('Please select a start date and time that is not in the past', 'error');
			return;
		}

		const intentionInput = document.getElementById('intention');
		const notesInput = document.getElementById('notes');

		const fastData = {
			plan_id: formData.get('plan_id'),
			start_date: startDate,
			intention: intentionInput ? RichTextEditor.sanitizeHtml(intentionInput.innerHTML) : '',
			notes: notesInput ? RichTextEditor.sanitizeHtml(notesInput.innerHTML) : ''
		};

		// Show loading state
		const submitBtn = document.getElementById('startFastSubmitBtn');
		const originalText = submitBtn.innerHTML;
		submitBtn.disabled = true;
		submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';

		try {
			const response = await AuthHelper.apiCall('fasting/start.php', 'POST', fastData);
			
			if (response.success) {
				modal.hide();

				await this.loadUserFasts();
				this.categorizeFasts();
				this.renderUserSpecificContent();

				const isUpcoming = this.upcomingFasts.some(f => f.id == response.fast_id);
				if (isUpcoming) {
					this.showMessage('Fast scheduled! You can find it under Upcoming Fasts.', 'success');
				} else {
					this.showMessage('Fast started! You can track it under Active Fasts.', 'success');
				}
				this.switchFastingSubtab('active');
			} else {
				this.showMessage('Error: ' + response.message, 'error');
			}
		} catch (error) {
			console.error('Error starting fast:', error);
			this.showMessage('Error starting fast. Please try again.', 'error');
		} finally {
			// Reset button state
			if (submitBtn) {
				submitBtn.disabled = false;
				submitBtn.innerHTML = originalText;
			}
		}
	}

    async endFast(fastId) {
        if (!confirm('Mark this fast as complete now? It will be recorded as 100% complete even though its scheduled end time has not been reached yet.')) return;

        try {
            const response = await AuthHelper.apiCall('fasting/end.php', 'POST', { fast_id: fastId });

            if (response.success) {
                await this.loadUserFasts();
                this.categorizeFasts();
                this.renderUserSpecificContent();
                this.showMessage('Fast marked as complete!', 'success');
            } else {
                this.showMessage('Error: ' + response.message, 'error');
            }
        } catch (error) {
            console.error('Error ending fast:', error);
            this.showMessage('Error ending fast', 'error');
        }
    }

    async cancelFast(fastId) {
        if (!confirm('Cancel this fast? It will not be counted as completed in your stats or history.')) return;

        try {
            const response = await AuthHelper.apiCall('fasting/cancel.php', 'POST', { fast_id: fastId });
            
            if (response.success) {
                await this.loadUserFasts();
                this.categorizeFasts();
                this.renderUserSpecificContent();
                this.showMessage('Fast cancelled', 'info');
            } else {
                this.showMessage('Error: ' + response.message, 'error');
            }
        } catch (error) {
            console.error('Error cancelling fast:', error);
            this.showMessage('Error cancelling fast', 'error');
        }
    }

    async viewFastDetails(fastId) {
        try {
            const response = await AuthHelper.apiCall(`fasting/details.php?id=${fastId}`);
            
            if (response.success) {
                this.showFastDetailsModal(response.fast);
            } else {
                this.showMessage('Error loading fast details', 'error');
            }
        } catch (error) {
            console.error('Error loading fast details:', error);
            this.showMessage('Error loading fast details', 'error');
        }
    }

    showFastDetailsModal(fast) {
        const progress = fast.progress_percent || 0;

        const modalHtml = `
            <div class="modal fade" id="fastDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content fast-details-modal">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-fire"></i> ${this.escapeHtml(fast.plan_name || 'Custom Fast')}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="fast-detail-badges">
                                <span class="fast-detail-badge difficulty-${fast.difficulty}">
                                    <i class="fas fa-${this.getDifficultyIcon(fast.difficulty)}"></i> ${fast.difficulty}
                                </span>
                                <span class="fast-detail-badge status-${fast.status}">
                                    <i class="fas fa-circle"></i> ${fast.status}
                                </span>
                            </div>

                            <div class="fast-progress-wrap">
                                <div class="fast-progress-label">
                                    <span>Progress</span>
                                    <span>${progress}%</span>
                                </div>
                                <div class="fast-progress-bar">
                                    <div class="fast-progress-fill" style="width: ${progress}%"></div>
                                </div>
                            </div>

                            <div class="fast-detail-stats">
                                <div class="fast-detail-stat">
                                    <i class="fas fa-calendar-day"></i>
                                    <div>
                                        <span class="stat-label">Duration</span>
                                        <span class="stat-value">${fast.duration_days} days</span>
                                    </div>
                                </div>
                                <div class="fast-detail-stat">
                                    <i class="fas fa-play"></i>
                                    <div>
                                        <span class="stat-label">Started</span>
                                        <span class="stat-value">${new Date(fast.start_date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div class="fast-detail-stat">
                                    <i class="fas fa-flag-checkered"></i>
                                    <div>
                                        <span class="stat-label">Ends</span>
                                        <span class="stat-value">${new Date(fast.end_date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div class="fast-detail-stat">
                                    <i class="fas fa-hourglass-half"></i>
                                    <div>
                                        <span class="stat-label">Elapsed</span>
                                        <span class="stat-value">${fast.elapsed_days} days</span>
                                    </div>
                                </div>
                                <div class="fast-detail-stat">
                                    <i class="fas fa-hourglass-end"></i>
                                    <div>
                                        <span class="stat-label">Remaining</span>
                                        <span class="stat-value">${fast.remaining_days} days</span>
                                    </div>
                                </div>
                            </div>

                            ${fast.intention ? `
                                <div class="fast-detail-section">
                                    <h6 class="fast-detail-section-title"><i class="fas fa-heart"></i> Fast Intention</h6>
                                    <div class="fast-detail-content">${RichTextEditor.contentToHtml(fast.intention)}</div>
                                </div>
                            ` : ''}

                            <div class="fast-detail-section">
                                <h6 class="fast-detail-section-title"><i class="fas fa-book"></i> Journal Entries</h6>
                                ${fast.journal_entries && fast.journal_entries.length > 0 ? `
                                    <div class="linked-entries-list">
                                        ${fast.journal_entries.map(entry => `
                                            <div class="linked-entry-card">
                                                <div class="linked-entry-title">${RichTextEditor.escapeHtml(entry.title || 'Journal Entry')}</div>
                                                <div class="linked-entry-content">${RichTextEditor.contentToHtml(entry.content)}</div>
                                                <div class="linked-entry-meta">
                                                    <span><i class="fas fa-calendar"></i> ${new Date(entry.entry_date).toLocaleDateString()}</span>
                                                    ${entry.mood ? `<span><i class="fas fa-smile"></i> ${RichTextEditor.escapeHtml(entry.mood)}</span>` : ''}
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : `
                                    <p class="fast-detail-empty">No journal entries linked to this fast.</p>
                                `}
                            </div>

                            <div class="fast-detail-section">
                                <h6 class="fast-detail-section-title"><i class="fas fa-praying-hands"></i> Prayers</h6>
                                ${fast.prayers && fast.prayers.length > 0 ? `
                                    <div class="linked-entries-list">
                                        ${fast.prayers.map(prayer => `
                                            <div class="linked-entry-card">
                                                <div class="linked-entry-title">${RichTextEditor.escapeHtml(prayer.title)}</div>
                                                <div class="linked-entry-content">${RichTextEditor.contentToHtml(prayer.description)}</div>
                                                <div class="linked-entry-meta">
                                                    <span><i class="fas fa-calendar"></i> ${new Date(prayer.created_at).toLocaleDateString()}</span>
                                                    ${prayer.status === 'answered' ? '<span class="linked-entry-answered"><i class="fas fa-check-circle"></i> Answered</span>' : ''}
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : `
                                    <p class="fast-detail-empty">No prayers linked to this fast.</p>
                                `}
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            ${fast.status === 'active' ? `
                                <button class="btn btn-success" onclick="fastingApp.endFast(${fast.id})"
                                        title="Mark this fast as complete now, before its scheduled end time">
                                    Complete Now
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('fastDetailsModal');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = new bootstrap.Modal(document.getElementById('fastDetailsModal'));
        modal.show();
    }

    bindEvents() {
        // Fasting subtab toggle buttons
        document.querySelectorAll('[data-fasting-subtab]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchFastingSubtab(btn.dataset.fastingSubtab);
            });
        });

        // Fasting plan search
        const searchInput = document.getElementById('fastingPlanSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterFastingPlans(e.target.value);
            });
        }

        // Fast history search
        const historySearchInput = document.getElementById('fastHistorySearch');
        if (historySearchInput) {
            historySearchInput.addEventListener('input', (e) => {
                this.filterFastHistory(e.target.value);
            });
        }
    }

    filterFastingPlans(query) {
        this.planSearchQuery = query.trim().toLowerCase();
        this.renderFastingPlans();
    }

    filterFastHistory(query) {
        this.historySearchQuery = query.trim().toLowerCase();
        this.historyPage = 1;
        this.renderFastHistory();
    }

    startTimers() {
        setInterval(() => {
            this.updateClocks();
        }, 1000);

        setInterval(() => {
            this.checkFastingReminders();
        }, 60000);

        this.checkFastingReminders();
    }

    updateClocks() {
        document.querySelectorAll('.countdown-clock[data-end]').forEach(clock => {
            const endDate = new Date(clock.dataset.end);
            const now = new Date();
            const timeRemaining = endDate - now;
            clock.textContent = this.formatTimeRemaining(timeRemaining);

            if (timeRemaining < 3600000) {
                clock.classList.add('text-danger');
                clock.classList.remove('text-primary');
            }
        });

        document.querySelectorAll('.countdown-clock[data-start]').forEach(clock => {
            const startDate = new Date(clock.dataset.start);
            const now = new Date();
            const timeUntilStart = startDate - now;
            clock.textContent = `Starts in: ${this.formatTimeRemaining(timeUntilStart)}`;
        });
    }

    checkFastingReminders() {
        if (typeof FastingReminders === 'undefined' || !this.isAuthenticated) return;

        const now = new Date();

        // Fast-ending-soon reminders for active fasts
        this.activeFasts.forEach(fast => {
            const endDate = new Date(fast.end_date);
            const timeRemaining = endDate - now;

            this.reminderThresholds.forEach(threshold => {
                const key = `ff_reminder_end_${fast.id}_${threshold}`;
                if (timeRemaining > 0 && timeRemaining <= threshold && !localStorage.getItem(key)) {
                    const label = threshold === 3600000 ? '1 hour' : '15 minutes';
                    FastingReminders.add({
                        type: 'fasting_reminder',
                        title: 'Fast Ending Soon',
                        message: `Your fast ends in ${label}.`,
                        link_tab: 'fasting',
                        storageKey: key
                    });
                    localStorage.setItem(key, '1');
                }
            });
        });

        const todayKey = now.toISOString().slice(0, 10);

        // Streak-at-risk reminder: no active fast and it's getting late
        const streakKey = `ff_reminder_streak_${todayKey}`;
        if (this.activeFasts.length === 0 && now.getHours() >= this.streakRiskHour && !localStorage.getItem(streakKey)) {
            FastingReminders.add({
                type: 'fasting_reminder',
                title: 'Streak at Risk',
                message: 'You have no active fast today - start one to keep your streak going!',
                link_tab: 'fasting',
                storageKey: streakKey
            });
            localStorage.setItem(streakKey, '1');
        }

        // Daily reminder: once per day, in the morning, if no active fast yet
        const dailyKey = `ff_reminder_daily_${todayKey}`;
        if (this.activeFasts.length === 0 && now.getHours() >= this.dailyReminderHour && !localStorage.getItem(dailyKey)) {
            FastingReminders.add({
                type: 'fasting_reminder',
                title: 'Daily Reminder',
                message: 'Have you planned your fast for today?',
                link_tab: 'fasting',
                storageKey: dailyKey
            });
            localStorage.setItem(dailyKey, '1');
        }
    }

    showMessage(message, type) {
        const alertClass = type === 'success' ? 'alert-success' : 
                          type === 'error' ? 'alert-danger' : 'alert-info';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert ${alertClass} alert-dismissible fade show`;
        messageDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.getElementById('fastingMessages');
        if (container) {
            container.innerHTML = '';
            container.appendChild(messageDiv);
        } else {
            const newContainer = document.createElement('div');
            newContainer.id = 'fastingMessages';
            newContainer.appendChild(messageDiv);
            document.querySelector('#fasting-tab-pane .container-fluid').prepend(newContainer);
        }
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 5000);
    }

    showFastingPlans() {
        this.switchFastingSubtab('plans');
    }

    cleanup() {
        this.isTabActive = false;
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    window.fastingApp = new Fasting();
});