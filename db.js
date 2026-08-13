// db.js - Shërbimi i të dhënave (Flat Model: Vehicle përfshin pronarin direkt)

class DBService {
  constructor() {
    this.vehiclesKey = "autoservice_vehicles";
    this.servicesKey = "autoservice_services";
    this.categoriesKey = "autoservice_categories";

    this.supabaseClient = null;

    this.init();
  }

  init() {
    // Version bump -> pastron çdo të dhënë të vjetër (modeli i mëparshëm me klientë)
    const VERSION = "v4-flat";
    if (localStorage.getItem('autoservice_version') !== VERSION) {
      localStorage.removeItem(this.vehiclesKey);
      localStorage.removeItem(this.servicesKey);
      localStorage.removeItem(this.categoriesKey);
      localStorage.removeItem('autoservice_customers'); // pastro modelin e vjetër
      localStorage.setItem('autoservice_version', VERSION);
    }

    if (!localStorage.getItem(this.vehiclesKey)) {
      localStorage.setItem(this.vehiclesKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.servicesKey)) {
      localStorage.setItem(this.servicesKey, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.categoriesKey)) {
      localStorage.setItem(this.categoriesKey, JSON.stringify(this._defaultCategories()));
    }

    this.initSupabase();
  }

  _defaultCategories() {
    return [
      { id: "cat_1", name: "Ndërrim vaji" },
      { id: "cat_2", name: "Ndërrim filtrash" },
      { id: "cat_3", name: "Kontroll periodik" },
      { id: "cat_4", name: "Frenat" },
      { id: "cat_5", name: "Gomat" },
      { id: "cat_6", name: "Diagnostikim" },
      { id: "cat_7", name: "Elektrikë" },
      { id: "cat_8", name: "Motor" },
      { id: "cat_9", name: "Kambio" },
      { id: "cat_10", name: "Kondicioner" },
      { id: "cat_11", name: "Suspension" },
      { id: "cat_12", name: "Riparim" },
      { id: "cat_13", name: "Tjetër" }
    ];
  }

  // Supabase (opsionale, e konfiguruar automatikisht nga variablat e mjedisit të Vercel)
  async initSupabase() {
    let url = "";
    let key = "";

    if (typeof window !== 'undefined' && window.env && window.env.SUPABASE_URL && window.env.SUPABASE_ANON_KEY) {
      url = window.env.SUPABASE_URL;
      key = window.env.SUPABASE_ANON_KEY;
    }

    if (url && key && typeof supabase !== 'undefined') {
      try {
        this.supabaseClient = supabase.createClient(url, key);
        console.log("Supabase u lidh me sukses përmes variablave të mjedisit.");
        return true;
      } catch (e) {
        console.error("Gabim gjatë lidhjes me Supabase:", e);
      }
    }
    return false;
  }

  isUsingSupabase() {
    return this.supabaseClient !== null;
  }

