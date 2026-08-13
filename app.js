// app.js - Kontrolluesi kryesor i aplikacionit (Modeli i Rrafshët: Automjeti përfshin pronarin)

import { db } from './db.js';

// Gjendja e aplikacionit (App State)
const state = {
  currentView: 'dashboard',
  selectedVehicleId: null,
  partsCount: 0,
  editingVehicleId: null,
  editingServiceId: null,
  deletingId: null,
  deletingType: null
};

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  setupNavigation();
  setupFormHandlers();
  setupSearch();
  setupPartsEditor();

  document.getElementById('btn-add-vehicle').addEventListener('click', () => openAddVehicleModal());
  document.getElementById('btn-add-service').addEventListener('click', () => openAddServiceModal());
  document.getElementById('btn-profile-add-service').addEventListener('click', () => {
    openAddServiceModal(state.selectedVehicleId);
  });
  document.getElementById('btn-profile-edit-vehicle').addEventListener('click', () => {
    if (state.selectedVehicleId) startEditVehicle(state.selectedVehicleId);
  });
  document.getElementById('btn-profile-delete-vehicle').addEventListener('click', () => {
    if (state.selectedVehicleId) startDeleteVehicle(state.selectedVehicleId);
  });

  navigateTo('dashboard');

  window.lucide && window.lucide.createIcons();

  window.openModal = openModal;
  window.closeModal = closeModal;
}

// ==========================================
// UTILITIES
// ==========================================
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDateSimple(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  return d.toISOString().split('T')[0];
}

function formatDateAlbanian(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  const months = ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Kor', 'Gus', 'Sht', 'Tet', 'Nën', 'Dhj'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatNumber(num) {
  const n = Number(num) || 0;
  return n.toLocaleString('sq-AL');
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = 'success') {
  const cssType = type; // one of: success | warning | error
  const icons = { success: 'check-circle', warning: 'alert-triangle', error: 'x-circle' };

  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${cssType}`;
  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.75rem;">
      <i data-lucide="${icons[cssType] || 'info'}" style="width:18px;height:18px;"></i>
      <span>${escapeHtml(message)}</span>
    </div>
    <button style="background:none;border:none;color:inherit;font-size:1.1rem;cursor:pointer;font-weight:bold;margin-left:1rem;" onclick="this.closest('.toast').remove()">&times;</button>
  `;
  container.appendChild(toast);
  window.lucide && window.lucide.createIcons();

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==========================================
// NAVIGATION
// ==========================================
function setupNavigation() {
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.dataset.view);
    });
  });
}

async function navigateTo(viewName, params = {}) {
  state.currentView = viewName;

  document.querySelectorAll('.view-section').forEach(sec => sec.style.display = 'none');
  document.querySelectorAll('.nav-item[data-view]').forEach(item => item.classList.remove('active'));

  const titleEl = document.getElementById('view-title');
  const subtitleEl = document.getElementById('view-subtitle-text');

  if (viewName === 'dashboard') {
    document.getElementById('view-dashboard-section').style.display = 'block';
    document.querySelector('.nav-item[data-view="dashboard"]').classList.add('active');
    titleEl.textContent = 'Paneli';
    subtitleEl.textContent = 'Statistikat e përgjithshme të servisit';
    await updateDashboardStats();

  } else if (viewName === 'vehicles') {
    document.getElementById('view-vehicles-section').style.display = 'block';
    document.querySelector('.nav-item[data-view="vehicles"]').classList.add('active');
    titleEl.textContent = 'Automjetet';
    subtitleEl.textContent = 'Lista e të gjitha automjeteve të regjistruara';
    await renderVehicles();

  } else if (viewName === 'vehicle-profile') {
    document.getElementById('view-vehicle-profile-section').style.display = 'block';
    titleEl.textContent = 'Profili i Automjetit';
    subtitleEl.textContent = 'Historiku i plotë i servisit';
    state.selectedVehicleId = params.vehicleId;
    await renderVehicleProfile(params.vehicleId);

  } else if (viewName === 'services') {
    document.getElementById('view-services-section').style.display = 'block';
    document.querySelector('.nav-item[data-view="services"]').classList.add('active');
    titleEl.textContent = 'Shërbimet';
    subtitleEl.textContent = 'Historiku i të gjitha shërbimeve të regjistruara';
    await renderServices();
  }

  window.lucide && window.lucide.createIcons();
}

