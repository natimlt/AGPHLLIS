/**
 * ======================================================
 * AGPHL LIS - Inventory Management Module (FIXED)
 * Version: 1.0
 * Developer: Asrat Genet
 * ======================================================
 */

class InventoryManager {
    constructor() {
        this.inventory = [];
        this.filteredItems = [];
        this.currentPage = 1;
        this.pageSize = 10;
        this.searchTerm = '';
        this.categoryFilter = '';
        this.statusFilter = '';
        this.editingId = null;
        this.init();
    }

    init() {
        this.loadInventory();
        this.setupEventListeners();
        this.loadCategories();
        this.renderTable();
        this.updateStats();
        this.checkExpiryAlerts();
    }

    loadInventory() {
        this.inventory = storage.getAll('inventory') || [];
        this.applyFilters();
    }

    loadCategories() {
        const categories = ['Reagent', 'Consumable', 'Supplies', 'Equipment', 'Other'];
        const select = document.getElementById('invCategory');
        const filterSelect = document.getElementById('invCategoryFilter');
        
        if (select) {
            select.innerHTML = '<option value="">Select Category</option>';
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                select.appendChild(option);
            });
        }

        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">All Categories</option>';
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                filterSelect.appendChild(option);
            });
        }
    }

    setupEventListeners() {
        const addBtn = document.getElementById('addInventoryBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openInventoryModal());
        }

        const searchInput = document.getElementById('invSearch');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.searchTerm = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
                this.renderTable();
            }, 300));
        }

        const categoryFilter = document.getElementById('invCategoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.categoryFilter = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
                this.renderTable();
            });
        }

        const statusFilter = document.getElementById('invStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.statusFilter = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
                this.renderTable();
            });
        }

        const clearBtn = document.getElementById('clearInvFiltersBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }

        const form = document.getElementById('inventoryForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveItem();
            });
        }

        const movementForm = document.getElementById('stockMovementForm');
        if (movementForm) {
            movementForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processStockMovement();
            });
        }
    }

    applyFilters() {
        this.filteredItems = this.inventory.filter(item => {
            const searchMatch = this.searchTerm === '' ||
                (item.name || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                (item.category || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                (item.supplier || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                (item.location || '').toLowerCase().includes(this.searchTerm.toLowerCase());

            const categoryMatch = this.categoryFilter === '' || item.category === this.categoryFilter;
            const statusMatch = this.statusFilter === '' || item.status === this.statusFilter;

            return searchMatch && categoryMatch && statusMatch;
        });

        const statusOrder = { 'Critical': 0, 'Low': 1, 'Available': 2, 'Out of Stock': 3 };
        this.filteredItems.sort((a, b) => {
            return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
        });

        this.updateStats();
        this.updateCount();
    }

    clearFilters() {
        const searchInput = document.getElementById('invSearch');
        const categoryFilter = document.getElementById('invCategoryFilter');
        const statusFilter = document.getElementById('invStatusFilter');

        if (searchInput) searchInput.value = '';
        if (categoryFilter) categoryFilter.value = '';
        if (statusFilter) statusFilter.value = '';

        this.searchTerm = '';
        this.categoryFilter = '';
        this.statusFilter = '';
        this.currentPage = 1;
        this.applyFilters();
        this.renderTable();
    }

    renderTable() {
        const tbody = document.getElementById('inventoryTableBody');
        if (!tbody) return;

        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const pageItems = this.filteredItems.slice(start, end);

        if (pageItems.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9">
                        <div class="empty-state">
                            <div class="empty-icon">📦</div>
                            <h3>No Inventory Items</h3>
                            <p>${this.searchTerm ? 'Try adjusting your search criteria' : 'Start by adding inventory items'}</p>
                            ${!this.searchTerm ? '<button class="btn btn-primary btn-sm" onclick="inventoryManager.openInventoryModal()">Add Item</button>' : ''}
                        </div>
                    </td>
                </tr>
            `;
            this.renderPagination();
            return;
        }

        tbody.innerHTML = pageItems.map((item, index) => {
            const isExpired = item.expiryDate && new Date(item.expiryDate) < new Date();
            const isExpiringSoon = item.expiryDate && !isExpired && 
                (new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24) < 30;

            return `
                <tr>
                    <td>${start + index + 1}</td>
                    <td><strong>${item.name}</strong></td>
                    <td><span class="inventory-category ${(item.category || 'other').toLowerCase()}">${item.category || 'Other'}</span></td>
                    <td>
                        <strong>${item.quantity || 0}</strong>
                        <span style="font-size: var(--text-xs); color: var(--gray-500);">${item.unit || 'pcs'}</span>
                    </td>
                    <td>${item.supplier || 'N/A'}</td>
                    <td>${item.location || 'N/A'}</td>
                    <td>
                        <span class="stock-status ${(item.status || 'available').toLowerCase()}">
                            ${item.status || 'Available'}
                        </span>
                    </td>
                    <td>
                        <span class="expiry-warning ${isExpired ? 'expired' : isExpiringSoon ? 'soon' : 'valid'}">
                            ${item.expiryDate ? Utils.formatDate(item.expiryDate, 'MM/DD/YYYY') : 'N/A'}
                            ${isExpired ? ' ⚠ EXPIRED' : isExpiringSoon ? ' ⚠ Soon' : ''}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-btn" onclick="inventoryManager.viewItem('${item.id}')" title="View">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                            </button>
                            <button class="action-btn" style="color: var(--success);" onclick="inventoryManager.openStockMovementModal('in', '${item.id}')" title="Stock In">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                                    <polyline points="17 6 23 6 23 12"/>
                                </svg>
                            </button>
                            <button class="action-btn" style="color: var(--danger);" onclick="inventoryManager.openStockMovementModal('out', '${item.id}')" title="Stock Out">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
                                    <polyline points="17 18 23 18 23 12"/>
                                </svg>
                            </button>
                            <button class="action-btn edit-btn" onclick="inventoryManager.editItem('${item.id}')" title="Edit">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                            </button>
                            <button class="action-btn delete-btn" onclick="inventoryManager.deleteItem('${item.id}')" title="Delete">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        this.renderPagination();
    }

    renderPagination() {
        const container = document.getElementById('inventoryPagination');
        const info = document.getElementById('inventoryPaginationInfo');
        if (!container) return;

        const totalPages = Math.ceil(this.filteredItems.length / this.pageSize);
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            if (info) info.textContent = `Showing ${this.filteredItems.length} items`;
            return;
        }

        const pages = Utils.generatePagination(this.currentPage, totalPages);
        
        container.innerHTML = `
            <button onclick="inventoryManager.goToPage(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>
                ←
            </button>
            ${pages.map(page => `
                <button class="${page === this.currentPage ? 'active' : ''}" 
                        onclick="${page === '...' ? '' : `inventoryManager.goToPage(${page})`}"
                        ${page === '...' ? 'disabled' : ''}>
                    ${page}
                </button>
            `).join('')}
            <button onclick="inventoryManager.goToPage(${this.currentPage + 1})" ${this.currentPage === totalPages ? 'disabled' : ''}>
                →
            </button>
        `;

        if (info) {
            const start = (this.currentPage - 1) * this.pageSize + 1;
            const end = Math.min(start + this.pageSize - 1, this.filteredItems.length);
            info.textContent = `Showing ${start}-${end} of ${this.filteredItems.length} items`;
        }
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredItems.length / this.pageSize);
        if (page < 1 || page > totalPages) return;
        this.currentPage = page;
        this.renderTable();
    }

    updateStats() {
        const totalEl = document.getElementById('totalItemsCount');
        const lowEl = document.getElementById('lowStockCount');
        const criticalEl = document.getElementById('criticalStockCount');
        const outEl = document.getElementById('outOfStockCount');

        if (totalEl) totalEl.textContent = this.inventory.length;
        if (lowEl) lowEl.textContent = this.inventory.filter(i => i.status === 'Low').length;
        if (criticalEl) criticalEl.textContent = this.inventory.filter(i => i.status === 'Critical').length;
        if (outEl) outEl.textContent = this.inventory.filter(i => i.status === 'Out of Stock').length;
    }

    updateCount() {
        const countEl = document.getElementById('inventoryCount');
        if (countEl) {
            const total = this.filteredItems.length;
            countEl.textContent = `Showing ${total} item${total !== 1 ? 's' : ''}`;
        }
    }

    checkExpiryAlerts() {
        const expired = this.inventory.filter(i => 
            i.expiryDate && new Date(i.expiryDate) < new Date() && i.quantity > 0
        );
        const expiringSoon = this.inventory.filter(i => 
            i.expiryDate && 
            new Date(i.expiryDate) > new Date() &&
            (new Date(i.expiryDate) - new Date()) / (1000 * 60 * 60 * 24) < 30 &&
            i.quantity > 0
        );

        if (expired.length > 0) {
            const names = expired.map(i => i.name).join(', ');
            showToast(`⚠️ ${expired.length} item(s) expired: ${names}`, 'error');
        }

        if (expiringSoon.length > 0) {
            const names = expiringSoon.map(i => i.name).join(', ');
            showToast(`📅 ${expiringSoon.length} item(s) expiring soon: ${names}`, 'warning');
        }
    }

    openInventoryModal(item = null) {
        const modal = document.getElementById('inventoryModal');
        const title = document.getElementById('inventoryModalTitle');
        const form = document.getElementById('inventoryForm');
        
        if (!modal) return;

        form.reset();
        this.clearErrors();
        this.editingId = null;
        document.getElementById('invQuantity').value = 0;

        this.loadCategories();

        if (item) {
            title.textContent = 'Edit Inventory Item';
            document.getElementById('saveInventoryBtn').innerHTML = '<span class="btn-text">Update Item</span><span class="btn-loader" style="display: none;"><span class="spinner"></span></span>';
            this.editingId = item.id;
            this.fillForm(item);
        } else {
            title.textContent = 'Add Inventory Item';
            document.getElementById('saveInventoryBtn').innerHTML = '<span class="btn-text">Add Item</span><span class="btn-loader" style="display: none;"><span class="spinner"></span></span>';
        }

        modal.style.display = 'flex';
        document.getElementById('invName').focus();
    }

    fillForm(item) {
        document.getElementById('invName').value = item.name || '';
        document.getElementById('invCategory').value = item.category || '';
        document.getElementById('invQuantity').value = item.quantity || 0;
        document.getElementById('invUnit').value = item.unit || 'pcs';
        document.getElementById('invSupplier').value = item.supplier || '';
        document.getElementById('invLocation').value = item.location || '';
        document.getElementById('invStatus').value = item.status || 'Available';
        document.getElementById('invExpiryDate').value = item.expiryDate || '';
        document.getElementById('invBatchNumber').value = item.batchNumber || '';
        document.getElementById('invReorderLevel').value = item.reorderLevel || 10;
        document.getElementById('invNotes').value = item.notes || '';
    }

    saveItem() {
        const data = {
            name: document.getElementById('invName').value.trim(),
            category: document.getElementById('invCategory').value,
            quantity: parseInt(document.getElementById('invQuantity').value) || 0,
            unit: document.getElementById('invUnit').value.trim() || 'pcs',
            supplier: document.getElementById('invSupplier').value.trim(),
            location: document.getElementById('invLocation').value.trim(),
            status: document.getElementById('invStatus').value || 'Available',
            expiryDate: document.getElementById('invExpiryDate').value || null,
            batchNumber: document.getElementById('invBatchNumber').value.trim(),
            reorderLevel: parseInt(document.getElementById('invReorderLevel').value) || 10,
            notes: document.getElementById('invNotes').value.trim()
        };

        if (!data.name || !data.category) {
            showToast('Please fill in all required fields', 'warning');
            return;
        }

        data.status = this.calculateStatus(data.quantity, data.reorderLevel);

        const isEdit = this.editingId;
        try {
            if (isEdit) {
                storage.update('inventory', isEdit, data);
                showToast('Item updated successfully', 'success');
                this.editingId = null;
            } else {
                storage.create('inventory', data);
                showToast('Item added successfully', 'success');
            }
            
            this.loadInventory();
            this.renderTable();
            this.updateStats();
            this.closeInventoryModal();
        } catch (error) {
            showToast('Error saving item: ' + error.message, 'error');
        }
    }

    calculateStatus(quantity, reorderLevel) {
        if (quantity <= 0) return 'Out of Stock';
        if (quantity <= reorderLevel * 0.3) return 'Critical';
        if (quantity <= reorderLevel) return 'Low';
        return 'Available';
    }

    editItem(id) {
        const item = storage.getById('inventory', id);
        if (item) {
            this.openInventoryModal(item);
        }
    }

    viewItem(id) {
        const item = storage.getById('inventory', id);
        if (!item) {
            showToast('Item not found', 'error');
            return;
        }

        const modal = document.getElementById('inventoryViewModal');
        const content = document.getElementById('inventoryViewContent');
        if (!modal || !content) return;

        const movements = storage.getAll('stockMovements') || [];
        const itemMovements = movements.filter(m => m.itemId === item.id).slice(-10).reverse();

        content.innerHTML = `
            <div class="card" style="padding: 1.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h4 style="margin: 0;">${item.name}</h4>
                        <div style="color: var(--gray-500); font-size: var(--text-sm);">
                            ${item.category || 'Other'} • Batch: ${item.batchNumber || 'N/A'}
                        </div>
                    </div>
                    <span class="stock-status ${(item.status || 'available').toLowerCase()}">${item.status || 'Available'}</span>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin: 1rem 0;">
                    <div class="stat-mini">
                        <span class="stat-mini-value">${item.quantity || 0}</span>
                        <span class="stat-mini-label">Quantity (${item.unit || 'pcs'})</span>
                    </div>
                    <div class="stat-mini">
                        <span class="stat-mini-value">${item.reorderLevel || 10}</span>
                        <span class="stat-mini-label">Reorder Level</span>
                    </div>
                    <div class="stat-mini">
                        <span class="stat-mini-value" style="${item.expiryDate && new Date(item.expiryDate) < new Date() ? 'color: var(--danger);' : ''}">
                            ${item.expiryDate ? Utils.formatDate(item.expiryDate) : 'N/A'}
                        </span>
                        <span class="stat-mini-label">Expiry Date</span>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin: 0.5rem 0;">
                    <div><strong>Supplier:</strong> ${item.supplier || 'N/A'}</div>
                    <div><strong>Location:</strong> ${item.location || 'N/A'}</div>
                </div>

                ${item.notes ? `
                    <div style="margin: 0.5rem 0;">
                        <strong>Notes:</strong>
                        <p style="margin: 0.25rem 0; color: var(--gray-700);">${item.notes}</p>
                    </div>
                ` : ''}

                <h5 style="margin: 1rem 0 0.5rem;">Recent Stock Movements</h5>
                ${itemMovements.length > 0 ? `
                    ${itemMovements.map(m => `
                        <div class="stock-movement ${m.type}">
                            <div class="movement-info">
                                <span>
                                    <strong>${m.type === 'in' ? 'Stock In' : m.type === 'out' ? 'Stock Out' : 'Adjustment'}</strong>
                                    ${m.reference ? ` - ${m.reference}` : ''}
                                </span>
                                <span class="quantity ${m.type === 'in' ? 'positive' : 'negative'}">
                                    ${m.type === 'in' ? '+' : ''}${m.quantity} ${item.unit || 'pcs'}
                                </span>
                            </div>
                            <div style="font-size: var(--text-xs); color: var(--gray-500);">
                                ${m.date ? Utils.formatDate(m.date) : 'N/A'} • By: ${m.user || 'System'}
                                ${m.notes ? ` • ${m.notes}` : ''}
                            </div>
                        </div>
                    `).join('')}
                ` : '<p style="color: var(--gray-500); font-size: var(--text-sm);">No stock movements recorded</p>'}
            </div>
        `;

        modal.style.display = 'flex';
    }

    deleteItem(id) {
        if (!confirm('Delete this inventory item?')) return;
        
        storage.delete('inventory', id);
        this.loadInventory();
        this.renderTable();
        this.updateStats();
        showToast('Item deleted successfully', 'success');
    }

    closeInventoryModal() {
        document.getElementById('inventoryModal').style.display = 'none';
        document.getElementById('inventoryForm').reset();
        this.editingId = null;
        this.clearErrors();
    }

    closeInventoryView() {
        document.getElementById('inventoryViewModal').style.display = 'none';
    }

    clearErrors() {
        document.querySelectorAll('#inventoryForm .error-message').forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });
        document.querySelectorAll('#inventoryForm .form-group input, #inventoryForm .form-group select').forEach(el => {
            el.classList.remove('error');
        });
    }

    openStockMovementModal(type, itemId = null) {
        const modal = document.getElementById('stockMovementModal');
        const title = document.getElementById('stockMovementTitle');
        if (!modal) return;

        document.getElementById('stockMovementForm').reset();
        document.getElementById('movementType').value = type;

        const titles = {
            'in': 'Stock In',
            'out': 'Stock Out',
            'adjust': 'Stock Adjustment'
        };
        title.textContent = titles[type] || 'Stock Movement';

        const select = document.getElementById('movementItem');
        select.innerHTML = '<option value="">Select Item</option>';
        this.inventory.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${item.name} (${item.quantity} ${item.unit || 'pcs'} available)`;
            select.appendChild(option);
        });

        if (itemId) {
            select.value = itemId;
            this.updateMovementItemInfo(itemId);
        }

        select.addEventListener('change', (e) => {
            this.updateMovementItemInfo(e.target.value);
        });

        modal.style.display = 'flex';
    }

    updateMovementItemInfo(itemId) {
        const item = storage.getById('inventory', itemId);
        const info = document.getElementById('movementItemInfo');
        if (!item) {
            info.innerHTML = '';
            return;
        }
        info.innerHTML = `
            <div class="quick-info-grid" style="margin-top: 0.5rem;">
                <span><strong>Current Stock:</strong> ${item.quantity} ${item.unit || 'pcs'}</span>
                <span><strong>Category:</strong> ${item.category || 'Other'}</span>
                <span><strong>Status:</strong> <span class="stock-status ${(item.status || 'available').toLowerCase()}">${item.status || 'Available'}</span></span>
            </div>
        `;
    }

    processStockMovement() {
        const itemId = document.getElementById('movementItem').value;
        const type = document.getElementById('movementType').value;
        const quantity = parseInt(document.getElementById('movementQuantity').value) || 0;
        const reference = document.getElementById('movementReference').value.trim();
        const notes = document.getElementById('movementNotes').value.trim();

        if (!itemId) {
            showToast('Please select an item', 'warning');
            return;
        }

        if (quantity <= 0) {
            showToast('Please enter a valid quantity', 'warning');
            return;
        }

        const item = storage.getById('inventory', itemId);
        if (!item) {
            showToast('Item not found', 'error');
            return;
        }

        let newQuantity = item.quantity || 0;
        if (type === 'in') {
            newQuantity += quantity;
        } else if (type === 'out') {
            if (quantity > newQuantity) {
                showToast(`Insufficient stock! Available: ${newQuantity} ${item.unit || 'pcs'}`, 'error');
                return;
            }
            newQuantity -= quantity;
        } else {
            newQuantity = quantity;
        }

        const status = this.calculateStatus(newQuantity, item.reorderLevel || 10);
        storage.update('inventory', itemId, {
            quantity: newQuantity,
            status: status
        });

        const movement = {
            itemId: itemId,
            itemName: item.name,
            type: type,
            quantity: quantity,
            previousQuantity: item.quantity || 0,
            newQuantity: newQuantity,
            reference: reference || '',
            notes: notes || '',
            user: auth.getCurrentUser()?.fullName || 'System',
            date: new Date().toISOString()
        };
        storage.create('stockMovements', movement);

        showToast(`Stock ${type === 'in' ? 'added' : type === 'out' ? 'removed' : 'adjusted'} successfully! New quantity: ${newQuantity} ${item.unit || 'pcs'}`, 'success');
        
        this.loadInventory();
        this.renderTable();
        this.updateStats();
        this.closeStockMovement();
    }

    closeStockMovement() {
        document.getElementById('stockMovementModal').style.display = 'none';
        document.getElementById('stockMovementForm').reset();
    }
}

let inventoryManager;

document.addEventListener('DOMContentLoaded', function() {
    inventoryManager = new InventoryManager();
});

function closeInventoryModal() {
    if (inventoryManager) inventoryManager.closeInventoryModal();
}

function closeInventoryView() {
    if (inventoryManager) inventoryManager.closeInventoryView();
}

function closeStockMovement() {
    if (inventoryManager) inventoryManager.closeStockMovement();
}