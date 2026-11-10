/**
 * BANTER Driver Tracking Store & Realtime Socket.IO Client Bridge
 * 
 * Rules:
 * 1. Admin website strictly NEVER calls navigator.geolocation (no admin GPS).
 * 2. Driver locations received via Socket.IO / Supabase Realtime or initial state.
 * 3. Supports connection states: 'connected' | 'connecting' | 'disconnected' | 'error'.
 * 4. Tracks driver duty status ('on_duty' | 'off_duty'), work status ('available' | 'delivering'),
 *    and connection status ('online' | 'disconnected' | 'expired').
 * 5. Single latest record per driver (no crumb/trail retention).
 */

import { DriverLocation, TrackingConnectionState } from '../../types';

// Default initial driver locations in Yogyakarta operational zone
export const INITIAL_DRIVER_LOCATIONS: DriverLocation[] = [
  {
    driver_id: 'drv-01',
    driver_code: 'DRV-01',
    driver_name: 'Budi Santoso',
    phone: '0812-3456-7890',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=face',
    vehicle_plate: 'AB 1234 XY',
    latitude: -7.7652,
    longitude: 110.3781,
    accuracy: 8,
    heading: 90,
    speed_kmh: 24,
    duty_status: 'on_duty',
    work_status: 'delivering',
    connection_status: 'online',
    active_order_id: 'ord-001',
    active_order_number: 'BNT-20261109-001',
    service_type: 'ojek',
    customer_name: 'Siti Rahmawati',
    delivery_address: 'Jl. Kaliurang KM 5.2, Pogung Kidul',
    device_timestamp: new Date().toISOString(),
    server_timestamp: new Date().toISOString(),
    duty_started_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    last_updated_at: new Date(Date.now() - 15 * 1000).toISOString(), // 15s ago
  },
  {
    driver_id: 'drv-02',
    driver_code: 'DRV-02',
    driver_name: 'Agus Prasetyo',
    phone: '0813-9876-5432',
    avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&h=120&fit=crop&crop=face',
    vehicle_plate: 'AB 5678 CD',
    latitude: -7.7825,
    longitude: 110.3664,
    accuracy: 12,
    heading: 180,
    speed_kmh: 0,
    duty_status: 'on_duty',
    work_status: 'available',
    connection_status: 'online',
    device_timestamp: new Date().toISOString(),
    server_timestamp: new Date().toISOString(),
    duty_started_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    last_updated_at: new Date(Date.now() - 45 * 1000).toISOString(), // 45s ago
  },
  {
    driver_id: 'drv-03',
    driver_code: 'DRV-03',
    driver_name: 'Rian Hidayat',
    phone: '0857-1122-3344',
    avatar_url: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=120&h=120&fit=crop&crop=face',
    vehicle_plate: 'AB 9012 EF',
    latitude: -7.7554,
    longitude: 110.3852,
    accuracy: 15,
    heading: 45,
    speed_kmh: 18,
    duty_status: 'on_duty',
    work_status: 'delivering',
    connection_status: 'online',
    active_order_id: 'ord-003',
    active_order_number: 'BNT-20261109-003',
    service_type: 'antar_barang',
    customer_name: 'Dewi Anggraini',
    delivery_address: 'Jl. Gejayan No. 45, Caturtunggal',
    device_timestamp: new Date().toISOString(),
    server_timestamp: new Date().toISOString(),
    duty_started_at: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
    last_updated_at: new Date(Date.now() - 120 * 1000).toISOString(), // 2 mins ago
  },
  {
    driver_id: 'drv-04',
    driver_code: 'DRV-04',
    driver_name: 'Dedi Kurniawan',
    phone: '0878-5566-7788',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=face',
    vehicle_plate: 'AB 3456 GH',
    latitude: -7.7712,
    longitude: 110.3924,
    accuracy: 20,
    heading: 0,
    speed_kmh: 0,
    duty_status: 'off_duty',
    work_status: 'available',
    connection_status: 'disconnected',
    device_timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    server_timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    duty_ended_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    last_updated_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 mins ago
  },
];

type TrackingListener = (locations: DriverLocation[], connection: TrackingConnectionState) => void;

class DriverTrackingStore {
  private locations: DriverLocation[] = [];
  private connectionState: TrackingConnectionState = 'connected';
  private listeners: Set<TrackingListener> = new Set();
  private socket: any = null;
  private intervalId: any = null;

  constructor() {
    this.locations = [...INITIAL_DRIVER_LOCATIONS];
  }

