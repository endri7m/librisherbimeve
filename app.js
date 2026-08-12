// app.js - Kontrolluesi kryesor i aplikacionit

import { db } from './db.js';

// Gjendja e aplikacionit (App State)
const state = {
  currentView: 'dashboard',
  selectedVehicleId: null,
  partsCount: 0,
  editingCustomerId: null,
  editingVehicleId: null,
  editingServiceId: null,
  deletingId: null,
  deletingType: null
};

// Kur ngarkohet faqja (DOM Loaded)
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // Inicializo navigimin
  setupNavigation();
  
  // Inicializo veprimet e shpejta të panelit
  setupDashboardActions();
  
  // Inicializo formularët dhe modale
  setupFormHandlers();
  
  // Inicializo kërkimin global
  setupSearch();
  
  // Inicializo faqen e cilësimeve (demo data / firebase / supabase)
  setupSettingsPage();
  
  // Ngarko pamjen e parë (Dashboard)
  navigateTo('dashboard');
  
  // Vendos funksionet e modalit në window që të thirren nga HTML
  window.openModal = openModal;
  window.closeModal = closeModal;
}

// ==========================================
// TOAST NOTIFICATIONS (Njoftimet Toast)
// ==========================================
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = '✅';
  if (type === 'warning') icon = '⚠️';
  if (type === 'error') icon = '❌';
  
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      <span>${icon}</span>
      <span>${message}</span>
    </div>
    <button style="background:none; border:none; color:inherit; font-size:1.1rem; cursor:pointer; font-weight:bold; margin-left:1rem;" onclick="this.parentElement.remove()">&times;</button>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// ==========================================
// ROUTING / VIEW NAVIGATION (Navigimi)
// ==========================================
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.getAttribute('data-view');
      if (view) {
        navigateTo(view);
      }
    });
  });
}

async function navigateTo(viewName, params = {}) {
  state.currentView = viewName;
  
  // Fshih të gjitha pamjet
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.style.display = 'none';
  });
  
  // Përditëso klasat active te sidebar
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-view') === viewName) {
      item.classList.add('active');
    }
  });

  // Mbyll çdo dropdown kërkimi nëse është i hapur
  document.getElementById('search-results-dropdown').style.display = 'none';
  document.getElementById('global-search').value = '';

  const titleEl = document.getElementById('view-title');
  const subtitleEl = document.getElementById('view-subtitle-text');

  switch (viewName) {
    case 'dashboard':
      titleEl.innerText = 'Paneli';
      subtitleEl.innerText = 'Përmbledhja e përgjithshme dhe statistikat e servisit';
      await renderDashboard();
      document.getElementById('view-dashboard-section').style.display = 'block';
      break;
      
    case 'customers':
      titleEl.innerText = 'Klientët';
      subtitleEl.innerText = 'Menaxhimi i klientëve dhe automjeteve të tyre';
      await renderCustomers();
      document.getElementById('view-customers-section').style.display = 'block';
      break;
      
    case 'vehicles':
      titleEl.innerText = 'Automjetet';
      subtitleEl.innerText = 'Lista e plotë e mjeteve të regjistruara në sistem';
      await renderVehicles();
      document.getElementById('view-vehicles-section').style.display = 'block';
      break;
      
    case 'history':
      titleEl.innerText = 'Historiku i Servisit';
      subtitleEl.innerText = 'Lista kronologjike e të gjitha shërbimeve të kryera';
      await renderAllServices();
      document.getElementById('view-history-section').style.display = 'block';
      break;
      
    case 'settings':
      titleEl.innerText = 'Cilësimet';
      subtitleEl.innerText = 'Menaxhimi i të dhënave dhe sinkronizimi Supabase/Firebase';
      await renderSettings();
      document.getElementById('view-settings-section').style.display = 'block';
      break;
      
    case 'vehicle-profile':
      const vehicle = await db.getVehicleById(params.vehicleId);
      if (vehicle) {
        state.selectedVehicleId = vehicle.id;
        titleEl.innerText = `${vehicle.make} ${vehicle.model}`;
        subtitleEl.innerText = `Profili dhe historiku i detajuar i shërbimeve`;
        await renderVehicleProfile(vehicle.id);
        document.getElementById('view-vehicle-profile-section').style.display = 'block';
      } else {
        showToast('Automjeti nuk u gjet!', 'error');
        navigateTo('dashboard');
      }
      break;
  }
}

