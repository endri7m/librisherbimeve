// db.js - Supabase data access with per-user ownership

const SUPABASE_URL = window.env?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.env?.SUPABASE_ANON_KEY || '';
let supabaseClient = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase?.createClient) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: 'public' },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
}

export function getSupabaseClient() {
  return supabaseClient;
}

class DBService {
  constructor() {
    this.vehiclesKey = 'autoservice_vehicles';
    this.servicesKey = 'autoservice_services';
    this.categoriesKey = 'autoservice_categories';
    this.currentUser = null;
    this.initLocalStorage();
  }

  initLocalStorage() {
    const version = 'v5-auth';
    if (localStorage.getItem('autoservice_version') !== version) {
      localStorage.removeItem('autoservice_vehicles');
      localStorage.removeItem('autoservice_services');
      localStorage.removeItem('autoservice_customers');
      localStorage.setItem('autoservice_version', version);
    }
    if (!localStorage.getItem(this.categoriesKey)) {
      localStorage.setItem(this.categoriesKey, JSON.stringify(this._defaultCategories()));
    }
  }

  setUser(user) {
    this.currentUser = user || null;
  }

  get userId() {
    return this.currentUser?.id || null;
  }

  _requireUser() {
    if (!this.userId) throw new Error('Duhet të jesh i loguar për të përdorur të dhënat.');
  }

  isUsingSupabase() {
    return Boolean(supabaseClient);
  }

  _localKey(baseKey) {
    return this.userId ? `${baseKey}_${this.userId}` : `${baseKey}_anonymous`;
  }

  _getLocal(baseKey) {
    return JSON.parse(localStorage.getItem(this._localKey(baseKey)) || '[]');
  }

  _saveLocal(baseKey, data) {
    localStorage.setItem(this._localKey(baseKey), JSON.stringify(data));
  }

