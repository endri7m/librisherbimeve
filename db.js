// db.js - Shërbimi i të dhënave për Librin Dixhital të Shërbimeve

// Të dhënat Demo në Shqip
const DEMO_CUSTOMERS = [
  {
    id: "cust_1",
    firstName: "Endri",
    lastName: "Hasa",
    phone: "0691234567",
    email: "endri.hasa@gmail.com",
    address: "Tiranë",
    notes: "Klient i rregullt që nga viti 2024. Kujdeset shumë për mjetet.",
    createdAt: "2024-05-10T10:00:00.000Z"
  },
  {
    id: "cust_2",
    firstName: "Arben",
    lastName: "Hoxha",
    phone: "0682223344",
    email: "arben.hoxha@yahoo.com",
    address: "Durrës",
    notes: "Kërkon gjithmonë pjesë origjinale ose Bosch. Paguan në kohë.",
    createdAt: "2025-01-15T09:30:00.000Z"
  },
  {
    id: "cust_3",
    firstName: "Valbona",
    lastName: "Leka",
    phone: "0675556677",
    email: "valbona.leka@outlook.com",
    address: "Vlorë",
    notes: "E saktë me kontrollet periodike. Automjeti përdoret kryesisht në qytet.",
    createdAt: "2025-11-01T14:20:00.000Z"
  }
];

const DEMO_VEHICLES = [
  {
    id: "veh_1",
    customerId: "cust_1",
    licensePlate: "AB 123 CD",
    vin: "WBA3A5C50JF012345",
    make: "BMW",
    model: "320d",
    year: 2018,
    mileage: 186420,
    engine: "2.0L",
    fuelType: "Naftë",
    transmission: "Automatike",
    color: "E zezë",
    notes: "Të kontrollohen frenat në çdo servis.",
    createdAt: "2024-05-10T10:30:00.000Z",
    updatedAt: "2026-08-12T22:42:53.000Z"
  },
  {
    id: "veh_2",
    customerId: "cust_1",
    licensePlate: "AB 999 XY",
    vin: "WAUZZZ8K5GA987654",
    make: "Audi",
    model: "A4",
    year: 2016,
    mileage: 168200,
    engine: "2.0 TFSI",
    fuelType: "Benzinë",
    transmission: "Automatike",
    color: "Blu",
    notes: "Makinë sekondare e familjes.",
    createdAt: "2026-02-05T11:00:00.000Z",
    updatedAt: "2026-07-22T15:30:00.000Z"
  },
  {
    id: "veh_3",
    customerId: "cust_2",
    licensePlate: "AA 987 ZZ",
    vin: "WDD2040011A654321",
    make: "Mercedes-Benz",
    model: "C220",
    year: 2015,
    mileage: 215300,
    engine: "2.2L",
    fuelType: "Naftë",
    transmission: "Automatike",
    color: "Gri",
    notes: "Përdoret për rrugë të gjata.",
    createdAt: "2025-01-15T10:00:00.000Z",
    updatedAt: "2026-06-10T16:20:00.000Z"
  },
  {
    id: "veh_4",
    customerId: "cust_3",
    licensePlate: "AB 567 EF",
    vin: "WVWZZZAUZHP246810",
    make: "Volkswagen",
    model: "Golf 7",
    year: 2017,
    mileage: 142500,
    engine: "1.6 TDI",
    fuelType: "Naftë",
    transmission: "Manuale",
    color: "E bardhë",
    notes: "Makinë e ruajtur shumë mirë.",
    createdAt: "2025-11-01T15:00:00.000Z",
    updatedAt: "2026-04-18T12:00:00.000Z"
  }
];