// ==========================================
// PANELI (DASHBOARD)
// ==========================================
async function renderDashboard() {
  const stats = await db.getDashboardStats();
  
  // Shfaq statistikat
  document.getElementById('stats-customers').innerText = stats.customerCount;
  document.getElementById('stats-vehicles').innerText = stats.vehicleCount;
  document.getElementById('stats-services').innerText = stats.serviceCount;
  
  // Shfaq shërbimet e fundit (5 të fundit)
  const allServices = await db.getServices();
  const services = allServices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const tbody = document.querySelector('#table-recent-services tbody');
  tbody.innerHTML = '';
  
  if (services.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <div class="empty-icon">🔧</div>
          <div class="empty-text">Nuk ka asnjë shërbim të regjistruar akoma.</div>
        </td>
      </tr>
    `;
    return;
  }
  
  for (const srv of services) {
    const veh = await db.getVehicleById(srv.vehicleId);
    const customer = veh ? await db.getCustomerById(veh.customerId) : null;
    const customerName = customer ? `${customer.firstName} ${customer.lastName}` : 'Pa pronar';
    const vehName = veh ? `${veh.make} ${veh.model}` : 'Mjet i panjohur';
    const plate = veh ? veh.licensePlate : '-';
    
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.addEventListener('click', () => {
      if (veh) navigateTo('vehicle-profile', { vehicleId: veh.id });
    });
    
    tr.innerHTML = `
      <td style="font-weight: 600;">${vehName}</td>
      <td><span class="result-plate">${plate}</span></td>
      <td>${customerName}</td>
      <td>${formatDateSimple(srv.serviceDate)}</td>
      <td style="font-weight: 500;">${formatNumber(srv.mileage)} km</td>
      <td>
        <div style="display:flex; flex-direction:column; gap:0.25rem;">
          <strong>${srv.serviceTypes.join(', ') || 'Tjetër'}</strong>
          <span style="font-size:0.8rem; color:var(--text-muted); max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            ${srv.description}
          </span>
        </div>
      </td>
      <td style="font-weight: 700; color: var(--accent);">${formatNumber(srv.totalCost)} Lekë</td>
    `;
    tbody.appendChild(tr);
  }
}

function setupDashboardActions() {
  document.getElementById('btn-quick-add-customer').addEventListener('click', () => openModal('modal-customer'));
  document.getElementById('btn-quick-add-vehicle').addEventListener('click', () => openModal('modal-vehicle'));
  document.getElementById('btn-quick-add-service').addEventListener('click', () => openModal('modal-service'));
}

// ==========================================
// KLIENTËT (CUSTOMERS)
// ==========================================
async function renderCustomers() {
  const allCustomers = await db.getCustomers();
  const customers = allCustomers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const tbody = document.querySelector('#table-customers tbody');
  tbody.innerHTML = '';
  
  if (customers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <div class="empty-icon">👥</div>
          <div class="empty-text">Nuk ka asnjë klient të regjistruar akoma.</div>
        </td>
      </tr>
    `;
    return;
  }
  
  for (const cust of customers) {
    const vehicles = await db.getVehiclesByCustomer(cust.id);
    const vehicleCount = vehicles.length;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 600;">${cust.firstName} ${cust.lastName}</td>
      <td style="font-weight: 500;">${cust.phone}</td>
      <td>${cust.email || '-'}</td>
      <td>${cust.address || '-'}</td>
      <td>
        <span class="badge badge-info" style="cursor:pointer;" id="badge-cust-veh-${cust.id}">
          ${vehicleCount} ${vehicleCount === 1 ? 'automjet' : 'automjete'}
        </span>
      </td>
      <td>${formatDateSimple(cust.createdAt)}</td>
      <td style="font-size: 0.85rem; color: var(--text-muted); max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
        ${cust.notes || '-'}
      </td>
      <td>
        <div style="display: flex; gap: 0.4rem;">
          <button class="btn btn-secondary btn-sm edit-cust-btn" data-id="${cust.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Ndrysho</button>
          <button class="btn btn-danger btn-sm delete-cust-btn" data-id="${cust.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Fshi</button>
        </div>
      </td>
    `;
    
    const badge = tr.querySelector(`#badge-cust-veh-${cust.id}`);
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal('modal-vehicle', { customerId: cust.id });
    });

    tr.querySelector('.edit-cust-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      startEditCustomer(cust.id);
    });

    tr.querySelector('.delete-cust-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      startDeleteCustomer(cust.id);
    });
    
    tbody.appendChild(tr);
  }
}

