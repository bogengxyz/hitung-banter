export type UserRole = 'owner' | 'admin' | 'viewer';
export type ServiceType = 'ojek' | 'antar_barang' | 'order_gabungan';

export interface PurchaseItem {
  id: string;
  name: string;
  qty: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  is_price_unconfirmed?: boolean;
}

export interface PurchaseLocation {
  id: string;
  name: string;
  address: string;
  maps_url?: string;
  items: PurchaseItem[];
}

export interface CombinedOrderCustomer {
  id: string;
  customer_name: string;
  customer_phone?: string;
  locations: PurchaseLocation[];
  delivery_address: string;
  delivery_maps_url?: string;
  distance_km: number;
  delivery_fee: number;
  shopping_subtotal: number;
  customer_total_bill: number;
  payment_status: CustomerPaymentStatus;
  paid_amount: number;
  has_unconfirmed_prices?: boolean;
}

export type CombinedOrderStatus =
  | 'waiting_driver'
  | 'driver_requested'
  | 'waiting_approval'
  | 'admin_processing'
  | 'driver_assigned'
  | 'in_progress'
  | 'shopping'
  | 'delivering'
  | 'completed'
  | 'cancelled';

export interface CombinedOrderStatusHistoryEntry {
  id: string;
  status: CombinedOrderStatus;
  timestamp: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  notes?: string;
}

export type CombinedAdminPricingMethod =
  | 'accumulative_per_customer'
  | 'consolidated_route'
  | 'flat_count'
  | 'custom';

export interface CombinedOrderGroup {
  id: string;
  group_number: string; // e.g. GAB-20261109-001
  service_type: 'order_gabungan';
  order_date: string;
  order_time: string;
  customer_count: number;
  status: CombinedOrderStatus;
  driver_id: string;
  driver_name: string;
  candidate_driver_id?: string;
  candidate_driver_name?: string;
  customers: CombinedOrderCustomer[];

  // Biaya Tambahan 100% Hak Driver
  is_rain: boolean;
  is_night: boolean;
  extra_locations_count: number;
  extra_locations_fee: number;
  rain_fee: number;
  night_fee: number;
  extra_fees_total: number;

  // Total Jarak
  total_distance_km?: number;

  // Status Harga Belanja
  has_unconfirmed_prices?: boolean;

  // Pricing Engine splits & audit method
  admin_calculation_method?: CombinedAdminPricingMethod;
  total_delivery_fee: number;
  admin_share: number;
  banter_share: number;
  driver_delivery_share: number;
  driver_total_delivery_entitlement: number;

  // Shopping Modal
  total_shopping_cost: number;
  driver_shopping_modal: number;
  admin_shopping_modal: number;

  // Financial totals
  customer_total_bill: number;
  driver_total_entitlement: number;

  // Driver Payout
  driver_payout_status: DriverPayoutStatus;
  driver_total_received: number;
  driver_balance_remaining: number;

  // Riwayat Proses Order
  status_history?: CombinedOrderStatusHistoryEntry[];

  cancellation_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  created_by_name: string;
}

export interface UserProfile {
  id: string;
  username?: string;
  email: string;
  role: UserRole;
  full_name: string;
  is_active: boolean;
  avatar_url?: string;
  phone?: string;
  created_at: string;
}

export interface AuthSession {
  token: string;
  user: UserProfile & { username: string };
  expires_at: string;
}

export interface Driver {
  id: string;
  code: string; // e.g. DRV-01
  name: string;
  phone: string;
  status: 'active' | 'inactive';
  vehicle_plate?: string;
  joined_at: string;
  notes?: string;
}

export interface TariffConfig {
  id: string;
  version: string;
  name: string;
  base_distance_km: number; // 2 KM
  base_rate: number; // Rp8.000
  per_km_rate: number; // Rp2.500
  admin_cut_per_km: number; // Rp500
  max_admin_cut: number; // Rp2.000
  banter_percent: number; // 0.10 (10%)
  rain_fee: number; // Rp5.000
  night_fee: number; // Rp5.000
  extra_stop_rate: number; // Rp2.000
  effective_from: string;
  is_active: boolean;
}