const DEMO_SERVICES = [
  {
    id: "srv_1",
    vehicleId: "veh_1",
    serviceDate: "2026-05-15",
    mileage: 181200,
    serviceTypes: ["Kontroll periodik", "Frenat"],
    description: "Kontroll i plotë dhe ndërrim i disqeve dhe pllakave të frenave të përparme.",
    parts: [
      { name: "Pllaka frena ATE", quantity: 1, description: "Komplet përpara" },
      { name: "Disqe frena ATE", quantity: 2, description: "Përpara" }
    ],
    laborCost: 3000,
    partsCost: 8000,
    totalCost: 11000,
    notes: "U kontrolluan dhe lëngjet e tjera të makinës. Gjithçka në rregull.",
    createdAt: "2026-05-15T12:30:00.000Z",
    updatedAt: "2026-05-15T12:30:00.000Z"
  },
  {
    id: "srv_2",
    vehicleId: "veh_1",
    serviceDate: "2026-08-12",
    mileage: 186420,
    serviceTypes: ["Ndërrim vaji", "Ndërrim filtrash"],
    description: "Ndërrim vaji i motorit Castrol 5W-30 dhe set filtrash Mann.",
    parts: [
      { name: "Castrol Edge 5W-30", quantity: 5, description: "Litra vaj motori" },
      { name: "Filter vaji Mann", quantity: 1, description: "HU 7003 x" },
      { name: "Filter ajri Mann", quantity: 1, description: "C 30 005" },
      { name: "Filter kabine Mann", quantity: 1, description: "CUK 29 001" }
    ],
    laborCost: 3000,
    partsCost: 8000,
    totalCost: 11000,
    notes: "U kontrolluan frenat. Disqet e pasme kanë konsum dhe rekomandohet zëvendësimi në servisin e ardhshëm.",
    createdAt: "2026-08-12T22:42:53.000Z",
    updatedAt: "2026-08-12T22:42:53.000Z"
  },
  {
    id: "srv_3",
    vehicleId: "veh_3",
    serviceDate: "2026-01-20",
    mileage: 205000,
    serviceTypes: ["Ndërrim vaji", "Ndërrim filtrash"],
    description: "Servis i rregullt vaji dhe filtra vaji/ajri/karburanti.",
    parts: [
      { name: "Vaj Mercedes-Benz 5W-30", quantity: 6, description: "Origjinal" },
      { name: "Filtra set Mann", quantity: 1, description: "Vaji, ajri, poleni, nafte" }
    ],
    laborCost: 4000,
    partsCost: 12000,
    totalCost: 16000,
    notes: "Gjithçka në normë. Pa probleme tjera.",
    createdAt: "2026-01-20T10:00:00.000Z",
    updatedAt: "2026-01-20T10:00:00.000Z"
  },
  {
    id: "srv_4",
    vehicleId: "veh_3",
    serviceDate: "2026-06-10",
    mileage: 215300,
    serviceTypes: ["Suspension", "Riparim"],
    description: "Ndërrim i amortizatorëve të përparmë dhe gomave të krahut të poshtëm.",
    parts: [
      { name: "Amortizatorë Sachs", quantity: 2, description: "Përpara" },
      { name: "Goma krahu Lemforder", quantity: 2, description: "Përpara" }
    ],
    laborCost: 6000,
    partsCost: 18000,
    totalCost: 24000,
    notes: "Konvergjenca dhe drejtimi i rrotave u krye pas ndërrimit. Ndjesia në rrugë është e shkëlqyer.",
    createdAt: "2026-06-10T16:20:00.000Z",
    updatedAt: "2026-06-10T16:20:00.000Z"
  },
  {
    id: "srv_5",
    vehicleId: "veh_4",
    serviceDate: "2025-11-12",
    mileage: 132000,
    serviceTypes: ["Ndërrim vaji", "Ndërrim filtrash"],
    description: "Ndërrim vaji i motorit Castrol 5W-30 dhe filtri i vajit dhe ajrit.",
    parts: [
      { name: "Castrol 5W-30", quantity: 4.5, description: "Litra" },
      { name: "Filtër vaji/ajri UFI", quantity: 1, description: "" }
    ],
    laborCost: 3000,
    partsCost: 7500,
    totalCost: 10500,
    notes: "Makinë shumë e pastër, pa rrjedhje vaji.",
    createdAt: "2025-11-12T11:00:00.000Z",
    updatedAt: "2025-11-12T11:00:00.000Z"
  },
  {
    id: "srv_6",
    vehicleId: "veh_4",
    serviceDate: "2026-04-18",
    mileage: 142500,
    serviceTypes: ["Gomat", "Kontroll periodik"],
    description: "Ndërrimi i katër gomave të reja dhe kontrolli i sistemit të drejtimit.",
    parts: [
      { name: "Goma Michelin Primacy 4", quantity: 4, description: "205/55 R16 91V" }
    ],
    laborCost: 2000,
    partsCost: 32000,
    totalCost: 34000,
    notes: "Gomat e vjetra ishin shumë të konsumuara. Konvergjenca është bërë.",
    createdAt: "2026-04-18T12:00:00.000Z",
    updatedAt: "2026-04-18T12:00:00.000Z"
  },
  {
    id: "srv_7",
    vehicleId: "veh_2",
    serviceDate: "2026-02-05",
    mileage: 158000,
    serviceTypes: ["Ndërrim vaji", "Ndërrim filtrash"],
    description: "Ndërrim vaji Liqui Moly 5W-30 dhe komplet filtrash.",
    parts: [
      { name: "Liqui Moly 5W-30", quantity: 5, description: "" },
      { name: "Filtra Bosch set", quantity: 1, description: "" }
    ],
    laborCost: 3000,
    partsCost: 9000,
    totalCost: 12000,
    notes: "Bërë reset treguesit të servisit.",
    createdAt: "2026-02-05T11:30:00.000Z",
    updatedAt: "2026-02-05T11:30:00.000Z"
  },
  {
    id: "srv_8",
    vehicleId: "veh_2",
    serviceDate: "2026-07-22",
    mileage: 168200,
    serviceTypes: ["Kondicioner", "Elektrikë"],
    description: "Mbushje me freon e kondicionerit dhe zëvendësimi i sensorit të jashtëm të temperaturës.",
    parts: [
      { name: "Gaz freon R134a", quantity: 1, description: "Mbushje" },
      { name: "Sensor temperature Bosch", quantity: 1, description: "Origjinal" }
    ],
    laborCost: 3000,
    partsCost: 5000,
    totalCost: 8000,
    notes: "Testuar dhe funksionon shkëlqyeshëm.",
    createdAt: "2026-07-22T15:30:00.000Z",
    updatedAt: "2026-07-22T15:30:00.000Z"
  }
];