  _newId(prefix) {
    return `${prefix}_${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
  }

  _toCamel(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this._toCamel(item));
    const camel = {};
    for (const key in obj) {
      if (key === 'parts' || key === 'serviceTypes') { camel[key] = obj[key]; continue; }
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      camel[camelKey] = this._toCamel(obj[key]);
    }
    return camel;
  }

  _toSnake(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this._toSnake(item));
    const snake = {};
    for (const key in obj) {
      // `serviceTypes` must become the database column `service_types`.
      // `parts` already has the same name in both layers.
      if (key === 'parts') { snake[key] = this._toSnake(obj[key]); continue; }
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      snake[snakeKey] = this._toSnake(obj[key]);
    }
    return snake;
  }

  _defaultCategories() {
    return [
      { id: 'cat_1', name: 'Ndërrim vaji' }, { id: 'cat_2', name: 'Ndërrim filtrash' },
      { id: 'cat_3', name: 'Kontroll periodik' }, { id: 'cat_4', name: 'Frenat' },
      { id: 'cat_5', name: 'Gomat' }, { id: 'cat_6', name: 'Diagnostikim' },
      { id: 'cat_7', name: 'Elektrikë' }, { id: 'cat_8', name: 'Motor' },
      { id: 'cat_9', name: 'Kambio' }, { id: 'cat_10', name: 'Kondicioner' },
      { id: 'cat_11', name: 'Suspension' }, { id: 'cat_12', name: 'Riparim' },
      { id: 'cat_13', name: 'Tjetër' }
    ];
  }

  async _remoteList(table, orderColumn = 'created_at') {
    this._requireUser();
    const query = supabaseClient.from(table).select('*').eq('user_id', this.userId);
    const { data, error } = await query.order(orderColumn, { ascending: false });
    if (error) throw error;
    return this._toCamel(data || []);
  }

  async getVehicles() {
    this._requireUser();
    if (this.isUsingSupabase()) {
      try { return await this._remoteList('automjetet'); }
      catch (error) { console.error('Supabase getVehicles:', error); return []; }
    }
    return this._getLocal(this.vehiclesKey).filter(item => item.userId === this.userId);
  }

  async getVehicleById(id) {
    const vehicles = await this.getVehicles();
    return vehicles.find(vehicle => vehicle.id === id) || null;
  }

  async addVehicle(vehicle) {
    this._requireUser();
    if (!vehicle?.ownerName || !vehicle?.vehicleBrand) throw new Error('ownerName dhe vehicleBrand janë të detyrueshme.');
    const now = new Date().toISOString();
    const record = {
      id: this._newId('veh'), userId: this.userId,
      ownerName: vehicle.ownerName.trim(), vehicleBrand: vehicle.vehicleBrand.trim(),
      ownerPhone: (vehicle.ownerPhone || '').trim(), vehiclePlate: ((vehicle.vehiclePlate || '').trim().toUpperCase() || null),
      vehicleModel: (vehicle.vehicleModel || '').trim(),       vehicleYear: vehicle.vehicleYear ? parseInt(vehicle.vehicleYear) : null,
      vehicleEngine: (vehicle.vehicleEngine || '').trim(), vehicleVin: (vehicle.vehicleVin || '').trim().toUpperCase(),
      mileage: 0, createdAt: now, updatedAt: now
    };
    if (this.isUsingSupabase()) {
      // Explicit payload for the current public.automjetet schema.
      // Only these columns are sent; optional blank fields are omitted.
      const vehiclePayload = {
        owner_name: record.ownerName,
        vehicle_brand: record.vehicleBrand,
        vehicle_plate: record.vehiclePlate,
        vehicle_model: record.vehicleModel,
        owner_phone: record.ownerPhone,
        user_id: record.userId
      };
      if (!vehiclePayload.vehicle_plate) delete vehiclePayload.vehicle_plate;
      if (!vehiclePayload.vehicle_model) delete vehiclePayload.vehicle_model;
      if (!vehiclePayload.owner_phone) delete vehiclePayload.owner_phone;
      const { data, error } = await supabaseClient.schema('public').from('automjetet').insert(vehiclePayload).select().single();
      if (error) {
        if (String(error.message || '').includes('owner_name') || String(error.code || '') === 'PGRST204') {
          throw new Error('Supabase nuk po e gjen tabelën automjetet në schema cache. Ekzekuto supabase-automjetet-access-and-cache.sql, prit disa sekonda dhe bëj Ctrl + Shift + R.');
        }
        if (String(error.code || '') === '23505' && (String(error.message || '').includes('vehicle_plate'))) {
          throw new Error('Kjo targë është regjistruar më parë. Vendosni një targë tjetër ose lëreni fushën bosh.');
        }
        throw error;
      }
      return this._toCamel(data);
    }
    const vehicles = this._getLocal(this.vehiclesKey); vehicles.push(record); this._saveLocal(this.vehiclesKey, vehicles); return record;
  }

  async updateVehicle(id, updatedFields) {
    this._requireUser();
    const changes = { ...updatedFields, updatedAt: new Date().toISOString() };
    if (changes.ownerName !== undefined) changes.ownerName = changes.ownerName.trim();
    if (changes.vehicleBrand !== undefined) changes.vehicleBrand = changes.vehicleBrand.trim();
    if (changes.vehiclePlate !== undefined) changes.vehiclePlate = changes.vehiclePlate.trim().toUpperCase() || null;
    if (changes.vehicleVin !== undefined) changes.vehicleVin = changes.vehicleVin.trim().toUpperCase();
    if (this.isUsingSupabase()) {
      const { data, error } = await supabaseClient.schema('public').from('automjetet').update(this._toSnake(changes)).eq('id', id).eq('user_id', this.userId).select().single();
      if (error) {
        if (String(error.code || '') === '23505' && (String(error.message || '').includes('vehicle_plate'))) {
          throw new Error('Kjo targë është regjistruar më parë. Vendosni një targë tjetër ose lëreni fushën bosh.');
        }
        throw error;
      }
      return this._toCamel(data);
    }
    const vehicles = this._getLocal(this.vehiclesKey); const index = vehicles.findIndex(item => item.id === id && item.userId === this.userId);
    if (index === -1) return null; vehicles[index] = { ...vehicles[index], ...changes }; this._saveLocal(this.vehiclesKey, vehicles); return vehicles[index];
  }

  async deleteVehicle(id) {
    this._requireUser();
    if (this.isUsingSupabase()) {
      const { error: servicesError } = await supabaseClient.schema('public').from('services').delete().eq('vehicle_id', id).eq('user_id', this.userId);
      if (servicesError) throw servicesError;
      const { error } = await supabaseClient.schema('public').from('automjetet').delete().eq('id', id).eq('user_id', this.userId);
      if (error) throw error;
      return true;
    }
    this._saveLocal(this.servicesKey, this._getLocal(this.servicesKey).filter(item => item.vehicleId !== id));
    this._saveLocal(this.vehiclesKey, this._getLocal(this.vehiclesKey).filter(item => item.id !== id));
    return true;
  }

  async updateVehicleMileage(vehicleId, newMileage) {
    this._requireUser();
    const mileage = parseInt(newMileage) || 0;
    if (this.isUsingSupabase()) {
      const { error } = await supabaseClient.schema('public').from('automjetet').update({ mileage, updated_at: new Date().toISOString() }).eq('id', vehicleId).eq('user_id', this.userId);
      if (error) throw error;
      return;
    }
    const vehicles = this._getLocal(this.vehiclesKey); const index = vehicles.findIndex(item => item.id === vehicleId && item.userId === this.userId);
    if (index !== -1) { vehicles[index].mileage = mileage; this._saveLocal(this.vehiclesKey, vehicles); }
  }

  async getServices() {
    this._requireUser();
    if (this.isUsingSupabase()) {
      try { return await this._remoteList('services'); }
      catch (error) { console.error('Supabase getServices:', error); return []; }
    }
    return this._getLocal(this.servicesKey).filter(item => item.userId === this.userId);
  }

  async getServiceById(id) { return (await this.getServices()).find(service => service.id === id) || null; }

  async getServicesByVehicle(vehicleId) { return (await this.getServices()).filter(service => service.vehicleId === vehicleId).sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate)); }

  async addServiceRecord(record) {
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    this._requireUser();
    if (!record?.vehicleId) throw new Error('vehicleId është i detyrueshëm.');
    const partsCost = parseFloat(record.partsCost) || 0; const laborCost = parseFloat(record.laborCost) || 0;
    const now = new Date().toISOString();
    const newRecord = {
      id: this._newId('srv'), userId: this.userId, vehicleId: record.vehicleId,
      serviceDate: record.serviceDate || new Date().toISOString().split('T')[0], mileage: parseInt(record.mileage) || 0,
      serviceTypes: record.serviceTypes || [], description: record.description || '', parts: record.parts || [],
      laborCost, partsCost, totalCost: partsCost + laborCost, notes: record.notes || '', archived: false, createdAt: now, updatedAt: now
    };
    if (this.isUsingSupabase()) {
      const servicePayload = {
        user_id: newRecord.userId,
        vehicle_id: newRecord.vehicleId,
        service_date: newRecord.serviceDate,
        mileage: Number(newRecord.mileage) || 0,
        service_types: newRecord.serviceTypes,
        description: newRecord.description,
        parts: newRecord.parts,
        labor_cost: Number(newRecord.laborCost) || 0,
        parts_cost: Number(newRecord.partsCost) || 0,
        total_cost: Number(newRecord.totalCost) || 0,
        notes: newRecord.notes,
        archived: Boolean(newRecord.archived),
        created_at: newRecord.createdAt,
        updated_at: newRecord.updatedAt
      };
      let response = await supabaseClient.schema('public').from('services').insert(servicePayload).select().single();
      const schemaCacheError = (error) => String(error?.code || '') === 'PGRST205' || String(error?.code || '') === 'PGRST204' || /schema cache|Could not find the table/i.test(String(error?.message || ''));
      if (response.error && schemaCacheError(response.error)) {
        await wait(10000);
        response = await supabaseClient.schema('public').from('services').insert(servicePayload).select().single();
      }
      const { data, error } = response;
      if (error) {
        if (String(error.message || '').includes('serviceTypes') || String(error.message || '').includes('service_types') || String(error.code || '') === 'PGRST204' || String(error.code || '') === 'PGRST205') {
          throw new Error('Supabase nuk po e gjen tabelën public.services në schema cache. Prit 10 sekonda dhe provo përsëri.');
        }
        throw error;
      }
      await this.updateVehicleMileage(record.vehicleId, newRecord.mileage);
      return this._toCamel(data);
    }
    const services = this._getLocal(this.servicesKey); services.push(newRecord); this._saveLocal(this.servicesKey, services); await this.updateVehicleMileage(record.vehicleId, newRecord.mileage); return newRecord;
  }

  async updateServiceRecord(id, updatedFields) {
    this._requireUser();
    const partsCost = updatedFields.partsCost !== undefined ? parseFloat(updatedFields.partsCost) || 0 : undefined;
    const laborCost = updatedFields.laborCost !== undefined ? parseFloat(updatedFields.laborCost) || 0 : undefined;
    const changes = { ...updatedFields, updatedAt: new Date().toISOString() };
    if (partsCost !== undefined) changes.partsCost = partsCost;
    if (laborCost !== undefined) changes.laborCost = laborCost;
    if (partsCost !== undefined || laborCost !== undefined) changes.totalCost = (partsCost ?? 0) + (laborCost ?? 0);
    if (this.isUsingSupabase()) {
      const { data, error } = await supabaseClient.schema('public').from('services').update(this._toSnake(changes)).eq('id', id).eq('user_id', this.userId).select().single();
      if (error) throw error;
      await this.recalculateVehicleMileage(data.vehicle_id);
      return this._toCamel(data);
    }
    const services = this._getLocal(this.servicesKey); const index = services.findIndex(item => item.id === id && item.userId === this.userId);
    if (index === -1) return null; services[index] = { ...services[index], ...changes }; this._saveLocal(this.servicesKey, services); await this.recalculateVehicleMileage(services[index].vehicleId); return services[index];
  }

  async deleteServiceRecord(id) {
    this._requireUser();
    const record = await this.getServiceById(id); if (!record) return false;
    if (this.isUsingSupabase()) {
      const { error } = await supabaseClient.schema('public').from('services').delete().eq('id', id).eq('user_id', this.userId);
      if (error) throw error;
    } else {
      this._saveLocal(this.servicesKey, this._getLocal(this.servicesKey).filter(item => item.id !== id));
    }
    await this.recalculateVehicleMileage(record.vehicleId); return true;
  }

  async recalculateVehicleMileage(vehicleId) {
    const services = await this.getServicesByVehicle(vehicleId);
    const latest = services.sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate))[0];
    await this.updateVehicleMileage(vehicleId, latest?.mileage || 0);
  }

  async getCategories() { return JSON.parse(localStorage.getItem(this.categoriesKey) || JSON.stringify(this._defaultCategories())); }
  async getActiveCategories() { return this.getCategories(); }

  async searchAll(query) {
    if (!query) return [];
    const q = query.toLowerCase().trim(); const vehicles = await this.getVehicles(); const results = [];
    vehicles.forEach(vehicle => {
      const ownerName = vehicle.ownerName || 'Pa pronar'; const ownerPhone = vehicle.ownerPhone || '';
      if ([vehicle.vehiclePlate, vehicle.vehicleBrand, vehicle.vehicleModel, ownerName, ownerPhone].some(value => value?.toLowerCase().includes(q))) {
        results.push({ type: 'vehicle', id: vehicle.id, title: `${vehicle.vehicleBrand || ''} ${vehicle.vehicleModel || ''}`.trim() || 'Automjet', subtitle: vehicle.vehiclePlate || '-', owner: ownerName, phone: ownerPhone, mileage: vehicle.mileage, vehicle });
      }
    });
    return results;
  }

  async getDashboardStats() { return { vehicleCount: (await this.getVehicles()).length, serviceCount: (await this.getServices()).length }; }
}

export const db = new DBService();
