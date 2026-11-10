/// <reference types="@types/google.maps" />
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  DriverLocation,
  DriverDutyStatus,
  DriverWorkStatus,
  DriverConnectionStatus,
  TrackingConnectionState,
} from '../../types';
import { driverTrackingStore } from '../../lib/tracking/trackingStore';
import {
  Navigation2,
  Radio,
  Wifi,
  WifiOff,
  Clock,
  Compass,
  Phone,
  Package,
  Bike,
  UserCheck,
  UserX,
  Maximize2,
  RefreshCw,
  Eye,
  AlertCircle,
  ExternalLink,
  MapPin,
  Sparkles,
} from 'lucide-react';

interface DriverTrackingPanelProps {
  onSelectDriverDetail?: (driverId: string) => void;
  onSelectOrder?: (orderId: string) => void;
}

type FilterTab = 'all' | 'on_duty' | 'available' | 'delivering' | 'off_duty';

// Helper component to pan and fit bounds smoothly
const MapController: React.FC<{
  targetLocation: { lat: number; lng: number } | null;
  fitAllTrigger: number;
  locations: DriverLocation[];
}> = ({ targetLocation, fitAllTrigger, locations }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (targetLocation) {
      map.panTo(targetLocation);
      map.setZoom(16);
    }
  }, [map, targetLocation]);

  useEffect(() => {
    if (!map || locations.length === 0) return;
    if (fitAllTrigger > 0) {
      const bounds = new google.maps.LatLngBounds();
      locations.forEach((loc) => {
        if (loc.latitude && loc.longitude) {
          bounds.extend({ lat: loc.latitude, lng: loc.longitude });
        }
      });
      map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    }
  }, [map, fitAllTrigger, locations]);

  return null;
};

