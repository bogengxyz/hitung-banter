import {
  AuditLog,
  CustomerReceipt,
  Driver,
  DriverPayment,
  ExpenseItem,
  Order,
  OrderItem,
  TariffConfig,
  UserProfile,
  UserRole,
  CombinedOrderGroup,
  CombinedOrderCustomer,
  PurchaseLocation,
  PurchaseItem,
  CombinedOrderStatus,
  CombinedAdminPricingMethod,
  CombinedOrderStatusHistoryEntry,
  ItemPurchaseStatus,
  DriverObligation,
  DriverManualDeposit,
  ObligationCategory,
  CompensationItem,
} from '../../types';
import { calculatePricing, createPricingSnapshot, DEFAULT_TARIFF_CONFIG, formatRupiah } from '../pricing/engine';
import { calculateCombinedOrderPricing } from '../pricing/combinedEngine';
import {
  generateTahap1DriverAnnouncement,
  generateTahap2DriverConfirmation,
  generateTahap3AdminProcessing,
  generateTahap4DriverAssignment,
  generateTahap5OrderCompleted,
  generateCombinedOrderShoppingList,
  isGroupPricePending,
} from '../whatsapp/combinedOrderTemplates';

const STORAGE_KEYS = {
  CURRENT_USER: 'hitung_banter_current_user',
  USERS: 'hitung_banter_users',
  DRIVERS: 'hitung_banter_drivers',
  ORDERS: 'hitung_banter_orders',
  COMBINED_ORDERS: 'hitung_banter_combined_orders',
  EXPENSES: 'hitung_banter_expenses',
  RECEIPTS: 'hitung_banter_receipts',
  PAYMENTS: 'hitung_banter_payments',
  DRIVER_OBLIGATIONS: 'hitung_banter_driver_obligations',
  DRIVER_DEPOSITS: 'hitung_banter_driver_deposits',
  AUDIT_LOGS: 'hitung_banter_audit_logs',
  TARIFF_CONFIG: 'hitung_banter_tariff_config',
  SUPABASE_CONFIG: 'hitung_banter_supabase_config',
};

// Default seed users
const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr-owner-01',
    email: 'owner@banter.id',
    full_name: 'Hendra Wijaya (Owner - Terkunci)',
    role: 'owner',
    is_active: false,
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'usr-admin-01',
    email: 'admin@banter.id',
    full_name: 'Admin BANTER',
    role: 'admin',
    is_active: true,
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    created_at: '2026-01-15T00:00:00Z',
  },
  {
    id: 'usr-viewer-01',
    email: 'monitoring@banter.id',
    full_name: 'Dewi Lestari (Viewer)',
    role: 'viewer',
    is_active: true,
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    created_at: '2026-02-01T00:00:00Z',
  },
];

// Initial active drivers
const INITIAL_DRIVERS: Driver[] = [
  {
    id: 'drv-01',
    code: 'DRV-01',
    name: 'Budi Santoso',
    phone: '0812-3456-7890',
    status: 'active',
    vehicle_plate: 'AB 1234 XY',
    joined_at: '2026-01-10T08:00:00Z',
    notes: 'Driver senior area Sleman & Malioboro',
  },
  {
    id: 'drv-02',
    code: 'DRV-02',
    name: 'Agus Prasetyo',
    phone: '0813-9876-5432',
    status: 'active',
    vehicle_plate: 'AB 5678 CD',
    joined_at: '2026-02-01T08:00:00Z',
    notes: 'Driver operasional area Bantul',
  },
  {
    id: 'drv-03',
    code: 'DRV-03',
    name: 'Rian Hidayat',
    phone: '0857-1122-3344',
    status: 'active',
    vehicle_plate: 'AB 9012 EF',
    joined_at: '2026-02-15T08:00:00Z',
    notes: 'Driver shift malam & hujan',
  },
  {
    id: 'drv-04',
    code: 'DRV-04',
    name: 'Dedi Kurniawan',
    phone: '0878-5566-7788',
    status: 'active',
    vehicle_plate: 'AB 3456 GH',
    joined_at: '2026-03-01T08:00:00Z',
    notes: 'Driver baru area Gejayan',
  },
];

// Ensure localStorage is available in test runners or SSR environments
if (typeof globalThis.localStorage === 'undefined') {
  const memoryMap = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => memoryMap.get(k) ?? null,
    setItem: (k: string, v: string) => { memoryMap.set(k, String(v)); },
    removeItem: (k: string) => { memoryMap.delete(k); },
    clear: () => { memoryMap.clear(); },
    key: (i: number) => Array.from(memoryMap.keys())[i] ?? null,
    get length() { return memoryMap.size; },
  };
}

type ChangeListener = () => void;

class BanterStore {
  private listeners: Set<ChangeListener> = new Set();

  constructor() {
    this.ensureInitialized();
  }