export interface ExpenseItem {
  id: string;
  order_id: string;
  item_name: string;
  amount: number;
  funding_source: 'driver' | 'admin';
  receipt_photo_url?: string;
  notes?: string;
  created_at: string;
  created_by: string;
}

export type PaymentMethod = 'cash' | 'qris' | 'transfer';
export type PaymentRecipient = 'admin' | 'driver';

export interface CustomerReceipt {
  id: string;
  receipt_number: string;
  order_id: string;
  amount: number;
  method: PaymentMethod;
  recipient: PaymentRecipient;
  received_at: string;
  reference_number?: string;
  proof_url?: string;
  notes?: string;
  created_by: string;
  allocation: {
    shopping: number;
    delivery: number;
    extra: number;
    change: number;
    deposit: number;
  };
}

export type OrderStatus = 'draft' | 'pending' | 'completed' | 'cancelled';
export type CustomerPaymentStatus = 'unpaid' | 'partial' | 'paid';
export type DriverPayoutStatus = 'unpaid' | 'partial' | 'paid' | 'overpaid';

export interface OrderPricingSnapshot {
  version: string;
  base_distance_km: number;
  base_rate: number;
  per_km_rate: number;
  admin_cut_per_km: number;
  max_admin_cut: number;
  banter_percent: number;
  rain_fee: number;
  night_fee: number;
  extra_stop_rate: number;
}

export type ItemPurchaseStatus = 'pending' | 'bought' | 'unavailable' | 'substituted';

export interface OrderItem {
  id: string;
  name: string;
  qty: number;
  unit_price: number;
  total_price: number;
  is_price_known: boolean; // false when waiting for driver confirmation
  funding_source: 'driver' | 'admin';
  item_status?: ItemPurchaseStatus; // Belum Dibeli | Sudah Dibeli | Tidak Tersedia | Diganti
  notes?: string;
  receipt_photo_url?: string;
}

export interface Order {
  id: string;
  order_number: string; // e.g. BNT-20261109-001
  service_type?: ServiceType;
  group_id?: string;
  created_at: string;
  updated_at: string;
  customer_name: string;
  customer_phone?: string;
  driver_id: string;
  driver_name: string;
  pickup_address: string;
  delivery_address: string;
  purchase_location?: string; // Toko / Tempat pembelian
  notes?: string;
  receipt_photo_url?: string; // Foto struk belanja dari Driver

  // Itemized shopping details
  items?: OrderItem[];
  shopping_price_status?: 'pending_driver' | 'confirmed'; // pending_driver when prices are not yet confirmed

  // Calculation parameters
  distance_raw_km: number;
  distance_rounded_km: number;
  is_rain: boolean;
  is_night: boolean;
  extra_stops_count: number;

  // Pricing calculations
  delivery_fee: number; // ongkir customer
  admin_share: number;
  banter_share: number;
  driver_delivery_share: number; // ongkir bersih driver
  extra_fees_total: number; // 100% hak driver
  driver_total_delivery_entitlement: number; // ongkir bersih + extra fees

  // Expenses & Modal
  total_shopping_cost: number;
  driver_shopping_modal: number; // Driver reimbursement
  admin_shopping_modal: number; // Admin money

  // Financial totals
  customer_total_bill: number; // delivery_fee + extra_fees_total + total_shopping_cost (only confirmed shopping included)
  driver_total_entitlement: number; // driver_shopping_modal + driver_total_delivery_entitlement

  // Payment Tracking
  customer_payment_status: CustomerPaymentStatus;
  customer_paid_amount: number;
  customer_balance_remaining: number; // customer_total_bill - customer_paid_amount

  driver_payout_status: DriverPayoutStatus;
  driver_received_from_customer: number; // allocated from customer cash/transfer received by driver
  driver_transferred_by_admin: number; // direct transfer from admin
  driver_total_received: number; // driver_received_from_customer + driver_transferred_by_admin
  driver_balance_remaining: number; // driver_total_entitlement - driver_total_received

  status: OrderStatus;
  cancellation_reason?: string;
  pricing_snapshot: OrderPricingSnapshot;
  created_by: string;
  created_by_name: string;
}