// ==========================================
// AUTOMJETET (VEHICLES)
// ==========================================
async function renderVehicles() {
  const allVehicles = await db.getVehicles();
  const vehicles = allVehicles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const tbody = document.querySelector('#table-vehicles tbody');
  tbody.innerHTML = '';
  
  if (vehicles.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <div class="empty-icon">🚗</div>
          <div class="empty-text">Nuk ka asnjë automjet të regjistruar akoma.</div>
        </td>
      </tr>
    `;
    return;
  }
  
  for (const veh of vehicles) {
    const owner = await db.getCustomerById(veh.customerId);
    const ownerName = owner ? `${owner.firstName} ${owner.lastName}` : 'Pa pronar';
    
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.addEventListener('click', () => {
      navigateTo('vehicle-profile', { vehicleId: veh.id });
    });
    
    tr.innerHTML = `
      <td><span class="result-plate">${veh.licensePlate}</span></td>
      <td style="font-weight: 600;">${veh.make} ${veh.model}</td>
      <td style="font-weight: 500;">${veh.year}</td>
      <td>${ownerName}</td>
      <td style="font-weight: 700; color: var(--accent);">${formatNumber(veh.mileage)} km</td>
      <td>
        <span class="badge badge-dark">${veh.fuelType || '-'}</span> 
        <span class="badge badge-dark">${veh.transmission || '-'}</span>
      </td>
      <td>
        <div style="display: flex; gap: 0.4rem;" onclick="event.stopPropagation()">
          <button class="btn btn-secondary btn-sm edit-veh-btn" data-id="${veh.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Ndrysho</button>
          <button class="btn btn-danger btn-sm delete-veh-btn" data-id="${veh.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Fshi</button>
        </div>
      </td>
    `;

    tr.querySelector('.edit-veh-btn').addEventListener('click', (e) => {
      startEditVehicle(veh.id);
    });

    tr.querySelector('.delete-veh-btn').addEventListener('click', (e) => {
      startDeleteVehicle(veh.id);
    });

    tbody.appendChild(tr);
  }
}

// ==========================================
// HISTORIKU I PËRGJITHSHËM (ALL HISTORY)
// ==========================================
async function renderAllServices() {
  const allServices = await db.getServices();
  const services = allServices.sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate));
  const tbody = document.querySelector('#table-all-services tbody');
  tbody.innerHTML = '';
  
  if (services.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <div class="empty-icon">📋</div>
          <div class="empty-text">Nuk ka asnjë shërbim të regjistruar në sistem.</div>
        </td>
      </tr>
    `;
    return;
  }
  
  for (const srv of services) {
    const veh = await db.getVehicleById(srv.vehicleId);
    const vehName = veh ? `${veh.make} ${veh.model}` : 'Mjet i panjohur';
    const plate = veh ? veh.licensePlate : '-';
    
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.addEventListener('click', () => {
      if (veh) navigateTo('vehicle-profile', { vehicleId: veh.id });
    });
    
    tr.innerHTML = `
      <td style="font-weight: 600;">${vehName}</td>
      <td><span class="result-plate">${plate}</span></td>
      <td>${formatDateSimple(srv.serviceDate)}</td>
      <td style="font-weight: 500;">${formatNumber(srv.mileage)} km</td>
      <td><strong>${srv.serviceTypes.join(', ') || 'Tjetër'}</strong></td>
      <td style="font-size: 0.9rem; color: var(--text-muted); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${srv.description}
      </td>
      <td style="font-weight: 700; color: var(--accent);">${formatNumber(srv.totalCost)} Lekë</td>
    `;
    tbody.appendChild(tr);
  }
}

// ==========================================
// PROFILI I AUTOMJETIT (VEHICLE PROFILE)
// ==========================================
async function renderVehicleProfile(vehicleId) {
  const veh = await db.getVehicleById(vehicleId);
  if (!veh) return;
  
  const owner = await db.getCustomerById(veh.customerId);
  const ownerName = owner ? `${owner.firstName} ${owner.lastName}` : 'Pa pronar';
  
  document.getElementById('prof-make-model').innerText = `${veh.make} ${veh.model}`;
  document.getElementById('prof-plate').innerText = veh.licensePlate;
  document.getElementById('prof-owner').innerText = ownerName;
  document.getElementById('prof-year').innerText = veh.year;
  document.getElementById('prof-mileage').innerText = `${formatNumber(veh.mileage)} km`;
  document.getElementById('prof-engine').innerText = veh.engine || '-';
  document.getElementById('prof-fuel').innerText = veh.fuelType || '-';
  document.getElementById('prof-trans').innerText = veh.transmission || '-';
  document.getElementById('prof-color').innerText = veh.color || '-';
  document.getElementById('prof-vin').innerText = veh.vin || '-';
  document.getElementById('prof-notes').innerText = veh.notes || 'Nuk ka shënime shtesë.';
  
  const addSrvBtn = document.getElementById('btn-profile-add-service');
  const newAddSrvBtn = addSrvBtn.cloneNode(true);
  addSrvBtn.parentNode.replaceChild(newAddSrvBtn, addSrvBtn);
  newAddSrvBtn.addEventListener('click', () => {
    openModal('modal-service', { vehicleId: veh.id });
  });

  const editVehBtn = document.getElementById('btn-profile-edit-vehicle');
  const newEditVehBtn = editVehBtn.cloneNode(true);
  editVehBtn.parentNode.replaceChild(newEditVehBtn, editVehBtn);
  newEditVehBtn.addEventListener('click', () => {
    startEditVehicle(veh.id);
  });

  const deleteVehBtn = document.getElementById('btn-profile-delete-vehicle');
  const newDeleteVehBtn = deleteVehBtn.cloneNode(true);
  deleteVehBtn.parentNode.replaceChild(newDeleteVehBtn, deleteVehBtn);
  newDeleteVehBtn.addEventListener('click', () => {
    startDeleteVehicle(veh.id);
  });
  
  await renderVehicleTimeline(veh.id);
}