  public subscribe(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Store listener error:', err);
      }
    });
  }

  private getItem<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      this.notify();
    } catch (err) {
      console.error('Failed to save to localStorage', err);
    }
  }

  public ensureInitialized(): void {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      this.setItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      this.setItem(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[1]); // Default to Admin BANTER
    }
    if (!localStorage.getItem(STORAGE_KEYS.DRIVERS)) {
      this.setItem(STORAGE_KEYS.DRIVERS, INITIAL_DRIVERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TARIFF_CONFIG)) {
      this.setItem(STORAGE_KEYS.TARIFF_CONFIG, DEFAULT_TARIFF_CONFIG);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
      this.seedInitialOrders();
    }
    if (!localStorage.getItem(STORAGE_KEYS.DRIVER_OBLIGATIONS)) {
      this.setItem(STORAGE_KEYS.DRIVER_OBLIGATIONS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.DRIVER_DEPOSITS)) {
      this.setItem(STORAGE_KEYS.DRIVER_DEPOSITS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.COMBINED_ORDERS)) {
      this.seedInitialCombinedOrders();
    }
  }

  private seedInitialOrders() {
    const today = new Date().toISOString().split('T')[0];
    const initialOrders: Order[] = [];
    const expenses: ExpenseItem[] = [];
    const receipts: CustomerReceipt[] = [];
    const obligations: DriverObligation[] = [];
    const deposits: DriverManualDeposit[] = [];
    const logs: AuditLog[] = [];

    // Create 12 realistic orders for today that match screenshot metrics
    // Total Ongkir: Rp528.000, BANTER: Rp52.800, Hak Driver delivery: Rp475.200
    const rawOrderSpecs = [
      { num: '001', drv: INITIAL_DRIVERS[0], km: 4, cust: 'Ibu Rahayu', rain: false, night: false, stops: 0, shoppingDriver: 45000, shoppingAdmin: 0, custPaid: true, recipient: 'driver' as const, method: 'cash' as const },
      { num: '002', drv: INITIAL_DRIVERS[1], km: 6, cust: 'Pak Handoko', rain: true, night: false, stops: 1, shoppingDriver: 0, shoppingAdmin: 30000, custPaid: true, recipient: 'admin' as const, method: 'qris' as const },
      { num: '003', drv: INITIAL_DRIVERS[2], km: 3, cust: 'Sdr. Dimas', rain: false, night: true, stops: 0, shoppingDriver: 25000, shoppingAdmin: 0, custPaid: true, recipient: 'driver' as const, method: 'cash' as const },
      { num: '004', drv: INITIAL_DRIVERS[0], km: 7, cust: 'Toko Anugerah', rain: false, night: false, stops: 2, shoppingDriver: 0, shoppingAdmin: 0, custPaid: true, recipient: 'admin' as const, method: 'transfer' as const },
      { num: '005', drv: INITIAL_DRIVERS[3], km: 2, cust: 'Mbak Cindy', rain: false, night: false, stops: 0, shoppingDriver: 15000, shoppingAdmin: 0, custPaid: true, recipient: 'driver' as const, method: 'cash' as const },
      { num: '006', drv: INITIAL_DRIVERS[1], km: 5, cust: 'Klinik Sehat', rain: false, night: false, stops: 0, shoppingDriver: 60000, shoppingAdmin: 20000, custPaid: true, recipient: 'admin' as const, method: 'qris' as const },
      { num: '007', drv: INITIAL_DRIVERS[2], km: 8, cust: 'Resto Dapur Mama', rain: true, night: false, stops: 0, shoppingDriver: 0, shoppingAdmin: 0, custPaid: true, recipient: 'driver' as const, method: 'cash' as const },
      { num: '008', drv: INITIAL_DRIVERS[0], km: 10, cust: 'PT Sinergi Abadi', rain: false, night: false, stops: 1, shoppingDriver: 0, shoppingAdmin: 0, custPaid: true, recipient: 'admin' as const, method: 'transfer' as const },
      { num: '009', drv: INITIAL_DRIVERS[3], km: 4, cust: 'Pak Joko', rain: false, night: false, stops: 0, shoppingDriver: 35000, shoppingAdmin: 0, custPaid: true, recipient: 'driver' as const, method: 'cash' as const },
      { num: '010', drv: INITIAL_DRIVERS[1], km: 9, cust: 'Ibu Ratna', rain: false, night: false, stops: 0, shoppingDriver: 0, shoppingAdmin: 0, custPaid: true, recipient: 'driver' as const, method: 'cash' as const },
      { num: '011', drv: INITIAL_DRIVERS[2], km: 12, cust: 'Apotek K-24 Gejayan', rain: false, night: false, stops: 0, shoppingDriver: 80000, shoppingAdmin: 0, custPaid: false, recipient: 'driver' as const, method: 'cash' as const },
      { num: '012', drv: INITIAL_DRIVERS[0], km: 15, cust: 'Hotel Tentrem Jogja', rain: false, night: false, stops: 1, shoppingDriver: 0, shoppingAdmin: 50000, custPaid: true, recipient: 'admin' as const, method: 'qris' as const },
    ];

    rawOrderSpecs.forEach((spec, idx) => {
      const pricing = calculatePricing({
        distance_km: spec.km,
        is_rain: spec.rain,
        is_night: spec.night,
        extra_stops_count: spec.stops,
      });

      const orderId = `ord-${today.replace(/-/g, '')}-${spec.num}`;
      const totalShopping = spec.shoppingDriver + spec.shoppingAdmin;
      const customerBill = pricing.delivery_fee + pricing.extra_fees_total + totalShopping;
      const driverEntitlement = spec.shoppingDriver + pricing.driver_total_delivery_entitlement;

      // Expense items
      if (spec.shoppingDriver > 0) {
        expenses.push({
          id: `exp-${orderId}-1`,
          order_id: orderId,
          item_name: 'Belanja pesanan makanan/barang',
          amount: spec.shoppingDriver,
          funding_source: 'driver',
          notes: 'Dibayar menggunakan uang pribadi driver',
          created_at: `${today}T${10 + idx}:00:00Z`,
          created_by: 'usr-admin-01',
        });
      }
      if (spec.shoppingAdmin > 0) {
        expenses.push({
          id: `exp-${orderId}-2`,
          order_id: orderId,
          item_name: 'Belanja transfer saldo admin',
          amount: spec.shoppingAdmin,
          funding_source: 'admin',
          notes: 'Ditalangi dari kas admin BANTER',
          created_at: `${today}T${10 + idx}:00:00Z`,
          created_by: 'usr-admin-01',
        });
      }

      // Customer payments
      let driverReceivedFromCust = 0;
      let driverTransferredByAdmin = 0;
      let custPaymentStatus: 'paid' | 'unpaid' = spec.custPaid ? 'paid' : 'unpaid';

      if (spec.custPaid) {
        const rcptId = `rcpt-${orderId}`;
        receipts.push({
          id: rcptId,
          receipt_number: `RCP-${today.replace(/-/g, '')}-${spec.num}`,
          order_id: orderId,
          amount: customerBill,
          method: spec.method,
          recipient: spec.recipient,
          received_at: `${today}T${10 + idx}:15:00Z`,
          created_by: 'usr-admin-01',
          notes: `Pembayaran customer ${spec.method.toUpperCase()} diterima ${spec.recipient}`,
          allocation: {
            shopping: totalShopping,
            delivery: pricing.delivery_fee,
            extra: pricing.extra_fees_total,
            change: 0,
            deposit: 0,
          },
        });

        if (spec.recipient === 'driver') {
          // Driver directly collected cash from customer, covering their entitlement
          driverReceivedFromCust = Math.min(customerBill, driverEntitlement);

          // 1. Modal Admin obligation if shopping was funded by Admin
          if (spec.shoppingAdmin > 0) {
            obligations.push({
              id: `ob-modal-${orderId}`,
              driver_id: spec.drv.id,
              driver_name: spec.drv.name,
              category: 'modal_admin',
              amount: spec.shoppingAdmin,
              settled_amount: 0,
              remaining_amount: spec.shoppingAdmin,
              order_id: orderId,
              order_number: `BNT-${today.replace(/-/g, '')}-${spec.num}`,
              notes: 'Pengembalian Modal Belanja Admin dari cash customer',
              created_at: `${today}T${10 + idx}:15:00Z`,
              status: 'active',
            });
          }

          // 2. Banter 10% cut held by driver
          if (pricing.banter_share > 0) {
            obligations.push({
              id: `ob-banter-${orderId}`,
              driver_id: spec.drv.id,
              driver_name: spec.drv.name,
              category: 'banter_share',
              amount: pricing.banter_share,
              settled_amount: 0,
              remaining_amount: pricing.banter_share,
              order_id: orderId,
              order_number: `BNT-${today.replace(/-/g, '')}-${spec.num}`,
              notes: 'Setoran bagian BANTER 10% dari ongkir cash customer',
              created_at: `${today}T${10 + idx}:15:00Z`,
              status: 'active',
            });
          }

          // 3. Admin share held by driver (if distance > 2km)
          if (pricing.admin_share > 0) {
            obligations.push({
              id: `ob-admin-${orderId}`,
              driver_id: spec.drv.id,
              driver_name: spec.drv.name,
              category: 'admin_share',
              amount: pricing.admin_share,
              settled_amount: 0,
              remaining_amount: pricing.admin_share,
              order_id: orderId,
              order_number: `BNT-${today.replace(/-/g, '')}-${spec.num}`,
              notes: 'Setoran bagian Admin dari ongkir cash customer',
              created_at: `${today}T${10 + idx}:15:00Z`,
              status: 'active',
            });
          }
        } else {
          // Paid to admin via QRIS / Transfer. Admin transfers to driver later or in settlement
          driverTransferredByAdmin = idx % 2 === 0 ? driverEntitlement : 0;
        }
      }

      const totalDriverRec = driverReceivedFromCust + driverTransferredByAdmin;
      const remaining = driverEntitlement - totalDriverRec;
      const driverPayoutStatus = remaining === 0 ? 'paid' : totalDriverRec > 0 ? 'partial' : 'unpaid';

      initialOrders.push({
        id: orderId,
        order_number: `BNT-${today.replace(/-/g, '')}-${spec.num}`,
        created_at: `${today}T${10 + idx}:00:00Z`,
        updated_at: `${today}T${10 + idx}:30:00Z`,
        customer_name: spec.cust,
        customer_phone: `081${Math.floor(10000000 + Math.random() * 90000000)}`,
        driver_id: spec.drv.id,
        driver_name: spec.drv.name,
        pickup_address: 'Titik A (Resto/Mitra)',
        delivery_address: 'Titik B (Rumah Customer)',
        notes: spec.rain ? 'Kondisi hujan deras' : spec.night ? 'Order larut malam' : 'Antar tepat waktu',
        distance_raw_km: spec.km,
        distance_rounded_km: pricing.distance_rounded_km,
        is_rain: spec.rain,
        is_night: spec.night,
        extra_stops_count: spec.stops,
        delivery_fee: pricing.delivery_fee,
        admin_share: pricing.admin_share,
        banter_share: pricing.banter_share,
        driver_delivery_share: pricing.driver_delivery_share,
        extra_fees_total: pricing.extra_fees_total,
        driver_total_delivery_entitlement: pricing.driver_total_delivery_entitlement,
        total_shopping_cost: totalShopping,
        driver_shopping_modal: spec.shoppingDriver,
        admin_shopping_modal: spec.shoppingAdmin,
        customer_total_bill: customerBill,
        driver_total_entitlement: driverEntitlement,
        customer_payment_status: custPaymentStatus,
        customer_paid_amount: spec.custPaid ? customerBill : 0,
        customer_balance_remaining: spec.custPaid ? 0 : customerBill,
        shopping_price_status: 'confirmed',
        driver_payout_status: driverPayoutStatus,
        driver_received_from_customer: driverReceivedFromCust,
        driver_transferred_by_admin: driverTransferredByAdmin,
        driver_total_received: totalDriverRec,
        driver_balance_remaining: remaining,
        status: 'completed',
        pricing_snapshot: createPricingSnapshot(),
        created_by: 'usr-admin-01',
        created_by_name: 'Admin BANTER',
      });
    });

    // Seed an operational driver loan for testing
    obligations.push({
      id: `ob-loan-seed-01`,
      driver_id: INITIAL_DRIVERS[1].id,
      driver_name: INITIAL_DRIVERS[1].name,
      category: 'driver_loan',
      amount: 50000,
      settled_amount: 0,
      remaining_amount: 50000,
      notes: 'Pinjaman modal operasional kas awal shift pagi',
      created_at: `${today}T08:00:00Z`,
      status: 'active',
    });

    this.setItem(STORAGE_KEYS.ORDERS, initialOrders);
    this.setItem(STORAGE_KEYS.EXPENSES, expenses);
    this.setItem(STORAGE_KEYS.RECEIPTS, receipts);
    this.setItem(STORAGE_KEYS.PAYMENTS, []);
    this.setItem(STORAGE_KEYS.DRIVER_OBLIGATIONS, obligations);
    this.setItem(STORAGE_KEYS.DRIVER_DEPOSITS, deposits);
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // --- Auth & Profile ---
  public getCurrentUser(): UserProfile {
    return this.getItem<UserProfile>(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[1]);
  }

  public setCurrentUser(user: UserProfile): void {
    this.setItem(STORAGE_KEYS.CURRENT_USER, user);
  }

  public getUsers(): UserProfile[] {
    return this.getItem<UserProfile[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  }

  public addUser(user: Omit<UserProfile, 'id' | 'created_at'>): UserProfile {
    const users = this.getUsers();
    const newUser: UserProfile = {
      ...user,
      id: `usr-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    users.push(newUser);
    this.setItem(STORAGE_KEYS.USERS, users);
    this.logAudit({
      entity_type: 'user',
      entity_id: newUser.id,
      action: 'create',
      new_state: newUser as unknown as Record<string, unknown>,
      reason: `Menambahkan pengguna baru: ${newUser.full_name} (${newUser.role})`,
    });
    return newUser;
  }

  public updateUserRole(userId: string, role: UserRole, isActive: boolean): void {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      const prev = { ...users[idx] };
      users[idx].role = role;
      users[idx].is_active = isActive;
      this.setItem(STORAGE_KEYS.USERS, users);
      this.logAudit({
        entity_type: 'user',
        entity_id: userId,
        action: 'update',
        previous_state: prev as unknown as Record<string, unknown>,
        new_state: users[idx] as unknown as Record<string, unknown>,
        reason: `Memperbarui role/status pengguna ${users[idx].full_name}`,
      });
    }
  }

  // --- Drivers ---
  public getDrivers(): Driver[] {
    return this.getItem<Driver[]>(STORAGE_KEYS.DRIVERS, INITIAL_DRIVERS);
  }

  public addDriver(driver: Omit<Driver, 'id' | 'joined_at'>): Driver {
    const drivers = this.getDrivers();
    const newDriver: Driver = {
      ...driver,
      id: `drv-${Date.now()}`,
      joined_at: new Date().toISOString(),
    };
    drivers.push(newDriver);
    this.setItem(STORAGE_KEYS.DRIVERS, drivers);
    this.logAudit({
      entity_type: 'driver',
      entity_id: newDriver.id,
      action: 'create',
      new_state: newDriver as unknown as Record<string, unknown>,
      reason: `Mendaftarkan driver baru: ${newDriver.name} (${newDriver.code})`,
    });
    return newDriver;
  }

  public updateDriver(driver: Driver): void {
    const drivers = this.getDrivers();
    const idx = drivers.findIndex((d) => d.id === driver.id);
    if (idx !== -1) {
      const prev = drivers[idx];
      drivers[idx] = driver;
      this.setItem(STORAGE_KEYS.DRIVERS, drivers);
      this.logAudit({
        entity_type: 'driver',
        entity_id: driver.id,
        action: 'update',
        previous_state: prev as unknown as Record<string, unknown>,
        new_state: driver as unknown as Record<string, unknown>,
        reason: `Update informasi driver: ${driver.name}`,
      });
    }
  }

  // --- Tariff Config ---
  public getTariffConfig(): TariffConfig {
    return this.getItem<TariffConfig>(STORAGE_KEYS.TARIFF_CONFIG, DEFAULT_TARIFF_CONFIG);
  }

  public updateTariffConfig(newConfig: TariffConfig, reason: string): void {
    const prev = this.getTariffConfig();
    this.setItem(STORAGE_KEYS.TARIFF_CONFIG, newConfig);
    this.logAudit({
      entity_type: 'tariff',
      entity_id: newConfig.id,
      action: 'update',
      previous_state: prev as unknown as Record<string, unknown>,
      new_state: newConfig as unknown as Record<string, unknown>,
      reason: reason || 'Pembaruan aturan tarif BANTER',
    });
  }

  // --- Orders ---
  public getOrders(): Order[] {
    return this.getItem<Order[]>(STORAGE_KEYS.ORDERS, []);
  }

  public getOrderById(id: string): Order | undefined {
    return this.getOrders().find((o) => o.id === id);
  }

  public createOrder(data: {
    customer_name: string;
    customer_phone?: string;
    driver_id: string;
    pickup_address: string;
    delivery_address: string;
    purchase_location?: string;
    notes?: string;
    distance_km: number;
    is_rain?: boolean;
    is_night?: boolean;
    extra_stops_count?: number;
    items?: {
      name: string;
      qty: number;
      unit_price?: number;
      is_price_known?: boolean;
      funding_source?: 'driver' | 'admin';
      notes?: string;
    }[];
    expenses?: { item_name: string; amount: number; funding_source: 'driver' | 'admin'; notes?: string }[];
  }): Order {
    const orders = this.getOrders();
    const drivers = this.getDrivers();
    const driver = drivers.find((d) => d.id === data.driver_id) || drivers[0];
    const currentUser = this.getCurrentUser();
    const config = this.getTariffConfig();

    const pricing = calculatePricing({
      distance_km: data.distance_km,
      is_rain: data.is_rain,
      is_night: data.is_night,
      extra_stops_count: data.extra_stops_count,
      config,
    });

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const seq = String(orders.length + 1).padStart(3, '0');
    const orderNumber = `BNT-${dateStr}-${seq}`;
    const orderId = `ord-${Date.now()}`;

    // Process items or expenses
    const orderItems: OrderItem[] = [];
    const orderExpenses: ExpenseItem[] = [];
    let driverModal = 0;
    let adminModal = 0;
    let hasUnconfirmedPrice = false;

    if (data.items && data.items.length > 0) {
      data.items.forEach((it, idx) => {
        const isKnown = it.is_price_known !== false && it.unit_price !== undefined && it.unit_price !== null && !isNaN(it.unit_price);
        if (!isKnown) {
          hasUnconfirmedPrice = true;
        }
        const unitPrice = isKnown ? Math.max(0, it.unit_price || 0) : 0;
        const qty = Math.max(1, it.qty || 1);
        const totalPrice = isKnown ? qty * unitPrice : 0;
        const funding = it.funding_source || 'driver';

        const itemObj: OrderItem = {
          id: `item-${orderId}-${idx + 1}`,
          name: it.name,
          qty,
          unit_price: unitPrice,
          total_price: totalPrice,
          is_price_known: isKnown,
          funding_source: funding,
          notes: it.notes,
        };
        orderItems.push(itemObj);

        if (isKnown && totalPrice > 0) {
          if (funding === 'driver') driverModal += totalPrice;
          else adminModal += totalPrice;

          orderExpenses.push({
            id: `exp-${orderId}-${idx + 1}`,
            order_id: orderId,
            item_name: it.name,
            amount: totalPrice,
            funding_source: funding,
            notes: it.notes,
            created_at: now.toISOString(),
            created_by: currentUser.id,
          });
        }
      });
    } else if (data.expenses && data.expenses.length > 0) {
      data.expenses.forEach((item, idx) => {
        const expId = `exp-${orderId}-${idx + 1}`;
        if (item.funding_source === 'driver') {
          driverModal += item.amount;
        } else {
          adminModal += item.amount;
        }
        orderExpenses.push({
          id: expId,
          order_id: orderId,
          item_name: item.item_name,
          amount: item.amount,
          funding_source: item.funding_source,
          notes: item.notes,
          created_at: now.toISOString(),
          created_by: currentUser.id,
        });

        orderItems.push({
          id: `item-${orderId}-${idx + 1}`,
          name: item.item_name,
          qty: 1,
          unit_price: item.amount,
          total_price: item.amount,
          is_price_known: true,
          funding_source: item.funding_source,
          notes: item.notes,
        });
      });
    }

    const totalShopping = driverModal + adminModal;
    // Section 3 rule: "Jangan menambahkan nilai belanja yang belum diketahui ke tagihan final Customer."
    const customerTotalBill = pricing.delivery_fee + pricing.extra_fees_total + totalShopping;
    const driverTotalEntitlement = driverModal + pricing.driver_total_delivery_entitlement;

    const newOrder: Order = {
      id: orderId,
      order_number: orderNumber,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      driver_id: driver.id,
      driver_name: driver.name,
      pickup_address: data.pickup_address,
      delivery_address: data.delivery_address,
      purchase_location: data.purchase_location,
      notes: data.notes,

      items: orderItems,
      shopping_price_status: hasUnconfirmedPrice ? 'pending_driver' : (orderItems.length > 0 || totalShopping > 0 ? 'confirmed' : 'confirmed'),

      distance_raw_km: pricing.distance_raw_km,
      distance_rounded_km: pricing.distance_rounded_km,
      is_rain: !!data.is_rain,
      is_night: !!data.is_night,
      extra_stops_count: data.extra_stops_count || 0,

      delivery_fee: pricing.delivery_fee,
      admin_share: pricing.admin_share,
      banter_share: pricing.banter_share,
      driver_delivery_share: pricing.driver_delivery_share,
      extra_fees_total: pricing.extra_fees_total,
      driver_total_delivery_entitlement: pricing.driver_total_delivery_entitlement,

      total_shopping_cost: totalShopping,
      driver_shopping_modal: driverModal,
      admin_shopping_modal: adminModal,

      customer_total_bill: customerTotalBill,
      driver_total_entitlement: driverTotalEntitlement,

      customer_payment_status: 'unpaid',
      customer_paid_amount: 0,
      customer_balance_remaining: customerTotalBill,

      driver_payout_status: 'unpaid',
      driver_received_from_customer: 0,
      driver_transferred_by_admin: 0,
      driver_total_received: 0,
      driver_balance_remaining: driverTotalEntitlement,

      status: 'pending',
      pricing_snapshot: createPricingSnapshot(config),
      created_by: currentUser.id,
      created_by_name: currentUser.full_name,
    };

    orders.unshift(newOrder);
    this.setItem(STORAGE_KEYS.ORDERS, orders);

    if (orderExpenses.length > 0) {
      const allExpenses = this.getExpenses();
      this.setItem(STORAGE_KEYS.EXPENSES, [...allExpenses, ...orderExpenses]);
    }

    this.logAudit({
      entity_type: 'order',
      entity_id: newOrder.id,
      action: 'create',
      new_state: newOrder as unknown as Record<string, unknown>,
      reason: `Pesanan dibuat: ${newOrder.order_number} (${newOrder.customer_name} via ${newOrder.driver_name})`,
    });

    return newOrder;
  }

  // --- Edit Pesanan Setelah Disimpan (Section 2) ---
  public updateOrder(
    orderId: string,
    data: {
      customer_name?: string;
      customer_phone?: string;
      pickup_address?: string;
      delivery_address?: string;
      purchase_location?: string;
      notes?: string;
      driver_id?: string;
      distance_km?: number;
      is_rain?: boolean;
      is_night?: boolean;
      extra_stops_count?: number;
      receipt_photo_url?: string;
      items?: {
        id?: string;
        name: string;
        qty: number;
        unit_price?: number;
        is_price_known?: boolean;
        funding_source?: 'driver' | 'admin';
        item_status?: ItemPurchaseStatus;
        notes?: string;
        receipt_photo_url?: string;
      }[];
    },
    reason?: string
  ): Order {
    const orders = this.getOrders();
    const ordIdx = orders.findIndex((o) => o.id === orderId);
    if (ordIdx === -1) throw new Error('Pesanan tidak ditemukan');

    const order = orders[ordIdx];
    const prevOrder = JSON.parse(JSON.stringify(order));
    const currentUser = this.getCurrentUser();
    const drivers = this.getDrivers();

    if (data.customer_name !== undefined) order.customer_name = data.customer_name.trim();
    if (data.customer_phone !== undefined) order.customer_phone = data.customer_phone?.trim() || undefined;
    if (data.pickup_address !== undefined) order.pickup_address = data.pickup_address.trim();
    if (data.delivery_address !== undefined) order.delivery_address = data.delivery_address.trim();
    if (data.purchase_location !== undefined) order.purchase_location = data.purchase_location?.trim() || undefined;
    if (data.notes !== undefined) order.notes = data.notes?.trim() || undefined;
    if (data.receipt_photo_url !== undefined) order.receipt_photo_url = data.receipt_photo_url?.trim() || undefined;

    if (data.driver_id && data.driver_id !== order.driver_id) {
      const newDriver = drivers.find((d) => d.id === data.driver_id);
      if (newDriver) {
        order.driver_id = newDriver.id;
        order.driver_name = newDriver.name;
      }
    }

    // Check if distance or surcharge parameters changed
    let paramsChanged = false;
    let distKm = order.distance_raw_km;
    let isRain = order.is_rain;
    let isNight = order.is_night;
    let extraStops = order.extra_stops_count;

    if (data.distance_km !== undefined && data.distance_km !== order.distance_raw_km) {
      distKm = data.distance_km;
      paramsChanged = true;
    }
    if (data.is_rain !== undefined && data.is_rain !== order.is_rain) {
      isRain = data.is_rain;
      paramsChanged = true;
    }
    if (data.is_night !== undefined && data.is_night !== order.is_night) {
      isNight = data.is_night;
      paramsChanged = true;
    }
    if (data.extra_stops_count !== undefined && data.extra_stops_count !== order.extra_stops_count) {
      extraStops = data.extra_stops_count;
      paramsChanged = true;
    }

    if (paramsChanged) {
      const config = this.getTariffConfig();
      const pricing = calculatePricing({
        distance_km: distKm,
        is_rain: isRain,
        is_night: isNight,
        extra_stops_count: extraStops,
        config,
      });

      order.distance_raw_km = pricing.distance_raw_km;
      order.distance_rounded_km = pricing.distance_rounded_km;
      order.is_rain = isRain;
      order.is_night = isNight;
      order.extra_stops_count = extraStops;

      order.delivery_fee = pricing.delivery_fee;
      order.admin_share = pricing.admin_share;
      order.banter_share = pricing.banter_share;
      order.driver_delivery_share = pricing.driver_delivery_share;
      order.extra_fees_total = pricing.extra_fees_total;
      order.driver_total_delivery_entitlement = pricing.driver_total_delivery_entitlement;
    }

    // Process updated items if provided
    if (data.items !== undefined) {
      const orderItems: OrderItem[] = [];
      let driverModal = 0;
      let adminModal = 0;
      let hasUnconfirmedPrice = false;

      data.items.forEach((it, idx) => {
        const isKnown = it.is_price_known !== false && it.unit_price !== undefined && it.unit_price !== null && !isNaN(it.unit_price);
        if (!isKnown) {
          hasUnconfirmedPrice = true;
        }
        const unitPrice = isKnown ? Math.max(0, it.unit_price || 0) : 0;
        const qty = Math.max(1, it.qty || 1);
        const totalPrice = isKnown ? qty * unitPrice : 0;
        const funding = it.funding_source || 'driver';

        const itemObj: OrderItem = {
          id: it.id || `item-${order.id}-${Date.now()}-${idx + 1}`,
          name: it.name.trim(),
          qty,
          unit_price: unitPrice,
          total_price: totalPrice,
          is_price_known: isKnown,
          funding_source: funding,
          item_status: it.item_status || 'bought',
          notes: it.notes,
          receipt_photo_url: it.receipt_photo_url,
        };
        orderItems.push(itemObj);

        if (isKnown && totalPrice > 0) {
          if (funding === 'driver') driverModal += totalPrice;
          else adminModal += totalPrice;
        }
      });

      order.items = orderItems;
      order.shopping_price_status = hasUnconfirmedPrice ? 'pending_driver' : 'confirmed';
      order.total_shopping_cost = driverModal + adminModal;
      order.driver_shopping_modal = driverModal;
      order.admin_shopping_modal = adminModal;

      // Sync expenses
      const allExpenses = this.getExpenses().filter((e) => e.order_id !== order.id);
      const newExpenses: ExpenseItem[] = orderItems
        .filter((it) => it.is_price_known && it.total_price > 0)
        .map((it, idx) => ({
          id: `exp-${order.id}-${idx + 1}`,
          order_id: order.id,
          item_name: it.name,
          amount: it.total_price,
          funding_source: it.funding_source,
          notes: it.notes,
          created_at: new Date().toISOString(),
          created_by: currentUser.id,
        }));
      this.setItem(STORAGE_KEYS.EXPENSES, [...allExpenses, ...newExpenses]);
    }

    // Recalculate totals
    order.customer_total_bill = order.delivery_fee + order.extra_fees_total + order.total_shopping_cost;
    order.driver_total_entitlement = order.driver_shopping_modal + order.driver_total_delivery_entitlement;
    order.customer_balance_remaining = Math.max(0, order.customer_total_bill - order.customer_paid_amount);

    if (order.customer_paid_amount >= order.customer_total_bill && order.customer_total_bill > 0) {
      order.customer_payment_status = 'paid';
    } else if (order.customer_paid_amount > 0) {
      order.customer_payment_status = 'partial';
    } else {
      order.customer_payment_status = 'unpaid';
    }

    order.driver_balance_remaining = order.driver_total_entitlement - order.driver_total_received;
    if (order.driver_balance_remaining === 0) {
      order.driver_payout_status = 'paid';
    } else if (order.driver_balance_remaining < 0) {
      order.driver_payout_status = 'overpaid';
    } else if (order.driver_total_received > 0) {
      order.driver_payout_status = 'partial';
    } else {
      order.driver_payout_status = 'unpaid';
    }

    order.updated_at = new Date().toISOString();
    orders[ordIdx] = order;
    this.setItem(STORAGE_KEYS.ORDERS, orders);

    this.logAudit({
      entity_type: 'order',
      entity_id: order.id,
      action: 'update',
      previous_state: prevOrder,
      new_state: order as unknown as Record<string, unknown>,
      reason: reason || `Admin ${currentUser.full_name} memperbarui pesanan ${order.order_number}`,
    });

    return order;
  }

  // --- Realisasi Belanja Driver (Section 4 & Section 7) ---
  public saveShoppingRealization(
    orderId: string,
    items: {
      id?: string;
      name: string;
      qty: number;
      unit_price: number;
      funding_source?: 'driver' | 'admin';
      item_status?: ItemPurchaseStatus;
      notes?: string;
      receipt_photo_url?: string;
    }[],
    reason?: string,
    receiptPhotoUrl?: string
  ): Order {
    const orders = this.getOrders();
    const ordIdx = orders.findIndex((o) => o.id === orderId);
    if (ordIdx === -1) throw new Error('Pesanan tidak ditemukan');

    const order = orders[ordIdx];
    const prevOrder = JSON.parse(JSON.stringify(order));
    const currentUser = this.getCurrentUser();

    if (receiptPhotoUrl !== undefined) {
      order.receipt_photo_url = receiptPhotoUrl.trim() || undefined;
    }

    let driverModal = 0;
    let adminModal = 0;

    const parsedItems: OrderItem[] = items.map((it, idx) => {
      const qty = Math.max(1, it.qty || 1);
      const unitPrice = Math.max(0, it.unit_price || 0);
      const totalPrice = qty * unitPrice;
      const funding = it.funding_source || 'driver';

      if (funding === 'driver') driverModal += totalPrice;
      else adminModal += totalPrice;

      return {
        id: it.id || `item-${order.id}-${idx + 1}`,
        name: it.name.trim(),
        qty,
        unit_price: unitPrice,
        total_price: totalPrice,
        is_price_known: true, // Marked as confirmed actual price
        funding_source: funding,
        item_status: it.item_status || 'bought',
        notes: it.notes,
        receipt_photo_url: it.receipt_photo_url,
      };
    });

    const totalShopping = driverModal + adminModal;

    order.items = parsedItems;
    order.shopping_price_status = 'confirmed';
    order.total_shopping_cost = totalShopping;
    order.driver_shopping_modal = driverModal;
    order.admin_shopping_modal = adminModal;

    // Recalculate customer bill: Ongkir + Extra + Total Belanja Aktual
    order.customer_total_bill = order.delivery_fee + order.extra_fees_total + totalShopping;
    order.driver_total_entitlement = driverModal + order.driver_total_delivery_entitlement;

    // Sisa Tagihan Customer = Total Tagihan Customer - Total Pembayaran Customer yang sudah dialokasikan
    order.customer_balance_remaining = Math.max(0, order.customer_total_bill - order.customer_paid_amount);

    // Update customer payment status automatically based on whether remaining bill exists
    if (order.customer_paid_amount >= order.customer_total_bill && order.customer_total_bill > 0) {
      order.customer_payment_status = 'paid';
    } else if (order.customer_paid_amount > 0) {
      order.customer_payment_status = 'partial';
    } else {
      order.customer_payment_status = 'unpaid';
    }

    // Recalculate driver payout status
    order.driver_balance_remaining = order.driver_total_entitlement - order.driver_total_received;
    if (order.driver_balance_remaining === 0) {
      order.driver_payout_status = 'paid';
    } else if (order.driver_balance_remaining < 0) {
      order.driver_payout_status = 'overpaid';
    } else if (order.driver_total_received > 0) {
      order.driver_payout_status = 'partial';
    } else {
      order.driver_payout_status = 'unpaid';
    }

    order.updated_at = new Date().toISOString();
    orders[ordIdx] = order;
    this.setItem(STORAGE_KEYS.ORDERS, orders);

    // Sync Expenses items
    const allExpenses = this.getExpenses().filter((e) => e.order_id !== order.id);
    const newExpenses: ExpenseItem[] = parsedItems
      .filter((it) => it.total_price > 0)
      .map((it, idx) => ({
        id: `exp-${order.id}-${idx + 1}`,
        order_id: order.id,
        item_name: it.name,
        amount: it.total_price,
        funding_source: it.funding_source,
        notes: it.notes,
        created_at: new Date().toISOString(),
        created_by: currentUser.id,
      }));
    this.setItem(STORAGE_KEYS.EXPENSES, [...allExpenses, ...newExpenses]);

    // Audit log (Section 9)
    this.logAudit({
      entity_type: 'order',
      entity_id: order.id,
      action: 'correct',
      previous_state: prevOrder,
      new_state: order as unknown as Record<string, unknown>,
      reason: reason || `Realisasi Belanja Driver disimpan: total belanja aktual ${formatRupiah(totalShopping)} oleh ${currentUser.full_name}`,
    });

    return order;
  }

  // --- Expenses & Shopping Modal ---
  public getExpenses(): ExpenseItem[] {
    return this.getItem<ExpenseItem[]>(STORAGE_KEYS.EXPENSES, []);
  }

  public getExpensesByOrderId(orderId: string): ExpenseItem[] {
    return this.getExpenses().filter((e) => e.order_id === orderId);
  }

  public addExpenseItem(orderId: string, item: {
    item_name: string;
    amount: number;
    funding_source: 'driver' | 'admin';
    notes?: string;
    receipt_photo_url?: string;
  }): void {
    const order = this.getOrderById(orderId);
    if (!order) return;

    const currentUser = this.getCurrentUser();
    const newExpense: ExpenseItem = {
      id: `exp-${Date.now()}`,
      order_id: orderId,
      item_name: item.item_name,
      amount: item.amount,
      funding_source: item.funding_source,
      notes: item.notes,
      receipt_photo_url: item.receipt_photo_url,
      created_at: new Date().toISOString(),
      created_by: currentUser.id,
    };

    const expenses = this.getExpenses();
    expenses.push(newExpense);
    this.setItem(STORAGE_KEYS.EXPENSES, expenses);

    // Recalculate order totals
    this.recalculateOrderFinancials(orderId, `Tambah pengeluaran belanja: ${item.item_name} (${formatRupiah(item.amount)})`);
  }

  // --- Customer Receipts ---
  public getReceipts(): CustomerReceipt[] {
    return this.getItem<CustomerReceipt[]>(STORAGE_KEYS.RECEIPTS, []);
  }

  public recordCustomerReceipt(data: {
    order_id: string;
    amount: number;
    method: 'cash' | 'qris' | 'transfer';
    recipient: 'admin' | 'driver';
    reference_number?: string;
    proof_url?: string;
    notes?: string;
    allocation: {
      shopping: number;
      delivery: number;
      extra: number;
      change: number;
      deposit: number;
    };
  }): CustomerReceipt {
    const order = this.getOrderById(data.order_id);
    if (!order) throw new Error('Order not found');

    const currentUser = this.getCurrentUser();
    const receipts = this.getReceipts();
    const receiptSeq = String(receipts.length + 1).padStart(3, '0');
    const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');

    const newReceipt: CustomerReceipt = {
      id: `rcpt-${Date.now()}`,
      receipt_number: `RCP-${todayStr}-${receiptSeq}`,
      order_id: data.order_id,
      amount: data.amount,
      method: data.method,
      recipient: data.recipient,
      received_at: new Date().toISOString(),
      reference_number: data.reference_number,
      proof_url: data.proof_url,
      notes: data.notes,
      created_by: currentUser.id,
      allocation: data.allocation,
    };

    receipts.push(newReceipt);
    this.setItem(STORAGE_KEYS.RECEIPTS, receipts);

    // If customer paid Cash directly to Driver, Driver holds money that may belong to Admin & BANTER
    if (data.recipient === 'driver') {
      const orderObs = this.getDriverObligations();
      const shoppingAlloc = data.allocation.shopping || 0;
      const deliveryAlloc = data.allocation.delivery || 0;

      // 1. Pengembalian Modal Admin (Belanja Customer didanai kas Admin, tetapi Cash diterima Driver)
      if (order.admin_shopping_modal > 0 && shoppingAlloc > 0) {
        const modalAdminAmt = Math.min(order.admin_shopping_modal, shoppingAlloc);
        orderObs.push({
          id: `ob-modal-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          driver_id: order.driver_id,
          driver_name: order.driver_name,
          category: 'modal_admin',
          amount: modalAdminAmt,
          settled_amount: 0,
          remaining_amount: modalAdminAmt,
          order_id: order.id,
          order_number: order.order_number,
          receipt_id: newReceipt.id,
          notes: `Pengembalian Modal Belanja Admin dari transaksi Cash customer ${order.order_number}`,
          created_at: new Date().toISOString(),
          status: 'active',
        });
      }

      // 2. Setoran Bagian BANTER 10% dari ongkir Cash yang dipegang Driver
      if (order.banter_share > 0 && deliveryAlloc > 0) {
        orderObs.push({
          id: `ob-banter-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          driver_id: order.driver_id,
          driver_name: order.driver_name,
          category: 'banter_share',
          amount: order.banter_share,
          settled_amount: 0,
          remaining_amount: order.banter_share,
          order_id: order.id,
          order_number: order.order_number,
          receipt_id: newReceipt.id,
          notes: `Setoran bagian BANTER 10% dari ongkir Cash customer ${order.order_number}`,
          created_at: new Date().toISOString(),
          status: 'active',
        });
      }

      // 3. Setoran Bagian Admin dari ongkir Cash yang dipegang Driver (jika ada potongan km)
      if (order.admin_share > 0 && deliveryAlloc > 0) {
        orderObs.push({
          id: `ob-admin-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          driver_id: order.driver_id,
          driver_name: order.driver_name,
          category: 'admin_share',
          amount: order.admin_share,
          settled_amount: 0,
          remaining_amount: order.admin_share,
          order_id: order.id,
          order_number: order.order_number,
          receipt_id: newReceipt.id,
          notes: `Setoran bagian Admin dari ongkir Cash customer ${order.order_number}`,
          created_at: new Date().toISOString(),
          status: 'active',
        });
      }

      this.setItem(STORAGE_KEYS.DRIVER_OBLIGATIONS, orderObs);
    }

    // Update order receipt tracking
    this.recalculateOrderFinancials(data.order_id, `Penerimaan customer ${formatRupiah(data.amount)} (${data.method.toUpperCase()} ke ${data.recipient})`);

    this.logAudit({
      entity_type: 'customer_receipt',
      entity_id: newReceipt.id,
      action: 'create',
      new_state: newReceipt as unknown as Record<string, unknown>,
      reason: `Catat pembayaran customer: ${formatRupiah(data.amount)} via ${data.method.toUpperCase()} diterima ${data.recipient}`,
    });

    return newReceipt;
  }

  // --- Driver Obligations & Reconciliation ---
  public getDriverObligations(): DriverObligation[] {
    return this.getItem<DriverObligation[]>(STORAGE_KEYS.DRIVER_OBLIGATIONS, []);
  }

  public getDriverObligationsByDriverId(driverId: string): DriverObligation[] {
    return this.getDriverObligations().filter((o) => o.driver_id === driverId);
  }

  public addDriverObligation(data: Omit<DriverObligation, 'id' | 'created_at' | 'settled_amount' | 'remaining_amount' | 'status'> & { id?: string; settled_amount?: number }): DriverObligation {
    const obligations = this.getDriverObligations();
    const settled = data.settled_amount || 0;
    const remaining = Math.max(0, data.amount - settled);
    const newOb: DriverObligation = {
      id: data.id || `ob-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      driver_id: data.driver_id,
      driver_name: data.driver_name,
      category: data.category,
      amount: data.amount,
      settled_amount: settled,
      remaining_amount: remaining,
      order_id: data.order_id,
      order_number: data.order_number,
      receipt_id: data.receipt_id,
      notes: data.notes,
      created_at: new Date().toISOString(),
      status: remaining === 0 ? 'settled' : settled > 0 ? 'partially_settled' : 'active',
    };
    obligations.push(newOb);
    this.setItem(STORAGE_KEYS.DRIVER_OBLIGATIONS, obligations);

    this.logAudit({
      entity_type: 'driver_obligation',
      entity_id: newOb.id,
      action: 'create',
      new_state: newOb as unknown as Record<string, unknown>,
      reason: `Pencatatan kewajiban driver ${newOb.driver_name}: ${newOb.category} sebesar ${formatRupiah(newOb.amount)}`,
    });

    return newOb;
  }

  public addDriverLoan(driverId: string, amount: number, notes?: string): DriverObligation {
    const drivers = this.getDrivers();
    const driver = drivers.find((d) => d.id === driverId);
    if (!driver) throw new Error('Driver tidak ditemukan');

    return this.addDriverObligation({
      driver_id: driver.id,
      driver_name: driver.name,
      category: 'driver_loan',
      amount,
      notes: notes || 'Pinjaman modal operasional kas driver',
    });
  }

  public getDriverDeposits(): DriverManualDeposit[] {
    return this.getItem<DriverManualDeposit[]>(STORAGE_KEYS.DRIVER_DEPOSITS, []);
  }

  public recordDriverManualDeposit(data: {
    driver_id: string;
    amount: number;
    method: 'cash' | 'transfer' | 'qris';
    reference_number?: string;
    notes?: string;
    allocations?: { obligation_id?: string; category: ObligationCategory; amount: number; order_number?: string }[];
  }): DriverManualDeposit {
    const drivers = this.getDrivers();
    const driver = drivers.find((d) => d.id === data.driver_id);
    if (!driver) throw new Error('Driver tidak ditemukan');

    const currentUser = this.getCurrentUser();
    const deposits = this.getDriverDeposits();
    const depSeq = String(deposits.length + 1).padStart(3, '0');
    const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');

    const allObs = this.getDriverObligations();
    let remainingToSettle = data.amount;
    const finalAllocations: { obligation_id?: string; category: ObligationCategory; amount: number; order_number?: string }[] = [];

    if (data.allocations && data.allocations.length > 0) {
      for (const alloc of data.allocations) {
        if (alloc.obligation_id) {
          const obIdx = allObs.findIndex((o) => o.id === alloc.obligation_id);
          if (obIdx !== -1) {
            allObs[obIdx].settled_amount += alloc.amount;
            allObs[obIdx].remaining_amount = Math.max(0, allObs[obIdx].remaining_amount - alloc.amount);
            allObs[obIdx].status = allObs[obIdx].remaining_amount === 0 ? 'settled' : 'partially_settled';
            finalAllocations.push(alloc);
          }
        }
      }
    } else {
      // Auto-settle driver's active obligations sequentially (priority: modal_admin, banter_share, admin_share, driver_loan)
      const priorityOrder: Record<ObligationCategory, number> = {
        modal_admin: 1,
        banter_share: 2,
        admin_share: 3,
        driver_loan: 4,
      };
      const driverPendingObs = allObs
        .filter((o) => o.driver_id === data.driver_id && o.status !== 'cancelled' && o.remaining_amount > 0)
        .sort((a, b) => (priorityOrder[a.category] ?? 99) - (priorityOrder[b.category] ?? 99));

      for (const ob of driverPendingObs) {
        if (remainingToSettle <= 0) break;
        const settleAmt = Math.min(ob.remaining_amount, remainingToSettle);
        ob.settled_amount += settleAmt;
        ob.remaining_amount -= settleAmt;
        ob.status = ob.remaining_amount === 0 ? 'settled' : 'partially_settled';
        remainingToSettle -= settleAmt;
        finalAllocations.push({
          obligation_id: ob.id,
          category: ob.category,
          amount: settleAmt,
          order_number: ob.order_number,
        });
      }
    }

    this.setItem(STORAGE_KEYS.DRIVER_OBLIGATIONS, allObs);

    const newDeposit: DriverManualDeposit = {
      id: `dep-${Date.now()}`,
      deposit_number: `DEP-${todayStr}-${depSeq}`,
      driver_id: driver.id,
      driver_name: driver.name,
      amount: data.amount,
      method: data.method,
      deposit_date: new Date().toISOString(),
      reference_number: data.reference_number,
      notes: data.notes,
      created_by: currentUser.id,
      allocations: finalAllocations,
    };

    deposits.push(newDeposit);
    this.setItem(STORAGE_KEYS.DRIVER_DEPOSITS, deposits);

    this.logAudit({
      entity_type: 'driver_deposit',
      entity_id: newDeposit.id,
      action: 'create',
      new_state: newDeposit as unknown as Record<string, unknown>,
      reason: `Setoran manual dari driver ${driver.name} sebesar ${formatRupiah(data.amount)} (${data.method.toUpperCase()})`,
    });

    return newDeposit;
  }

  // --- Driver Payments (Admin to Driver) ---
  public getPayments(): DriverPayment[] {
    return this.getItem<DriverPayment[]>(STORAGE_KEYS.PAYMENTS, []);
  }

  public recordDriverPayment(data: {
    driver_id: string;
    amount: number;
    method: 'cash' | 'transfer' | 'qris';
    reference_number?: string;
    proof_url?: string;
    notes?: string;
    gross_amount?: number;
    compensation_amount?: number;
    compensation_allocations?: CompensationItem[];
    allocations: { order_id: string; order_number: string; allocated_amount: number }[];
  }): DriverPayment {
    const drivers = this.getDrivers();
    const driver = drivers.find((d) => d.id === data.driver_id);
    if (!driver) throw new Error('Driver not found');

    const currentUser = this.getCurrentUser();
    const payments = this.getPayments();
    const paySeq = String(payments.length + 1).padStart(3, '0');
    const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');

    // Settle obligations if compensation was applied
    if (data.compensation_allocations && data.compensation_allocations.length > 0) {
      const allObs = this.getDriverObligations();
      for (const comp of data.compensation_allocations) {
        if (comp.obligation_id) {
          const obIdx = allObs.findIndex((o) => o.id === comp.obligation_id);
          if (obIdx !== -1) {
            allObs[obIdx].settled_amount += comp.amount;
            allObs[obIdx].remaining_amount = Math.max(0, allObs[obIdx].remaining_amount - comp.amount);
            allObs[obIdx].status = allObs[obIdx].remaining_amount === 0 ? 'settled' : 'partially_settled';
          }
        }
      }
      this.setItem(STORAGE_KEYS.DRIVER_OBLIGATIONS, allObs);

      this.logAudit({
        entity_type: 'driver_obligation',
        entity_id: `pay-${todayStr}-${paySeq}`,
        action: 'correct',
        reason: `Kompensasi kewajiban driver ${driver.name} sebesar ${formatRupiah(data.compensation_amount || 0)} dipotong saat pembayaran`,
      });
    }

    const newPayment: DriverPayment = {
      id: `pay-${Date.now()}`,
      payment_number: `PAY-${todayStr}-${paySeq}`,
      driver_id: driver.id,
      driver_name: driver.name,
      amount: data.amount,
      gross_amount: data.gross_amount ?? (data.amount + (data.compensation_amount || 0)),
      compensation_amount: data.compensation_amount || 0,
      compensation_allocations: data.compensation_allocations || [],
      method: data.method,
      payment_date: new Date().toISOString(),
      reference_number: data.reference_number,
      proof_url: data.proof_url,
      notes: data.notes,
      created_by: currentUser.id,
      allocations: data.allocations,
    };

    payments.push(newPayment);
    this.setItem(STORAGE_KEYS.PAYMENTS, payments);

    // Update affected orders
    const orders = this.getOrders();
    for (const alloc of data.allocations) {
      const ordIdx = orders.findIndex((o) => o.id === alloc.order_id);
      if (ordIdx !== -1) {
        orders[ordIdx].driver_transferred_by_admin += alloc.allocated_amount;
        orders[ordIdx].driver_total_received = orders[ordIdx].driver_received_from_customer + orders[ordIdx].driver_transferred_by_admin;
        orders[ordIdx].driver_balance_remaining = orders[ordIdx].driver_total_entitlement - orders[ordIdx].driver_total_received;
        
        if (orders[ordIdx].driver_balance_remaining === 0) {
          orders[ordIdx].driver_payout_status = 'paid';
        } else if (orders[ordIdx].driver_balance_remaining < 0) {
          orders[ordIdx].driver_payout_status = 'overpaid';
        } else if (orders[ordIdx].driver_total_received > 0) {
          orders[ordIdx].driver_payout_status = 'partial';
        } else {
          orders[ordIdx].driver_payout_status = 'unpaid';
        }
      }
    }
    this.setItem(STORAGE_KEYS.ORDERS, orders);

    this.logAudit({
      entity_type: 'driver_payment',
      entity_id: newPayment.id,
      action: 'create',
      new_state: newPayment as unknown as Record<string, unknown>,
      reason: `Transfer pembayaran ke ${driver.name} sebesar ${formatRupiah(data.amount)} (Gross ${formatRupiah(newPayment.gross_amount || data.amount)}, Kompensasi ${formatRupiah(newPayment.compensation_amount || 0)}) via ${data.method.toUpperCase()}`,
    });

    return newPayment;
  }

  // --- Recalculate Order Financials atomically ---
  public recalculateOrderFinancials(orderId: string, reason: string): void {
    const orders = this.getOrders();
    const ordIdx = orders.findIndex((o) => o.id === orderId);
    if (ordIdx === -1) return;

    const order = orders[ordIdx];
    const prevOrder = { ...order };

    const expenses = this.getExpensesByOrderId(orderId);
    let driverShopping = 0;
    let adminShopping = 0;
    expenses.forEach((e) => {
      if (e.funding_source === 'driver') driverShopping += e.amount;
      else adminShopping += e.amount;
    });

    const confirmedShopping = order.shopping_price_status === 'pending_driver' ? 0 : (driverShopping + adminShopping);
    order.total_shopping_cost = confirmedShopping;
    order.driver_shopping_modal = order.shopping_price_status === 'pending_driver' ? 0 : driverShopping;
    order.admin_shopping_modal = order.shopping_price_status === 'pending_driver' ? 0 : adminShopping;

    order.customer_total_bill = order.delivery_fee + order.extra_fees_total + confirmedShopping;
    order.driver_total_entitlement = order.driver_shopping_modal + order.driver_total_delivery_entitlement;

    const receipts = this.getReceipts().filter((r) => r.order_id === orderId);
    let totalCustomerPaid = 0;
    let driverDirectlyReceived = 0;

    receipts.forEach((r) => {
      totalCustomerPaid += r.amount;
      if (r.recipient === 'driver') {
        // Driver collected cash from customer:
        // Cash covering driver's personal shopping modal + net delivery share + extra fees
        const driverShoppingPart = Math.min(order.driver_shopping_modal, r.allocation?.shopping || 0);
        const deliveryExtra = (r.allocation?.delivery || 0) + (r.allocation?.extra || 0);
        const driverDeliveryPart = Math.max(0, deliveryExtra - (order.banter_share + order.admin_share));
        const netDriverPart = driverShoppingPart + Math.min(order.driver_total_delivery_entitlement, driverDeliveryPart);
        driverDirectlyReceived += Math.min(order.driver_total_entitlement, netDriverPart > 0 ? netDriverPart : Math.min(r.amount, order.driver_total_entitlement));
      }
    });

    order.customer_paid_amount = totalCustomerPaid;
    order.customer_balance_remaining = Math.max(0, order.customer_total_bill - totalCustomerPaid);

    if (totalCustomerPaid >= order.customer_total_bill && order.customer_total_bill > 0) {
      order.customer_payment_status = 'paid';
    } else if (totalCustomerPaid > 0) {
      order.customer_payment_status = 'partial';
    } else {
      order.customer_payment_status = 'unpaid';
    }

    order.driver_received_from_customer = driverDirectlyReceived;
    order.driver_total_received = order.driver_received_from_customer + order.driver_transferred_by_admin;
    order.driver_balance_remaining = order.driver_total_entitlement - order.driver_total_received;

    if (order.driver_balance_remaining === 0) {
      order.driver_payout_status = 'paid';
    } else if (order.driver_balance_remaining < 0) {
      order.driver_payout_status = 'overpaid';
    } else if (order.driver_total_received > 0) {
      order.driver_payout_status = 'partial';
    } else {
      order.driver_payout_status = 'unpaid';
    }

    order.updated_at = new Date().toISOString();
    orders[ordIdx] = order;
    this.setItem(STORAGE_KEYS.ORDERS, orders);

    this.logAudit({
      entity_type: 'order',
      entity_id: order.id,
      action: 'correct',
      previous_state: prevOrder as unknown as Record<string, unknown>,
      new_state: order as unknown as Record<string, unknown>,
      reason,
    });
  }

  // --- Order Cancellation with Reversal Audit ---
  public cancelOrder(orderId: string, reason: string): void {
    const orders = this.getOrders();
    const ordIdx = orders.findIndex((o) => o.id === orderId);
    if (ordIdx === -1) return;

    const prevOrder = { ...orders[ordIdx] };
    orders[ordIdx].status = 'cancelled';
    orders[ordIdx].cancellation_reason = reason;
    orders[ordIdx].updated_at = new Date().toISOString();
    this.setItem(STORAGE_KEYS.ORDERS, orders);

    // Cancel and reverse any active driver obligations linked to this order
    const allObs = this.getDriverObligations();
    let obsModified = false;
    allObs.forEach((o) => {
      if (o.order_id === orderId && o.status !== 'cancelled') {
        o.status = 'cancelled';
        o.remaining_amount = 0;
        obsModified = true;
      }
    });
    if (obsModified) {
      this.setItem(STORAGE_KEYS.DRIVER_OBLIGATIONS, allObs);
    }

    this.logAudit({
      entity_type: 'order',
      entity_id: orderId,
      action: 'cancel',
      previous_state: prevOrder as unknown as Record<string, unknown>,
      new_state: orders[ordIdx] as unknown as Record<string, unknown>,
      reason: `Pesanan dibatalkan: ${reason}`,
    });
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditLog[] {
    return this.getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  }

  public logAudit(entry: Omit<AuditLog, 'id' | 'timestamp' | 'user_id' | 'user_name' | 'user_role'> & { reason: string }): void {
    const currentUser = this.getCurrentUser();
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      user_id: currentUser.id,
      user_name: currentUser.full_name,
      user_role: currentUser.role,
      ...entry,
    };
    logs.unshift(newLog);
    // Keep max 500 audit entries
    if (logs.length > 500) logs.pop();
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // --- Supabase Config & Diagnostics ---
  public getSupabaseConfig(): { url: string; anonKey: string; isConnected: boolean } {
    return this.getItem(STORAGE_KEYS.SUPABASE_CONFIG, {
      url: (import.meta as any).env?.VITE_SUPABASE_URL || '',
      anonKey: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '',
      isConnected: false,
    });
  }

  public setSupabaseConfig(config: { url: string; anonKey: string; isConnected: boolean }): void {
    this.setItem(STORAGE_KEYS.SUPABASE_CONFIG, config);
    this.logAudit({
      entity_type: 'tariff',
      entity_id: 'supabase-settings',
      action: 'update',
      reason: 'Pembaruan konfigurasi koneksi Supabase PostgreSQL',
    });
  }

  // --- Order Gabungan (Combined Orders) ---
  public getCombinedOrders(): CombinedOrderGroup[] {
    return this.getItem<CombinedOrderGroup[]>(STORAGE_KEYS.COMBINED_ORDERS, []);
  }

  public seedInitialCombinedOrders(): void {
    const today = new Date().toISOString().split('T')[0];
    const drivers = this.getDrivers();
    const assignedDriver = drivers[0] || INITIAL_DRIVERS[0];

    const customer1: CombinedOrderCustomer = {
      id: `cust-gab-01`,
      customer_name: 'Ibu Siska',
      customer_phone: '0812-9988-7711',
      locations: [
        {
          id: `loc-01`,
          name: 'Toko Roti Prima',
          address: 'Jl. Kaliurang KM 5 No. 12',
          maps_url: 'https://maps.google.com/?q=Toko+Roti+Prima+Jogja',
          items: [
            {
              id: 'item-01',
              name: 'Roti Cokelat Spesial',
              qty: 2,
              unit_price: 12000,
              total_price: 24000,
            },
          ],
        },
      ],
      delivery_address: 'Pogung Dalangan No. 4, Sleman',
      delivery_maps_url: 'https://maps.google.com/?q=Pogung+Dalangan',
      distance_km: 3,
      delivery_fee: 10000,
      shopping_subtotal: 24000,
      customer_total_bill: 34000,
      payment_status: 'paid',
      paid_amount: 34000,
    };

    const customer2: CombinedOrderCustomer = {
      id: `cust-gab-02`,
      customer_name: 'Pak Rudi',
      customer_phone: '0856-4433-2211',
      locations: [
        {
          id: `loc-02`,
          name: 'Apotek Sehat 24',
          address: 'Jl. Kaliurang KM 4.5',
          maps_url: 'https://maps.google.com/?q=Apotek+Sehat+24',
          items: [
            {
              id: 'item-02',
              name: 'Minyak Kayu Putih 120ml',
              qty: 1,
              unit_price: 25000,
              total_price: 25000,
            },
          ],
        },
      ],
      delivery_address: 'Pogung Baru Blok C-2, Sleman',
      delivery_maps_url: 'https://maps.google.com/?q=Pogung+Baru',
      distance_km: 3,
      delivery_fee: 10000,
      shopping_subtotal: 25000,
      customer_total_bill: 35000,
      payment_status: 'unpaid',
      paid_amount: 0,
    };

    const pricing = calculateCombinedOrderPricing({
      customers: [
        {
          customer_name: customer1.customer_name,
          delivery_address: customer1.delivery_address,
          distance_km: customer1.distance_km,
          delivery_fee: customer1.delivery_fee,
          locations: customer1.locations,
        },
        {
          customer_name: customer2.customer_name,
          delivery_address: customer2.delivery_address,
          distance_km: customer2.distance_km,
          delivery_fee: customer2.delivery_fee,
          locations: customer2.locations,
        },
      ],
      driver_shopping_modal: 49000,
      admin_shopping_modal: 0,
    });

    const initialCombinedGroup: CombinedOrderGroup = {
      id: `gab-${today.replace(/-/g, '')}-001`,
      group_number: `GAB-${today.replace(/-/g, '')}-001`,
      service_type: 'order_gabungan',
      order_date: today,
      order_time: '11:15',
      customer_count: 2,
      status: 'in_progress',
      driver_id: assignedDriver.id,
      driver_name: assignedDriver.name,
      customers: [customer1, customer2],
      is_rain: false,
      is_night: false,
      extra_locations_count: pricing.extra_locations_count,
      extra_locations_fee: pricing.extra_locations_fee,
      rain_fee: pricing.rain_fee,
      night_fee: pricing.night_fee,
      extra_fees_total: pricing.extra_fees_total,
      total_distance_km: 6,
      has_unconfirmed_prices: false,
      admin_calculation_method: 'accumulative_per_customer',
      total_delivery_fee: pricing.total_delivery_fee,
      admin_share: pricing.admin_share,
      banter_share: pricing.banter_share,
      driver_delivery_share: pricing.driver_delivery_share,
      driver_total_delivery_entitlement: pricing.driver_total_delivery_entitlement,
      total_shopping_cost: pricing.total_shopping_cost,
      driver_shopping_modal: pricing.driver_shopping_modal,
      admin_shopping_modal: pricing.admin_shopping_modal,
      customer_total_bill: pricing.customer_total_bill,
      driver_total_entitlement: pricing.driver_total_entitlement,
      driver_payout_status: 'unpaid',
      driver_total_received: 0,
      driver_balance_remaining: pricing.driver_total_entitlement,
      status_history: [
        {
          id: `hist-${Date.now()}-1`,
          status: 'waiting_driver',
          timestamp: `${today}T11:00:00Z`,
          actor_id: 'usr-admin-01',
          actor_name: 'Admin BANTER',
          actor_role: 'admin',
          notes: 'Order Gabungan dibuat oleh Admin',
        },
        {
          id: `hist-${Date.now()}-2`,
          status: 'driver_assigned',
          timestamp: `${today}T11:10:00Z`,
          actor_id: 'usr-admin-01',
          actor_name: 'Admin BANTER',
          actor_role: 'admin',
          notes: `Driver ${assignedDriver.name} resmi ditugaskan`,
        },
        {
          id: `hist-${Date.now()}-3`,
          status: 'in_progress',
          timestamp: `${today}T11:15:00Z`,
          actor_id: assignedDriver.id,
          actor_name: assignedDriver.name,
          actor_role: 'driver',
          notes: 'Driver memulai proses belanja dan pengantaran',
        },
      ],
      created_at: `${today}T11:15:00Z`,
      updated_at: `${today}T11:15:00Z`,
      created_by: 'usr-admin-01',
      created_by_name: 'Admin BANTER',
      notes: 'Grup rute searah area Kaliurang & Pogung',
    };

    this.setItem(STORAGE_KEYS.COMBINED_ORDERS, [initialCombinedGroup]);
  }

  public createCombinedOrder(data: {
    driver_id: string;
    is_rain?: boolean;
    is_night?: boolean;
    driver_shopping_modal?: number;
    admin_shopping_modal?: number;
    admin_calculation_method?: CombinedAdminPricingMethod;
    admin_share_override?: number;
    notes?: string;
    customers: {
      customer_name: string;
      customer_phone?: string;
      delivery_address: string;
      delivery_maps_url?: string;
      distance_km: number;
      delivery_fee?: number;
      locations: {
        name: string;
        address: string;
        maps_url?: string;
        items: {
          name: string;
          qty: number;
          unit_price: number;
          notes?: string;
          is_price_unconfirmed?: boolean;
        }[];
      }[];
    }[];
  }): CombinedOrderGroup {
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toTimeString().slice(0, 5);
    const existingGroups = this.getCombinedOrders();
    const countToday = existingGroups.filter((g) => g.order_date === today).length + 1;
    const groupNum = `GAB-${today.replace(/-/g, '')}-${String(countToday).padStart(3, '0')}`;
    const groupId = `gab-${Date.now()}`;

    const drivers = this.getDrivers();
    const assignedDriver = drivers.find((d) => d.id === data.driver_id) || {
      id: data.driver_id || '',
      name: data.driver_id ? 'Driver' : 'Belum Ditugaskan',
    };

    // Calculate pricing with transparent method
    const pricing = calculateCombinedOrderPricing({
      customers: data.customers,
      is_rain: data.is_rain,
      is_night: data.is_night,
      driver_shopping_modal: data.driver_shopping_modal,
      admin_shopping_modal: data.admin_shopping_modal,
      admin_calculation_method: data.admin_calculation_method || 'accumulative_per_customer',
      admin_share_override: data.admin_share_override,
    });

    const parsedCustomers: CombinedOrderCustomer[] = data.customers.slice(0, 3).map((c, cIdx) => {
      const cRes = pricing.customer_results[cIdx];
      const parsedLocations: PurchaseLocation[] = (c.locations || []).map((l, lIdx) => ({
        id: `loc-${groupId}-${cIdx}-${lIdx}`,
        name: l.name,
        address: l.address,
        maps_url: l.maps_url,
        items: (l.items || []).map((it, itIdx) => ({
          id: `item-${groupId}-${cIdx}-${lIdx}-${itIdx}`,
          name: it.name,
          qty: Math.max(1, it.qty || 1),
          unit_price: Math.max(0, it.unit_price || 0),
          total_price: Math.max(1, it.qty || 1) * Math.max(0, it.unit_price || 0),
          notes: it.notes,
          is_price_unconfirmed: !!it.is_price_unconfirmed || it.unit_price === 0,
        })),
      }));

      const shoppingSubtotal = cRes ? cRes.shopping_subtotal : 0;
      const deliveryFee = cRes ? cRes.delivery_fee : 0;

      return {
        id: `cust-${groupId}-${cIdx}`,
        customer_name: c.customer_name,
        customer_phone: c.customer_phone,
        locations: parsedLocations,
        delivery_address: c.delivery_address,
        delivery_maps_url: c.delivery_maps_url,
        distance_km: c.distance_km,
        delivery_fee: deliveryFee,
        shopping_subtotal: shoppingSubtotal,
        customer_total_bill: deliveryFee + shoppingSubtotal,
        payment_status: 'unpaid',
        paid_amount: 0,
        has_unconfirmed_prices: cRes ? cRes.has_unconfirmed_prices : false,
      };
    });

    const currentUser = this.getCurrentUser();
    const newGroup: CombinedOrderGroup = {
      id: groupId,
      group_number: groupNum,
      service_type: 'order_gabungan',
      order_date: today,
      order_time: nowTime,
      customer_count: parsedCustomers.length,
      status: 'waiting_driver',
      driver_id: assignedDriver.id,
      driver_name: (assignedDriver as Driver).name || 'Belum Ditugaskan',
      customers: parsedCustomers,
      is_rain: !!data.is_rain,
      is_night: !!data.is_night,
      extra_locations_count: pricing.extra_locations_count,
      extra_locations_fee: pricing.extra_locations_fee,
      rain_fee: pricing.rain_fee,
      night_fee: pricing.night_fee,
      extra_fees_total: pricing.extra_fees_total,
      total_distance_km: pricing.total_distance_km,
      has_unconfirmed_prices: pricing.has_unconfirmed_prices,
      admin_calculation_method: pricing.admin_calculation_method,
      total_delivery_fee: pricing.total_delivery_fee,
      admin_share: pricing.admin_share,
      banter_share: pricing.banter_share,
      driver_delivery_share: pricing.driver_delivery_share,
      driver_total_delivery_entitlement: pricing.driver_total_delivery_entitlement,
      total_shopping_cost: pricing.total_shopping_cost,
      driver_shopping_modal: pricing.driver_shopping_modal,
      admin_shopping_modal: pricing.admin_shopping_modal,
      customer_total_bill: pricing.customer_total_bill,
      driver_total_entitlement: pricing.driver_total_entitlement,
      driver_payout_status: 'unpaid',
      driver_total_received: 0,
      driver_balance_remaining: pricing.driver_total_entitlement,
      status_history: [
        {
          id: `hist-${Date.now()}-1`,
          status: 'waiting_driver',
          timestamp: new Date().toISOString(),
          actor_id: currentUser.id,
          actor_name: currentUser.full_name,
          actor_role: currentUser.role,
          notes: `Order Gabungan ${groupNum} dibuat (${parsedCustomers.length} pelanggan)`,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: currentUser.id,
      created_by_name: currentUser.full_name,
      notes: data.notes,
    };

    existingGroups.unshift(newGroup);
    this.setItem(STORAGE_KEYS.COMBINED_ORDERS, existingGroups);

    this.logAudit({
      entity_type: 'order_group',
      entity_id: newGroup.id,
      action: 'create',
      new_state: newGroup as unknown as Record<string, unknown>,
      reason: `Pembuatan Order Gabungan ${newGroup.group_number} (${newGroup.customer_count} pelanggan)`,
    });

    this.notify();
    return newGroup;
  }

  public updateCombinedOrderStatus(
    groupId: string,
    status: CombinedOrderStatus,
    notes?: string
  ): void {
    const groups = this.getCombinedOrders();
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx === -1) return;

    const currentUser = this.getCurrentUser();
    const prev = { ...groups[idx] };
    groups[idx].status = status;
    groups[idx].updated_at = new Date().toISOString();

    const history = groups[idx].status_history || [];
    history.push({
      id: `hist-${Date.now()}-${history.length + 1}`,
      status,
      timestamp: new Date().toISOString(),
      actor_id: currentUser.id,
      actor_name: currentUser.full_name,
      actor_role: currentUser.role,
      notes: notes || `Status diubah ke ${status}`,
    });
    groups[idx].status_history = history;

    this.setItem(STORAGE_KEYS.COMBINED_ORDERS, groups);

    this.logAudit({
      entity_type: 'order_group',
      entity_id: groupId,
      action: 'update',
      previous_state: prev as unknown as Record<string, unknown>,
      new_state: groups[idx] as unknown as Record<string, unknown>,
      reason: `Status Order Gabungan ${groups[idx].group_number} diubah ke ${status}: ${notes || ''}`,
    });

    this.notify();
  }

  // Tahap 2: Driver menyatakan bersedia mengambil order
  public driverRequestCombinedOrder(
    groupId: string,
    driverId: string,
    driverName: string,
    notes?: string
  ): void {
    const groups = this.getCombinedOrders();
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx === -1) return;

    const currentUser = this.getCurrentUser();
    const prev = { ...groups[idx] };
    groups[idx].status = 'driver_requested';
    groups[idx].candidate_driver_id = driverId;
    groups[idx].candidate_driver_name = driverName;
    groups[idx].updated_at = new Date().toISOString();

    const history = groups[idx].status_history || [];
    history.push({
      id: `hist-${Date.now()}-${history.length + 1}`,
      status: 'driver_requested',
      timestamp: new Date().toISOString(),
      actor_id: currentUser.id,
      actor_name: currentUser.full_name,
      actor_role: currentUser.role,
      notes: notes || `Driver ${driverName} menyatakan bersedia mengambil pesanan (Menunggu persetujuan Admin)`,
    });
    groups[idx].status_history = history;

    this.setItem(STORAGE_KEYS.COMBINED_ORDERS, groups);

    this.logAudit({
      entity_type: 'order_group',
      entity_id: groupId,
      action: 'update',
      previous_state: prev as unknown as Record<string, unknown>,
      new_state: groups[idx] as unknown as Record<string, unknown>,
      reason: `Driver ${driverName} menyatakan bersedia mengambil Order Gabungan ${groups[idx].group_number}`,
    });

    this.notify();
  }

  // Tahap 3: Admin memproses pesanan
  public adminProcessCombinedOrder(groupId: string, notes?: string): void {
    const groups = this.getCombinedOrders();
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx === -1) return;

    const currentUser = this.getCurrentUser();
    const prev = { ...groups[idx] };
    groups[idx].status = 'admin_processing';
    groups[idx].updated_at = new Date().toISOString();

    const history = groups[idx].status_history || [];
    history.push({
      id: `hist-${Date.now()}-${history.length + 1}`,
      status: 'admin_processing',
      timestamp: new Date().toISOString(),
      actor_id: currentUser.id,
      actor_name: currentUser.full_name,
      actor_role: currentUser.role,
      notes: notes || 'Admin memverifikasi item belanja, lokasi, dan rute pesanan',
    });
    groups[idx].status_history = history;

    this.setItem(STORAGE_KEYS.COMBINED_ORDERS, groups);

    this.logAudit({
      entity_type: 'order_group',
      entity_id: groupId,
      action: 'update',
      previous_state: prev as unknown as Record<string, unknown>,
      new_state: groups[idx] as unknown as Record<string, unknown>,
      reason: `Admin memproses Order Gabungan ${groups[idx].group_number}`,
    });

    this.notify();
  }

  // Tahap 4: Admin menetapkan / mengganti driver resmi
  public assignDriverToCombinedOrder(
    groupId: string,
    driverId: string,
    driverName: string,
    notes?: string
  ): void {
    const groups = this.getCombinedOrders();
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx === -1) return;

    const currentUser = this.getCurrentUser();
    const prev = { ...groups[idx] };
    const oldDriver = groups[idx].driver_name;
    groups[idx].driver_id = driverId;
    groups[idx].driver_name = driverName;
    groups[idx].candidate_driver_id = undefined;
    groups[idx].candidate_driver_name = undefined;
    groups[idx].status = 'driver_assigned';
    groups[idx].updated_at = new Date().toISOString();

    const history = groups[idx].status_history || [];
    history.push({
      id: `hist-${Date.now()}-${history.length + 1}`,
      status: 'driver_assigned',
      timestamp: new Date().toISOString(),
      actor_id: currentUser.id,
      actor_name: currentUser.full_name,
      actor_role: currentUser.role,
      notes: notes || (oldDriver && oldDriver !== 'Belum Ditugaskan' ? `Admin mengganti driver dari ${oldDriver} ke ${driverName}` : `Admin resmi menugaskan ${driverName}`),
    });
    groups[idx].status_history = history;

    this.setItem(STORAGE_KEYS.COMBINED_ORDERS, groups);

    this.logAudit({
      entity_type: 'order_group',
      entity_id: groupId,
      action: 'update',
      previous_state: prev as unknown as Record<string, unknown>,
      new_state: groups[idx] as unknown as Record<string, unknown>,
      reason: `Penetapan Driver ${driverName} untuk Order Gabungan ${groups[idx].group_number}`,
    });

    this.notify();
  }

  // Update Metode Perhitungan Bagian Admin
  public updateCombinedOrderPricingMethod(
    groupId: string,
    method: CombinedAdminPricingMethod,
    customAdminShare?: number
  ): void {
    const groups = this.getCombinedOrders();
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx === -1) return;

    const group = groups[idx];
    const prev = JSON.parse(JSON.stringify(group));

    const pricing = calculateCombinedOrderPricing({
      customers: group.customers.map((c) => ({
        customer_name: c.customer_name,
        delivery_address: c.delivery_address,
        distance_km: c.distance_km,
        delivery_fee: c.delivery_fee,
        locations: c.locations,
      })),
      is_rain: group.is_rain,
      is_night: group.is_night,
      driver_shopping_modal: group.driver_shopping_modal,
      admin_shopping_modal: group.admin_shopping_modal,
      admin_calculation_method: method,
      admin_share_override: customAdminShare,
    });

    group.admin_calculation_method = method;
    group.admin_share = pricing.admin_share;
    group.banter_share = pricing.banter_share;
    group.driver_delivery_share = pricing.driver_delivery_share;
    group.driver_total_delivery_entitlement = pricing.driver_total_delivery_entitlement;
    group.driver_total_entitlement = pricing.driver_total_entitlement;
    group.driver_balance_remaining = group.driver_total_entitlement - group.driver_total_received;
    group.updated_at = new Date().toISOString();

    groups[idx] = group;
    this.setItem(STORAGE_KEYS.COMBINED_ORDERS, groups);

    this.logAudit({
      entity_type: 'order_group',
      entity_id: groupId,
      action: 'correct',
      previous_state: prev,
      new_state: group as unknown as Record<string, unknown>,
      reason: `Metode tarif admin diubah ke ${method}: Bagian Admin = ${formatRupiah(pricing.admin_share)}, BANTER = ${formatRupiah(pricing.banter_share)}, Driver = ${formatRupiah(pricing.driver_delivery_share)}`,
    });

    this.notify();
  }

  // Update / koreksi item belanja (harga, nama, qty, status konfirmasi)
  public updateCombinedOrderItem(
    groupId: string,
    customerId: string,
    locationId: string,
    itemId: string,
    data: {
      name?: string;
      qty?: number;
      unit_price?: number;
      is_price_unconfirmed?: boolean;
      notes?: string;
    }
  ): void {
    const groups = this.getCombinedOrders();
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx === -1) return;

    const group = groups[idx];
    const prev = JSON.parse(JSON.stringify(group));

    const cust = group.customers.find((c) => c.id === customerId);
    if (!cust) return;
    const loc = cust.locations.find((l) => l.id === locationId);
    if (!loc) return;
    const item = loc.items.find((i) => i.id === itemId);
    if (!item) return;

    if (data.name !== undefined) item.name = data.name;
    if (data.qty !== undefined) item.qty = Math.max(1, data.qty);
    if (data.unit_price !== undefined) item.unit_price = Math.max(0, data.unit_price);
    if (data.is_price_unconfirmed !== undefined) item.is_price_unconfirmed = data.is_price_unconfirmed;
    if (data.notes !== undefined) item.notes = data.notes;

    item.total_price = item.qty * item.unit_price;

    // Recalculate customer shopping subtotal
    let custShopping = 0;
    let custHasUnconfirmed = false;
    cust.locations.forEach((l) => {
      l.items.forEach((it) => {
        if (it.is_price_unconfirmed || it.unit_price === 0) custHasUnconfirmed = true;
        custShopping += it.total_price;
      });
    });
    cust.shopping_subtotal = custShopping;
    cust.customer_total_bill = cust.delivery_fee + custShopping;
    cust.has_unconfirmed_prices = custHasUnconfirmed;

    // Recalculate group totals
    let totalShopping = 0;
    let groupHasPending = false;
    group.customers.forEach((c) => {
      totalShopping += c.shopping_subtotal;
      if (c.has_unconfirmed_prices) groupHasPending = true;
    });

    group.total_shopping_cost = totalShopping;
    group.has_unconfirmed_prices = groupHasPending;

    // Keep reimbursement consistent
    if (group.driver_shopping_modal > 0 || group.admin_shopping_modal === 0) {
      group.driver_shopping_modal = totalShopping;
    } else {
      group.admin_shopping_modal = totalShopping;
    }

    group.customer_total_bill = group.total_delivery_fee + group.extra_fees_total + totalShopping;
    group.driver_total_entitlement = group.driver_total_delivery_entitlement + group.driver_shopping_modal;
    group.driver_balance_remaining = group.driver_total_entitlement - group.driver_total_received;
    group.updated_at = new Date().toISOString();

    groups[idx] = group;
    this.setItem(STORAGE_KEYS.COMBINED_ORDERS, groups);

    this.logAudit({
      entity_type: 'order_group',
      entity_id: groupId,
      action: 'correct',
      previous_state: prev,
      new_state: group as unknown as Record<string, unknown>,
      reason: `Pembaruan item ${item.name}: Qty ${item.qty}, Harga ${formatRupiah(item.unit_price)} (${item.is_price_unconfirmed ? 'Menunggu konfirmasi' : 'Terkonfirmasi'})`,
    });

    this.notify();
  }

  public updateCombinedOrderActualPrice(
    groupId: string,
    customerId: string,
    locationId: string,
    itemId: string,
    actualPrice: number
  ): void {
    this.updateCombinedOrderItem(groupId, customerId, locationId, itemId, {
      unit_price: actualPrice,
      is_price_unconfirmed: false,
    });
  }

  public cancelCombinedOrder(groupId: string, reason: string): void {
    const groups = this.getCombinedOrders();
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx === -1) return;

    const currentUser = this.getCurrentUser();
    const prev = { ...groups[idx] };
    groups[idx].status = 'cancelled';
    groups[idx].cancellation_reason = reason;
    groups[idx].updated_at = new Date().toISOString();

    const history = groups[idx].status_history || [];
    history.push({
      id: `hist-${Date.now()}-${history.length + 1}`,
      status: 'cancelled',
      timestamp: new Date().toISOString(),
      actor_id: currentUser.id,
      actor_name: currentUser.full_name,
      actor_role: currentUser.role,
      notes: `Order Gabungan dibatalkan: ${reason}`,
    });
    groups[idx].status_history = history;

    this.setItem(STORAGE_KEYS.COMBINED_ORDERS, groups);

    this.logAudit({
      entity_type: 'order_group',
      entity_id: groupId,
      action: 'cancel',
      previous_state: prev as unknown as Record<string, unknown>,
      new_state: groups[idx] as unknown as Record<string, unknown>,
      reason: `Order Gabungan ${groups[idx].group_number} dibatalkan: ${reason}`,
    });

    this.notify();
  }

  // --- WhatsApp Text Generators for Combined Orders (5 Tahapan + Daftar Belanja) ---
  public generateDriverAnnouncement(group: CombinedOrderGroup): string {
    return generateTahap1DriverAnnouncement(group);
  }

  public generateTahap1DriverAnnouncement(group: CombinedOrderGroup): string {
    return generateTahap1DriverAnnouncement(group);
  }

  public generateTahap2DriverConfirmation(group: CombinedOrderGroup, candidateDriverName?: string): string {
    return generateTahap2DriverConfirmation(group, candidateDriverName);
  }

  public generateTahap3AdminProcessing(group: CombinedOrderGroup): string {
    return generateTahap3AdminProcessing(group);
  }

  public generateTahap4DriverAssignment(group: CombinedOrderGroup): string {
    return generateTahap4DriverAssignment(group);
  }

  public generateTahap5OrderCompleted(group: CombinedOrderGroup): string {
    return generateTahap5OrderCompleted(group);
  }

  public generateDriverShoppingList(group: CombinedOrderGroup): string {
    return generateCombinedOrderShoppingList(group);
  }

  // --- Reset to initial seed ---
  public resetToSeed(): void {
    localStorage.removeItem(STORAGE_KEYS.ORDERS);
    localStorage.removeItem(STORAGE_KEYS.COMBINED_ORDERS);
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
    localStorage.removeItem(STORAGE_KEYS.RECEIPTS);
    localStorage.removeItem(STORAGE_KEYS.PAYMENTS);
    localStorage.removeItem(STORAGE_KEYS.DRIVER_OBLIGATIONS);
    localStorage.removeItem(STORAGE_KEYS.DRIVER_DEPOSITS);
    localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
    this.seedInitialOrders();
    this.seedInitialCombinedOrders();
    this.notify();
  }
}

export const banterStore = new BanterStore();