  public subscribe(listener: TrackingListener): () => void {
    this.listeners.add(listener);
    // Emit initial state immediately
    listener(this.locations, this.connectionState);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.locations, this.connectionState));
  }

  public getLocations(): DriverLocation[] {
    return [...this.locations];
  }

  public getConnectionState(): TrackingConnectionState {
    return this.connectionState;
  }

  public setConnectionState(state: TrackingConnectionState) {
    this.connectionState = state;
    this.notify();
  }

  /**
   * Update location of a driver (from Socket.IO or Supabase Realtime)
   */
  public updateDriverLocation(payload: Partial<DriverLocation> & { driver_id: string }) {
    const index = this.locations.findIndex((l) => l.driver_id === payload.driver_id);
    const nowIso = new Date().toISOString();

    if (index >= 0) {
      this.locations[index] = {
        ...this.locations[index],
        ...payload,
        server_timestamp: nowIso,
        last_updated_at: payload.device_timestamp || nowIso,
      };
    } else {
      this.locations.push({
        driver_code: payload.driver_code || 'DRV',
        driver_name: payload.driver_name || 'Driver BANTER',
        phone: payload.phone || '-',
        latitude: payload.latitude || -7.77,
        longitude: payload.longitude || 110.38,
        duty_status: payload.duty_status || 'on_duty',
        work_status: payload.work_status || 'available',
        connection_status: payload.connection_status || 'online',
        device_timestamp: payload.device_timestamp || nowIso,
        server_timestamp: nowIso,
        last_updated_at: nowIso,
        ...payload,
        driver_id: payload.driver_id,
      });
    }

    this.notify();
  }

  /**
   * Update duty status from driver
   */
  public updateDutyStatus(driverId: string, dutyStatus: 'on_duty' | 'off_duty') {
    const index = this.locations.findIndex((l) => l.driver_id === driverId);
    if (index >= 0) {
      const nowIso = new Date().toISOString();
      this.locations[index] = {
        ...this.locations[index],
        duty_status: dutyStatus,
        duty_started_at: dutyStatus === 'on_duty' ? nowIso : this.locations[index].duty_started_at,
        duty_ended_at: dutyStatus === 'off_duty' ? nowIso : undefined,
        work_status: dutyStatus === 'off_duty' ? 'available' : this.locations[index].work_status,
        last_updated_at: nowIso,
      };
      this.notify();
    }
  }

  /**
   * Recheck expiration (if driver hasn't sent GPS in > 5 minutes, mark as 'expired')
   */
  public auditExpiration() {
    const now = Date.now();
    let hasChanged = false;

    this.locations = this.locations.map((loc) => {
      if (loc.duty_status === 'off_duty') {
        if (loc.connection_status !== 'disconnected') {
          hasChanged = true;
          return { ...loc, connection_status: 'disconnected' };
        }
        return loc;
      }

      const diffMs = now - new Date(loc.last_updated_at).getTime();
      // If no updates in > 5 mins (300,000ms)
      if (diffMs > 5 * 60 * 1000 && loc.connection_status === 'online') {
        hasChanged = true;
        return { ...loc, connection_status: 'expired' };
      }
      return loc;
    });

    if (hasChanged) {
      this.notify();
    }
  }

  /**
   * Simulate a realistic tiny vehicle movement for active on-duty drivers in Yogyakarta
   * to provide a responsive live visual experience for the admin.
   */
  public startSimulatedMovement() {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.locations = this.locations.map((loc) => {
        if (loc.duty_status === 'on_duty' && loc.work_status === 'delivering') {
          // Add micro jitter to simulate motorcycle moving along road
          const latDelta = (Math.random() - 0.48) * 0.0003;
          const lngDelta = (Math.random() - 0.48) * 0.0003;
          return {
            ...loc,
            latitude: Number((loc.latitude + latDelta).toFixed(6)),
            longitude: Number((loc.longitude + lngDelta).toFixed(6)),
            speed_kmh: Math.floor(20 + Math.random() * 15),
            last_updated_at: new Date().toISOString(),
            connection_status: 'online',
          };
        }
        return loc;
      });
      this.notify();
    }, 4000);
  }

  public stopSimulatedMovement() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Connect to real Oracle VPS Socket.IO server if configured
   */
  public async initSocket(url?: string) {
    if (!url) {
      // Standalone simulation mode
      this.connectionState = 'connected';
      this.startSimulatedMovement();
      this.notify();
      return;
    }

    try {
      this.connectionState = 'connecting';
      this.notify();

      const { io } = await import('socket.io-client');
      this.socket = io(url, {
        reconnectionAttempts: 5,
        timeout: 8000,
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        this.connectionState = 'connected';
        this.notify();
      });

      this.socket.on('disconnect', () => {
        this.connectionState = 'disconnected';
        this.notify();
      });

      this.socket.on('connect_error', () => {
        this.connectionState = 'error';
        this.notify();
      });

      // Events as per technical specifications:
      // admin:location:update
      this.socket.on('admin:location:update', (data: any) => {
        this.updateDriverLocation(data);
      });

      // driver:status:update
      this.socket.on('driver:status:update', (data: any) => {
        if (data.driver_id && data.duty_status) {
          this.updateDutyStatus(data.driver_id, data.duty_status);
        }
      });
    } catch {
      this.connectionState = 'error';
      this.notify();
    }
  }

  public disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.stopSimulatedMovement();
  }
}

export const driverTrackingStore = new DriverTrackingStore();
// Auto start simulation in browser environment so map exhibits live presence
if (typeof window !== 'undefined') {
  driverTrackingStore.startSimulatedMovement();
}