export interface DriverPaymentAllocation {
  order_id: string;
  order_number: string;
  allocated_amount: number;
}

export type ObligationCategory = 'modal_admin' | 'banter_share' | 'admin_share' | 'driver_loan';
export type ObligationStatus = 'active' | 'settled' | 'partially_settled' | 'cancelled';

export interface DriverObligation {
  id: string;
  driver_id: string;
  driver_name: string;
  category: ObligationCategory;
  amount: number;
  settled_amount: number;
  remaining_amount: number;
  order_id?: string;
  order_number?: string;
  receipt_id?: string;
  notes?: string;
  created_at: string;
  status: ObligationStatus;
}

export interface CompensationItem {
  obligation_id?: string;
  category: ObligationCategory;
  amount: number;
  order_number?: string;
  description: string;
}

export interface DriverManualDeposit {
  id: string;
  deposit_number: string; // e.g. DEP-20261109-001
  driver_id: string;
  driver_name: string;
  amount: number;
  method: PaymentMethod;
  deposit_date: string;
  reference_number?: string;
  notes?: string;
  created_by: string;
  allocations: {
    obligation_id?: string;
    category: ObligationCategory;
    amount: number;
    order_number?: string;
  }[];
}

export interface DriverPayment {
  id: string;
  payment_number: string; // e.g. PAY-20261109-001
  driver_id: string;
  driver_name: string;
  amount: number;
  gross_amount?: number;
  compensation_amount?: number;
  compensation_allocations?: CompensationItem[];
  method: PaymentMethod;
  payment_date: string;
  reference_number?: string;
  proof_url?: string;
  notes?: string;
  created_by: string;
  allocations: DriverPaymentAllocation[];
}

export interface AuditLog {
  id: string;
  entity_type: 'order' | 'order_group' | 'customer_receipt' | 'driver_payment' | 'expense' | 'driver' | 'tariff' | 'user' | 'driver_obligation' | 'driver_deposit';
  entity_id: string;
  action: 'create' | 'update' | 'cancel' | 'correct' | 'reverse';
  user_id: string;
  user_name: string;
  user_role: UserRole;
  previous_state?: Record<string, unknown> | null;
  new_state?: Record<string, unknown> | null;
  reason?: string;
  timestamp: string;
}

export interface CalculationResult {
  distance_raw_km: number;
  distance_rounded_km: number;
  delivery_fee: number;
  admin_share: number;
  banter_share: number;
  driver_delivery_share: number;
  extra_fees_total: number;
  driver_total_delivery_entitlement: number;
  customer_total_fee: number;
  breakdown: {
    base_fee: number;
    extra_km_fee: number;
    rain_fee: number;
    night_fee: number;
    stops_fee: number;
  };
}

// ---------------------------------------------------------------------------
// MONITORING DRIVER (LIVE TRACKING) TYPES
// ---------------------------------------------------------------------------

export type DriverDutyStatus = 'on_duty' | 'off_duty';
export type DriverWorkStatus = 'available' | 'delivering';
export type DriverConnectionStatus = 'online' | 'disconnected' | 'expired';

export interface DriverLocation {
  driver_id: string;
  driver_name: string;
  driver_code: string;
  phone: string;
  avatar_url?: string;
  vehicle_plate?: string;
  latitude: number;
  longitude: number;
  accuracy?: number; // GPS accuracy in meters
  heading?: number; // Orientation in degrees (0-360)
  speed_kmh?: number; // Speed if moving

  // Statuses
  duty_status: DriverDutyStatus; // 'on_duty' (Bertugas) | 'off_duty' (Tidak Bertugas)
  work_status: DriverWorkStatus; // 'available' (Tersedia) | 'delivering' (Sedang Mengerjakan Order)
  connection_status: DriverConnectionStatus; // 'online' | 'disconnected' | 'expired'

  // Active Order info (if work_status === 'delivering')
  active_order_id?: string;
  active_order_number?: string;
  service_type?: ServiceType;
  customer_name?: string;
  delivery_address?: string;

  // Timestamps (ISO string)
  device_timestamp: string;
  server_timestamp: string;
  duty_started_at?: string;
  duty_ended_at?: string;
  last_updated_at: string;
}

export type TrackingConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';

