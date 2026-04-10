// =====================================================
// TYPES & INTERFACES
// =====================================================

interface ApiUser {
    id: number;
    title: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'Admin' | 'User';
}

interface SessionUser extends ApiUser {
    verified: boolean;
}

interface Department {
    id: string;
    name: string;
    description: string;
}

interface Employee {
    id: string;
    employeeId: string;
    userEmail: string;
    userName?: string;
    position: string;
    departmentId: string;
    hireDate: string;
}

interface RequestItem {
    name: string;
    qty: number;
}

interface UserRequest {
    id: string;
    type: string;
    items: RequestItem[];
    status: 'Pending' | 'Approved' | 'Rejected';
    date: string;
    employeeEmail: string;
}

interface LocalDb {
    departments: Department[];
    employees: Employee[];
    requests: UserRequest[];
}

// =====================================================
// CONFIG
// =====================================================

const API_BASE = 'http://localhost:4000';
const LOCAL_STORAGE_KEY = 'ipt_lab5_local';
let currentUser: SessionUser | null = null;

// =====================================================
// LOCAL DB  (Departments, Employees, Requests — no backend endpoint yet)
// =====================================================

let localDb: LocalDb = { departments: [], employees: [], requests: [] };

function loadLocalData(): void {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
            localDb = JSON.parse(stored) as LocalDb;
        }
    } catch (e) {
        console.error('Error loading local data:', e);
    }
}

function saveLocalData(): void {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localDb));
    } catch (e) {
        showToast('Error saving data', 'danger');
    }
}

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// =====================================================
// API HELPER
// =====================================================

async function apiFetch<T>(path: string, options: RequestInit & { body?: unknown } = {}): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { message?: string }).message || `Request failed (${res.status})`);
    return data as T;
}

// =====================================================
// AUTH STATE
// =====================================================

function setAuthState(isAuth: boolean, user: SessionUser | null = null): void {
    currentUser = user;
    const body = document.body;

    if (isAuth && user) {
        body.classList.remove('not-authenticated');
        body.classList.add('authenticated');
        body.classList.toggle('is-admin', user.role === 'Admin');
        const el = document.getElementById('navbar-username');
        if (el) el.textContent = `${user.firstName} ${user.lastName}`;
    } else {
        body.classList.remove('authenticated', 'is-admin');
        body.classList.add('not-authenticated');
    }
}

function checkAuth(): boolean {
    const raw = localStorage.getItem('auth_session');
    if (raw) {
        try {
            const user = JSON.parse(raw) as SessionUser;
            if (user?.id) { setAuthState(true, user); return true; }
        } catch (_) { /* invalid */ }
    }
    setAuthState(false);
    return false;
}

function logout(): void {
    localStorage.removeItem('auth_session');
    setAuthState(false);
    showToast('Logged out successfully', 'success');
    navigateTo('#/');
}

// =====================================================
// ROUTING
// =====================================================

function navigateTo(hash: string): void {
    window.location.hash = hash;
}

function handleRouting(): void {
    const hash = window.location.hash || '#/';
    const route = hash.substring(2);

    document.querySelectorAll<HTMLElement>('.page').forEach(p => p.classList.remove('active'));

    const isAuthenticated = checkAuth();
    const protectedRoutes = ['profile', 'requests'];
    const adminRoutes = ['employees', 'departments', 'accounts'];

    if (protectedRoutes.includes(route) && !isAuthenticated) {
        showToast('Please login to access this page', 'warning');
        navigateTo('#/login');
        return;
    }
    if (adminRoutes.includes(route)) {
        if (!isAuthenticated) { showToast('Please login to access this page', 'warning'); navigateTo('#/login'); return; }
        if (currentUser?.role !== 'Admin') { showToast('Admin access required', 'danger'); navigateTo('#/'); return; }
    }

    const pageId = route ? `${route}-page` : 'home-page';
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
        switch (route) {
            case 'profile': renderProfile(); break;
            case 'employees': renderEmployees(); break;
            case 'departments': renderDepartments(); break;
            case 'accounts': renderAccounts(); break;
            case 'requests': renderRequests(); break;
        }
    } else {
        document.getElementById('home-page')?.classList.add('active');
    }
}