export const DriverTrackingPanel: React.FC<DriverTrackingPanelProps> = ({
  onSelectDriverDetail,
  onSelectOrder,
}) => {
  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    (typeof process !== 'undefined' && process.env?.GOOGLE_MAPS_API_KEY) ||
    '';

  const [locations, setLocations] = useState<DriverLocation[]>(driverTrackingStore.getLocations());
  const [connectionState, setConnectionState] = useState<TrackingConnectionState>(
    driverTrackingStore.getConnectionState()
  );
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [panTarget, setPanTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [fitAllCounter, setFitAllCounter] = useState(0);

  // Subscribe to tracking store
  useEffect(() => {
    const unsubscribe = driverTrackingStore.subscribe((newLocs, newConn) => {
      setLocations([...newLocs]);
      setConnectionState(newConn);
    });

    const auditInterval = setInterval(() => {
      driverTrackingStore.auditExpiration();
    }, 15000);

    return () => {
      unsubscribe();
      clearInterval(auditInterval);
    };
  }, []);

  // Filtered locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      if (activeFilter === 'on_duty') return loc.duty_status === 'on_duty';
      if (activeFilter === 'available')
        return loc.duty_status === 'on_duty' && loc.work_status === 'available';
      if (activeFilter === 'delivering')
        return loc.duty_status === 'on_duty' && loc.work_status === 'delivering';
      if (activeFilter === 'off_duty') return loc.duty_status === 'off_duty';
      return true;
    });
  }, [locations, activeFilter]);

  // Selected driver object for InfoWindow
  const selectedDriver = useMemo(() => {
    return locations.find((l) => l.driver_id === selectedDriverId) || null;
  }, [locations, selectedDriverId]);

  // Statistics
  const onDutyCount = locations.filter((l) => l.duty_status === 'on_duty').length;
  const availableCount = locations.filter(
    (l) => l.duty_status === 'on_duty' && l.work_status === 'available'
  ).length;
  const deliveringCount = locations.filter(
    (l) => l.duty_status === 'on_duty' && l.work_status === 'delivering'
  ).length;
  const offDutyCount = locations.filter((l) => l.duty_status === 'off_duty').length;

  const handleCenterAll = useCallback(() => {
    setPanTarget(null);
    setFitAllCounter((c) => c + 1);
  }, []);

  const handleSelectAndCenterDriver = useCallback((driver: DriverLocation) => {
    setSelectedDriverId(driver.driver_id);
    setPanTarget({ lat: driver.latitude, lng: driver.longitude });
  }, []);

  const getTimeAgo = (dateStr: string) => {
    const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
    if (diffSeconds < 10) return 'Baru saja';
    if (diffSeconds < 60) return `${diffSeconds} dtk lalu`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes} mnt lalu`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours} jam lalu`;
  };

  return (
    <div className="bg-white rounded-[6px] p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-5">
      {/* 1. Sub-Header & Live Connection Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[6px] bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Navigation2 className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Peta Armada & Lokasi Realtime
              </h2>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                LIVE TRACKING
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Pantau armada secara interaktif dan cek penugasan order aktif driver.
            </p>
          </div>
        </div>

        {/* Connection status pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[6px] text-xs font-bold border transition-colors ${
              connectionState === 'connected'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : connectionState === 'connecting'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {connectionState === 'connected' ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>Socket.IO Live (VPS Oracle / Realtime)</span>
              </>
            ) : connectionState === 'connecting' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Menghubungkan ke Gateway...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Koneksi Tracking Terputus</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards (5 indicators required by spec) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Status Koneksi */}
        <div className="p-3.5 rounded-[6px] bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Status Gateway</div>
            <div className="text-xs font-black text-slate-800 capitalize mt-0.5 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionState === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              {connectionState === 'connected' ? 'Online' : 'Offline'}
            </div>
          </div>
          <Radio className="w-4 h-4 text-blue-600 stroke-[2.2]" />
        </div>

        {/* Driver Bertugas */}
        <div
          onClick={() => setActiveFilter('on_duty')}
          className={`p-3.5 rounded-[6px] border transition-all cursor-pointer flex items-center justify-between ${
            activeFilter === 'on_duty'
              ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20'
              : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/60'
          }`}
        >
          <div>
            <div className="text-[11px] font-medium text-slate-500">Bertugas</div>
            <div className="text-lg font-black text-blue-700 leading-none mt-1 tabular-nums">
              {onDutyCount}
              <span className="text-[10px] font-semibold text-slate-500 ml-1">Driver</span>
            </div>
          </div>
          <UserCheck className="w-4 h-4 text-blue-600 stroke-[2.2]" />
        </div>

        {/* Driver Tersedia */}
        <div
          onClick={() => setActiveFilter('available')}
          className={`p-3.5 rounded-[6px] border transition-all cursor-pointer flex items-center justify-between ${
            activeFilter === 'available'
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/60'
          }`}
        >
          <div>
            <div className="text-[11px] font-medium text-slate-500">Tersedia</div>
            <div className="text-lg font-black text-emerald-700 leading-none mt-1 tabular-nums">
              {availableCount}
              <span className="text-[10px] font-semibold text-slate-500 ml-1">Standby</span>
            </div>
          </div>
          <Bike className="w-4 h-4 text-emerald-600 stroke-[2.2]" />
        </div>

        {/* Sedang Order */}
        <div
          onClick={() => setActiveFilter('delivering')}
          className={`p-3.5 rounded-[6px] border transition-all cursor-pointer flex items-center justify-between ${
            activeFilter === 'delivering'
              ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20'
              : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/60'
          }`}
        >
          <div>
            <div className="text-[11px] font-medium text-slate-500">Mengerjakan Order</div>
            <div className="text-lg font-black text-indigo-700 leading-none mt-1 tabular-nums">
              {deliveringCount}
              <span className="text-[10px] font-semibold text-slate-500 ml-1">Jalan</span>
            </div>
          </div>
          <Package className="w-4 h-4 text-indigo-600 stroke-[2.2]" />
        </div>

        {/* Driver Offline */}
        <div
          onClick={() => setActiveFilter('off_duty')}
          className={`col-span-2 sm:col-span-1 p-3.5 rounded-[6px] border transition-all cursor-pointer flex items-center justify-between ${
            activeFilter === 'off_duty'
              ? 'bg-slate-200/80 border-slate-400 ring-2 ring-slate-400/20'
              : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/60'
          }`}
        >
          <div>
            <div className="text-[11px] font-medium text-slate-500">Tidak Bertugas</div>
            <div className="text-lg font-black text-slate-600 leading-none mt-1 tabular-nums">
              {offDutyCount}
              <span className="text-[10px] font-semibold text-slate-500 ml-1">Off</span>
            </div>
          </div>
          <UserX className="w-4 h-4 text-slate-500 stroke-[2.2]" />
        </div>
      </div>

      {/* 3. Main Interactive Map & Side Driver List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* MAP CONTAINER (8 Columns on desktop) */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          {/* Map Controls Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-700">Area Operasional:</span>
              <span className="px-2 py-0.5 rounded-[4px] bg-slate-100 text-slate-700 text-[11px] font-semibold">
                DI Yogyakarta & Sekitarnya
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCenterAll}
                className="px-3 py-1.5 rounded-[6px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Pusatkan tampilan peta ke semua driver"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Pusatkan Semua</span>
              </button>
              {selectedDriver && (
                <button
                  type="button"
                  onClick={() =>
                    setPanTarget({ lat: selectedDriver.latitude, lng: selectedDriver.longitude })
                  }
                  className="px-3 py-1.5 rounded-[6px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200"
                  title="Pusatkan ke driver yang dipilih"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Pusatkan ke {selectedDriver.driver_code}</span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive Google Map Container */}
          <div className="relative w-full h-[440px] sm:h-[480px] rounded-[6px] overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
            {apiKey ? (
              <APIProvider apiKey={apiKey}>
                <Map
                  mapId="DEMO_MAP_ID"
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  defaultCenter={{ lat: -7.77, lng: 110.38 }}
                  defaultZoom={13}
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  fullscreenControl={true}
                  zoomControl={true}
                  streetViewControl={false}
                  mapTypeControl={false}
                  className="w-full h-full"
                >
                  <MapController
                    targetLocation={panTarget}
                    fitAllTrigger={fitAllCounter}
                    locations={locations}
                  />

                  {/* Driver Markers */}
                  {filteredLocations.map((driver) => {
                    const isSelected = selectedDriverId === driver.driver_id;
                    const isOnDuty = driver.duty_status === 'on_duty';
                    const isDelivering = isOnDuty && driver.work_status === 'delivering';
                    const isAvailable = isOnDuty && driver.work_status === 'available';

                    // Marker color coding
                    const pinBg = !isOnDuty
                      ? 'bg-slate-500 border-white'
                      : isDelivering
                      ? 'bg-indigo-600 border-white'
                      : 'bg-emerald-500 border-white';

                    return (
                      <AdvancedMarker
                        key={driver.driver_id}
                        position={{ lat: driver.latitude, lng: driver.longitude }}
                        onClick={() => handleSelectAndCenterDriver(driver)}
                        title={`${driver.driver_code} - ${driver.driver_name}`}
                      >
                        {/* Custom Animated Pin Element */}
                        <div className="relative cursor-pointer group">
                          {/* Pulsing ring for delivering or active driver */}
                          {isOnDuty && (
                            <span
                              className={`absolute -inset-1.5 rounded-full opacity-75 animate-ping ${
                                isDelivering ? 'bg-indigo-400' : 'bg-emerald-400'
                              }`}
                            />
                          )}

                          {/* Marker container */}
                          <div
                            className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white font-black text-[11px] shadow-lg border-2 transition-transform duration-200 group-hover:scale-110 ${pinBg} ${
                              isSelected ? 'scale-115 ring-3 ring-blue-400 ring-offset-2' : ''
                            }`}
                          >
                            <Bike className="w-3.5 h-3.5" />
                            <span>{driver.driver_code}</span>
                            {driver.speed_kmh !== undefined && driver.speed_kmh > 0 && (
                              <span className="text-[9px] font-bold opacity-90 pl-0.5">
                                {driver.speed_kmh}km/h
                              </span>
                            )}
                          </div>

                          {/* Pin downward pointer tip */}
                          <div
                            className={`w-0 h-0 border-x-4 border-x-transparent border-t-6 mx-auto -mt-0.5 ${
                              !isOnDuty
                                ? 'border-t-slate-500'
                                : isDelivering
                                ? 'border-t-indigo-600'
                                : 'border-t-emerald-500'
                            }`}
                          />
                        </div>
                      </AdvancedMarker>
                    );
                  })}

                  {/* InfoWindow on Marker Click */}
                  {selectedDriver && (
                    <InfoWindow
                      position={{ lat: selectedDriver.latitude, lng: selectedDriver.longitude }}
                      onCloseClick={() => setSelectedDriverId(null)}
                      headerContent={
                        <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                          <span>{selectedDriver.driver_code}</span>
                          <span className="text-slate-400">•</span>
                          <span>{selectedDriver.driver_name}</span>
                        </div>
                      }
                    >
                      <div className="w-64 p-1 text-slate-800 space-y-2.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              selectedDriver.avatar_url ||
                              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop'
                            }
                            alt={selectedDriver.driver_name}
                            className="w-12 h-12 rounded-[4px] object-cover border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {selectedDriver.driver_name}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>{selectedDriver.phone}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {selectedDriver.vehicle_plate || 'AB 1234 XY'}
                            </div>
                          </div>
                        </div>

                        {/* Status badges */}
                        <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                          <span
                            className={`px-2 py-0.5 rounded-[4px] ${
                              selectedDriver.duty_status === 'on_duty'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {selectedDriver.duty_status === 'on_duty'
                              ? 'Bertugas'
                              : 'Tidak Bertugas'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-[4px] ${
                              selectedDriver.work_status === 'delivering'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {selectedDriver.work_status === 'delivering'
                              ? 'Sedang Mengantar'
                              : 'Tersedia'}
                          </span>
                          <span className="px-2 py-0.5 rounded-[4px] bg-slate-100 text-slate-600">
                            GPS: {getTimeAgo(selectedDriver.last_updated_at)}
                          </span>
                        </div>

                        {/* Order info if actively delivering */}
                        {selectedDriver.work_status === 'delivering' && (
                          <div className="p-2.5 rounded-[6px] bg-indigo-50 border border-indigo-100 space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-indigo-900">
                                {selectedDriver.active_order_number || 'Pesanan Berjalan'}
                              </span>
                              <span className="text-[10px] font-semibold uppercase text-indigo-700 bg-white/70 px-1.5 py-0.5 rounded-[4px]">
                                {selectedDriver.service_type === 'antar_barang'
                                  ? 'Antar Barang'
                                  : 'Ojek'}
                              </span>
                            </div>
                            {selectedDriver.customer_name && (
                              <div className="text-[11px] text-indigo-800 truncate">
                                Pelanggan: <span className="font-bold">{selectedDriver.customer_name}</span>
                              </div>
                            )}
                            {selectedDriver.delivery_address && (
                              <div className="text-[10px] text-indigo-600 truncate flex items-center gap-1">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span>{selectedDriver.delivery_address}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="pt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectDriverDetail) {
                                onSelectDriverDetail(selectedDriver.driver_id);
                              }
                            }}
                            className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-[6px] transition-colors text-center cursor-pointer"
                          >
                            Lihat Detail Driver
                          </button>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </Map>
              </APIProvider>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="w-10 h-10 text-amber-500 mb-2" />
                <h4 className="text-sm font-bold text-slate-800">API Key Google Maps Diperlukan</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Peta live tracking membutuhkan Google Maps API Key.
                </p>
              </div>
            )}

            {/* Empty state overlay when no filtered drivers */}
            {filteredLocations.length === 0 && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-10 pointer-events-none">
                <Bike className="w-10 h-10 text-slate-400 mb-2" />
                <div className="text-sm font-bold text-slate-700">
                  Belum ada driver yang mengirimkan lokasi
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Tidak ada driver yang cocok dengan filter ({activeFilter}).
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DRIVER LIST PANEL (4 Columns on desktop) */}
        <div className="lg:col-span-4 flex flex-col space-y-3">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-[6px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({locations.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('on_duty')}
              className={`px-3 py-1.5 rounded-[6px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeFilter === 'on_duty'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Bertugas ({onDutyCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('available')}
              className={`px-3 py-1.5 rounded-[6px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeFilter === 'available'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tersedia ({availableCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('delivering')}
              className={`px-3 py-1.5 rounded-[6px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeFilter === 'delivering'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Order ({deliveringCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('off_duty')}
              className={`px-3 py-1.5 rounded-[6px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeFilter === 'off_duty'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Off ({offDutyCount})
            </button>
          </div>

          {/* Scrollable list of driver cards */}
          <div className="space-y-2.5 max-h-[440px] sm:max-h-[480px] overflow-y-auto pr-1">
            {filteredLocations.map((driver) => {
              const isSelected = selectedDriverId === driver.driver_id;
              const isOnDuty = driver.duty_status === 'on_duty';
              const isDelivering = isOnDuty && driver.work_status === 'delivering';

              return (
                <div
                  key={driver.driver_id}
                  onClick={() => handleSelectAndCenterDriver(driver)}
                  className={`p-3.5 rounded-[6px] border transition-all cursor-pointer flex flex-col gap-2.5 ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-400 shadow-xs ring-2 ring-blue-500/20'
                      : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={
                            driver.avatar_url ||
                            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop'
                          }
                          alt={driver.driver_name}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/assets/aistudio/logo_7417d4ba.png';
                          }}
                          className="w-10 h-10 rounded-[4px] object-cover border border-slate-200"
                        />
                        <span
                          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            !isOnDuty
                              ? 'bg-slate-400'
                              : isDelivering
                              ? 'bg-indigo-600'
                              : 'bg-emerald-500'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900 truncate">
                            {driver.driver_name}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] bg-slate-200 text-slate-700 shrink-0">
                            {driver.driver_code}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 shrink-0" />
                          <span className="truncate">{driver.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-[4px] ${
                          !isOnDuty
                            ? 'bg-slate-200 text-slate-700'
                            : isDelivering
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {!isOnDuty ? 'Offline' : isDelivering ? 'Mengantar' : 'Standby'}
                      </span>
                      <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1 mt-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{getTimeAgo(driver.last_updated_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Active Order snippet if delivering */}
                  {isDelivering && driver.active_order_number && (
                    <div className="p-2 rounded-[6px] bg-white/90 border border-indigo-100 text-[11px] text-indigo-900 flex items-center justify-between">
                      <div className="truncate">
                        <span className="font-bold">{driver.active_order_number}</span>
                        {driver.customer_name && (
                          <span className="text-slate-500"> • {driver.customer_name}</span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600 shrink-0 pl-1">
                        {driver.speed_kmh ? `${driver.speed_kmh} km/h` : 'Jalan'}
                      </span>
                    </div>
                  )}

                  {/* Action row */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[11px]">
                    <span className="text-slate-400 font-mono text-[10px]">
                      {driver.vehicle_plate || 'Motor'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectAndCenterDriver(driver);
                      }}
                      className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Lihat di Peta &rarr;</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