async function renderVehicleTimeline(vehicleId) {
  const services = await db.getServicesByVehicle(vehicleId);
  const timelineEl = document.getElementById('vehicle-timeline');
  timelineEl.innerHTML = '';
  
  if (services.length === 0) {
    timelineEl.innerHTML = `
      <div class="empty-state" style="background-color: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-color); padding: 2rem 1.5rem;">
        <div class="empty-icon" style="font-size: 2rem;">🔧</div>
        <div class="empty-text">Kjo makinë nuk ka asnjë shërbim të regjistruar kronologjikisht.</div>
      </div>
    `;
    return;
  }
  
  services.forEach(srv => {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    
    let partsHtml = '';
    if (srv.parts && srv.parts.length > 0) {
      partsHtml = `
        <div class="timeline-parts">
          <div class="timeline-parts-title">Pjesët e ndërruara</div>
          <ul class="timeline-parts-list">
            ${srv.parts.map(p => `
              <li>
                <span style="font-weight: 500;">• ${p.name} (x${p.quantity})</span>
                <span style="color: var(--text-muted); font-size: 0.8rem;">${p.description || ''}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }
    
    const notesHtml = srv.notes ? `
      <div class="timeline-notes">
        <strong>Shënime:</strong> "${srv.notes}"
      </div>
    ` : '';
    
    item.innerHTML = `
      <div class="timeline-dot"></div>
      <div class="timeline-header">
        <div class="timeline-date-km">
          <span class="timeline-date">${formatDateAlbanian(srv.serviceDate)}</span>
          <span class="timeline-km">${formatNumber(srv.mileage)} km</span>
        </div>
        <span class="timeline-cost-badge">${formatNumber(srv.totalCost)} Lekë</span>
      </div>
      <div class="timeline-card">
        <div class="timeline-title">
          <span>🔧</span>
          <span>${srv.serviceTypes.join(' & ') || 'Shërbim i kryer'}</span>
        </div>
        <div class="timeline-desc">${srv.description}</div>
        
        ${partsHtml}
        ${notesHtml}
        
        <div class="timeline-footer">
          <span>Kosto e pjesëve: ${formatNumber(srv.partsCost)} Lekë | Kosto e punës: ${formatNumber(srv.laborCost)} Lekë</span>
          <span>Mekaniku i Servisit</span>
        </div>
        <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.75rem; border-top: 1px dashed var(--border-color); padding-top: 0.5rem;">
          <button class="btn btn-secondary btn-sm edit-srv-btn" data-id="${srv.id}" style="padding: 0.15rem 0.4rem; font-size: 0.75rem; font-weight: normal;">Ndrysho</button>
          <button class="btn btn-danger btn-sm delete-srv-btn" data-id="${srv.id}" style="padding: 0.15rem 0.4rem; font-size: 0.75rem; font-weight: normal;">Fshi</button>
        </div>
      </div>
    `;

    item.querySelector('.edit-srv-btn').addEventListener('click', () => {
      startEditService(srv.id);
    });

    item.querySelector('.delete-srv-btn').addEventListener('click', () => {
      startDeleteService(srv.id);
    });
    
    timelineEl.appendChild(item);
  });
}

// ==========================================
// CILËSIMET (SETTINGS)
// ==========================================
function setupSettingsPage() {
  document.getElementById('btn-load-demo').addEventListener('click', async () => {
    if (confirm('A jeni të sigurt që dëshironi të ngarkoni të dhënat demo shqip? Të dhënat aktuale do të fshihen.')) {
      await db.resetToDemo();
      showToast('Të dhënat demo u ngarkuan me sukses!', 'success');
      navigateTo('dashboard');
    }
  });
  
  document.getElementById('btn-clear-data').addEventListener('click', async () => {
    if (confirm('Kujdes! Ky veprim do të fshijë të gjithë klientët, automjetet dhe historikun e shërbimeve. A jeni të sigurt?')) {
      await db.clearAll();
      showToast('Të gjitha të dhënat u fshinë me sukses.', 'warning');
      navigateTo('dashboard');
    }
  });
  
  // Submit i Formës së Firebase Config
  document.getElementById('form-firebase-config').addEventListener('submit', async (e) => {
    e.preventDefault();
    const configVal = document.getElementById('fb-config-json').value.trim();
    if (!configVal) {
      showToast('Lutem vendosni një konfigurim JSON të vlefshëm.', 'error');
      return;
    }
    try {
      const config = JSON.parse(configVal);
      if (config && config.projectId) {
        const success = db.saveFirebaseConfig(config);
        if (success) {
          showToast('Firebase u lidh me sukses!', 'success');
          await renderSettings();
        } else {
          showToast('Gabim gjatë lidhjes me Firebase SDK.', 'error');
        }
      } else {
        showToast('JSON nuk është një konfigurim i vlefshëm Firebase (mungon projectId).', 'error');
      }
    } catch (err) {
      showToast('Formati JSON është i pasaktë. Kontrollojeni përsëri.', 'error');
    }
  });
  
  document.getElementById('btn-disconnect-fb').addEventListener('click', async () => {
    db.saveFirebaseConfig(null);
    showToast('Firebase u shkëput. Aplikacioni tani përdor memorie lokale.', 'info');
    await renderSettings();
  });

  // Submit i Formës së Supabase Config
  document.getElementById('form-supabase-config').addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = document.getElementById('sb-url').value.trim();
    const key = document.getElementById('sb-key').value.trim();
    
    if (!url || !key) {
      showToast('Lutem plotësoni URL-në dhe Anon Key të Supabase.', 'error');
      return;
    }
    
    const success = db.saveSupabaseConfig(url, key);
    if (success) {
      showToast('Supabase u lidh me sukses!', 'success');
      await renderSettings();
    } else {
      showToast('Gabim gjatë lidhjes me Supabase SDK.', 'error');
    }
  });

  document.getElementById('btn-disconnect-sb').addEventListener('click', async () => {
    db.saveSupabaseConfig("", "");
    showToast('Supabase u shkëput.', 'info');
    await renderSettings();
  });
}

