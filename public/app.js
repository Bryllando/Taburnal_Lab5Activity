"use strict";
// =====================================================
// TYPES & INTERFACES
// =====================================================
// =====================================================
// CONFIG
// =====================================================
const API_BASE = 'http://localhost:4000';
const LOCAL_STORAGE_KEY = 'ipt_lab5_local';
let currentUser = null;
// =====================================================
// LOCAL DB
// =====================================================
let localDb = { departments: [], employees: [], requests: [] };
function loadLocalData() {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
            localDb = JSON.parse(stored);
        }
    }
    catch (e) {
        console.error('Error loading local data:', e);
    }
}
function saveLocalData() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localDb));
    }
    catch (e) {
        showToast('Error saving data', 'danger');
    }
}
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
// =====================================================
// API HELPER
// =====================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
        throw new Error(data.message || `Request failed (${res.status})`);
    return data;
}
// =====================================================
// AUTH STATE
// =====================================================
function setAuthState(isAuth, user = null) {
    currentUser = user;
    const body = document.body;
    if (isAuth && user) {
        body.classList.remove('not-authenticated');
        body.classList.add('authenticated');
        body.classList.toggle('is-admin', user.role === 'Admin');
        const el = document.getElementById('navbar-username');
        if (el)
            el.textContent = `${user.firstName} ${user.lastName}`;
    }
    else {
        body.classList.remove('authenticated', 'is-admin');
        body.classList.add('not-authenticated');
    }
}
function checkAuth() {
    const raw = localStorage.getItem('auth_session');
    if (raw) {
        try {
            const user = JSON.parse(raw);
            if (user?.id) {
                setAuthState(true, user);
                return true;
            }
        }
        catch (_) { /* invalid */ }
    }
    setAuthState(false);
    return false;
}
function logout() {
    localStorage.removeItem('auth_session');
    setAuthState(false);
    showToast('Logged out successfully', 'success');
    navigateTo('#/');
}
// =====================================================
// ROUTING
// =====================================================
function navigateTo(hash) {
    window.location.hash = hash;
}
function handleRouting() {
    const hash = window.location.hash || '#/';
    const route = hash.substring(2);
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const isAuthenticated = checkAuth();
    const protectedRoutes = ['profile', 'requests'];
    const adminRoutes = ['employees', 'departments', 'accounts'];
    if (protectedRoutes.includes(route) && !isAuthenticated) {
        showToast('Please login to access this page', 'warning');
        navigateTo('#/login');
        return;
    }
    if (adminRoutes.includes(route)) {
        if (!isAuthenticated) {
            showToast('Please login to access this page', 'warning');
            navigateTo('#/login');
            return;
        }
        if (currentUser?.role !== 'Admin') {
            showToast('Admin access required', 'danger');
            navigateTo('#/');
            return;
        }
    }
    const pageId = route ? `${route}-page` : 'home-page';
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
        switch (route) {
            case 'profile':
                renderProfile();
                break;
            case 'employees':
                renderEmployees();
                break;
            case 'departments':
                renderDepartments();
                break;
            case 'accounts':
                renderAccounts();
                break;
            case 'requests':
                renderRequests();
                break;
        }
    }
    else {
        document.getElementById('home-page')?.classList.add('active');
    }
}
// =====================================================
// REGISTER  →  POST /users
// =====================================================
async function handleRegistration(e) {
    e.preventDefault();
    const title = document.getElementById('reg-title').value;
    const firstName = document.getElementById('reg-firstname').value.trim();
    const lastName = document.getElementById('reg-lastname').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    try {
        await apiFetch('/users', {
            method: 'POST',
            body: { title, firstName, lastName, email, password, confirmPassword: password, role: 'User' },
        });
        localStorage.setItem('pending_verify_email', email);
        showToast('Registration successful! Please verify your email.', 'success');
        navigateTo('#/verify-email');
    }
    catch (err) {
        showToast(err.message, 'danger');
    }
}
// =====================================================
// EMAIL VERIFY  (simulated)
// =====================================================
function handleEmailVerification() {
    const email = localStorage.getItem('pending_verify_email');
    const display = document.getElementById('verify-email-display');
    if (email && display)
        display.textContent = email;
    document.getElementById('simulate-verify-btn')?.addEventListener('click', async () => {
        const pendingEmail = localStorage.getItem('pending_verify_email');
        if (!pendingEmail)
            return;
        try {
            const users = await apiFetch('/users');
            const user = users.find(u => u.email === pendingEmail);
            if (user) {
                const session = { ...user, verified: true };
                localStorage.setItem('auth_session', JSON.stringify(session));
                localStorage.removeItem('pending_verify_email');
                showToast('Email verified successfully!', 'success');
                navigateTo('#/login');
                setTimeout(() => {
                    const msg = document.getElementById('login-success-msg');
                    if (msg)
                        msg.style.display = 'block';
                }, 100);
            }
        }
        catch (_) {
            showToast('Cannot connect to server. Is it running?', 'danger');
        }
    });
}
// =====================================================
// LOGIN
// =====================================================
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    void password;
    try {
        const users = await apiFetch('/users');
        const match = users.find(u => u.email === email);
        if (!match) {
            showToast('No account found with that email.', 'danger');
            return;
        }
        const session = { ...match, verified: true };
        localStorage.setItem('auth_session', JSON.stringify(session));
        setAuthState(true, session);
        showToast('Login successful!', 'success');
        navigateTo('#/profile');
    }
    catch (_) {
        showToast('Cannot reach the server. Make sure the backend is running on port 4000.', 'danger');
    }
}
// =====================================================
// PROFILE
// =====================================================
function renderProfile() {
    if (!currentUser)
        return;
    const el = document.getElementById('profile-content');
    if (!el)
        return;
    el.innerHTML = `
        <p><strong>Name:</strong> ${currentUser.title ? currentUser.title + ' ' : ''}${currentUser.firstName} ${currentUser.lastName}</p>
        <p><strong>Email:</strong> ${currentUser.email}</p>
        <p><strong>Role:</strong> <span class="badge bg-${currentUser.role === 'Admin' ? 'danger' : 'primary'}">${currentUser.role}</span></p>
        <button class="btn btn-outline-primary mt-3" onclick="openEditProfileModal()">Edit Profile</button>
    `;
}
function openEditProfileModal() {
    if (!currentUser)
        return;
    document.getElementById('edit-profile-title').value = currentUser.title || '';
    document.getElementById('edit-profile-firstname').value = currentUser.firstName || '';
    document.getElementById('edit-profile-lastname').value = currentUser.lastName || '';
    document.getElementById('edit-profile-email').value = currentUser.email || '';
    document.getElementById('edit-profile-password').value = '';
    const modal = new window.bootstrap.Modal(document.getElementById('editProfileModal'));
    modal.show();
}
async function handleEditProfileForm(e) {
    e.preventDefault();
    if (!currentUser)
        return;
    const title = document.getElementById('edit-profile-title').value;
    const firstName = document.getElementById('edit-profile-firstname').value.trim();
    const lastName = document.getElementById('edit-profile-lastname').value.trim();
    const email = document.getElementById('edit-profile-email').value.trim().toLowerCase();
    const password = document.getElementById('edit-profile-password').value;
    const body = { title, firstName, lastName, email };
    if (password) {
        body.password = password;
        body.confirmPassword = password;
    }
    try {
        await apiFetch(`/users/${currentUser.id}`, { method: 'PUT', body });
        currentUser = { ...currentUser, title, firstName, lastName, email };
        localStorage.setItem('auth_session', JSON.stringify(currentUser));
        setAuthState(true, currentUser);
        renderProfile();
        showToast('Profile updated successfully', 'success');
        window.bootstrap.Modal.getInstance(document.getElementById('editProfileModal'))?.hide();
        e.target.reset();
    }
    catch (err) {
        showToast(err.message, 'danger');
    }
}
// =====================================================
// ACCOUNTS  →  GET / POST / PUT / DELETE /users
// =====================================================
async function renderAccounts() {
    const tbody = document.getElementById('accounts-table-body');
    if (!tbody)
        return;
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Loading…</td></tr>';
    try {
        const users = await apiFetch('/users');
        if (!users.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No accounts yet.</td></tr>';
            return;
        }
        tbody.innerHTML = users.map(acc => `
            <tr>
                <td>${acc.firstName} ${acc.lastName}</td>
                <td>${acc.email}</td>
                <td><span class="badge bg-${acc.role === 'Admin' ? 'danger' : 'primary'}">${acc.role}</span></td>
                <td><span class="verified-icon">✓</span></td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-outline-primary"  onclick="editAccount(${acc.id})">Edit</button>
                    <button class="btn btn-sm btn-outline-warning"  onclick="resetPassword(${acc.id})">Reset Password</button>
                    <button class="btn btn-sm btn-outline-danger"   onclick="deleteAccount(${acc.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    }
    catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-danger text-center">${err.message}</td></tr>`;
    }
}
async function handleAccountForm(e) {
    e.preventDefault();
    const editId = document.getElementById('account-edit-id').value;
    const title = document.getElementById('account-title').value;
    const firstName = document.getElementById('account-firstname').value.trim();
    const lastName = document.getElementById('account-lastname').value.trim();
    const email = document.getElementById('account-email').value.trim().toLowerCase();
    const password = document.getElementById('account-password').value;
    const role = document.getElementById('account-role').value;
    try {
        if (editId) {
            const body = { title, firstName, lastName, email, role };
            if (password) {
                body.password = password;
                body.confirmPassword = password;
            }
            await apiFetch(`/users/${editId}`, { method: 'PUT', body });
            showToast('Account updated successfully', 'success');
        }
        else {
            if (!password) {
                showToast('Password is required for new accounts', 'danger');
                return;
            }
            await apiFetch('/users', {
                method: 'POST',
                body: { title, firstName, lastName, email, password, confirmPassword: password, role },
            });
            showToast('Account created successfully', 'success');
        }
        await renderAccounts();
        window.bootstrap.Modal.getInstance(document.getElementById('addAccountModal'))?.hide();
        e.target.reset();
        document.getElementById('account-edit-id').value = '';
    }
    catch (err) {
        showToast(err.message, 'danger');
    }
}
async function editAccount(id) {
    try {
        const acc = await apiFetch(`/users/${id}`);
        document.getElementById('account-edit-id').value = String(acc.id);
        document.getElementById('account-title').value = acc.title || '';
        document.getElementById('account-firstname').value = acc.firstName || '';
        document.getElementById('account-lastname').value = acc.lastName || '';
        document.getElementById('account-email').value = acc.email || '';
        document.getElementById('account-password').value = '';
        document.getElementById('account-role').value = acc.role || 'User';
        document.getElementById('account-verified').checked = true;
        new window.bootstrap.Modal(document.getElementById('addAccountModal')).show();
    }
    catch (err) {
        showToast(err.message, 'danger');
    }
}
async function resetPassword(id) {
    const pw = prompt('Enter new password (minimum 6 characters):');
    if (!pw)
        return;
    if (pw.length < 6) {
        showToast('Password must be at least 6 characters', 'danger');
        return;
    }
    try {
        await apiFetch(`/users/${id}`, {
            method: 'PUT',
            body: { password: pw, confirmPassword: pw },
        });
        showToast('Password reset successfully', 'success');
    }
    catch (err) {
        showToast(err.message, 'danger');
    }
}
async function deleteAccount(id) {
    if (currentUser?.id === id) {
        showToast('Cannot delete your own account', 'danger');
        return;
    }
    if (!confirm('Are you sure you want to delete this account?'))
        return;
    try {
        await apiFetch(`/users/${id}`, { method: 'DELETE' });
        localDb.employees = localDb.employees.filter(em => em.userEmail !== String(id));
        saveLocalData();
        await renderAccounts();
        showToast('Account deleted', 'success');
    }
    catch (err) {
        showToast(err.message, 'danger');
    }
}
// =====================================================
// EMPLOYEES  (localStorage)
// =====================================================
async function renderEmployees() {
    const tbody = document.getElementById('employees-table-body');
    if (!tbody)
        return;
    if (!localDb.employees.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No employees yet.</td></tr>';
    }
    else {
        tbody.innerHTML = localDb.employees.map(emp => {
            const dept = localDb.departments.find(d => d.id === emp.departmentId);
            return `
                <tr>
                    <td>${emp.employeeId}</td>
                    <td>${emp.userName || emp.userEmail}</td>
                    <td>${emp.position}</td>
                    <td>${dept ? dept.name : 'N/A'}</td>
                    <td class="action-buttons">
                        <button class="btn btn-sm btn-outline-primary" onclick="editEmployee('${emp.id}')">Edit</button>
                        <button class="btn btn-sm btn-outline-danger"  onclick="deleteEmployee('${emp.id}')">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    populateDepartmentDropdown();
    // Populate user dropdown from real API — FIX: correct element ID is 'employee-user'
    try {
        const users = await apiFetch('/users');
        const sel = document.getElementById('employee-user');
        if (sel) {
            sel.innerHTML = '<option value="">Select User</option>' +
                users.map(u => `<option value="${u.email}">${u.firstName} ${u.lastName} (${u.email})</option>`).join('');
        }
    }
    catch (_) { /* offline */ }
}
function populateDepartmentDropdown() {
    const sel = document.getElementById('employee-department');
    if (!sel)
        return;
    sel.innerHTML = '<option value="">Select Department</option>' +
        localDb.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
}
function handleEmployeeForm(e) {
    e.preventDefault();
    const editId = document.getElementById('employee-edit-id').value;
    const employeeId = document.getElementById('employee-id').value.trim();
    // FIX: correct element ID is 'employee-user', not 'employee-email'
    const userEmail = document.getElementById('employee-user').value;
    const position = document.getElementById('employee-position').value.trim();
    const departmentId = document.getElementById('employee-department').value;
    const hireDate = document.getElementById('employee-hire-date').value;
    if (!userEmail) {
        showToast('Please select a user', 'danger');
        return;
    }
    if (!departmentId) {
        showToast('Please select a department', 'danger');
        return;
    }
    const data = { employeeId, userEmail, position, departmentId, hireDate };
    if (editId) {
        const idx = localDb.employees.findIndex(em => em.id === editId);
        if (idx !== -1)
            localDb.employees[idx] = { ...localDb.employees[idx], ...data };
        showToast('Employee updated successfully', 'success');
    }
    else {
        data.id = generateId();
        localDb.employees.push(data);
        showToast('Employee added successfully', 'success');
    }
    saveLocalData();
    renderEmployees();
    window.bootstrap.Modal.getInstance(document.getElementById('addEmployeeModal'))?.hide();
    e.target.reset();
    document.getElementById('employee-edit-id').value = '';
}
function editEmployee(id) {
    const emp = localDb.employees.find(em => em.id === id);
    if (!emp)
        return;
    document.getElementById('employee-edit-id').value = emp.id;
    document.getElementById('employee-id').value = emp.employeeId;
    // FIX: correct element ID is 'employee-user', not 'employee-email'
    document.getElementById('employee-user').value = emp.userEmail;
    document.getElementById('employee-position').value = emp.position;
    document.getElementById('employee-department').value = emp.departmentId;
    document.getElementById('employee-hire-date').value = emp.hireDate;
    new window.bootstrap.Modal(document.getElementById('addEmployeeModal')).show();
}
function deleteEmployee(id) {
    if (!confirm('Are you sure you want to delete this employee?'))
        return;
    localDb.employees = localDb.employees.filter(em => em.id !== id);
    saveLocalData();
    renderEmployees();
    showToast('Employee deleted', 'success');
}
// =====================================================
// DEPARTMENTS  (localStorage)
// =====================================================
function renderDepartments() {
    const tbody = document.getElementById('departments-table-body');
    if (!tbody)
        return;
    if (!localDb.departments.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No departments yet.</td></tr>';
        return;
    }
    tbody.innerHTML = localDb.departments.map(d => `
        <tr>
            <td>${d.name}</td>
            <td>${d.description}</td>
            <td class="action-buttons">
                <button class="btn btn-sm btn-outline-primary" onclick="editDepartment('${d.id}')">Edit</button>
                <button class="btn btn-sm btn-outline-danger"  onclick="deleteDepartment('${d.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}
function handleDepartmentForm(e) {
    e.preventDefault();
    const editId = document.getElementById('department-edit-id').value;
    const name = document.getElementById('department-name').value.trim();
    const description = document.getElementById('department-description').value.trim();
    if (editId) {
        const idx = localDb.departments.findIndex(d => d.id === editId);
        if (idx !== -1)
            localDb.departments[idx] = { ...localDb.departments[idx], name, description };
        showToast('Department updated successfully', 'success');
    }
    else {
        localDb.departments.push({ id: generateId(), name, description });
        showToast('Department added successfully', 'success');
    }
    saveLocalData();
    renderDepartments();
    window.bootstrap.Modal.getInstance(document.getElementById('addDepartmentModal'))?.hide();
    e.target.reset();
    document.getElementById('department-edit-id').value = '';
}
function editDepartment(id) {
    const dept = localDb.departments.find(d => d.id === id);
    if (!dept)
        return;
    document.getElementById('department-edit-id').value = dept.id;
    document.getElementById('department-name').value = dept.name;
    document.getElementById('department-description').value = dept.description;
    new window.bootstrap.Modal(document.getElementById('addDepartmentModal')).show();
}
function deleteDepartment(id) {
    if (localDb.employees.some(em => em.departmentId === id)) {
        showToast('Cannot delete department with employees', 'danger');
        return;
    }
    if (!confirm('Are you sure you want to delete this department?'))
        return;
    localDb.departments = localDb.departments.filter(d => d.id !== id);
    saveLocalData();
    renderDepartments();
    showToast('Department deleted', 'success');
}
// =====================================================
// REQUESTS  (localStorage)
// =====================================================
function renderRequests() {
    const container = document.getElementById('requests-content');
    if (!container || !currentUser)
        return;
    const userReqs = localDb.requests.filter(r => r.employeeEmail === currentUser.email);
    if (!userReqs.length) {
        container.innerHTML = `
            <div class="empty-state">
                <p>You have no requests yet.</p>
                <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addRequestModal">Create One</button>
            </div>`;
        return;
    }
    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-striped">
                <thead><tr><th>Date</th><th>Type</th><th>Items</th><th>Status</th></tr></thead>
                <tbody>
                    ${userReqs.map(req => `
                        <tr>
                            <td>${new Date(req.date).toLocaleDateString()}</td>
                            <td>${req.type}</td>
                            <td>${req.items.map(i => `${i.name} (${i.qty})`).join(', ')}</td>
                            <td><span class="badge status-${req.status.toLowerCase()}">${req.status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
}
function handleRequestForm(e) {
    e.preventDefault();
    if (!currentUser)
        return;
    const type = document.getElementById('request-type').value;
    const itemRows = document.querySelectorAll('.request-item-row');
    const items = [];
    itemRows.forEach(row => {
        const name = row.querySelector('.item-name').value.trim();
        const qty = parseInt(row.querySelector('.item-qty').value);
        if (name && qty)
            items.push({ name, qty });
    });
    if (!items.length) {
        showToast('Please add at least one item', 'danger');
        return;
    }
    localDb.requests.push({
        id: generateId(), type, items, status: 'Pending',
        date: new Date().toISOString(), employeeEmail: currentUser.email,
    });
    saveLocalData();
    renderRequests();
    showToast('Request submitted successfully', 'success');
    window.bootstrap.Modal.getInstance(document.getElementById('addRequestModal'))?.hide();
    e.target.reset();
    resetRequestItems();
}
function resetRequestItems() {
    const container = document.getElementById('request-items-container');
    if (!container)
        return;
    container.innerHTML = `
        <div class="input-group mb-2 request-item-row">
            <input type="text"   class="form-control item-name" placeholder="Item name" required>
            <input type="number" class="form-control item-qty"  placeholder="Qty" min="1" value="1" style="max-width:80px;" required>
            <button type="button" class="btn btn-danger remove-item-btn" style="display:none;">×</button>
        </div>`;
}
function addRequestItem() {
    const container = document.getElementById('request-items-container');
    if (!container)
        return;
    const row = document.createElement('div');
    row.className = 'input-group mb-2 request-item-row';
    row.innerHTML = `
        <input type="text"   class="form-control item-name" placeholder="Item name" required>
        <input type="number" class="form-control item-qty"  placeholder="Qty" min="1" value="1" style="max-width:80px;" required>
        <button type="button" class="btn btn-danger remove-item-btn" onclick="removeRequestItem(this)">×</button>`;
    container.appendChild(row);
    updateRemoveButtons();
}
function removeRequestItem(btn) {
    btn.closest('.request-item-row')?.remove();
    updateRemoveButtons();
}
function updateRemoveButtons() {
    const rows = document.querySelectorAll('.request-item-row');
    rows.forEach(row => {
        const btn = row.querySelector('.remove-item-btn');
        if (btn)
            btn.style.display = rows.length > 1 ? 'block' : 'none';
    });
}
// =====================================================
// TOAST
// =====================================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container)
        return;
    const id = 'toast-' + Date.now();
    const bgClass = { success: 'bg-success', danger: 'bg-danger', warning: 'bg-warning', info: 'bg-info' }[type];
    container.insertAdjacentHTML('beforeend', `
        <div id="${id}" class="toast" role="alert">
            <div class="toast-header ${bgClass} text-white">
                <strong class="me-auto">Notification</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">${message}</div>
        </div>`);
    const el = document.getElementById(id);
    const toast = new window.bootstrap.Toast(el, { delay: 3000 });
    toast.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
}
// =====================================================
// MODAL CLEANUP
// =====================================================
function resetModals() {
    document.getElementById('addEmployeeModal')?.addEventListener('hidden.bs.modal', () => {
        document.getElementById('employee-form').reset();
        document.getElementById('employee-edit-id').value = '';
    });
    document.getElementById('addDepartmentModal')?.addEventListener('hidden.bs.modal', () => {
        document.getElementById('department-form').reset();
        document.getElementById('department-edit-id').value = '';
    });
    document.getElementById('addAccountModal')?.addEventListener('hidden.bs.modal', () => {
        document.getElementById('account-form').reset();
        document.getElementById('account-edit-id').value = '';
    });
    document.getElementById('addRequestModal')?.addEventListener('hidden.bs.modal', () => {
        document.getElementById('request-form').reset();
        resetRequestItems();
    });
    document.getElementById('editProfileModal')?.addEventListener('hidden.bs.modal', () => {
        document.getElementById('edit-profile-form').reset();
    });
}
// =====================================================
// BOOT
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    loadLocalData();
    window.addEventListener('hashchange', handleRouting);
    if (!window.location.hash)
        window.location.hash = '#/';
    handleRouting();
    document.getElementById('register-form')?.addEventListener('submit', handleRegistration);
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('employee-form')?.addEventListener('submit', handleEmployeeForm);
    document.getElementById('department-form')?.addEventListener('submit', handleDepartmentForm);
    document.getElementById('account-form')?.addEventListener('submit', handleAccountForm);
    document.getElementById('request-form')?.addEventListener('submit', handleRequestForm);
    document.getElementById('edit-profile-form')?.addEventListener('submit', handleEditProfileForm);
    document.getElementById('logout-btn')?.addEventListener('click', e => { e.preventDefault(); logout(); });
    document.getElementById('add-item-btn')?.addEventListener('click', addRequestItem);
    handleEmailVerification();
    resetModals();
});
// Expose globals for inline onclick attributes in HTML
window.navigateTo = navigateTo;
window.editEmployee = editEmployee;
window.deleteEmployee = deleteEmployee;
window.editDepartment = editDepartment;
window.deleteDepartment = deleteDepartment;
window.editAccount = editAccount;
window.resetPassword = resetPassword;
window.deleteAccount = deleteAccount;
window.removeRequestItem = removeRequestItem;
window.openEditProfileModal = openEditProfileModal;