  _toCamel(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this._toCamel(item));
    const camel = {};
    for (const key in obj) {
      if (key === 'parts' || key === 'serviceTypes') { camel[key] = obj[key]; continue; }
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      camel[camelKey] = this._toCamel(obj[key]);
    }
    return camel;
  }

  _toSnake(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this._toSnake(item));
    const snake = {};
    for (const key in obj) {
      if (key === 'parts' || key === 'serviceTypes') { snake[key] = obj[key]; continue; }
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      snake[snakeKey] = this._toSnake(obj[key]);
    }
    return snake;
  }

  _getLocal(key) {
    return JSON.parse(localStorage.getItem(key) || "[]");
  }

  _saveLocal(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // ==========================================
  // VEHICLES API (flat: përfshin pronarin)
  // Fusha: ownerName*, vehicleBrand* (të detyrueshme)
  //        vehiclePlate, vehicleModel, vehicleYear, vehicleEngine, vehicleVin, ownerPhone (opsionale)
  // ==========================================
  async getVehicles() {
    if (this.isUsingSupabase()) {
      try {
        const { data, error } = await this.supabaseClient.from('vehicles').select('*');
        if (error) throw error;
        return this._toCamel(data || []);
      } catch (err) {
        console.error("Supabase error (getVehicles), falling back to local:", err);
      }
    }
    return this._getLocal(this.vehiclesKey);
  }

  async getVehicleById(id) {
    const vehicles = await this.getVehicles();
    return vehicles.find(v => v.id === id) || null;
  }

  async addVehicle(vehicle) {
    if (!vehicle || !vehicle.ownerName || !vehicle.vehicleBrand) {
      throw new Error("ownerName dhe vehicleBrand janë të detyrueshme.");
    }

    const newVehicle = {
      id: "veh_" + Date.now(),
      ownerName: vehicle.ownerName.trim(),
      vehicleBrand: vehicle.vehicleBrand.trim(),
      ownerPhone: (vehicle.ownerPhone || "").trim(),
      vehiclePlate: (vehicle.vehiclePlate || "").trim().toUpperCase(),
      vehicleModel: (vehicle.vehicleModel || "").trim(),
      vehicleYear: vehicle.vehicleYear ? parseInt(vehicle.vehicleYear) : "",
      vehicleEngine: (vehicle.vehicleEngine || "").trim(),
      vehicleVin: (vehicle.vehicleVin || "").trim().toUpperCase(),
      mileage: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const vehicles = this._getLocal(this.vehiclesKey);
    vehicles.push(newVehicle);
    this._saveLocal(this.vehiclesKey, vehicles);

    if (this.isUsingSupabase()) {
      try {
        const { error } = await this.supabaseClient.from('vehicles').insert(this._toSnake(newVehicle));
        if (error) throw error;
      } catch (err) {
        console.error("Supabase error (addVehicle):", err);
      }
    }

    return newVehicle;
  }

  async updateVehicle(id, updatedFields) {
    const vehicles = this._getLocal(this.vehiclesKey);
    const idx = vehicles.findIndex(v => v.id === id);
    if (idx === -1) return null;

    if (updatedFields.ownerName !== undefined && !updatedFields.ownerName.trim()) {
      throw new Error("ownerName është i detyrueshëm.");
    }
    if (updatedFields.vehicleBrand !== undefined && !updatedFields.vehicleBrand.trim()) {
      throw new Error("vehicleBrand është i detyrueshëm.");
    }

    vehicles[idx] = {
      ...vehicles[idx],
      ownerName: updatedFields.ownerName !== undefined ? updatedFields.ownerName.trim() : vehicles[idx].ownerName,
      vehicleBrand: updatedFields.vehicleBrand !== undefined ? updatedFields.vehicleBrand.trim() : vehicles[idx].vehicleBrand,
      ownerPhone: updatedFields.ownerPhone !== undefined ? updatedFields.ownerPhone.trim() : vehicles[idx].ownerPhone,
      vehiclePlate: updatedFields.vehiclePlate !== undefined ? updatedFields.vehiclePlate.trim().toUpperCase() : vehicles[idx].vehiclePlate,
      vehicleModel: updatedFields.vehicleModel !== undefined ? updatedFields.vehicleModel.trim() : vehicles[idx].vehicleModel,
      vehicleYear: updatedFields.vehicleYear !== undefined ? (updatedFields.vehicleYear ? parseInt(updatedFields.vehicleYear) : "") : vehicles[idx].vehicleYear,
      vehicleEngine: updatedFields.vehicleEngine !== undefined ? updatedFields.vehicleEngine.trim() : vehicles[idx].vehicleEngine,
      vehicleVin: updatedFields.vehicleVin !== undefined ? updatedFields.vehicleVin.trim().toUpperCase() : vehicles[idx].vehicleVin,
      updatedAt: new Date().toISOString()
    };
    this._saveLocal(this.vehiclesKey, vehicles);

    if (this.isUsingSupabase()) {
      try {
        const { error } = await this.supabaseClient.from('vehicles').update(this._toSnake(vehicles[idx])).eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error("Supabase error (updateVehicle):", err);
      }
    }

    return vehicles[idx];
  }

  async deleteVehicle(id) {
    const services = this._getLocal(this.servicesKey);
    const filteredServices = services.filter(s => s.vehicleId !== id);
    this._saveLocal(this.servicesKey, filteredServices);

    const vehicles = this._getLocal(this.vehiclesKey);
    const filteredVehicles = vehicles.filter(v => v.id !== id);
    this._saveLocal(this.vehiclesKey, filteredVehicles);

    if (this.isUsingSupabase()) {
      try {
        await this.supabaseClient.from('services').delete().eq('vehicle_id', id);
        const { error } = await this.supabaseClient.from('vehicles').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error("Supabase error (deleteVehicle):", err);
      }
    }

    return true;
  }

  async updateVehicleMileage(vehicleId, newMileage) {
    const vehicles = this._getLocal(this.vehiclesKey);
    const idx = vehicles.findIndex(v => v.id === vehicleId);
    if (idx !== -1) {
      vehicles[idx].mileage = parseInt(newMileage) || 0;
      vehicles[idx].updatedAt = new Date().toISOString();
      this._saveLocal(this.vehiclesKey, vehicles);

      if (this.isUsingSupabase()) {
        try {
          await this.supabaseClient.from('vehicles').update({ mileage: vehicles[idx].mileage, updated_at: vehicles[idx].updatedAt }).eq('id', vehicleId);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }

  // ==========================================
  // SERVICE RECORDS API
  // ==========================================
  async getServices() {
    if (this.isUsingSupabase()) {
      try {
        const { data, error } = await this.supabaseClient.from('services').select('*');
        if (error) throw error;
        return this._toCamel(data || []);
      } catch (err) {
        console.error("Supabase error (getServices), falling back to local:", err);
      }
    }
    return this._getLocal(this.servicesKey);
  }

  async getServiceById(id) {
    const services = await this.getServices();
    return services.find(s => s.id === id) || null;
  }

  async getServicesByVehicle(vehicleId) {
    const services = await this.getServices();
    return services
      .filter(s => s.vehicleId === vehicleId)
      .sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate));
  }

  async addServiceRecord(record) {
    if (!record || !record.vehicleId) {
      throw new Error("vehicleId është i detyrueshëm.");
    }
    const partsCost = parseFloat(record.partsCost) || 0;
    const laborCost = parseFloat(record.laborCost) || 0;
    const totalCost = partsCost + laborCost;

    const newRecord = {
      id: "srv_" + Date.now(),
      vehicleId: record.vehicleId,
      serviceDate: record.serviceDate || new Date().toISOString().split('T')[0],
      mileage: parseInt(record.mileage) || 0,
      serviceTypes: record.serviceTypes || [],
      description: record.description || "",
      parts: record.parts || [],
      laborCost: laborCost,
      partsCost: partsCost,
      totalCost: totalCost,
      notes: record.notes || "",
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const services = this._getLocal(this.servicesKey);
    services.push(newRecord);
    this._saveLocal(this.servicesKey, services);

    await this.updateVehicleMileage(record.vehicleId, newRecord.mileage);

    if (this.isUsingSupabase()) {
      try {
        const { error } = await this.supabaseClient.from('services').insert(this._toSnake(newRecord));
        if (error) throw error;
      } catch (err) {
        console.error("Supabase error (addServiceRecord):", err);
      }
    }

    return newRecord;
  }

  async updateServiceRecord(id, updatedFields) {
    const services = this._getLocal(this.servicesKey);
    const idx = services.findIndex(s => s.id === id);
    if (idx === -1) return null;

    const partsCost = updatedFields.partsCost !== undefined ? parseFloat(updatedFields.partsCost) : services[idx].partsCost;
    const laborCost = updatedFields.laborCost !== undefined ? parseFloat(updatedFields.laborCost) : services[idx].laborCost;
    const totalCost = partsCost + laborCost;

    services[idx] = {
      ...services[idx],
      serviceDate: updatedFields.serviceDate !== undefined ? updatedFields.serviceDate : services[idx].serviceDate,
      mileage: updatedFields.mileage !== undefined ? parseInt(updatedFields.mileage) : services[idx].mileage,
      serviceTypes: updatedFields.serviceTypes !== undefined ? updatedFields.serviceTypes : services[idx].serviceTypes,
      description: updatedFields.description !== undefined ? updatedFields.description : services[idx].description,
      parts: updatedFields.parts !== undefined ? updatedFields.parts : services[idx].parts,
      laborCost: laborCost,
      partsCost: partsCost,
      totalCost: totalCost,
      notes: updatedFields.notes !== undefined ? updatedFields.notes : services[idx].notes,
      archived: updatedFields.archived !== undefined ? updatedFields.archived : (services[idx].archived || false),
      updatedAt: new Date().toISOString()
    };
    this._saveLocal(this.servicesKey, services);

    await this.recalculateVehicleMileage(services[idx].vehicleId);

    if (this.isUsingSupabase()) {
      try {
        const { error } = await this.supabaseClient.from('services').update(this._toSnake(services[idx])).eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error("Supabase error (updateServiceRecord):", err);
      }
    }

    return services[idx];
  }

  async deleteServiceRecord(id) {
    const services = this._getLocal(this.servicesKey);
    const record = services.find(s => s.id === id);
    if (!record) return false;

    const vehicleId = record.vehicleId;
    const filtered = services.filter(s => s.id !== id);
    this._saveLocal(this.servicesKey, filtered);

    await this.recalculateVehicleMileage(vehicleId);

    if (this.isUsingSupabase()) {
      try {
        const { error } = await this.supabaseClient.from('services').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error("Supabase error (deleteServiceRecord):", err);
      }
    }

    return true;
  }

  async recalculateVehicleMileage(vehicleId) {
    const services = await this.getServicesByVehicle(vehicleId);
    if (services.length > 0) {
      services.sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate));
      await this.updateVehicleMileage(vehicleId, services[0].mileage);
    } else {
      await this.updateVehicleMileage(vehicleId, 0);
    }
  }

  // ==========================================
  // CATEGORIES (fikse, pa UI menaxhimi - shërbimet i referojnë me emër)
  // ==========================================
  async getCategories() {
    return this._getLocal(this.categoriesKey);
  }

  async getActiveCategories() {
    return this.getCategories();
  }

  // ==========================================
  // GLOBAL SEARCH
  // ==========================================
  async searchAll(query) {
    if (!query) return [];
    const q = query.toLowerCase().trim();

    const vehicles = await this.getVehicles();

    const results = [];
    vehicles.forEach(v => {
      const ownerName = v.ownerName || "Pa pronar";
      const ownerPhone = v.ownerPhone || "";

      if (
        (v.vehiclePlate && v.vehiclePlate.toLowerCase().includes(q)) ||
        (v.vehicleBrand && v.vehicleBrand.toLowerCase().includes(q)) ||
        (v.vehicleModel && v.vehicleModel.toLowerCase().includes(q)) ||
        ownerName.toLowerCase().includes(q) ||
        ownerPhone.toLowerCase().includes(q)
      ) {
        results.push({
          type: "vehicle",
          id: v.id,
          title: `${v.vehicleBrand || ''} ${v.vehicleModel || ''}`.trim() || 'Automjet',
          subtitle: v.vehiclePlate || '-',
          owner: ownerName,
          phone: ownerPhone,
          mileage: v.mileage,
          vehicle: v
        });
      }
    });

    return results;
  }

  // ==========================================
  // DASHBOARD STATS
  // ==========================================
  async getDashboardStats() {
    const vehicles = await this.getVehicles();
    const services = await this.getServices();

    return {
      vehicleCount: vehicles.length,
      serviceCount: services.length
    };
  }
}

export const db = new DBService();
