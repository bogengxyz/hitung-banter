import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePricing } from '../pricing/engine';

test('Financial reconciliation: modal driver vs modal admin', () => {
  // Scenario: Pesanan 4 KM, belanja Rp40.000 (Rp25.000 modal Driver, Rp15.000 modal Admin)
  const pricing = calculatePricing({ distance_km: 4 });
  // 4 KM: Ongkir 13.000, Admin 1.000, BANTER 1.200, Driver 10.800
  assert.equal(pricing.delivery_fee, 13000);
  assert.equal(pricing.driver_delivery_share, 10800);

  const driverShoppingModal = 25000;
  const adminShoppingModal = 15000;
  const totalShopping = driverShoppingModal + adminShoppingModal;

  // Driver entitlement MUST ONLY include driver shopping modal + driver delivery + extra fees
  const driverTotalEntitlement = driverShoppingModal + pricing.driver_total_delivery_entitlement;
  assert.equal(driverTotalEntitlement, 25000 + 10800); // 35.800

  // Total customer bill
  const customerBill = pricing.delivery_fee + totalShopping; // 13.000 + 40.000 = 53.000
  assert.equal(customerBill, 53000);

  // If customer pays Rp53.000 to ADMIN via QRIS:
  // Driver hasn't received anything yet!
  let driverReceived = 0;
  let remainingOwedToDriver = driverTotalEntitlement - driverReceived;
  assert.equal(remainingOwedToDriver, 35800);

  // Admin pays Driver Rp20.000 partially:
  driverReceived += 20000;
  remainingOwedToDriver = driverTotalEntitlement - driverReceived;
  assert.equal(remainingOwedToDriver, 15800);

  // Admin pays remaining Rp15.800:
  driverReceived += 15800;
  remainingOwedToDriver = driverTotalEntitlement - driverReceived;
  assert.equal(remainingOwedToDriver, 0);
});

test('Financial reconciliation: customer pays Cash to Driver directly', () => {
  // Scenario: Customer pays Rp53.000 cash to driver
  // Breakdown: Driver takes shopping reimbursement (25.000) + driver fee (10.800) = 35.800
  // The remaining Rp17.200 (Admin fee 1.000 + BANTER 1.200 + Admin modal 15.000 = 17.200) is cash held by driver to be deposited to Admin!
  const pricing = calculatePricing({ distance_km: 4 });
  const driverEntitlement = 25000 + pricing.driver_delivery_share; // 35.800
  const cashGivenToDriver = 53000;

  // The allocated payment satisfying driver entitlement is 35.800
  const allocatedToDriver = Math.min(cashGivenToDriver, driverEntitlement);
  const remainingOwedToDriver = driverEntitlement - allocatedToDriver;
  assert.equal(remainingOwedToDriver, 0);

  // Surplus cash held by driver (due to admin)
  const driverCashSurplusToDeposit = cashGivenToDriver - allocatedToDriver;
  assert.equal(driverCashSurplusToDeposit, 17200);
});