class DBService {
  constructor() {
    this.customersKey = "autoservice_customers";
    this.vehiclesKey = "autoservice_vehicles";
    this.servicesKey = "autoservice_services";
    this.firebaseConfigKey = "autoservice_firebase_config";
    this.supabaseUrlKey = "autoservice_supabase_url";
    this.supabaseKeyKey = "autoservice_supabase_key";

    this.firebaseApp = null;
    this.firestore = null;
    this.supabaseClient = null;

    this.init();
  }

  init() {
    if (!localStorage.getItem(this.customersKey)) {
      localStorage.setItem(this.customersKey, JSON.stringify(DEMO_CUSTOMERS));
    }
    if (!localStorage.getItem(this.vehiclesKey)) {
      localStorage.setItem(this.vehiclesKey, JSON.stringify(DEMO_VEHICLES));
    }
    if (!localStorage.getItem(this.servicesKey)) {
      localStorage.setItem(this.servicesKey, JSON.stringify(DEMO_SERVICES));
    }

    this.initFirebase();
    this.initSupabase();
  }

  // Firebase integration
  initFirebase() {
    const configStr = localStorage.getItem(this.firebaseConfigKey);
    if (!configStr) return false;
    try {
      const config = JSON.parse(configStr);
      if (config && config.projectId && typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
          this.firebaseApp = firebase.initializeApp(config);
        } else {
          this.firebaseApp = firebase.app();
        }
        this.firestore = firebase.firestore();
        console.log("Firebase/Firestore u inicializua.");
        return true;
      }
    } catch (e) {
      console.error("Gabim Firebase:", e);
    }
    return false;
  }

  saveFirebaseConfig(config) {
    if (config) {
      localStorage.setItem(this.firebaseConfigKey, JSON.stringify(config));
      return this.initFirebase();
    } else {
      localStorage.removeItem(this.firebaseConfigKey);
      this.firebaseApp = null;
      this.firestore = null;
      return true;
    }
  }

  getFirebaseConfig() {
    const configStr = localStorage.getItem(this.firebaseConfigKey);
    return configStr ? JSON.parse(configStr) : null;
  }

  isUsingFirebase() {
    return this.firestore !== null;
  }

  // Supabase Integration
  initSupabase() {
    const url = localStorage.getItem(this.supabaseUrlKey);
    const key = localStorage.getItem(this.supabaseKeyKey);
    if (!url || !key) return false;
    try {
      if (typeof supabase !== 'undefined') {
        this.supabaseClient = supabase.createClient(url, key);
        console.log("Supabase u inicializua me sukses.");
        return true;
      }
    } catch (e) {
      console.error("Gabim gjatë inicializimit të Supabase:", e);
    }
    return false;
  }

  saveSupabaseConfig(url, key) {
    if (url && key) {
      localStorage.setItem(this.supabaseUrlKey, url);
      localStorage.setItem(this.supabaseKeyKey, key);
      return this.initSupabase();
    } else {
      localStorage.removeItem(this.supabaseUrlKey);
      localStorage.removeItem(this.supabaseKeyKey);
      this.supabaseClient = null;
      return true;
    }
  }

  getSupabaseConfig() {
    return {
      url: localStorage.getItem(this.supabaseUrlKey) || "",
      key: localStorage.getItem(this.supabaseKeyKey) || ""
    };
  }

  isUsingSupabase() {
    return this.supabaseClient !== null;
  }

  // Mappers midis camelCase (Frontend) dhe snake_case (PostgreSQL/Supabase)
  _toCamel(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this._toCamel(item));
    const camel = {};
    for (const key in obj) {
      if (key === 'parts') {
        camel.parts = obj.parts;
        continue;
      }
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
      if (key === 'parts') {
        snake.parts = obj.parts;
        continue;
      }
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      snake[snakeKey] = this._toSnake(obj[key]);
    }
    return snake;
  }

  // Helpers për LocalStorage
  _getLocal(key) {
    return JSON.parse(localStorage.getItem(key) || "[]");
  }

  _saveLocal(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // CUSTOMERS API
  async getCustomers() {
    if (this.isUsingSupabase()) {
      try {
        const { data, error } = await this.supabaseClient.from('customers').select('*');
        if (error) throw error;
        return this._toCamel(data || []);
      } catch (err) {
        console.error("Supabase error (getCustomers), falling back to local:", err);
      }
    }
    return this._getLocal(this.customersKey);
  }

  async getCustomerById(id) {
    if (this.isUsingSupabase()) {
      try {
        const { data, error } = await this.supabaseClient.from('customers').select('*').eq('id', id).single();
        if (error) throw error;
        return this._toCamel(data);
      } catch (err) {
        console.error("Supabase error (getCustomerById), falling back to local:", err);
      }
    }
    const customers = await this.getCustomers();
    return customers.find(c => c.id === id) || null;
  }

  async addCustomer(customer) {
    const newCustomer = {
      id: "cust_" + Date.now(),
      firstName: customer.firstName || "",
      lastName: customer.lastName || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      notes: customer.notes || "",
      createdAt: new Date().toISOString()
    };

    // Ruaj lokalisht si fallback
    const customers = this._getLocal(this.customersKey);
    customers.push(newCustomer);
    this._saveLocal(this.customersKey, customers);

    // Sinkronizo Supabase
    if (this.isUsingSupabase()) {
      try {
        const { error } = await this.supabaseClient.from('customers').insert(this._toSnake(newCustomer));
        if (error) throw error;
      } catch (err) {
        console.error("Supabase error (addCustomer):", err);
      }
    }

    // Sinkronizo Firebase
    if (this.isUsingFirebase()) {
      this.firestore.collection("customers").doc(newCustomer.id).set(newCustomer).catch(e => console.error(e));
    }

    return newCustomer;
  }

  async updateCustomer(id, updatedFields) {
    const customers = this._getLocal(this.customersKey);
    const idx = customers.findIndex(c => c.id === id);
    if (idx === -1) return null;

    customers[idx] = {
      ...customers[idx],
      firstName: updatedFields.firstName !== undefined ? updatedFields.firstName : customers[idx].firstName,
      lastName: updatedFields.lastName !== undefined ? updatedFields.lastName : customers[idx].lastName,
      phone: updatedFields.phone !== undefined ? updatedFields.phone : customers[idx].phone,
      email: updatedFields.email !== undefined ? updatedFields.email : customers[idx].email,
      address: updatedFields.address !== undefined ? updatedFields.address : customers[idx].address,
      notes: updatedFields.notes !== undefined ? updatedFields.notes : customers[idx].notes
    };
    this._saveLocal(this.customersKey, customers);

    if (this.isUsingSupabase()) {
      try {
        const { error } = await this.supabaseClient.from('customers').update(this._toSnake(customers[idx])).eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error("Supabase error (updateCustomer):", err);
      }
    }

    if (this.isUsingFirebase()) {
      this.firestore.collection("customers").doc(id).update(customers[idx]).catch(e => console.error(e));
    }

    return customers[idx];
  }

  async deleteCustomer(id) {
    // Fshirja Cascade lokal
    const vehicles = await this.getVehiclesByCustomer(id);
    for (const v of vehicles) {
      await this.deleteVehicle(v.id);
    }

    const customers = this._getLocal(this.customersKey);
    const filtered = customers.filter(c => c.id !== id);
    this._saveLocal(this.customersKey, filtered);

    if (this.isUsingSupabase()) {
      try {
        // SQL Foreign Keys duhet te jene ON DELETE CASCADE, por per siguri fshijme dhe manualisht nese jo
        const { error } = await this.supabaseClient.from('customers').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error("Supabase error (deleteCustomer):", err);
      }
    }

    if (this.isUsingFirebase()) {
      this.firestore.collection("customers").doc(id).delete().catch(e => console.error(e));
    }

    return true;
  }

  // VEHICLES API
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
    if (this.isUsingSupabase()) {
      try {
        const { data, error } = await this.supabaseClient.from('vehicles').select('*').eq('id', id).single();
        if (error) throw error;
        return this._toCamel(data);
      } catch (err) {
        console.error("Supabase error (getVehicleById), falling back to local:", err);
      }
    }
    const vehicles = await this.getVehicles();
    return vehicles.find(v => v.id === id) || null;
  }

  async getVehiclesByCustomer(customerId) {
    const vehicles = await this.getVehicles();
    return vehicles.filter(v => v.customerId === customerId);
  }

  async addVehicle(vehicle) {
    const newVehicle = {
      id: "veh_" + Date.now(),
      customerId: vehicle.customerId,
      licensePlate: vehicle.licensePlate.toUpperCase().trim(),
      vin: (vehicle.vin || "").toUpperCase().trim(),
      make: vehicle.make.trim(),
      model: vehicle.model.trim(),
      year: parseInt(vehicle.year) || new Date().getFullYear(),
      mileage: parseInt(vehicle.mileage) || 0,
      engine: vehicle.engine || "",
      fuelType: vehicle.fuelType || "",
      transmission: vehicle.transmission || "",
      color: vehicle.color || "",
      notes: vehicle.notes || "",
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

    if (this.isUsingFirebase()) {
      this.firestore.collection("vehicles").doc(newVehicle.id).set(newVehicle).catch(e => console.error(e));
    }

    return newVehicle;
  }

  async updateVehicle(id, updatedFields) {
    const vehicles = this._getLocal(this.vehiclesKey);
    const idx = vehicles.findIndex(v => v.id === id);
    if (idx === -1) return null;

    vehicles[idx] = {
      ...vehicles[idx],
      licensePlate: updatedFields.licensePlate !== undefined ? updatedFields.licensePlate.toUpperCase().trim() : vehicles[idx].licensePlate,
      vin: updatedFields.vin !== undefined ? updatedFields.vin.toUpperCase().trim() : vehicles[idx].vin,
      make: updatedFields.make !== undefined ? updatedFields.make.trim() : vehicles[idx].make,
      model: updatedFields.model !== undefined ? updatedFields.model.trim() : vehicles[idx].model,
      year: updatedFields.year !== undefined ? parseInt(updatedFields.year) : vehicles[idx].year,
      mileage: updatedFields.mileage !== undefined ? parseInt(updatedFields.mileage) : vehicles[idx].mileage,
      engine: updatedFields.engine !== undefined ? updatedFields.engine : vehicles[idx].engine,
      fuelType: updatedFields.fuelType !== undefined ? updatedFields.fuelType : vehicles[idx].fuelType,
      transmission: updatedFields.transmission !== undefined ? updatedFields.transmission : vehicles[idx].transmission,
      color: updatedFields.color !== undefined ? updatedFields.color : vehicles[idx].color,
      notes: updatedFields.notes !== undefined ? updatedFields.notes : vehicles[idx].notes,
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

    if (this.isUsingFirebase()) {
      this.firestore.collection("vehicles").doc(id).update(vehicles[idx]).catch(e => console.error(e));
    }

    return vehicles[idx];
  }

  async deleteVehicle(id) {
    // Fshij shërbimet e lidhura lokal
    const services = this._getLocal(this.servicesKey);
    const filteredServices = services.filter(s => s.vehicleId !== id);
    this._saveLocal(this.servicesKey, filteredServices);

    const vehicles = this._getLocal(this.vehiclesKey);
    const filteredVehicles = vehicles.filter(v => v.id !== id);
    this._saveLocal(this.vehiclesKey, filteredVehicles);

    if (this.isUsingSupabase()) {
      try {
        const { error } = await this.supabaseClient.from('vehicles').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error("Supabase error (deleteVehicle):", err);
      }
    }

    if (this.isUsingFirebase()) {
      this.firestore.collection("vehicles").doc(id).delete().catch(e => console.error(e));
    }

    return true;
  }

  async updateVehicleMileage(vehicleId, newMileage) {
    const vehicles = this._getLocal(this.vehiclesKey);
    const idx = vehicles.findIndex(v => v.id === vehicleId);
    if (idx !== -1) {
      vehicles[idx].mileage = parseInt(newMileage);
      vehicles[idx].updatedAt = new Date().toISOString();
      this._saveLocal(this.vehiclesKey, vehicles);

      if (this.isUsingSupabase()) {
        try {
          await this.supabaseClient.from('vehicles').update({ mileage: parseInt(newMileage), updated_at: new Date().toISOString() }).eq('id', vehicleId);
        } catch (e) {
          console.error(e);
        }
      }

      if (this.isUsingFirebase()) {
        this.firestore.collection("vehicles").doc(vehicleId).update({
          mileage: parseInt(newMileage),
          updatedAt: new Date().toISOString()
        }).catch(err => console.error(err));
      }
    }
  }

  // SERVICE RECORDS API
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
    if (this.isUsingSupabase()) {
      try {
        const { data, error } = await this.supabaseClient.from('services').select('*').eq('id', id).single();
        if (error) throw error;
        return this._toCamel(data);
      } catch (err) {
        console.error("Supabase error (getServiceById), falling back to local:", err);
      }
    }
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

    if (this.isUsingFirebase()) {
      this.firestore.collection("services").doc(newRecord.id).set(newRecord).catch(e => console.error(e));
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

    if (this.isUsingFirebase()) {
      this.firestore.collection("services").doc(id).update(services[idx]).catch(e => console.error(e));
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

    if (this.isUsingFirebase()) {
      this.firestore.collection("services").doc(id).delete().catch(e => console.error(e));
    }

    return true;
  }

  async recalculateVehicleMileage(vehicleId) {
    const services = await this.getServicesByVehicle(vehicleId);
    if (services.length > 0) {
      services.sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate));
      await this.updateVehicleMileage(vehicleId, services[0].mileage);
    }
  }

  // GLOBAL SEARCH
  async searchAll(query) {
    if (!query) return [];
    const q = query.toLowerCase().trim();

    const customers = await this.getCustomers();
    const vehicles = await this.getVehicles();

    const results = [];
    vehicles.forEach(v => {
      const owner = customers.find(c => c.id === v.customerId);
      const ownerName = owner ? `${owner.firstName} ${owner.lastName}` : "Pa pronar";
      const ownerPhone = owner ? owner.phone : "";

      if (
        v.licensePlate.toLowerCase().includes(q) ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        ownerName.toLowerCase().includes(q) ||
        ownerPhone.toLowerCase().includes(q)
      ) {
        results.push({
          type: "vehicle",
          id: v.id,
          title: `${v.make} ${v.model}`,
          subtitle: v.licensePlate,
          owner: ownerName,
          phone: ownerPhone,
          mileage: v.mileage,
          vehicle: v
        });
      }
    });

    return results;
  }

  // DASHBOARD STATS
  async getDashboardStats() {
    const customers = await this.getCustomers();
    const vehicles = await this.getVehicles();
    const services = await this.getServices();

    return {
      customerCount: customers.length,
      vehicleCount: vehicles.length,
      serviceCount: services.length
    };
  }

  // Ringarko të dhënat demo
  async resetToDemo() {
    localStorage.setItem(this.customersKey, JSON.stringify(DEMO_CUSTOMERS));
    localStorage.setItem(this.vehiclesKey, JSON.stringify(DEMO_VEHICLES));
    localStorage.setItem(this.servicesKey, JSON.stringify(DEMO_SERVICES));
    this.saveFirebaseConfig(null);
    this.saveSupabaseConfig(null, null);
    return true;
  }

  // Pastro të gjitha të dhënat
  async clearAll() {
    localStorage.setItem(this.customersKey, "[]");
    localStorage.setItem(this.vehiclesKey, "[]");
    localStorage.setItem(this.servicesKey, "[]");
    this.saveFirebaseConfig(null);
    this.saveSupabaseConfig(null, null);
    return true;
  }
}

export const db = new DBService();