// =====================================================
// REGISTER  →  POST /users
// =====================================================

async function handleRegistration(e: Event): Promise<void> {
    e.preventDefault();
    const title = (document.getElementById('reg-title') as HTMLSelectElement).value;
    const firstName = (document.getElementById('reg-firstname') as HTMLInputElement).value.trim();
    const lastName = (document.getElementById('reg-lastname') as HTMLInputElement).value.trim();
    const email = (document.getElementById('reg-email') as HTMLInputElement).value.trim().toLowerCase();
    const password = (document.getElementById('reg-password') as HTMLInputElement).value;

    try {
        await apiFetch<{ message: string }>('/users', {
            method: 'POST',
            body: { title, firstName, lastName, email, password, confirmPassword: password, role: 'User' },
        });
        localStorage.setItem('pending_verify_email', email);
        showToast('Registration successful! Please verify your email.', 'success');
        navigateTo('#/verify-email');
    } catch (err) {
        showToast((err as Error).message, 'danger');
    }
}

// =====================================================
// EMAIL VERIFY  (simulated)
// =====================================================

function handleEmailVerification(): void {
    const email = localStorage.getItem('pending_verify_email');
    const display = document.getElementById('verify-email-display');
    if (email && display) display.textContent = email;

    document.getElementById('simulate-verify-btn')?.addEventListener('click', async () => {
        const pendingEmail = localStorage.getItem('pending_verify_email');
        if (!pendingEmail) return;
        try {
            const users = await apiFetch<ApiUser[]>('/users');
            const user = users.find(u => u.email === pendingEmail);
            if (user) {
                const session: SessionUser = { ...user, verified: true };
                localStorage.setItem('auth_session', JSON.stringify(session));
                localStorage.removeItem('pending_verify_email');
                showToast('Email verified successfully!', 'success');
                navigateTo('#/login');
                setTimeout(() => {
                    const msg = document.getElementById('login-success-msg');
                    if (msg) (msg as HTMLElement).style.display = 'block';
                }, 100);
            }
        } catch (_) {
            showToast('Cannot connect to server. Is it running?', 'danger');
        }
    });
}

// =====================================================
// LOGIN  (workaround: no /auth/login endpoint yet)
// =====================================================

async function handleLogin(e: Event): Promise<void> {
    e.preventDefault();
    const email = (document.getElementById('login-email') as HTMLInputElement).value.trim().toLowerCase();
    const password = (document.getElementById('login-password') as HTMLInputElement).value;

    // suppress unused-variable warning — password validation belongs in a real /auth/login
    void password;

    try {
        const users = await apiFetch<ApiUser[]>('/users');
        const match = users.find(u => u.email === email);
        if (!match) { showToast('No account found with that email.', 'danger'); return; }

        const session: SessionUser = { ...match, verified: true };
        localStorage.setItem('auth_session', JSON.stringify(session));
        setAuthState(true, session);
        showToast('Login successful!', 'success');
        navigateTo('#/profile');
    } catch (_) {
        showToast('Cannot reach the server. Make sure the backend is running on port 4000.', 'danger');
    }
}

// =====================================================
// PROFILE
// =====================================================

function renderProfile(): void {
    if (!currentUser) return;
    const el = document.getElementById('profile-content');
    if (!el) return;
    el.innerHTML = `
        <p><strong>Name:</strong> ${currentUser.title ? currentUser.title + ' ' : ''}${currentUser.firstName} ${currentUser.lastName}</p>
        <p><strong>Email:</strong> ${currentUser.email}</p>
        <p><strong>Role:</strong> <span class="badge bg-${currentUser.role === 'Admin' ? 'danger' : 'primary'}">${currentUser.role}</span></p>
        <button class="btn btn-outline-primary mt-3" onclick="openEditProfileModal()">Edit Profile</button>
    `;
}