async function renderSettings() {
  // Firebase status
  const fbBadge = document.getElementById('firebase-status-badge');
  const isFb = db.isUsingFirebase();
  const fbConfig = db.getFirebaseConfig();
  
  if (isFb) {
    fbBadge.innerText = 'Lidhur me Firebase (Firestore)';
    fbBadge.className = 'badge badge-success';
    document.getElementById('fb-config-json').value = JSON.stringify(fbConfig, null, 2);
  } else {
    fbBadge.innerText = 'Lokal (LocalStorage)';
    fbBadge.className = 'badge badge-dark';
    document.getElementById('fb-config-json').value = '';
  }

  // Supabase status
  const sbBadge = document.getElementById('supabase-status-badge');
  const isSb = db.isUsingSupabase();
  const sbConfig = db.getSupabaseConfig();

  if (isSb) {
    sbBadge.innerText = 'Lidhur me Supabase';
    sbBadge.className = 'badge badge-success';
    document.getElementById('sb-url').value = sbConfig.url;
    document.getElementById('sb-key').value = sbConfig.key;
  } else {
    sbBadge.innerText = 'Lokal (LocalStorage)';
    sbBadge.className = 'badge badge-dark';
    document.getElementById('sb-url').value = '';
    document.getElementById('sb-key').value = '';
  }
}

// ==========================================
// KËRKIMI GLOBAL (GLOBAL SEARCH)
// ==========================================
function setupSearch() {
  const searchInput = document.getElementById('global-search');
  const dropdown = document.getElementById('search-results-dropdown');
  
  searchInput.addEventListener('input', async () => {
    const val = searchInput.value.trim();
    if (!val) {
      dropdown.style.display = 'none';
      return;
    }
    
    const results = await db.searchAll(val);
    dropdown.innerHTML = '';
    
    if (results.length === 0) {
      dropdown.innerHTML = `
        <div style="padding: 0.75rem 1rem; color: var(--text-muted); font-size: 0.85rem; text-align: center;">
          Nuk u gjet asnjë automjet apo klient me këtë kërkim.
        </div>
      `;
      dropdown.style.display = 'block';
      return;
    }
    
    results.forEach(res => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.addEventListener('click', () => {
        dropdown.style.display = 'none';
        searchInput.value = '';
        navigateTo('vehicle-profile', { vehicleId: res.id });
      });
      
      item.innerHTML = `
        <div class="result-title">
          <span>${res.title}</span>
          <span class="result-plate">${res.subtitle}</span>
        </div>
        <div class="result-subtitle">
          Pronari: ${res.owner} | ${res.phone} | Kilometra: ${formatNumber(res.mileage)} km
        </div>
      `;
      dropdown.appendChild(item);
    });
    
    dropdown.style.display = 'block';
  });
  
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}

// ==========================================
// MODALS AND FORMS (Modalet dhe Formularët)
// ==========================================
async function openModal(modalId, options = {}) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  if (modalId === 'modal-customer') {
    if (!state.editingCustomerId) {
      document.querySelector('#modal-customer .modal-title').innerText = 'Shto Klient të Ri';
      document.getElementById('form-add-customer').reset();
    }
  }

  if (modalId === 'modal-vehicle') {
    if (!state.editingVehicleId) {
      document.querySelector('#modal-vehicle .modal-title').innerText = 'Shto Automjet të Ri';
      await populateCustomerDropdown('veh-owner-select', options.customerId);
      document.getElementById('form-add-vehicle').reset();
      if (options.customerId) {
        document.getElementById('veh-owner-select').value = options.customerId;
      }
    } else {
      await populateCustomerDropdown('veh-owner-select');
    }
  }
  
  if (modalId === 'modal-service') {
    if (!state.editingServiceId) {
      document.querySelector('#modal-service .modal-title').innerText = 'Regjistro Shërbim të Ri';
      document.getElementById('form-add-service').reset();
      document.getElementById('srv-mileage-warning').style.display = 'none';
      
      const partsContainer = document.getElementById('parts-rows-container');
      partsContainer.innerHTML = '';
      state.partsCount = 0;
      
      document.getElementById('srv-date').value = new Date().toISOString().split('T')[0];
      document.getElementById('srv-total-display').innerText = '0 Lekë';
      
      const selectContainer = document.getElementById('service-vehicle-select-container');
      if (options.vehicleId) {
        await populateVehicleDropdown('srv-vehicle-select', options.vehicleId);
        document.getElementById('srv-vehicle-select').value = options.vehicleId;
        selectContainer.style.display = 'none';
        
        const veh = await db.getVehicleById(options.vehicleId);
        if (veh) {
          document.getElementById('srv-mileage').placeholder = `Aktual: ${formatNumber(veh.mileage)} km`;
        }
      } else {
        await populateVehicleDropdown('srv-vehicle-select');
        selectContainer.style.display = 'block';
        document.getElementById('srv-mileage').placeholder = 'Fusni kilometrazhin e mjetit';
      }
    } else {
      const selectContainer = document.getElementById('service-vehicle-select-container');
      await populateVehicleDropdown('srv-vehicle-select', options.vehicleId);
      document.getElementById('srv-vehicle-select').value = options.vehicleId;
      selectContainer.style.display = 'none';
    }
  }
  
  modal.classList.add('show');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
  }
}