// ==========================================
// DASHBOARD
// ==========================================
async function updateDashboardStats() {
  const stats = await db.getDashboardStats();
  document.getElementById('stats-vehicles').textContent = stats.vehicleCount;
  document.getElementById('stats-services').textContent = stats.serviceCount;
}

// ==========================================
// VEHICLES (Automjetet)
// ==========================================
async function renderVehicles() {
  const allVehicles = await db.getVehicles();
  const searchInput = document.getElementById('vehicles-search');
  const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const vehicles = allVehicles
    .filter(v => {
      if (!searchQuery) return true;
      const owner = (v.ownerName || '').toLowerCase();
      const brand = (v.vehicleBrand || '').toLowerCase();
      return owner.includes(searchQuery) || brand.includes(searchQuery);
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const tbody = document.querySelector('#table-vehicles tbody');
  tbody.innerHTML = '';

  if (vehicles.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <div class="empty-icon"><i data-lucide="car" style="width:48px;height:48px;color:var(--text-light);margin:0 auto 1rem;"></i></div>
          <div class="empty-text" style="font-weight:600;margin-bottom:0.5rem;color:var(--text-main);">Nuk ka asnjë automjet të regjistruar.</div>
          <button class="btn btn-primary btn-sm" id="empty-add-vehicle-btn">+ Shto automjet</button>
        </td>
      </tr>
    `;
    const emptyBtn = document.getElementById('empty-add-vehicle-btn');
    if (emptyBtn) emptyBtn.addEventListener('click', () => openAddVehicleModal());
    window.lucide && window.lucide.createIcons();
    return;
  }

  vehicles.forEach(veh => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.innerHTML = `
      <td style="font-weight:600;color:var(--primary);">${escapeHtml(veh.ownerName) || '—'}</td>
      <td>${escapeHtml([veh.vehicleBrand, veh.vehicleModel].filter(Boolean).join(' ')) || '—'}</td>
      <td><span class="result-plate">${escapeHtml(veh.vehiclePlate) || '—'}</span></td>
      <td>${escapeHtml(veh.ownerPhone) || '—'}</td>
      <td>${veh.mileage ? formatNumber(veh.mileage) + ' km' : '—'}</td>
      <td style="text-align:right;" class="row-actions"></td>
    `;
    tr.addEventListener('click', () => navigateTo('vehicle-profile', { vehicleId: veh.id }));

    const actionsCell = tr.querySelector('.row-actions');
    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary btn-xs';
    editBtn.innerHTML = '<i data-lucide="edit" style="width:12px;height:12px;"></i>';
    editBtn.addEventListener('click', (e) => { e.stopPropagation(); startEditVehicle(veh.id); });

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger btn-xs';
    delBtn.style.marginLeft = '0.4rem';
    delBtn.innerHTML = '<i data-lucide="trash-2" style="width:12px;height:12px;"></i>';
    delBtn.addEventListener('click', (e) => { e.stopPropagation(); startDeleteVehicle(veh.id); });

    actionsCell.appendChild(editBtn);
    actionsCell.appendChild(delBtn);
    tbody.appendChild(tr);
  });

  window.lucide && window.lucide.createIcons();
}

async function renderVehicleProfile(vehicleId) {
  const veh = await db.getVehicleById(vehicleId);
  if (!veh) {
    showToast('Automjeti nuk u gjet.', 'error');
    navigateTo('vehicles');
    return;
  }

  document.getElementById('prof-brand-model').textContent = [veh.vehicleBrand, veh.vehicleModel].filter(Boolean).join(' ') || '—';
  document.getElementById('prof-plate').textContent = veh.vehiclePlate || '—';
  document.getElementById('prof-tag-year').textContent = veh.vehicleYear || '—';
  document.getElementById('prof-tag-engine').textContent = veh.vehicleEngine || '—';
  document.getElementById('prof-mileage').textContent = veh.mileage ? `${formatNumber(veh.mileage)} km` : '—';
  document.getElementById('prof-owner').textContent = veh.ownerName || '—';
  document.getElementById('prof-phone').textContent = veh.ownerPhone || '—';
  document.getElementById('prof-engine').textContent = veh.vehicleEngine || '—';
  document.getElementById('prof-vin').textContent = veh.vehicleVin || '—';

  const services = await db.getServicesByVehicle(vehicleId);
  document.getElementById('prof-summary-total-services').textContent = services.length;
  document.getElementById('prof-summary-last-service').textContent = services.length > 0 ? formatDateAlbanian(services[0].serviceDate) : 'Nuk ka';

  await renderVehicleTimeline(vehicleId, services);
}

async function renderVehicleTimeline(vehicleId, services) {
  const timelineEl = document.getElementById('vehicle-timeline');
  timelineEl.innerHTML = '';

  if (!services || services.length === 0) {
    timelineEl.innerHTML = `<div class="empty-state" style="padding:2rem;text-align:center;color:var(--text-muted);">Nuk ka shërbime të regjistruara për këtë automjet.</div>`;
    return;
  }

  services.forEach(srv => {
    const item = document.createElement('div');
    item.className = 'timeline-item';

    let partsHtml = '';
    if (srv.parts && srv.parts.length > 0) {
      partsHtml = `
        <div style="margin-top:0.75rem;">
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:0.25rem;">
            ${srv.parts.slice(0, 3).map(p => `<li style="font-size:0.8rem;color:var(--text-muted);">• ${escapeHtml(p.name)} (${escapeHtml(p.quantity)})</li>`).join('')}
            ${srv.parts.length > 3 ? `<li style="color:var(--accent);font-weight:500;font-size:0.8rem;">+ dhe ${srv.parts.length - 3} pjesë të tjera...</li>` : ''}
          </ul>
        </div>
      `;
    }

    const archivedBadge = srv.archived ? `<span class="badge badge-warning" style="margin-left:0.5rem;font-size:0.7rem;border-radius:var(--radius-sm);">E Arkivuar</span>` : '';
    const formattedDate = formatDateAlbanian(srv.serviceDate);
    const serviceTypesText = (srv.serviceTypes && srv.serviceTypes.length) ? escapeHtml(srv.serviceTypes.join(' + ')) : 'Shërbim';

    item.innerHTML = `
      <div class="timeline-dot" style="${srv.archived ? 'background-color:var(--text-light);box-shadow:none;' : ''}"></div>
      <div class="timeline-header">
        <div class="timeline-date-km">
          <span class="timeline-date">${formattedDate}</span>
          <span class="timeline-km">${formatNumber(srv.mileage)} km</span>
          ${archivedBadge}
        </div>
        <span class="timeline-cost-badge">${formatNumber(srv.totalCost)} Lekë</span>
      </div>
      <div class="timeline-card" style="margin-top:0.5rem;${srv.archived ? 'border-color:#cbd5e1;background:#fafafa;' : ''}">
        <div class="timeline-title" style="display:flex;align-items:center;gap:0.5rem;font-weight:600;">
          <i data-lucide="${srv.archived ? 'archive' : 'wrench'}" style="width:16px;height:16px;color:${srv.archived ? 'var(--text-muted)' : 'var(--accent)'};"></i>
          <span>${serviceTypesText}</span>
        </div>
        <div class="timeline-desc" style="margin-top:0.5rem;font-size:0.9rem;color:var(--text-main);line-height:1.4;">${escapeHtml(srv.description)}</div>
        ${partsHtml}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1rem;border-top:1px solid var(--border-color);padding-top:0.75rem;flex-wrap:wrap;gap:0.5rem;">
          <span style="font-size:0.75rem;color:var(--text-muted);">Pjesë: ${formatNumber(srv.partsCost)} L | Punë: ${formatNumber(srv.laborCost)} L</span>
          <button class="btn btn-secondary btn-sm view-srv-details-btn" style="padding:0.25rem 0.6rem;font-size:0.75rem;display:flex;align-items:center;gap:0.25rem;font-weight:500;">
            Shiko detajet <i data-lucide="chevron-right" style="width:12px;height:12px;"></i>
          </button>
        </div>
      </div>
    `;

    item.querySelector('.view-srv-details-btn').addEventListener('click', () => openServiceDetails(srv.id));
    timelineEl.appendChild(item);
  });

  window.lucide && window.lucide.createIcons();
}

// ==========================================
// SERVICES (Shërbimet)
// ==========================================
async function renderServices() {
  const allServices = await db.getServices();
  const vehicles = await db.getVehicles();
  const vehicleMap = {};
  vehicles.forEach(v => vehicleMap[v.id] = v);

  const searchInput = document.getElementById('services-search');
  const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';

  let services = allServices
    .filter(s => {
      if (!searchQuery) return true;
      const veh = vehicleMap[s.vehicleId];
      if (!veh) return false;
      const owner = (veh.ownerName || '').toLowerCase();
      const brand = (veh.vehicleBrand || '').toLowerCase();
      return owner.includes(searchQuery) || brand.includes(searchQuery);
    })
    .sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate));

  const tbody = document.querySelector('#table-services tbody');
  tbody.innerHTML = '';

  if (services.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <div class="empty-icon"><i data-lucide="wrench" style="width:48px;height:48px;color:var(--text-light);margin:0 auto 1rem;"></i></div>
          <div class="empty-text" style="font-weight:600;color:var(--text-main);">Nuk ka asnjë shërbim të regjistruar.</div>
        </td>
      </tr>
    `;
    window.lucide && window.lucide.createIcons();
    return;
  }

  services.forEach(srv => {
    const veh = vehicleMap[srv.vehicleId];
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.innerHTML = `
      <td>${escapeHtml(veh ? [veh.vehicleBrand, veh.vehicleModel].filter(Boolean).join(' ') : 'Automjet i fshirë') || '—'}</td>
      <td>${escapeHtml(veh ? veh.ownerName : '—') || '—'}</td>
      <td><span class="result-plate">${escapeHtml(veh ? veh.vehiclePlate : '—') || '—'}</span></td>
      <td>${formatDateAlbanian(srv.serviceDate)}</td>
      <td>${formatNumber(srv.mileage)} km</td>
      <td>${escapeHtml((srv.serviceTypes || []).join(', ')) || '—'}</td>
      <td>${formatNumber(srv.totalCost)} Lekë</td>
      <td style="text-align:right;" class="row-actions"></td>
    `;
    tr.addEventListener('click', () => openServiceDetails(srv.id));

    const actionsCell = tr.querySelector('.row-actions');
    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary btn-xs';
    editBtn.innerHTML = '<i data-lucide="edit" style="width:12px;height:12px;"></i>';
    editBtn.addEventListener('click', (e) => { e.stopPropagation(); startEditService(srv.id); });

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger btn-xs';
    delBtn.style.marginLeft = '0.4rem';
    delBtn.innerHTML = '<i data-lucide="trash-2" style="width:12px;height:12px;"></i>';
    delBtn.addEventListener('click', (e) => { e.stopPropagation(); startDeleteService(srv.id); });

    actionsCell.appendChild(editBtn);
    actionsCell.appendChild(delBtn);
    tbody.appendChild(tr);
  });

  window.lucide && window.lucide.createIcons();
}

async function openServiceDetails(srvId) {
  const srv = await db.getServiceById(srvId);
  if (!srv) return;

  document.getElementById('detail-srv-date').innerText = formatDateAlbanian(srv.serviceDate);
  document.getElementById('detail-srv-mileage').innerText = `${formatNumber(srv.mileage)} km`;
  document.getElementById('detail-srv-desc').innerText = srv.description || '-';

  const archivedBadge = document.getElementById('detail-srv-archived-badge-container');
  archivedBadge.style.display = srv.archived ? 'block' : 'none';

  const catContainer = document.getElementById('detail-srv-categories');
  catContainer.innerHTML = '';
  if (srv.serviceTypes && srv.serviceTypes.length > 0) {
    srv.serviceTypes.forEach(cat => {
      const span = document.createElement('span');
      span.className = 'badge badge-info';
      span.style.padding = '0.2rem 0.5rem';
      span.innerText = cat;
      catContainer.appendChild(span);
    });
  } else {
    catContainer.innerHTML = '<span class="badge badge-dark">Tjetër</span>';
  }

  const partsContainer = document.getElementById('detail-srv-parts-container');
  const tbody = document.getElementById('detail-srv-parts-tbody');
  tbody.innerHTML = '';
  if (srv.parts && srv.parts.length > 0) {
    partsContainer.style.display = 'block';
    srv.parts.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding:0.5rem 0.75rem;border-bottom:1px solid var(--border-color);font-weight:500;color:var(--text-main);">${escapeHtml(p.name)}</td>
        <td style="padding:0.5rem 0.75rem;border-bottom:1px solid var(--border-color);text-align:center;font-weight:600;color:var(--text-main);">${escapeHtml(p.quantity)}</td>
        <td style="padding:0.5rem 0.75rem;border-bottom:1px solid var(--border-color);text-align:right;color:var(--text-muted);">${escapeHtml(p.description) || '-'}</td>
      `;
      tbody.appendChild(tr);
    });
  } else {
    partsContainer.style.display = 'none';
  }

  document.getElementById('detail-srv-cost-parts').innerText = `${formatNumber(srv.partsCost)} Lekë`;
  document.getElementById('detail-srv-cost-labor').innerText = `${formatNumber(srv.laborCost)} Lekë`;
  document.getElementById('detail-srv-cost-total').innerText = `${formatNumber(srv.totalCost)} Lekë`;

  const notesContainer = document.getElementById('detail-srv-notes-container');
  if (srv.notes) {
    notesContainer.style.display = 'block';
    document.getElementById('detail-srv-notes').innerText = srv.notes;
  } else {
    notesContainer.style.display = 'none';
  }

  const archiveBtn = document.getElementById('btn-detail-archive');
  const archiveText = document.getElementById('btn-detail-archive-text');
  archiveText.innerText = srv.archived ? 'Çarkivo' : 'Arkivo';

  const newArchiveBtn = archiveBtn.cloneNode(true);
  archiveBtn.parentNode.replaceChild(newArchiveBtn, archiveBtn);
  newArchiveBtn.addEventListener('click', async () => {
    const nextState = !srv.archived;
    await db.updateServiceRecord(srv.id, { archived: nextState });
    showToast(nextState ? 'Shërbimi u arkivua.' : 'Shërbimi u çarkivua.', 'success');
    closeModal('modal-service-details');
    if (state.currentView === 'vehicle-profile') await renderVehicleProfile(srv.vehicleId);
    if (state.currentView === 'services') await renderServices();
  });

  const editBtn = document.getElementById('btn-detail-edit');
  const newEditBtn = editBtn.cloneNode(true);
  editBtn.parentNode.replaceChild(newEditBtn, editBtn);
  newEditBtn.addEventListener('click', () => {
    closeModal('modal-service-details');
    startEditService(srv.id);
  });

  const deleteBtn = document.getElementById('btn-detail-delete');
  const newDeleteBtn = deleteBtn.cloneNode(true);
  deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
  newDeleteBtn.addEventListener('click', () => {
    closeModal('modal-service-details');
    startDeleteService(srv.id);
  });

  openModal('modal-service-details');
  window.lucide && window.lucide.createIcons();
}

// ==========================================
// MODALS (generic open/close)
// ==========================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('show');
  window.lucide && window.lucide.createIcons();
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('show');
}

// ==========================================
// VEHICLE DROPDOWN (për formularin e shërbimit)
// ==========================================
async function populateVehicleDropdown(selectedId = null) {
  const select = document.getElementById('srv-vehicle-select');
  const vehicles = (await db.getVehicles()).sort((a, b) => (a.ownerName || '').localeCompare(b.ownerName || ''));

  select.innerHTML = '<option value="" disabled selected>Zgjidh automjetin...</option>';
  vehicles.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id;
    const label = `${v.ownerName} — ${[v.vehicleBrand, v.vehicleModel].filter(Boolean).join(' ')}${v.vehiclePlate ? ' (' + v.vehiclePlate + ')' : ''}`;
    opt.textContent = label;
    if (selectedId && v.id === selectedId) opt.selected = true;
    select.appendChild(opt);
  });
}

// ==========================================
// VEHICLE MODAL (Add / Edit)
// ==========================================
function openAddVehicleModal() {
  state.editingVehicleId = null;
  document.getElementById('form-vehicle').reset();
  document.getElementById('veh-id').value = '';
  document.getElementById('modal-vehicle-title').textContent = 'Shto Automjet';
  openModal('modal-vehicle');
}

async function startEditVehicle(id) {
  const veh = await db.getVehicleById(id);
  if (!veh) return;

  state.editingVehicleId = veh.id;
  document.getElementById('veh-id').value = veh.id;
  document.getElementById('veh-owner-name').value = veh.ownerName || '';
  document.getElementById('veh-brand').value = veh.vehicleBrand || '';
  document.getElementById('veh-owner-phone').value = veh.ownerPhone || '';
  document.getElementById('veh-plate').value = veh.vehiclePlate || '';
  document.getElementById('veh-model').value = veh.vehicleModel || '';
  document.getElementById('veh-year').value = veh.vehicleYear || '';
  document.getElementById('veh-engine').value = veh.vehicleEngine || '';
  document.getElementById('veh-vin').value = veh.vehicleVin || '';

  document.getElementById('modal-vehicle-title').textContent = 'Modifiko Automjetin';
  openModal('modal-vehicle');
}

async function startDeleteVehicle(id) {
  const veh = await db.getVehicleById(id);
  if (!veh) return;

  state.deletingId = id;
  state.deletingType = 'vehicle';
  document.getElementById('confirm-delete-title').innerText = 'Fshi automjetin?';
  document.getElementById('confirm-delete-message').innerText = `Ky veprim do të fshijë automjetin e "${veh.ownerName}" (${veh.vehicleBrand}) dhe të gjitha shërbimet e lidhura. Ky veprim nuk mund të kthehet mbrapsht.`;
  openModal('modal-confirm-delete');
}

// The core save function: validates only ownerName + vehicleBrand,
// persists via db.js, closes the modal, and refreshes list + stats immediately.
async function saveVehicle(e) {
  e.preventDefault();

  const ownerName = document.getElementById('veh-owner-name').value.trim();
  const vehicleBrand = document.getElementById('veh-brand').value.trim();

  if (!ownerName || !vehicleBrand) {
    showToast('Emri i Pronarit dhe Marka janë të detyrueshme.', 'error');
    return;
  }

  const vehicleData = {
    ownerName,
    vehicleBrand,
    ownerPhone: document.getElementById('veh-owner-phone').value.trim(),
    vehiclePlate: document.getElementById('veh-plate').value.trim(),
    vehicleModel: document.getElementById('veh-model').value.trim(),
    vehicleYear: document.getElementById('veh-year').value,
    vehicleEngine: document.getElementById('veh-engine').value.trim(),
    vehicleVin: document.getElementById('veh-vin').value.trim()
  };

  try {
    if (state.editingVehicleId) {
      await db.updateVehicle(state.editingVehicleId, vehicleData);
      showToast('Automjeti u përditësua me sukses.', 'success');
    } else {
      await db.addVehicle(vehicleData);
      showToast('Automjeti u shtua me sukses.', 'success');
    }
  } catch (err) {
    showToast(err.message || 'Ndodhi një gabim gjatë ruajtjes.', 'error');
    return;
  }

  closeModal('modal-vehicle');

  // Refresh immediately so the new/updated vehicle shows up without a reload
  await renderVehicles();
  await updateDashboardStats();

  if (state.currentView === 'vehicle-profile' && state.selectedVehicleId) {
    await renderVehicleProfile(state.selectedVehicleId);
  }
}

// ==========================================
// SERVICE MODAL (Add / Edit)
// ==========================================
async function populateCategoryCheckboxes(selected = []) {
  const container = document.getElementById('srv-categories-checkboxes');
  const categories = await db.getActiveCategories();
  container.innerHTML = '';
  categories.forEach((cat, i) => {
    const inputId = `srv-cat-${i}`;
    const checked = selected.includes(cat.name) ? 'checked' : '';
    container.insertAdjacentHTML('beforeend', `
      <input type="checkbox" class="service-type-checkbox" id="${inputId}" value="${escapeHtml(cat.name)}" ${checked}>
      <label class="service-type-label" for="${inputId}">${escapeHtml(cat.name)}</label>
    `);
  });
}

function setupPartsEditor() {
  document.getElementById('btn-add-part-row').addEventListener('click', () => addPartRow());
}

function addPartRow(part = {}) {
  const container = document.getElementById('srv-parts-rows-container');
  const rowId = 'part_' + (state.partsCount++);
  const row = document.createElement('div');
  row.className = 'part-row';
  row.dataset.rowId = rowId;
  row.innerHTML = `
    <input type="text" class="form-control part-name" placeholder="Emri i pjesës" value="${escapeHtml(part.name || '')}">
    <input type="number" class="form-control part-qty" placeholder="Sasia" min="1" value="${part.quantity || 1}">
    <input type="text" class="form-control part-desc" placeholder="Brand" value="${escapeHtml(part.description || '')}">
    <button type="button" class="btn btn-danger btn-xs remove-part-row">&times;</button>
  `;
  row.querySelector('.remove-part-row').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function collectParts() {
  const rows = document.querySelectorAll('#srv-parts-rows-container .part-row');
  const parts = [];
  rows.forEach(row => {
    const name = row.querySelector('.part-name').value.trim();
    if (!name) return;
    parts.push({
      name,
      quantity: parseInt(row.querySelector('.part-qty').value) || 1,
      description: row.querySelector('.part-desc').value.trim()
    });
  });
  return parts;
}

function calculateServiceTotal() {
  const partsCost = parseFloat(document.getElementById('srv-cost-parts').value) || 0;
  const laborCost = parseFloat(document.getElementById('srv-cost-labor').value) || 0;
  document.getElementById('srv-total-display').textContent = `${formatNumber(partsCost + laborCost)} Lekë`;
}

async function openAddServiceModal(lockedVehicleId = null) {
  state.editingServiceId = null;
  document.getElementById('form-service').reset();
  document.getElementById('srv-id').value = '';
  document.getElementById('srv-parts-rows-container').innerHTML = '';
  document.getElementById('srv-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('srv-cost-parts').value = 0;
  document.getElementById('srv-cost-labor').value = 0;
  calculateServiceTotal();

  await populateVehicleDropdown(lockedVehicleId);
  await populateCategoryCheckboxes();

  const vehicleGroup = document.getElementById('srv-vehicle-group');
  const vehicleSelect = document.getElementById('srv-vehicle-select');
  if (lockedVehicleId) {
    vehicleSelect.value = lockedVehicleId;
    vehicleSelect.disabled = true;
    vehicleGroup.style.display = 'none';
  } else {
    vehicleSelect.disabled = false;
    vehicleGroup.style.display = 'block';
  }

  document.getElementById('modal-service-title').textContent = 'Regjistro Shërbim';
  openModal('modal-service');
}

async function startEditService(id) {
  const srv = await db.getServiceById(id);
  if (!srv) return;

  state.editingServiceId = srv.id;
  document.getElementById('form-service').reset();
  document.getElementById('srv-parts-rows-container').innerHTML = '';

  await populateVehicleDropdown(srv.vehicleId);
  await populateCategoryCheckboxes(srv.serviceTypes || []);

  document.getElementById('srv-id').value = srv.id;
  document.getElementById('srv-vehicle-select').value = srv.vehicleId;
  document.getElementById('srv-vehicle-select').disabled = true;
  document.getElementById('srv-vehicle-group').style.display = 'none';
  document.getElementById('srv-date').value = formatDateSimple(srv.serviceDate);
  document.getElementById('srv-mileage').value = srv.mileage;
  document.getElementById('srv-description').value = srv.description || '';
  document.getElementById('srv-cost-parts').value = srv.partsCost || 0;
  document.getElementById('srv-cost-labor').value = srv.laborCost || 0;
  document.getElementById('srv-notes').value = srv.notes || '';
  calculateServiceTotal();

  (srv.parts || []).forEach(p => addPartRow(p));

  document.getElementById('modal-service-title').textContent = 'Modifiko Shërbimin';
  openModal('modal-service');
}

async function startDeleteService(id) {
  const srv = await db.getServiceById(id);
  if (!srv) return;

  state.deletingId = id;
  state.deletingType = 'service';
  document.getElementById('confirm-delete-title').innerText = 'Fshi shërbimin?';
  document.getElementById('confirm-delete-message').innerText = `Ky veprim do të fshijë shërbimin e datës ${formatDateAlbanian(srv.serviceDate)}. Ky veprim nuk mund të kthehet mbrapsht.`;
  openModal('modal-confirm-delete');
}

async function saveService(e) {
  e.preventDefault();

  const vehicleId = document.getElementById('srv-vehicle-select').value;
  const date = document.getElementById('srv-date').value;
  const mileage = document.getElementById('srv-mileage').value;

  if (!vehicleId || !date || mileage === '') {
    showToast('Automjeti, data dhe kilometrazhi janë të detyrueshme.', 'error');
    return;
  }

  const serviceTypes = Array.from(document.querySelectorAll('#srv-categories-checkboxes input:checked')).map(cb => cb.value);

  const serviceData = {
    vehicleId,
    serviceDate: date,
    mileage,
    serviceTypes,
    description: document.getElementById('srv-description').value.trim(),
    parts: collectParts(),
    partsCost: document.getElementById('srv-cost-parts').value,
    laborCost: document.getElementById('srv-cost-labor').value,
    notes: document.getElementById('srv-notes').value.trim()
  };

  try {
    if (state.editingServiceId) {
      await db.updateServiceRecord(state.editingServiceId, serviceData);
      showToast('Shërbimi u përditësua me sukses.', 'success');
    } else {
      await db.addServiceRecord(serviceData);
      showToast('Shërbimi u regjistrua me sukses.', 'success');
    }
  } catch (err) {
    showToast(err.message || 'Ndodhi një gabim gjatë ruajtjes.', 'error');
    return;
  }

  closeModal('modal-service');

  await updateDashboardStats();
  if (state.currentView === 'services') await renderServices();
  if (state.currentView === 'vehicle-profile') await renderVehicleProfile(vehicleId);
  if (state.currentView === 'vehicles') await renderVehicles();
}

// ==========================================
// FORM HANDLERS / DELETE CONFIRM
// ==========================================
function setupFormHandlers() {
  document.getElementById('form-vehicle').addEventListener('submit', saveVehicle);
  document.getElementById('form-service').addEventListener('submit', saveService);

  document.getElementById('srv-cost-parts').addEventListener('input', calculateServiceTotal);
  document.getElementById('srv-cost-labor').addEventListener('input', calculateServiceTotal);

  document.getElementById('btn-confirm-delete-action').addEventListener('click', async () => {
    if (state.deletingType === 'vehicle') {
      await db.deleteVehicle(state.deletingId);
      showToast('Automjeti u fshi me sukses.', 'warning');
      closeModal('modal-confirm-delete');
      await updateDashboardStats();
      if (state.currentView === 'vehicle-profile') {
        navigateTo('vehicles');
      } else {
        await renderVehicles();
      }
    } else if (state.deletingType === 'service') {
      const srv = await db.getServiceById(state.deletingId);
      await db.deleteServiceRecord(state.deletingId);
      showToast('Shërbimi u fshi me sukses.', 'warning');
      closeModal('modal-confirm-delete');
      await updateDashboardStats();
      if (state.currentView === 'vehicle-profile' && srv) await renderVehicleProfile(srv.vehicleId);
      if (state.currentView === 'services') await renderServices();
    }
    state.deletingId = null;
    state.deletingType = null;
  });
}

// ==========================================
// SEARCH
// ==========================================
function setupSearch() {
  const globalInput = document.getElementById('global-search');
  const dropdown = document.getElementById('search-results-dropdown');

  globalInput.addEventListener('input', async () => {
    const query = globalInput.value.trim();
    if (!query) {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
      return;
    }
    const results = await db.searchAll(query);
    if (results.length === 0) {
      dropdown.innerHTML = `<div class="search-result-empty">Nuk u gjet asnjë automjet me këtë kërkim.</div>`;
      dropdown.style.display = 'block';
      return;
    }
    dropdown.innerHTML = results.slice(0, 8).map(r => `
      <div class="search-result-item" data-vehicle-id="${r.id}">
        <span class="result-plate">${escapeHtml(r.subtitle)}</span>
        <div>
          <div style="font-weight:600;">${escapeHtml(r.title)}</div>
          <div style="font-size:0.8rem;color:var(--text-muted);">${escapeHtml(r.owner)}</div>
        </div>
      </div>
    `).join('');
    dropdown.style.display = 'block';

    dropdown.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        dropdown.style.display = 'none';
        globalInput.value = '';
        navigateTo('vehicle-profile', { vehicleId: el.dataset.vehicleId });
      });
    });
  });

  document.addEventListener('click', (e) => {
    if (!globalInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  document.getElementById('vehicles-search').addEventListener('input', () => renderVehicles());
  document.getElementById('services-search').addEventListener('input', () => renderServices());
}