function openEditProfileModal(): void {
    if (!currentUser) return;
    (document.getElementById('edit-profile-title') as HTMLSelectElement).value = currentUser.title || '';
    (document.getElementById('edit-profile-firstname') as HTMLInputElement).value = currentUser.firstName || '';
    (document.getElementById('edit-profile-lastname') as HTMLInputElement).value = currentUser.lastName || '';
    (document.getElementById('edit-profile-email') as HTMLInputElement).value = currentUser.email || '';
    (document.getElementById('edit-profile-password') as HTMLInputElement).value = '';
    const modal = new (window as any).bootstrap.Modal(document.getElementById('editProfileModal'));
    modal.show();
}

async function handleEditProfileForm(e: Event): Promise<void> {
    e.preventDefault();
    if (!currentUser) return;
    const title = (document.getElementById('edit-profile-title') as HTMLSelectElement).value;
    const firstName = (document.getElementById('edit-profile-firstname') as HTMLInputElement).value.trim();
    const lastName = (document.getElementById('edit-profile-lastname') as HTMLInputElement).value.trim();
    const email = (document.getElementById('edit-profile-email') as HTMLInputElement).value.trim().toLowerCase();
    const password = (document.getElementById('edit-profile-password') as HTMLInputElement).value;

    const body: Record<string, string> = { title, firstName, lastName, email };
    if (password) { body.password = password; body.confirmPassword = password; }

    try {
        await apiFetch<{ message: string }>(`/users/${currentUser.id}`, { method: 'PUT', body });
        currentUser = { ...currentUser, title, firstName, lastName, email };
        localStorage.setItem('auth_session', JSON.stringify(currentUser));
        setAuthState(true, currentUser);
        renderProfile();
        showToast('Profile updated successfully', 'success');
        (window as any).bootstrap.Modal.getInstance(document.getElementById('editProfileModal'))?.hide();
        (e.target as HTMLFormElement).reset();
    } catch (err) {
        showToast((err as Error).message, 'danger');
    }
}

// =====================================================
// ACCOUNTS  →  GET / POST / PUT / DELETE /users
// =====================================================