// Mbush listat dropdown (Select inputs)
async function populateCustomerDropdown(elementId, selectedId = null) {
  const select = document.getElementById(elementId);
  const customersList = await db.getCustomers();
  const customers = customersList.sort((a, b) => a.firstName.localeCompare(b.firstName));
  
  select.innerHTML = '<option value="" disabled selected>Zgjidh klientin...</option>';
  customers.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.innerText = `${c.firstName} ${c.lastName} (${c.phone})`;
    if (c.id === selectedId) opt.selected = true;
    select.appendChild(opt);
  });
}

async function populateVehicleDropdown(elementId, selectedId = null) {
  const select = document.getElementById(elementId);
  const vehiclesList = await db.getVehicles();
  const vehicles = vehiclesList.sort((a, b) => a.make.localeCompare(b.make));
  
  select.innerHTML = '<option value="" disabled selected>Zgjidh makinën...</option>';
  for (const v of vehicles) {
    const owner = await db.getCustomerById(v.customerId);
    const ownerName = owner ? `${owner.firstName} ${owner.lastName}` : 'Pa pronar';
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.innerText = `${v.make} ${v.model} - ${v.licensePlate} (${ownerName})`;
    if (v.id === selectedId) opt.selected = true;
    select.appendChild(opt);
  }
}

