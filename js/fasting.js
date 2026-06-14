class Fasting {
    constructor() {
        this.plans = [];
        this.userFasts = [];
        this.activeFasts = [];
        this.upcomingFasts = [];
        this.isAuthenticated = false;
        this.isTabActive = false;
        this.plansVisible = false;
    }

    async init() {
        this.isTabActive = window.location.hash === '#fasting' || 
                          document.getElementById('fasting-tab')?.classList.contains('active');
        
        if (!this.isTabActive) {
            console.log('Fasting tab not active, skipping initialization');
            return;
        }

        this.isAuthenticated = AuthHelper.isAuthenticated();
        
        // Hide plans by default
        this.plansVisible = false;
        
        await this.loadPlans();
        
        if (this.isAuthenticated) {
            await this.loadUserFasts();
            this.categorizeFasts();
        }
        
        this.render();
        this.bindEvents();
        this.startTimers();
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
                this.updatePlansVisibility(); // Update visibility based on flag
            } else {
                console.error('Error loading plans:', data.message);
                this.plans = [];
                this.showNoPlansMessage(true);
            }
        } catch (error) {
            console.error('Error loading fasting plans:', error);
            this.plans = [];
            this.showNoPlansMessage(true);
        }
    }
	
	showNoPlansMessage(show) {
        const containerEl = document.getElementById('fastingPlansContainer');
        const noPlansEl = document.getElementById('noPlansMessage');
        
        if (containerEl) containerEl.style.display = show && this.plans.length === 0 ? 'block' : 'none';
        if (noPlansEl) noPlansEl.style.display = show && this.plans.length === 0 ? 'block' : 'none';
    }

    shouldRender() {
        const fastingTab = document.getElementById('fasting-tab');
        return fastingTab && fastingTab.classList.contains('active') && 
               window.location.hash === '#fasting';
    }
	
	updatePlansVisibility() {
        const container = document.getElementById('fastingPlansContainer');
        const noPlansEl = document.getElementById('noPlansMessage');
        const refreshBtn = document.getElementById('refreshPlansBtn');
        
        if (!container || !refreshBtn) return;
        
        if (this.plansVisible && this.plans.length > 0) {
            // Show plans in 3-column layout
            container.style.display = 'block';
            noPlansEl.style.display = 'none';
            refreshBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Fasting Plans';
            refreshBtn.setAttribute('data-action', 'hide-plans');
            this.renderFastingPlans();
        } else if (this.plansVisible && this.plans.length === 0) {
            // Show no plans message
            container.style.display = 'none';
            noPlansEl.style.display = 'block';
            refreshBtn.innerHTML = '<i class="fas fa-eye"></i> View Fasting Plans';
            refreshBtn.setAttribute('data-action', 'view-plans');
        } else {
            // Hide everything
            container.style.display = 'none';
            noPlansEl.style.display = 'none';
            refreshBtn.innerHTML = '<i class="fas fa-eye"></i> View Fasting Plans';
            refreshBtn.setAttribute('data-action', 'view-plans');
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
        
        // Only update plans visibility, don't render plans directly
        this.updatePlansVisibility();
        this.renderUserSpecificContent();
    }

    renderFastingPlans() {
		if (!this.shouldRender() || !this.plansVisible) return;
		
		const container = document.getElementById('fastingPlansContainer');
		if (!container) return;

		// Use CSS Grid instead of Bootstrap columns
		container.innerHTML = `
			<div class="fasting-plans-grid">
				${this.plans.map(plan => `
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

	// Add toggle method to show/hide fasting plans
	toggleFastingPlans() {
		this.plansVisible = !this.plansVisible;
        this.updatePlansVisibility();
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
                                ${fast.intention ? `<p><strong>Intention:</strong> ${fast.intention}</p>` : ''}
                                <p><strong>Status:</strong> <span class="badge bg-success">Active</span></p>
                            </div>
                        </div>
                        <div class="card-footer">
                            <div class="btn-group w-100">
                                <button class="btn btn-success btn-sm" 
                                        onclick="fastingApp.endFast(${fast.id})">
                                    <i class="bi bi-check-circle"></i> End
                                </button>
                                <button class="btn btn-outline-danger btn-sm" 
                                        onclick="fastingApp.cancelFast(${fast.id})">
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
                            ${fast.intention ? `<p class="mb-2"><strong>Intention:</strong> ${fast.intention}</p>` : ''}
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

        const completedFasts = this.userFasts.filter(fast => 
            fast.status === 'completed' || fast.status === 'cancelled'
        );

        if (completedFasts.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div class="col-12 mt-4">
                <h5>Fast History</h5>
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Fast</th>
                                <th>Duration</th>
                                <th>Status</th>
                                <th>Progress</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${completedFasts.map(fast => {
                                const plan = this.plans.find(p => p.id == fast.plan_id) || {};
                                const start = new Date(fast.start_date);
                                const end = new Date(fast.end_date);
                                const duration = Math.round((end - start) / (1000 * 60 * 60 * 24));

                                return `
                                    <tr>
                                        <td>${plan.name || 'Custom Fast'}</td>
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
            </div>
        `;
    }

    renderUserSpecificContent() {
        this.renderActiveFasts();
        this.renderUpcomingFasts();
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
									<textarea class="form-control" id="intention" name="intention" rows="3" 
											  placeholder="Why are you starting this fast? What are you seeking God for?"></textarea>
								</div>

								<div class="mb-3">
									<label for="notes" class="form-label">Additional Notes</label>
									<textarea class="form-control" id="notes" name="notes" rows="2" 
											  placeholder="Any specific guidelines or personal rules for this fast?"></textarea>
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
        const now = new Date();
        now.setHours(now.getHours() + 1);
        now.setMinutes(0);
        return now.toISOString().slice(0, 16);
    }

    async startFast(modal) {
		const form = document.getElementById('startFastForm');
		if (!form) {
			this.showMessage('Form not found', 'error');
			return;
		}
		
		const formData = new FormData(form);
		const startDate = formData.get('start_date');
		
		// Validate start date is in the future
		const selectedDate = new Date(startDate);
		const now = new Date();
		if (selectedDate <= now) {
			this.showMessage('Please select a future start date and time', 'error');
			return;
		}
		
		const fastData = {
			plan_id: formData.get('plan_id'),
			start_date: startDate,
			intention: formData.get('intention'),
			notes: formData.get('notes')
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
				
				this.showMessage('Fast started successfully!', 'success');
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
        if (!confirm('Are you sure you want to end this fast?')) return;

        try {
            const response = await AuthHelper.apiCall('fasting/end.php', 'POST', { fast_id: fastId });
            
            if (response.success) {
                await this.loadUserFasts();
                this.categorizeFasts();
                this.renderUserSpecificContent();
                this.showMessage('Fast completed successfully!', 'success');
            } else {
                this.showMessage('Error: ' + response.message, 'error');
            }
        } catch (error) {
            console.error('Error ending fast:', error);
            this.showMessage('Error ending fast', 'error');
        }
    }

    async cancelFast(fastId) {
        if (!confirm('Are you sure you want to cancel this fast?')) return;

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
        const modalHtml = `
            <div class="modal fade" id="fastDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Fast Details - ${fast.plan_name || 'Custom Fast'}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Fast Information</h6>
                                    <table class="table table-sm">
                                        <tr>
                                            <td><strong>Plan:</strong></td>
                                            <td>${fast.plan_name || 'Custom'}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Duration:</strong></td>
                                            <td>${fast.duration_days} days</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Difficulty:</strong></td>
                                            <td>
                                                <span class="badge bg-${this.getDifficultyColor(fast.difficulty)}">
                                                    ${fast.difficulty}
                                                </span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>Status:</strong></td>
                                            <td>
                                                <span class="badge bg-${this.getStatusColor(fast.status)}">
                                                    ${fast.status}
                                                </span>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                                <div class="col-md-6">
                                    <h6>Timeline</h6>
                                    <table class="table table-sm">
                                        <tr>
                                            <td><strong>Start:</strong></td>
                                            <td>${new Date(fast.start_date).toLocaleString()}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>End:</strong></td>
                                            <td>${new Date(fast.end_date).toLocaleString()}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Progress:</strong></td>
                                            <td>${fast.progress_percent || 0}% complete</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Elapsed:</strong></td>
                                            <td>${fast.elapsed_days} days</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Remaining:</strong></td>
                                            <td>${fast.remaining_days} days</td>
                                        </tr>
                                    </table>
                                </div>
                            </div>

                            ${fast.intention ? `
                                <div class="mt-3">
                                    <h6>Fast Intention</h6>
                                    <p class="p-3 bg-light rounded">${fast.intention}</p>
                                </div>
                            ` : ''}

                            ${fast.journal_entries && fast.journal_entries.length > 0 ? `
                                <div class="mt-3">
                                    <h6>Journal Entries</h6>
                                    <div class="journal-entries">
                                        ${fast.journal_entries.map(entry => `
                                            <div class="card mb-2">
                                                <div class="card-body py-2">
                                                    <h6 class="card-title mb-1">${entry.title || 'Journal Entry'}</h6>
                                                    <p class="card-text small mb-1">${entry.content}</p>
                                                    <small class="text-muted">
                                                        ${new Date(entry.entry_date).toLocaleDateString()}
                                                        ${entry.mood ? ` • Mood: ${entry.mood}` : ''}
                                                    </small>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : `
                                <div class="mt-3 text-center">
                                    <p class="text-muted">No journal entries for this fast period.</p>
                                </div>
                            `}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            ${fast.status === 'active' ? `
                                <button class="btn btn-success" onclick="fastingApp.endFast(${fast.id})">
                                    End Fast
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
		// Refresh plans button
        const refreshBtn = document.getElementById('refreshPlansBtn');
		if (refreshBtn) {
			refreshBtn.addEventListener('click', () => {
				this.toggleFastingPlans();
			});
		}
		
        // Add any additional event bindings here
    }

    startTimers() {
        setInterval(() => {
            this.updateClocks();
        }, 1000);
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
        window.app.switchTab('fasting');
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