async function renderAccounts(): Promise<void> {
    const tbody = document.getElementById('accounts-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Loading…</td></tr>';
    try {
        const users = await apiFetch<ApiUser[]>('/users');
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
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-danger text-center">${(err as Error).message}</td></tr>`;
    }
}

async function handleAccountForm(e: Event): Promise<void> {
    e.preventDefault();
    const editId = (document.getElementById('account-edit-id') as HTMLInputElement).value;
    const title = (document.getElementById('account-title') as HTMLSelectElement).value;
    const firstName = (document.getElementById('account-firstname') as HTMLInputElement).value.trim();
    const lastName = (document.getElementById('account-lastname') as HTMLInputElement).value.trim();
    const email = (document.getElementById('account-email') as HTMLInputElement).value.trim().toLowerCase();
    const password = (document.getElementById('account-password') as HTMLInputElement).value;
    const role = (document.getElementById('account-role') as HTMLSelectElement).value;

    try {
        if (editId) {
            const body: Record<string, string> = { title, firstName, lastName, email, role };
            if (password) { body.password = password; body.confirmPassword = password; }
            await apiFetch<{ message: string }>(`/users/${editId}`, { method: 'PUT', body });
            showToast('Account updated successfully', 'success');
        } else {
            if (!password) { showToast('Password is required for new accounts', 'danger'); return; }
            await apiFetch<{ message: string }>('/users', {
                method: 'POST',
                body: { title, firstName, lastName, email, password, confirmPassword: password, role },
            });
            showToast('Account created successfully', 'success');
        }
        await renderAccounts();
        (window as any).bootstrap.Modal.getInstance(document.getElementById('addAccountModal'))?.hide();
        (e.target as HTMLFormElement).reset();
        (document.getElementById('account-edit-id') as HTMLInputElement).value = '';
    } catch (err) {
        showToast((err as Error).message, 'danger');
    }
}

async function editAccount(id: number): Promise<void> {
    try {
        const acc = await apiFetch<ApiUser>(`/users/${id}`);
        (document.getElementById('account-edit-id') as HTMLInputElement).value = String(acc.id);
        (document.getElementById('account-title') as HTMLSelectElement).value = acc.title || '';
        (document.getElementById('account-firstname') as HTMLInputElement).value = acc.firstName || '';
        (document.getElementById('account-lastname') as HTMLInputElement).value = acc.lastName || '';
        (document.getElementById('account-email') as HTMLInputElement).value = acc.email || '';
        (document.getElementById('account-password') as HTMLInputElement).value = '';
        (document.getElementById('account-role') as HTMLSelectElement).value = acc.role || 'User';
        (document.getElementById('account-verified') as HTMLInputElement).checked = true;
        new (window as any).bootstrap.Modal(document.getElementById('addAccountModal')).show();
    } catch (err) {
        showToast((err as Error).message, 'danger');
    }
}

async function resetPassword(id: number): Promise<void> {
    const pw = prompt('Enter new password (minimum 6 characters):');
    if (!pw) return;
    if (pw.length < 6) { showToast('Password must be at least 6 characters', 'danger'); return; }
    try {
        await apiFetch<{ message: string }>(`/users/${id}`, {
            method: 'PUT',
            body: { password: pw, confirmPassword: pw },
        });
        showToast('Password reset successfully', 'success');
    } catch (err) {
        showToast((err as Error).message, 'danger');
    }
}

async function deleteAccount(id: number): Promise<void> {
    if (currentUser?.id === id) { showToast('Cannot delete your own account', 'danger'); return; }
    if (!confirm('Are you sure you want to delete this account?')) return;
    try {
        await apiFetch<{ message: string }>(`/users/${id}`, { method: 'DELETE' });
        localDb.employees = localDb.employees.filter(em => em.userEmail !== String(id));
        saveLocalData();
        await renderAccounts();
        showToast('Account deleted', 'success');
    } catch (err) {
        showToast((err as Error).message, 'danger');
    }
}

// =====================================================
// EMPLOYEES  (localStorage — no backend endpoint yet)
// =====================================================

async function renderEmployees(): Promise<void> {
    const tbody = document.getElementById('employees-table-body');
    if (!tbody) return;

    if (!localDb.employees.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No employees yet.</td></tr>';
    } else {
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

    // Populate user dropdown from real API
    try {
        const users = await apiFetch<ApiUser[]>('/users');
        const sel = document.getElementById('employee-email') as HTMLSelectElement;
        if (sel) {
            sel.innerHTML = '<option value="">Select User</option>' +
                users.map(u => `<option value="${u.email}">${u.firstName} ${u.lastName} (${u.email})</option>`).join('');
        }
    } catch (_) { /* offline */ }
}

function populateDepartmentDropdown(): void {
    const sel = document.getElementById('employee-department') as HTMLSelectElement;
    sel.innerHTML = '<option value="">Select Department</option>' +
        localDb.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
}

function handleEmployeeForm(e: Event): void {
    e.preventDefault();
    const editId = (document.getElementById('employee-edit-id') as HTMLInputElement).value;
    const employeeId = (document.getElementById('employee-id') as HTMLInputElement).value.trim();
    const userEmail = (document.getElementById('employee-email') as HTMLSelectElement).value;
    const position = (document.getElementById('employee-position') as HTMLInputElement).value.trim();
    const departmentId = (document.getElementById('employee-department') as HTMLSelectElement).value;
    const hireDate = (document.getElementById('employee-hire-date') as HTMLInputElement).value;

    const data: Omit<Employee, 'id'> & { id?: string } = { employeeId, userEmail, position, departmentId, hireDate };

    if (editId) {
        const idx = localDb.employees.findIndex(em => em.id === editId);
        localDb.employees[idx] = { ...localDb.employees[idx], ...data };
        showToast('Employee updated successfully', 'success');
    } else {
        data.id = generateId();
        localDb.employees.push(data as Employee);
        showToast('Employee added successfully', 'success');
    }

    saveLocalData();
    renderEmployees();
    (window as any).bootstrap.Modal.getInstance(document.getElementById('addEmployeeModal'))?.hide();
    (e.target as HTMLFormElement).reset();
    (document.getElementById('employee-edit-id') as HTMLInputElement).value = '';
}

function editEmployee(id: string): void {
    const emp = localDb.employees.find(em => em.id === id);
    if (!emp) return;
    (document.getElementById('employee-edit-id') as HTMLInputElement).value = emp.id;
    (document.getElementById('employee-id') as HTMLInputElement).value = emp.employeeId;
    (document.getElementById('employee-email') as HTMLSelectElement).value = emp.userEmail;
    (document.getElementById('employee-position') as HTMLInputElement).value = emp.position;
    (document.getElementById('employee-department') as HTMLSelectElement).value = emp.departmentId;
    (document.getElementById('employee-hire-date') as HTMLInputElement).value = emp.hireDate;
    new (window as any).bootstrap.Modal(document.getElementById('addEmployeeModal')).show();
}

function deleteEmployee(id: string): void {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    localDb.employees = localDb.employees.filter(em => em.id !== id);
    saveLocalData();
    renderEmployees();
    showToast('Employee deleted', 'success');
}

// =====================================================
// DEPARTMENTS  (localStorage — no backend endpoint yet)
// =====================================================

function renderDepartments(): void {
    const tbody = document.getElementById('departments-table-body');
    if (!tbody) return;
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

function handleDepartmentForm(e: Event): void {
    e.preventDefault();
    const editId = (document.getElementById('department-edit-id') as HTMLInputElement).value;
    const name = (document.getElementById('department-name') as HTMLInputElement).value.trim();
    const description = (document.getElementById('department-description') as HTMLTextAreaElement).value.trim();

    if (editId) {
        const idx = localDb.departments.findIndex(d => d.id === editId);
        localDb.departments[idx] = { ...localDb.departments[idx], name, description };
        showToast('Department updated successfully', 'success');
    } else {
        localDb.departments.push({ id: generateId(), name, description });
        showToast('Department added successfully', 'success');
    }

    saveLocalData();
    renderDepartments();
    (window as any).bootstrap.Modal.getInstance(document.getElementById('addDepartmentModal'))?.hide();
    (e.target as HTMLFormElement).reset();
    (document.getElementById('department-edit-id') as HTMLInputElement).value = '';
}

function editDepartment(id: string): void {
    const dept = localDb.departments.find(d => d.id === id);
    if (!dept) return;
    (document.getElementById('department-edit-id') as HTMLInputElement).value = dept.id;
    (document.getElementById('department-name') as HTMLInputElement).value = dept.name;
    (document.getElementById('department-description') as HTMLTextAreaElement).value = dept.description;
    new (window as any).bootstrap.Modal(document.getElementById('addDepartmentModal')).show();
}

function deleteDepartment(id: string): void {
    if (localDb.employees.some(em => em.departmentId === id)) {
        showToast('Cannot delete department with employees', 'danger');
        return;
    }
    if (!confirm('Are you sure you want to delete this department?')) return;
    localDb.departments = localDb.departments.filter(d => d.id !== id);
    saveLocalData();
    renderDepartments();
    showToast('Department deleted', 'success');
}

// =====================================================
// REQUESTS  (localStorage — no backend endpoint yet)
// =====================================================

function renderRequests(): void {
    const container = document.getElementById('requests-content');
    if (!container || !currentUser) return;
    const userReqs = localDb.requests.filter(r => r.employeeEmail === currentUser!.email);

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

function handleRequestForm(e: Event): void {
    e.preventDefault();
    if (!currentUser) return;
    const type = (document.getElementById('request-type') as HTMLSelectElement).value;
    const itemRows = document.querySelectorAll<HTMLElement>('.request-item-row');
    const items: RequestItem[] = [];

    itemRows.forEach(row => {
        const name = (row.querySelector('.item-name') as HTMLInputElement).value.trim();
        const qty = parseInt((row.querySelector('.item-qty') as HTMLInputElement).value);
        if (name && qty) items.push({ name, qty });
    });

    if (!items.length) { showToast('Please add at least one item', 'danger'); return; }

    localDb.requests.push({
        id: generateId(), type, items, status: 'Pending',
        date: new Date().toISOString(), employeeEmail: currentUser.email,
    });
    saveLocalData();
    renderRequests();
    showToast('Request submitted successfully', 'success');
    (window as any).bootstrap.Modal.getInstance(document.getElementById('addRequestModal'))?.hide();
    (e.target as HTMLFormElement).reset();
    resetRequestItems();
}

function resetRequestItems(): void {
    const container = document.getElementById('request-items-container');
    if (!container) return;
    container.innerHTML = `
        <div class="input-group mb-2 request-item-row">
            <input type="text"   class="form-control item-name" placeholder="Item name" required>
            <input type="number" class="form-control item-qty"  placeholder="Qty" min="1" value="1" style="max-width:80px;" required>
            <button type="button" class="btn btn-danger remove-item-btn" style="display:none;">×</button>
        </div>`;
}

function addRequestItem(): void {
    const container = document.getElementById('request-items-container');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'input-group mb-2 request-item-row';
    row.innerHTML = `
        <input type="text"   class="form-control item-name" placeholder="Item name" required>
        <input type="number" class="form-control item-qty"  placeholder="Qty" min="1" value="1" style="max-width:80px;" required>
        <button type="button" class="btn btn-danger remove-item-btn" onclick="removeRequestItem(this)">×</button>`;
    container.appendChild(row);
    updateRemoveButtons();
}

function removeRequestItem(btn: HTMLButtonElement): void {
    btn.closest('.request-item-row')?.remove();
    updateRemoveButtons();
}

function updateRemoveButtons(): void {
    const rows = document.querySelectorAll('.request-item-row');
    rows.forEach(row => {
        const btn = row.querySelector<HTMLButtonElement>('.remove-item-btn');
        if (btn) btn.style.display = rows.length > 1 ? 'block' : 'none';
    });
}

// =====================================================
// TOAST
// =====================================================

function showToast(message: string, type: 'success' | 'danger' | 'warning' | 'info' = 'info'): void {
    const container = document.getElementById('toast-container');
    if (!container) return;
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

    const el = document.getElementById(id)!;
    const toast = new (window as any).bootstrap.Toast(el, { delay: 3000 });
    toast.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
}

// =====================================================
// MODAL CLEANUP
// =====================================================

function resetModals(): void {
    document.getElementById('addEmployeeModal')?.addEventListener('hidden.bs.modal', () => {
        (document.getElementById('employee-form') as HTMLFormElement).reset();
        (document.getElementById('employee-edit-id') as HTMLInputElement).value = '';
    });
    document.getElementById('addDepartmentModal')?.addEventListener('hidden.bs.modal', () => {
        (document.getElementById('department-form') as HTMLFormElement).reset();
        (document.getElementById('department-edit-id') as HTMLInputElement).value = '';
    });
    document.getElementById('addAccountModal')?.addEventListener('hidden.bs.modal', () => {
        (document.getElementById('account-form') as HTMLFormElement).reset();
        (document.getElementById('account-edit-id') as HTMLInputElement).value = '';
    });
    document.getElementById('addRequestModal')?.addEventListener('hidden.bs.modal', () => {
        (document.getElementById('request-form') as HTMLFormElement).reset();
        resetRequestItems();
    });
    document.getElementById('editProfileModal')?.addEventListener('hidden.bs.modal', () => {
        (document.getElementById('edit-profile-form') as HTMLFormElement).reset();
    });
}

// =====================================================
// BOOT
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    loadLocalData();

    window.addEventListener('hashchange', handleRouting);
    if (!window.location.hash) window.location.hash = '#/';
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
(window as any).navigateTo = navigateTo;
(window as any).editEmployee = editEmployee;
(window as any).deleteEmployee = deleteEmployee;
(window as any).editDepartment = editDepartment;
(window as any).deleteDepartment = deleteDepartment;
(window as any).editAccount = editAccount;
(window as any).resetPassword = resetPassword;
(window as any).deleteAccount = deleteAccount;
(window as any).removeRequestItem = removeRequestItem;
(window as any).openEditProfileModal = openEditProfileModal;