// Konfigurimi i Submit-eve të Formave
function setupFormHandlers() {
  // 1. Shto / Modifiko Klient
  document.getElementById('form-add-customer').addEventListener('submit', async (e) => {
    e.preventDefault();
    const customerData = {
      firstName: document.getElementById('cust-firstname').value.trim(),
      lastName: document.getElementById('cust-lastname').value.trim(),
      phone: document.getElementById('cust-phone').value.trim(),
      email: document.getElementById('cust-email').value.trim(),
      address: document.getElementById('cust-address').value.trim(),
      notes: document.getElementById('cust-notes').value.trim()
    };
    
    if (state.editingCustomerId) {
      await db.updateCustomer(state.editingCustomerId, customerData);
      showToast('Të dhënat e klientit u përditësuan.', 'success');
      state.editingCustomerId = null;
    } else {
      await db.addCustomer(customerData);
      showToast('Klienti u shtua me sukses.', 'success');
    }
    
    closeModal('modal-customer');
    
    if (state.currentView === 'customers') {
      await renderCustomers();
    } else {
      await renderDashboard();
    }
  });
  
  // 2. Shto / Modifiko Automjet
  document.getElementById('form-add-vehicle').addEventListener('submit', async (e) => {
    e.preventDefault();
    const vehicleData = {
      customerId: document.getElementById('veh-owner-select').value,
      licensePlate: document.getElementById('veh-plate').value,
      vin: document.getElementById('veh-vin').value,
      make: document.getElementById('veh-make').value,
      model: document.getElementById('veh-model').value,
      year: document.getElementById('veh-year').value,
      mileage: document.getElementById('veh-mileage').value,
      engine: document.getElementById('veh-engine').value,
      fuelType: document.getElementById('veh-fuel').value,
      transmission: document.getElementById('veh-trans').value,
      color: document.getElementById('veh-color').value,
      notes: document.getElementById('veh-notes').value
    };
    
    let targetVehId;
    if (state.editingVehicleId) {
      await db.updateVehicle(state.editingVehicleId, vehicleData);
      showToast('Të dhënat e automjetit u përditësuan.', 'success');
      targetVehId = state.editingVehicleId;
      state.editingVehicleId = null;
    } else {
      const newVeh = await db.addVehicle(vehicleData);
      showToast('Automjeti u shtua me sukses.', 'success');
      targetVehId = newVeh.id;
    }
    
    closeModal('modal-vehicle');
    await navigateTo('vehicle-profile', { vehicleId: targetVehId });
  });

  // 3. Regjistro Shërbim
  const partsContainer = document.getElementById('parts-rows-container');
  const addPartBtn = document.getElementById('btn-add-part-row');
  const partsCostInput = document.getElementById('srv-cost-parts');
  const laborCostInput = document.getElementById('srv-cost-labor');
  const totalDisplay = document.getElementById('srv-total-display');
  const mileageInput = document.getElementById('srv-mileage');
  const mileageWarning = document.getElementById('srv-mileage-warning');
  const selectVehicle = document.getElementById('srv-vehicle-select');

  addPartBtn.addEventListener('click', () => {
    state.partsCount++;
    const rowId = `part-row-${state.partsCount}`;
    const row = document.createElement('div');
    row.className = 'part-row';
    row.id = rowId;
    
    row.innerHTML = `
      <input type="text" class="form-control part-name" placeholder="Pjesa (p.sh. Vaj 5W30)" required>
      <input type="number" class="form-control part-qty" value="1" min="1" required>
      <input type="text" class="form-control part-desc" placeholder="Brand / Marka">
      <button type="button" class="btn btn-danger btn-sm" style="padding: 0.3rem 0.6rem;" onclick="document.getElementById('${rowId}').remove()">&times;</button>
    `;
    partsContainer.appendChild(row);
  });

  const calculateTotal = () => {
    const partsCost = parseFloat(partsCostInput.value) || 0;
    const laborCost = parseFloat(laborCostInput.value) || 0;
    totalDisplay.innerText = `${formatNumber(partsCost + laborCost)} Lekë`;
  };

  partsCostInput.addEventListener('input', calculateTotal);
  laborCostInput.addEventListener('input', calculateTotal);

  const validateMileageInput = async () => {
    const targetVehId = selectVehicle.value || state.selectedVehicleId;
    if (!targetVehId) return;

    const veh = await db.getVehicleById(targetVehId);
    if (!veh) return;

    const enteredMileage = parseInt(mileageInput.value) || 0;
    if (enteredMileage < veh.mileage) {
      mileageWarning.style.display = 'block';
    } else {
      mileageWarning.style.display = 'none';
    }
  };

  mileageInput.addEventListener('input', validateMileageInput);
  selectVehicle.addEventListener('change', validateMileageInput);

  // Submit i Formës së Shërbimit (Shto / Modifiko)
  document.getElementById('form-add-service').addEventListener('submit', async (e) => {
    e.preventDefault();
    const targetVehId = selectVehicle.value || state.selectedVehicleId;
    
    if (!targetVehId) {
      showToast('Lutem zgjidhni një automjet.', 'error');
      return;
    }

    const veh = await db.getVehicleById(targetVehId);
    const enteredMileage = parseInt(mileageInput.value) || 0;

    if (veh && enteredMileage < veh.mileage && !state.editingServiceId) {
      const confirmSave = confirm(
        `Paralajmërim: Kilometrazhi i futur (${formatNumber(enteredMileage)} km) është më i ulët se kilometrazhi i regjistruar më parë (${formatNumber(veh.mileage)} km). A jeni të sigurt që dëshironi të vazhdoni?`
      );
      if (!confirmSave) return;
    }

    const serviceTypes = [];
    document.querySelectorAll('.service-type-checkbox:checked').forEach(cb => {
      serviceTypes.push(cb.value);
    });

    if (serviceTypes.length === 0) {
      serviceTypes.push('Tjetër');
    }

    const parts = [];
    document.querySelectorAll('.part-row').forEach(row => {
      const name = row.querySelector('.part-name').value.trim();
      const qty = parseInt(row.querySelector('.part-qty').value) || 1;
      const desc = row.querySelector('.part-desc').value.trim();
      if (name) {
        parts.push({ name, quantity: qty, description: desc });
      }
    });

    const serviceData = {
      vehicleId: targetVehId,
      serviceDate: document.getElementById('srv-date').value,
      mileage: enteredMileage,
      serviceTypes: serviceTypes,
      description: document.getElementById('srv-description').value.trim(),
      parts: parts,
      laborCost: parseFloat(laborCostInput.value) || 0,
      partsCost: parseFloat(partsCostInput.value) || 0,
      notes: document.getElementById('srv-notes').value.trim()
    };

    if (state.editingServiceId) {
      await db.updateServiceRecord(state.editingServiceId, serviceData);
      showToast('Shërbimi u modifikua me sukses.', 'success');
      state.editingServiceId = null;
    } else {
      await db.addServiceRecord(serviceData);
      showToast('Shërbimi u regjistrua me sukses.', 'success');
    }
    
    closeModal('modal-service');
    await navigateTo('vehicle-profile', { vehicleId: targetVehId });
  });

  // 4. Konfirmo fshirjen e rekordeve
  document.getElementById('btn-confirm-delete-action').addEventListener('click', async () => {
    if (!state.deletingId || !state.deletingType) return;

    if (state.deletingType === 'customer') {
      await db.deleteCustomer(state.deletingId);
      showToast('Klienti u fshi me sukses.', 'warning');
      closeModal('modal-confirm-delete');
      if (state.currentView === 'customers') {
        await renderCustomers();
      } else {
        await navigateTo('dashboard');
      }
    } 
    else if (state.deletingType === 'vehicle') {
      await db.deleteVehicle(state.deletingId);
      showToast('Automjeti u fshi me sukses.', 'warning');
      closeModal('modal-confirm-delete');
      if (state.currentView === 'vehicles') {
        await renderVehicles();
      } else {
        await navigateTo('dashboard');
      }
    } 
    else if (state.deletingType === 'service') {
      const srv = await db.getServiceById(state.deletingId);
      const vehicleId = srv ? srv.vehicleId : null;
      await db.deleteServiceRecord(state.deletingId);
      showToast('Shërbimi u fshi me sukses.', 'warning');
      closeModal('modal-confirm-delete');
      
      if (vehicleId) {
        await renderVehicleProfile(vehicleId);
      } else {
        await navigateTo('dashboard');
      }
    }

    state.deletingId = null;
    state.deletingType = null;
  });
}

