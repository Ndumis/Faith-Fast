class Groups {
    constructor() {
        this.groups = [];
        this.myGroups = [];
        this.pendingRequests = {};
        this.currentView = 'list'; // 'list', 'create', 'manage'
        this.init();
    }

    async init() {
        await this.loadGroups();
        await this.loadMyGroups();
		await this.loadUserMembershipStatus();
        this.render();
        this.bindEvents();
    }
	
	async loadUserMembershipStatus() {
		try {
			const response = await AuthHelper.apiCall('groups/membership_status.php');
			if (response.success) {
				this.userMemberships = response.memberships || {};
			}
		} catch (error) {
			console.error('Error loading user membership status:', error);
			this.userMemberships = {};
		}
	}

    async loadGroups() {
        try {
            const response = await AuthHelper.apiCall('groups/list.php');
            if (response.success) {
                this.groups = response.groups;
            }
        } catch (error) {
            console.error('Error loading groups:', error);
        }
    }

    async loadMyGroups() {
        try {
            const response = await AuthHelper.apiCall('groups/my.php');
            if (response.success) {
                this.myGroups = response.groups;
            }
        } catch (error) {
            console.error('Error loading my groups:', error);
        }
    }

    render() {
        const container = document.getElementById('groups-tab');
        if (!container) return;

        container.innerHTML = `
            <div class="tab-header">
                <h2><i class="fas fa-users"></i> Groups</h2>
                <button class="btn btn-primary" id="showCreateGroupForm">
                    <i class="fas fa-plus"></i> Create Group
                </button>
            </div>

            <div class="groups-container">
                <!-- Create Group Form (shown when creating) -->
                <div id="createGroupSection" class="card mb-4 d-none">
                    <div class="card-header">
                        <h3>Create New Group</h3>
                    </div>
                    <div class="card-body">
                        <form id="createGroupForm">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="groupName" class="form-label">Group Name *</label>
                                        <input type="text" class="form-control" id="groupName" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="groupCategory" class="form-label">Category</label>
                                        <select class="form-select" id="groupCategory">
                                            <option value="General">General</option>
                                            <option value="Prayer">Prayer</option>
                                            <option value="Bible Study">Bible Study</option>
                                            <option value="Fasting">Fasting</option>
                                            <option value="Support">Support</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label for="groupTags" class="form-label">Tags (comma separated)</label>
                                        <input type="text" class="form-control" id="groupTags" placeholder="prayer, fasting, bible">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="groupDescription" class="form-label">Description</label>
                                        <textarea class="form-control" id="groupDescription" rows="3"></textarea>
                                    </div>
                                    <div class="mb-3">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="isPublic" checked>
                                            <label class="form-check-label" for="isPublic">
                                                Public Group (visible to everyone)
                                            </label>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="requiresApproval" checked>
                                            <label class="form-check-label" for="requiresApproval">
                                                Require approval to join
                                            </label>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="maxMembers" class="form-label">Maximum Members</label>
                                        <input type="number" class="form-control" id="maxMembers" value="50" min="2" max="1000">
                                    </div>
                                </div>
                            </div>
                            <div class="d-flex gap-2">
                                <button type="submit" class="btn btn-primary">Create Group</button>
                                <button type="button" class="btn btn-secondary" id="cancelCreateGroup">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Search and Filter -->
                <div class="card mb-4">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <input type="text" id="searchGroups" class="form-control" placeholder="Search groups...">
                            </div>
                            <div class="col-md-3">
                                <select id="categoryFilter" class="form-select">
                                    <option value="">All Categories</option>
                                    <option value="General">General</option>
                                    <option value="Prayer">Prayer</option>
                                    <option value="Bible Study">Bible Study</option>
                                    <option value="Fasting">Fasting</option>
                                    <option value="Support">Support</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <select id="membershipFilter" class="form-select">
                                    <option value="all">All Groups</option>
                                    <option value="my">My Groups</option>
                                    <option value="public">Public Groups</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- My Groups Section -->
                <div class="my-groups-section mb-5">
                    <h3>My Groups</h3>
                    <div id="myGroupsList" class="row">
                        <!-- My groups will be loaded here -->
                    </div>
                </div>

                <!-- All Groups Section -->
                <div class="all-groups-section">
                    <h3>Discover Groups</h3>
                    <div id="groupsDiscoverList" class="row">
                        <!-- All groups will be loaded here -->
                    </div>
                </div>

                <!-- Group Management Section -->
                <div id="groupManagementSection" class="d-none">
                    <!-- This will be populated when managing a specific group -->
                </div>
            </div>
        `;

        this.renderGroups();
        this.bindEvents();
    }

    renderGroups() {
        this.renderMyGroups();
        this.renderDiscoverGroups();
    }

    renderMyGroups() {
		const container = document.getElementById('myGroupsList');
		if (!container) return;

		if (this.myGroups.length === 0) {
			container.innerHTML = `
				<div class="col-12">
					<div class="alert alert-info">
						<i class="fas fa-info-circle"></i> You haven't joined any groups yet.
					</div>
				</div>
			`;
			return;
		}

		container.innerHTML = this.myGroups.map(group => {
			const pendingCount = group.pending_requests_count || 0;
			const showNotification = group.is_admin && pendingCount > 0;

			return `
				<div class="col-md-6 col-lg-4 mb-3">
					<div class="card group-card h-100" data-group-id="${group.id}">
						<div class="card-body">
							<div class="d-flex justify-content-between align-items-start mb-2">
								<h5 class="card-title">${this.escapeHtml(group.name)}</h5>
								<div>
									${showNotification ? `
										<span class="badge bg-danger me-1" title="${pendingCount} pending request(s)">
											<i class="fas fa-bell"></i> ${pendingCount}
										</span>
									` : ''}
									<span class="badge bg-${group.is_admin ? 'primary' : 'secondary'}">
										${group.is_admin ? 'Admin' : 'Member'}
									</span>
								</div>
							</div>
							<p class="card-text text-muted small">${this.escapeHtml(group.description || 'No description')}</p>
							<div class="group-meta">
								<small class="text-muted">
									<i class="fas fa-users"></i> ${group.member_count} members
								</small>
								<small class="text-muted">
									<i class="fas fa-tag"></i> ${group.category || 'General'}
								</small>
								${showNotification ? `
									<small class="text-warning">
										<i class="fas fa-exclamation-circle"></i> ${pendingCount} pending
									</small>
								` : ''}
							</div>
						</div>
						<div class="card-footer">
							<div class="d-flex gap-2 flex-wrap">
								<!-- View button - always visible for all members -->
								<button class="btn btn-sm btn-outline-primary view-group" data-group-id="${group.id}">
									<i class="fas fa-eye"></i> View
								</button>
								
								<!-- Manage button - only for admins -->
								${group.is_admin ? `
									<button class="btn btn-sm btn-outline-secondary manage-group" data-group-id="${group.id}">
										<i class="fas fa-cog"></i> Manage
									</button>
								` : ''}
								
								<!-- Leave button - always visible -->
								<button class="btn btn-sm btn-outline-danger leave-group" data-group-id="${group.id}">
									<i class="fas fa-sign-out-alt"></i> Leave
								</button>
							</div>
						</div>
					</div>
				</div>
			`;
		}).join('');
	}

    renderDiscoverGroups() {
		const container = document.getElementById('groupsDiscoverList');
		if (!container) return;

		const myGroupIds = this.myGroups.map(g => g.id);
		const availableGroups = this.groups.filter(group => !myGroupIds.includes(group.id));

		if (availableGroups.length === 0) {
			container.innerHTML = `
				<div class="col-12">
					<div class="alert alert-info">
						<i class="fas fa-info-circle"></i> No groups available to join.
					</div>
				</div>
			`;
			return;
		}

		container.innerHTML = availableGroups.map(group => {
			const membershipStatus = this.userMemberships[group.id];
			const isPending = membershipStatus === 'pending';
			const canJoin = !membershipStatus || membershipStatus === 'rejected';

			return `
				<div class="col-md-6 col-lg-4 mb-3">
					<div class="card group-card h-100" data-group-id="${group.id}">
						<div class="card-body">
							<h5 class="card-title">${this.escapeHtml(group.name)}</h5>
							<p class="card-text text-muted small">${this.escapeHtml(group.description || 'No description')}</p>
							<div class="group-meta">
								<small class="text-muted">
									<i class="fas fa-users"></i> ${group.member_count} members
								</small>
								<small class="text-muted">
									<i class="fas fa-tag"></i> ${group.category || 'General'}
								</small>
								<small class="text-muted">
									<i class="fas ${group.requires_approval ? 'fa-lock' : 'fa-lock-open'}"></i>
									${group.requires_approval ? 'Approval Required' : 'Open Join'}
								</small>
							</div>
							${isPending ? `
								<div class="mt-2">
									<span class="badge bg-warning text-dark">
										<i class="fas fa-clock"></i> Pending Approval
									</span>
								</div>
							` : ''}
						</div>
						<div class="card-footer">
							${canJoin ? `
								<button class="btn btn-sm btn-primary join-group" data-group-id="${group.id}">
									<i class="fas fa-plus"></i> Join Group
								</button>
							` : `
								<button class="btn btn-sm btn-secondary" disabled>
									${isPending ? 'Pending Approval' : 'Already Member'}
								</button>
							`}
						</div>
					</div>
				</div>
			`;
		}).join('');
	}

    bindEvents() {
        // Create group form
        document.getElementById('showCreateGroupForm')?.addEventListener('click', () => this.showCreateForm());
        document.getElementById('cancelCreateGroup')?.addEventListener('click', () => this.hideCreateForm());
        document.getElementById('createGroupForm')?.addEventListener('submit', (e) => this.handleCreateGroup(e));

        // Search and filter
        document.getElementById('searchGroups')?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('categoryFilter')?.addEventListener('change', (e) => this.handleFilter());
        document.getElementById('membershipFilter')?.addEventListener('change', (e) => this.handleFilter());

        // Group actions
        document.addEventListener('click', (e) => {
            if (e.target.closest('.join-group')) {
                const groupId = e.target.closest('.join-group').dataset.groupId;
                this.joinGroup(groupId);
            }
            if (e.target.closest('.leave-group')) {
                const groupId = e.target.closest('.leave-group').dataset.groupId;
                this.leaveGroup(groupId);
            }
            if (e.target.closest('.manage-group')) {
                const groupId = e.target.closest('.manage-group').dataset.groupId;
                this.manageGroup(groupId);
            }
            if (e.target.closest('.view-group')) {
                const groupId = e.target.closest('.view-group').dataset.groupId;
                this.viewGroup(groupId);
            }
        });
    }

    showCreateForm() {
        document.getElementById('createGroupSection').classList.remove('d-none');
        document.getElementById('groupName').focus();
    }

    hideCreateForm() {
        document.getElementById('createGroupSection').classList.add('d-none');
        document.getElementById('createGroupForm').reset();
    }

    async handleCreateGroup(e) {
		e.preventDefault();
		
		const submitBtn = e.target.querySelector('button[type="submit"]');
		const originalText = submitBtn.innerHTML;
		
		// Disable button to prevent duplicate submissions
		submitBtn.disabled = true;
		submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
		
		const formData = {
			name: document.getElementById('groupName').value,
			description: document.getElementById('groupDescription').value,
			category: document.getElementById('groupCategory').value,
			tags: document.getElementById('groupTags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
			is_public: document.getElementById('isPublic').checked ? 1 : 0,
			requires_approval: document.getElementById('requiresApproval').checked ? 1 : 0,
			max_members: parseInt(document.getElementById('maxMembers').value)
		};

		try {
			const response = await AuthHelper.apiCall('groups/create.php', 'POST', formData);
			
			if (response.success) {
				this.showMessage('Group created successfully!', 'success');
				this.hideCreateForm();
				await this.loadGroups();
				await this.loadMyGroups();
				this.renderGroups();
			} else {
				this.showMessage(response.message, 'error');
			}
		} catch (error) {
			this.showMessage('Error creating group: ' + error.message, 'error');
		} finally {
			// Re-enable button
			submitBtn.disabled = false;
			submitBtn.innerHTML = originalText;
		}
	}

    async joinGroup(groupId) {
		try {
			const response = await AuthHelper.apiCall('groups/join.php', 'POST', { group_id: groupId });
			
			if (response.success) {
				const message = response.requires_approval 
					? 'Join request sent. Waiting for approval.' 
					: 'Successfully joined the group!';
				this.showMessage(message, 'success');
				
				// Refresh membership status and groups
				await this.loadUserMembershipStatus();
				await this.loadMyGroups();
				await this.loadGroups();
				this.renderGroups();
			} else {
				this.showMessage(response.message, 'error');
			}
		} catch (error) {
			this.showMessage('Error joining group: ' + error.message, 'error');
		}
	}

	async leaveGroup(groupId) {
		if (!confirm('Are you sure you want to leave this group?')) return;

		try {
			const response = await AuthHelper.apiCall('groups/leave.php', 'POST', { group_id: groupId });
			
			if (response.success) {
				this.showMessage('Left group successfully', 'success');
				await this.loadMyGroups();
				await this.loadGroups();
				this.renderGroups();
			} else {
				this.showMessage(response.message, 'error');
			}
		} catch (error) {
			this.showMessage('Error leaving group: ' + error.message, 'error');
		}
	}

    async manageGroup(groupId) {
		try {
			// Load group details and members first
			const [groupResponse, membersResponse] = await Promise.all([
				AuthHelper.apiCall('groups/details.php', 'POST', { group_id: groupId }),
				AuthHelper.apiCall('groups/members.php', 'POST', { group_id: groupId })
			]);
			
			if (groupResponse.success && membersResponse.success) {
				// Try to load pending requests, but don't fail if it errors
				let pendingRequests = [];
				try {
					const pendingResponse = await AuthHelper.apiCall('groups/pending.php', 'POST', { group_id: groupId });
					if (pendingResponse.success) {
						pendingRequests = pendingResponse.pending_requests || [];
					}
				} catch (pendingError) {
					console.warn('Could not load pending requests:', pendingError);
					// Continue without pending requests
				}
				
				this.showGroupManagement(
					groupResponse.group, 
					membersResponse.members, 
					pendingRequests
				);
			} else {
				this.showMessage('Error loading group management data', 'error');
			}
		} catch (error) {
			this.showMessage('Error loading group management: ' + error.message, 'error');
		}
	}

	showGroupManagement(group, members, pendingRequests) {
		const container = document.getElementById('groups-tab');
		
		container.innerHTML = `
			<div class="tab-header">
				<button class="btn btn-secondary" id="backToGroupsList">
					<i class="fas fa-arrow-left"></i> Back to Groups
				</button>
				<h2>Manage Group: ${this.escapeHtml(group.name)}</h2>
			</div>

			<div class="group-management-container">
				<!-- Pending Requests -->
				${pendingRequests.length > 0 ? `
					<div class="card mb-4">
						<div class="card-header">
							<h3>Pending Join Requests (${pendingRequests.length})</h3>
						</div>
						<div class="card-body">
							${pendingRequests.map(request => `
								<div class="pending-request d-flex justify-content-between align-items-center mb-3 p-3 border rounded">
									<div>
										<h5 class="mb-1">${this.escapeHtml(request.user_name)}</h5>
										<p class="mb-1 text-muted">${request.email}</p>
										<small>Requested on: ${new Date(request.joined_at).toLocaleDateString()}</small>
									</div>
									<div class="request-actions">
										<button class="btn btn-success btn-sm approve-request" 
												data-request-id="${request.id}">
											<i class="fas fa-check"></i> Approve
										</button>
										<button class="btn btn-danger btn-sm reject-request" 
												data-request-id="${request.id}">
											<i class="fas fa-times"></i> Reject
										</button>
									</div>
								</div>
							`).join('')}
						</div>
					</div>
				` : ''}

				<!-- Group Members -->
				<div class="card mb-4">
					<div class="card-header d-flex justify-content-between align-items-center">
						<h3>Group Members (${members.length})</h3>
					</div>
					<div class="card-body">
						<div class="members-management-list">
							${members.map(member => `
								<div class="member-management-item d-flex justify-content-between align-items-center mb-3 p-3 border rounded">
									<div class="d-flex align-items-center">
										<div class="member-avatar me-3">
											<i class="fas fa-user-circle ${member.is_online ? 'text-success' : 'text-muted'} fa-2x"></i>
										</div>
										<div>
											<h5 class="mb-1">${this.escapeHtml(member.name)}</h5>
											<span class="badge ${member.role === 'admin' ? 'bg-primary' : 'bg-secondary'}">
												${member.role}
											</span>
											${member.is_online ? 
												'<span class="badge bg-success">Online</span>' : 
												'<span class="badge bg-secondary">Offline</span>'
											}
										</div>
									</div>
									<div class="member-actions">
										${member.role !== 'admin' ? `
											<button class="btn btn-warning btn-sm make-admin" 
													data-member-id="${member.membership_id}" 
													data-user-id="${member.user_id}">
												Make Admin
											</button>
										` : ''}
										<button class="btn btn-danger btn-sm remove-member" 
												data-member-id="${member.membership_id}" 
												data-user-name="${this.escapeHtml(member.name)}">
											Remove
										</button>
									</div>
								</div>
							`).join('')}
						</div>
					</div>
				</div>

				<!-- Group Settings -->
				<div class="card">
					<div class="card-header">
						<h3>Group Settings</h3>
					</div>
					<div class="card-body">
						<form id="updateGroupForm">
							<div class="row">
								<div class="col-md-6">
									<div class="mb-3">
										<label for="editGroupName" class="form-label">Group Name</label>
										<input type="text" class="form-control" id="editGroupName" value="${this.escapeHtml(group.name)}" required>
									</div>
									<div class="mb-3">
										<label for="editGroupDescription" class="form-label">Description</label>
										<textarea class="form-control" id="editGroupDescription" rows="3">${this.escapeHtml(group.description || '')}</textarea>
									</div>
								</div>
								<div class="col-md-6">
									<div class="mb-3">
										<label for="editGroupCategory" class="form-label">Category</label>
										<select class="form-select" id="editGroupCategory">
											<option value="General" ${group.category === 'General' ? 'selected' : ''}>General</option>
											<option value="Prayer" ${group.category === 'Prayer' ? 'selected' : ''}>Prayer</option>
											<option value="Bible Study" ${group.category === 'Bible Study' ? 'selected' : ''}>Bible Study</option>
											<option value="Fasting" ${group.category === 'Fasting' ? 'selected' : ''}>Fasting</option>
											<option value="Support" ${group.category === 'Support' ? 'selected' : ''}>Support</option>
										</select>
									</div>
									<div class="mb-3">
										<div class="form-check">
											<input class="form-check-input" type="checkbox" id="editIsPublic" ${group.is_public ? 'checked' : ''}>
											<label class="form-check-label" for="editIsPublic">
												Public Group
											</label>
										</div>
									</div>
									<div class="mb-3">
										<div class="form-check">
											<input class="form-check-input" type="checkbox" id="editRequiresApproval" ${group.requires_approval ? 'checked' : ''}>
											<label class="form-check-label" for="editRequiresApproval">
												Require approval to join
											</label>
										</div>
									</div>
								</div>
							</div>
							<button type="submit" class="btn btn-primary">Update Group</button>
							<button type="button" class="btn btn-danger" id="deleteGroup">Delete Group</button>
						</form>
					</div>
				</div>
			</div>
		`;

		// Add event listeners for management actions
		this.bindManagementEvents(group.id);
		
		// Back button
		document.getElementById('backToGroupsList').addEventListener('click', () => {
			this.currentView = 'list';
			this.render();
		});
	}

	bindManagementEvents(groupId) {
		// Approve/Reject requests
		document.querySelectorAll('.approve-request').forEach(btn => {
			btn.addEventListener('click', (e) => {
				this.handleMembershipAction(e.target.dataset.requestId, 'approve', groupId);
			});
		});
		
		document.querySelectorAll('.reject-request').forEach(btn => {
			btn.addEventListener('click', (e) => {
				this.handleMembershipAction(e.target.dataset.requestId, 'reject', groupId);
			});
		});

		// Member management
		document.querySelectorAll('.make-admin').forEach(btn => {
			btn.addEventListener('click', (e) => {
				this.updateMemberRole(e.target.dataset.memberId, 'admin', groupId);
			});
		});

		document.querySelectorAll('.remove-member').forEach(btn => {
			btn.addEventListener('click', (e) => {
				const userName = e.target.dataset.userName;
				if (confirm(`Are you sure you want to remove ${userName} from the group?`)) {
					this.removeMember(e.target.dataset.memberId, groupId);
				}
			});
		});

		// Group settings
		document.getElementById('updateGroupForm').addEventListener('submit', (e) => {
			e.preventDefault();
			this.updateGroupSettings(groupId);
		});

		document.getElementById('deleteGroup').addEventListener('click', () => {
			this.deleteGroup(groupId);
		});
	}

	async handleMembershipAction(membershipId, action, groupId) {
		try {
			const response = await AuthHelper.apiCall('groups/approve.php', 'POST', {
				membership_id: membershipId,
				action: action
			});
			
			if (response.success) {
				this.showMessage(`Request ${action}d successfully`, 'success');
				// Reload management view
				this.manageGroup(groupId);
			} else {
				this.showMessage(response.message, 'error');
			}
		} catch (error) {
			this.showMessage('Error processing request: ' + error.message, 'error');
		}
	}

    async viewGroup(groupId) {
		try {
			const response = await AuthHelper.apiCall('groups/details.php', 'POST', { group_id: groupId });
			
			if (response.success) {
				// Ensure members have is_online property even if query fails
				const members = response.members.map(member => ({
					...member,
					is_online: member.is_online || false
				}));
				this.showGroupDetails(response.group, members);
			} else {
				this.showMessage(response.message, 'error');
			}
		} catch (error) {
			this.showMessage('Error loading group details: ' + error.message, 'error');
		}
	}

	showGroupDetails(group, members) {
		const container = document.getElementById('groups-tab');
		
		container.innerHTML = `
			<div class="tab-header">
				<button class="btn btn-secondary" id="backToGroupsList">
					<i class="fas fa-arrow-left"></i> Back to Groups
				</button>
				<h2>${this.escapeHtml(group.name)}</h2>
			</div>

			<div class="group-details-container">
				<div class="row">
					<div class="col-md-8">
						<div class="card mb-4">
							<div class="card-header">
								<h3>Group Information</h3>
							</div>
							<div class="card-body">
								<div class="row">
									<div class="col-md-6">
										<p><strong>Category:</strong> ${group.category}</p>
										<p><strong>Members:</strong> ${group.member_count}</p>
										<p><strong>Privacy:</strong> ${group.is_public ? 'Public' : 'Private'}</p>
									</div>
									<div class="col-md-6">
										<p><strong>Join Type:</strong> ${group.requires_approval ? 'Approval Required' : 'Open Join'}</p>
										<p><strong>Created:</strong> ${new Date(group.created_at).toLocaleDateString()}</p>
										<p><strong>Leader:</strong> ${this.escapeHtml(group.leader_name)}</p>
									</div>
								</div>
								<div class="mt-3">
									<h5>Description</h5>
									<p>${this.escapeHtml(group.description || 'No description provided.')}</p>
								</div>
								${group.tags ? `
									<div class="mt-3">
										<h5>Tags</h5>
										<div class="tags-container">
											${JSON.parse(group.tags).map(tag => 
												`<span class="badge bg-secondary">${this.escapeHtml(tag)}</span>`
											).join('')}
										</div>
									</div>
								` : ''}
							</div>
						</div>
					</div>
					
					<div class="col-md-4">
						<div class="card">
							<div class="card-header">
								<h3>Members (${members.length})</h3>
							</div>
							<div class="card-body">
								<div class="members-list">
									${members.map(member => `
										<div class="member-item d-flex align-items-center mb-2">
											<div class="member-avatar me-2">
												<i class="fas fa-user-circle ${member.is_online ? 'text-success' : 'text-muted'}"></i>
											</div>
											<div class="member-info flex-grow-1">
												<div class="member-name">${this.escapeHtml(member.name)}</div>
												<small class="text-muted">${member.role}</small>
											</div>
											${member.is_online ? 
												'<span class="badge bg-success">Online</span>' : 
												'<span class="badge bg-secondary">Offline</span>'
											}
										</div>
									`).join('')}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;

		// Add back button event
		document.getElementById('backToGroupsList').addEventListener('click', () => {
			this.currentView = 'list';
			this.render();
		});
	}

    handleSearch(query) {
        // Implement search functionality
        const cards = document.querySelectorAll('.group-card');
        cards.forEach(card => {
            const title = card.querySelector('.card-title').textContent.toLowerCase();
            const description = card.querySelector('.card-text').textContent.toLowerCase();
            const matches = title.includes(query.toLowerCase()) || description.includes(query.toLowerCase());
            card.closest('.col-md-6').style.display = matches ? 'block' : 'none';
        });
    }

    handleFilter() {
		const categoryFilter = document.getElementById('categoryFilter').value;
		const membershipFilter = document.getElementById('membershipFilter').value;
		const searchQuery = document.getElementById('searchGroups').value.toLowerCase();

		const myGroupCards = document.querySelectorAll('#myGroupsList .group-card');
		const discoverCards = document.querySelectorAll('#groupsDiscoverList .group-card');

		// Filter My Groups
		myGroupCards.forEach(card => {
			const groupId = card.dataset.groupId;
			const group = this.myGroups.find(g => g.id == groupId);
			const matches = this.groupMatchesFilter(group, categoryFilter, membershipFilter, searchQuery);
			card.closest('.col-md-6').style.display = matches ? 'block' : 'none';
		});

		// Filter Discover Groups
		discoverCards.forEach(card => {
			const groupId = card.dataset.groupId;
			const group = this.groups.find(g => g.id == groupId);
			const myGroupIds = this.myGroups.map(g => g.id);
			const isMyGroup = myGroupIds.includes(groupId);
			
			// Only show if not in my groups and matches filter
			const matches = !isMyGroup && this.groupMatchesFilter(group, categoryFilter, membershipFilter, searchQuery);
			card.closest('.col-md-6').style.display = matches ? 'block' : 'none';
		});
	}

	groupMatchesFilter(group, categoryFilter, membershipFilter, searchQuery) {
		// Category filter
		if (categoryFilter && group.category !== categoryFilter) {
			return false;
		}

		// Membership filter
		if (membershipFilter === 'my') {
			const myGroupIds = this.myGroups.map(g => g.id);
			if (!myGroupIds.includes(group.id)) return false;
		} else if (membershipFilter === 'public') {
			if (!group.is_public) return false;
		}

		// Search filter
		if (searchQuery) {
			const matchesName = group.name.toLowerCase().includes(searchQuery);
			const matchesDescription = group.description.toLowerCase().includes(searchQuery);
			const matchesCategory = group.category.toLowerCase().includes(searchQuery);
			if (!matchesName && !matchesDescription && !matchesCategory) return false;
		}

		return true;
	}

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    showMessage(message, type) {
        // Implement message display
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.getElementById('groups-tab');
        container.insertBefore(alert, container.firstChild);
        
        setTimeout(() => alert.remove(), 5000);
    }
}

// Initialize groups when the tab is shown
document.addEventListener('DOMContentLoaded', function() {
    let groupsInstance = null;
    
    // Initialize when groups tab is shown
    document.addEventListener('click', function(e) {
        if (e.target.closest('[data-tab="groups"]')) {
            if (!groupsInstance) {
                groupsInstance = new Groups();
            }
        }
    });
});