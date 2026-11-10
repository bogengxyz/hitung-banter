import test from 'node:test';
import assert from 'node:assert/strict';
import { driverTrackingStore, INITIAL_DRIVER_LOCATIONS } from './trackingStore';

test('DriverTrackingStore initializes with default drivers and connected state', () => {
  const locs = driverTrackingStore.getLocations();
  assert.ok(locs.length >= 4, 'Should have at least 4 initial drivers');
  const bSantoso = locs.find((d) => d.driver_id === 'drv-01');
  assert.ok(bSantoso, 'Budi Santoso should exist');
  assert.equal(bSantoso.driver_code, 'DRV-01');
  assert.equal(bSantoso.duty_status, 'on_duty');
  assert.equal(bSantoso.work_status, 'delivering');
});

test('DriverTrackingStore updates location for a driver correctly', () => {
  const newLat = -7.7600;
  const newLng = 110.3700;
  driverTrackingStore.updateDriverLocation({
    driver_id: 'drv-02',
    latitude: newLat,
    longitude: newLng,
    speed_kmh: 30,
  });

  const updated = driverTrackingStore.getLocations().find((d) => d.driver_id === 'drv-02');
  assert.ok(updated);
  assert.equal(updated.latitude, newLat);
  assert.equal(updated.longitude, newLng);
  assert.equal(updated.speed_kmh, 30);
});

test('DriverTrackingStore updates duty status to off_duty', () => {
  driverTrackingStore.updateDutyStatus('drv-01', 'off_duty');
  const updated = driverTrackingStore.getLocations().find((d) => d.driver_id === 'drv-01');
  assert.ok(updated);
  assert.equal(updated.duty_status, 'off_duty');
  assert.equal(updated.work_status, 'available');
  assert.ok(updated.duty_ended_at);

  // Re-enable for further tests
  driverTrackingStore.updateDutyStatus('drv-01', 'on_duty');
});

test('DriverTrackingStore audits expired locations correctly', () => {
  // Set last updated to 10 minutes ago
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  driverTrackingStore.updateDriverLocation({
    driver_id: 'drv-03',
    duty_status: 'on_duty',
    connection_status: 'online',
    device_timestamp: tenMinsAgo,
  });
  // Manually tweak last_updated_at in memory
  const locs = driverTrackingStore.getLocations();
  const d3 = locs.find((d) => d.driver_id === 'drv-03')!;
  d3.last_updated_at = tenMinsAgo;

  driverTrackingStore.auditExpiration();
  const rechecked = driverTrackingStore.getLocations().find((d) => d.driver_id === 'drv-03')!;
  assert.equal(rechecked.connection_status, 'expired', 'Should be expired after >5 minutes without update');
});