// ==========================================
// FORMATTING UTILITIES (Formatimet)
// ==========================================
function formatDateSimple(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateAlbanian(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  
  const months = [
    "JANAR", "SHKURT", "MARS", "PRILL", "MAJ", "QERSHOR",
    "KORRIK", "GUSHT", "SHTATOR", "TETOR", "NËNTOR", "DHJETOR"
  ];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
}

function formatNumber(num) {
  if (num === undefined || num === null) return '0';
  return Number(num).toLocaleString('en-US');
}

// ==========================================
// EDIT & DELETE ACTIONS LOGIC
// ==========================================
async function startEditCustomer(id) {
  const cust = await db.getCustomerById(id);
  if (!cust) return;

  state.editingCustomerId = cust.id;
  
  openModal('modal-customer');
  document.querySelector('#modal-customer .modal-title').innerText = 'Modifiko Klientin';

  document.getElementById('cust-firstname').value = cust.firstName;
  document.getElementById('cust-lastname').value = cust.lastName || '';
  document.getElementById('cust-phone').value = cust.phone;
  document.getElementById('cust-email').value = cust.email || '';
  document.getElementById('cust-address').value = cust.address || '';
  document.getElementById('cust-notes').value = cust.notes || '';
}

async function startDeleteCustomer(id) {
  const cust = await db.getCustomerById(id);
  if (!cust) return;

  state.deletingId = id;
  state.deletingType = 'customer';

  document.getElementById('confirm-delete-title').innerText = 'A jeni të sigurt?';
  document.getElementById('confirm-delete-message').innerText = `Ky veprim do të fshijë klientin "${cust.firstName} ${cust.lastName}" dhe të gjitha automjetet dhe shërbimet e lidhura me të. Ky veprim nuk mund të kthehet mbrapsht.`;

  openModal('modal-confirm-delete');
}

async function startEditVehicle(id) {
  const veh = await db.getVehicleById(id);
  if (!veh) return;

  state.editingVehicleId = veh.id;

  openModal('modal-vehicle', { customerId: veh.customerId });
  document.querySelector('#modal-vehicle .modal-title').innerText = 'Modifiko Automjetin';

  document.getElementById('veh-owner-select').value = veh.customerId;
  document.getElementById('veh-plate').value = veh.licensePlate;
  document.getElementById('veh-vin').value = veh.vin || '';
  document.getElementById('veh-make').value = veh.make;
  document.getElementById('veh-model').value = veh.model;
  document.getElementById('veh-year').value = veh.year;
  document.getElementById('veh-mileage').value = veh.mileage;
  document.getElementById('veh-engine').value = veh.engine || '';
  document.getElementById('veh-fuel').value = veh.fuelType || '';
  document.getElementById('veh-trans').value = veh.transmission || '';
  document.getElementById('veh-color').value = veh.color || '';
  document.getElementById('veh-notes').value = veh.notes || '';
}

async function startDeleteVehicle(id) {
  const veh = await db.getVehicleById(id);
  if (!veh) return;

  state.deletingId = id;
  state.deletingType = 'vehicle';

  document.getElementById('confirm-delete-title').innerText = 'A jeni të sigurt?';
  document.getElementById('confirm-delete-message').innerText = `Ky veprim do të fshijë automjetin "${veh.make} ${veh.model} (${veh.licensePlate})" dhe të gjithë historikun e shërbimeve të tij. Ky veprim nuk mund të kthehet mbrapsht.`;

  openModal('modal-confirm-delete');
}

async function startEditService(id) {
  const srv = await db.getServiceById(id);
  if (!srv) return;

  state.editingServiceId = srv.id;

  openModal('modal-service', { vehicleId: srv.vehicleId });
  document.querySelector('#modal-service .modal-title').innerText = 'Modifiko Shërbimin';

  document.getElementById('srv-date').value = srv.serviceDate;
  document.getElementById('srv-mileage').value = srv.mileage;
  document.getElementById('srv-description').value = srv.description;
  document.getElementById('srv-cost-parts').value = srv.partsCost;
  document.getElementById('srv-cost-labor').value = srv.laborCost;
  document.getElementById('srv-notes').value = srv.notes || '';
  document.getElementById('srv-total-display').innerText = `${formatNumber(srv.totalCost)} Lekë`;

  document.querySelectorAll('.service-type-checkbox').forEach(cb => {
    cb.checked = srv.serviceTypes.includes(cb.value);
  });

  const partsContainer = document.getElementById('parts-rows-container');
  partsContainer.innerHTML = '';
  state.partsCount = 0;

  if (srv.parts && srv.parts.length > 0) {
    srv.parts.forEach(p => {
      state.partsCount++;
      const rowId = `part-row-${state.partsCount}`;
      const row = document.createElement('div');
      row.className = 'part-row';
      row.id = rowId;
      
      row.innerHTML = `
        <input type="text" class="form-control part-name" placeholder="Pjesa" value="${p.name}" required>
        <input type="number" class="form-control part-qty" value="${p.quantity}" min="1" required>
        <input type="text" class="form-control part-desc" placeholder="Brand" value="${p.description || ''}">
        <button type="button" class="btn btn-danger btn-sm" style="padding: 0.3rem 0.6rem;" onclick="document.getElementById('${rowId}').remove()">&times;</button>
      `;
      partsContainer.appendChild(row);
    });
  }
}

async function startDeleteService(id) {
  state.deletingId = id;
  state.deletingType = 'service';

  document.getElementById('confirm-delete-title').innerText = 'A jeni të sigurt?';
  document.getElementById('confirm-delete-message').innerText = 'Ky veprim do të fshijë këtë shërbim nga historiku i mjetit. Ky veprim nuk mund të kthehet mbrapsht.';

  openModal('modal-confirm-delete');
}
