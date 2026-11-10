import React, { useState, useEffect } from 'react';
import { banterStore } from './lib/storage/store';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { NotificationModal } from './components/NotificationModal';
import { MainNavTab } from './components/MainMenuGrid';
import { Order, Driver, UserProfile, UserRole, TariffConfig, PaymentMethod, PaymentRecipient, CombinedOrderGroup, CombinedOrderStatus, CompensationItem } from './types';
import { authService } from './lib/auth/authService';
import { LoginPage } from './features/auth/LoginPage';

// Feature Views
import { DashboardView } from './features/dashboard/DashboardView';
import { CalculatorView } from './features/calculator/CalculatorView';
import { OrdersView } from './features/orders/OrdersView';
import { NewOrderModal } from './features/orders/NewOrderModal';
import { CombinedOrderModal } from './features/orders/CombinedOrderModal';
import { DriversView } from './features/drivers/DriversView';
import { DriverTrackingView } from './features/tracking/DriverTrackingView';
import { CustomerPaymentsView } from './features/customer-payments/CustomerPaymentsView';
import { DriverPaymentsView } from './features/driver-payments/DriverPaymentsView';
import { ExpensesView } from './features/expenses/ExpensesView';
import { ReportsView } from './features/reports/ReportsView';
import { AuditView } from './features/audit/AuditView';
import { SettingsView } from './features/settings/SettingsView';

export default function App() {
  const [currentTab, setCurrentTab] = useState<MainNavTab>('home');
  const [currentUser, setCurrentUser] = useState<UserProfile>(banterStore.getCurrentUser());
  const [users, setUsers] = useState<UserProfile[]>(banterStore.getUsers());
  const [drivers, setDrivers] = useState<Driver[]>(banterStore.getDrivers());
  const [orders, setOrders] = useState<Order[]>(banterStore.getOrders());
  const [combinedOrders, setCombinedOrders] = useState<CombinedOrderGroup[]>(banterStore.getCombinedOrders());
  const [expenses, setExpenses] = useState(banterStore.getExpenses());
  const [receipts, setReceipts] = useState(banterStore.getReceipts());
  const [payments, setPayments] = useState(banterStore.getPayments());
  const [auditLogs, setAuditLogs] = useState(banterStore.getAuditLogs());
  const [tariffConfig, setTariffConfig] = useState<TariffConfig>(banterStore.getTariffConfig());
  const [supabaseConfig, setSupabaseConfig] = useState(banterStore.getSupabaseConfig());

  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => authService.isAuthenticatedAdmin());
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  // Navigation states & modals
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isCombinedOrderModalOpen, setIsCombinedOrderModalOpen] = useState(false);
  const [newOrderInitialData, setNewOrderInitialData] = useState<any>(null);

  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<Order | null>(null);
  const [preSelectedOrderForReceipt, setPreSelectedOrderForReceipt] = useState<Order | null>(null);
  const [preSelectedDriverForPayment, setPreSelectedDriverForPayment] = useState<Driver | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // Check auth session on startup
  useEffect(() => {
    let isMounted = true;
    authService
      .validateSession()
      .then((session) => {
        if (!isMounted) return;
        if (session && session.user.role === 'admin') {
          setIsAuthenticated(true);
          banterStore.setCurrentUser({
            id: session.user.id,
            username: session.user.username,
            full_name: session.user.full_name,
            email: session.user.email,
            role: session.user.role,
            avatar_url: session.user.avatar_url || '/assets/aistudio/logo_7417d4ba.png',
            is_active: true,
            created_at: session.user.created_at,
          });
          setCurrentUser(banterStore.getCurrentUser());
        } else {
          setIsAuthenticated(false);
        }
        setIsCheckingAuth(false);
      })
      .catch(() => {
        if (isMounted) {
          setIsAuthenticated(false);
          setIsCheckingAuth(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Google Maps Platform Quota Defense listener
  useEffect(() => {
    const handleQuotaExceeded = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  // Subscribe to reactive store changes
  useEffect(() => {
    const unsubscribe = banterStore.subscribe(() => {
      setCurrentUser(banterStore.getCurrentUser());
      setUsers(banterStore.getUsers());
      setDrivers(banterStore.getDrivers());
      setOrders(banterStore.getOrders());
      setCombinedOrders(banterStore.getCombinedOrders());
      setExpenses(banterStore.getExpenses());
      setReceipts(banterStore.getReceipts());
      setPayments(banterStore.getPayments());
      setAuditLogs(banterStore.getAuditLogs());
      setTariffConfig(banterStore.getTariffConfig());
      setSupabaseConfig(banterStore.getSupabaseConfig());
    });
    return unsubscribe;
  }, []);

  // Compute pending driver payouts count
  const unpaidDriverOrders = orders.filter(
    (o) => o.status !== 'cancelled' && o.driver_balance_remaining > 0
  );

  // Switch user handler
  const handleSwitchUser = (user: UserProfile) => {
    banterStore.setCurrentUser(user);
    setCurrentUser(user);
  };

  // Calculator "Simpan Sebagai Pesanan"
  const handleSaveCalculatorAsOrder = (calcData: {
    driver_id: string;
    distance_km: number;
    is_rain: boolean;
    is_night: boolean;
    extra_stops_count: number;
    notes?: string;
  }) => {
    setNewOrderInitialData(calcData);
    setIsNewOrderModalOpen(true);
  };

  // Submit New Order
  const handleCreateOrder = (data: any) => {
    banterStore.createOrder(data);
    setCurrentTab('orders');
  };

  // Submit New Combined Order
  const handleCreateCombinedOrder = (data: any) => {
    banterStore.createCombinedOrder(data);
    setCurrentTab('orders');
  };

  // Cancel Order with Reason
  const handleCancelOrder = (orderId: string, reason: string) => {
    banterStore.cancelOrder(orderId, reason);
  };

  // Cancel Combined Order Group with Reason
  const handleCancelCombinedOrder = (groupId: string, reason: string) => {
    banterStore.cancelCombinedOrder(groupId, reason);
  };

  // Update Combined Order Status
  const handleUpdateCombinedOrderStatus = (groupId: string, status: CombinedOrderStatus) => {
    banterStore.updateCombinedOrderStatus(groupId, status);
  };

  // Update Combined Order Item Price
  const handleUpdateCombinedActualPrice = (
    groupId: string,
    customerId: string,
    locationId: string,
    itemId: string,
    actualPrice: number
  ) => {
    banterStore.updateCombinedOrderActualPrice(groupId, customerId, locationId, itemId, actualPrice);
  };

  // Customer Receipt Recording
  const handleRecordReceipt = (data: {
    order_id: string;
    amount: number;
    method: PaymentMethod;
    recipient: PaymentRecipient;
    reference_number?: string;
    notes?: string;
    allocation: {
      shopping: number;
      delivery: number;
      extra: number;
      change: number;
      deposit: number;
    };
  }) => {
    banterStore.recordCustomerReceipt(data);
  };

  // Driver Payment Recording
  const handleRecordDriverPayment = (data: {
    driver_id: string;
    amount: number;
    gross_amount?: number;
    compensation_amount?: number;
    compensation_allocations?: CompensationItem[];
    method: PaymentMethod;
    reference_number?: string;
    notes?: string;
    allocations: { order_id: string; order_number: string; allocated_amount: number }[];
  }) => {
    banterStore.recordDriverPayment(data);
  };

  // Auth Handlers
  const handleLoginSuccess = (session: any) => {
    setIsAuthenticated(true);
    banterStore.setCurrentUser({
      id: session.user.id,
      username: session.user.username,
      full_name: session.user.full_name,
      email: session.user.email,
      role: session.user.role,
      avatar_url: session.user.avatar_url || '/assets/aistudio/logo_7417d4ba.png',
      is_active: true,
      created_at: session.user.created_at,
    });
    setCurrentUser(banterStore.getCurrentUser());
    setCurrentTab('home');
  };

  const handleLogout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
  };

  // Loading Splash Screen while verifying session
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4 select-none">
        <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md p-2 flex items-center justify-center border border-white/20 shadow-2xl mb-5 animate-pulse">
          <img
            src="/assets/aistudio/logo_7417d4ba.png"
            alt="HITUNG BANTER"
            className="w-full h-full object-contain drop-shadow-md"
          />
        </div>
        <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-300">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span>Memeriksa sesi login HITUNG BANTER...</span>
        </div>
      </div>
    );
  }

  // Unauthenticated -> Render Login Gate
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#F4F7FC] text-slate-900 flex flex-col antialiased">
      {/* Google Maps Quota Defense Sticky Warning Banner */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        users={users}
        orders={orders}
        onSelectOrder={(order) => {
          setSelectedOrderForDetail(order);
          setCurrentTab('orders');
        }}
        onSwitchUser={handleSwitchUser}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        notificationCount={unpaidDriverOrders.length}
        supabaseConnected={supabaseConfig.isConnected}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Persistent Desktop Sidebar & Mobile Drawer */}
        <Sidebar
          currentTab={currentTab}
          onNavigate={(tab) => {
            setCurrentTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          currentUser={currentUser}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onLogout={handleLogout}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 max-w-full overflow-hidden">
          {currentTab === 'home' && (
            <DashboardView
              currentUser={currentUser}
              orders={orders}
              drivers={drivers}
              receipts={receipts}
              payments={payments}
              expenses={expenses}
              onNavigate={(tab) => {
                setCurrentTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSelectOrder={(ord) => {
                setSelectedOrderForDetail(ord);
                setCurrentTab('orders');
              }}
              onOpenNewOrderModal={() => {
                setNewOrderInitialData(null);
                setIsNewOrderModalOpen(true);
              }}
            />
          )}

          {currentTab === 'calculator' && (
            <CalculatorView
              drivers={drivers}
              tariffConfig={tariffConfig}
              onSaveAsOrder={handleSaveCalculatorAsOrder}
            />
          )}

          {currentTab === 'orders' && (
            <OrdersView
              orders={orders}
              combinedOrders={combinedOrders}
              drivers={drivers}
              expenses={expenses}
              receipts={receipts}
              tariffConfig={tariffConfig}
              onOpenNewOrderModal={() => {
                setNewOrderInitialData(null);
                setIsNewOrderModalOpen(true);
              }}
              onOpenCombinedOrderModal={() => setIsCombinedOrderModalOpen(true)}
              onCancelOrder={handleCancelOrder}
              onCancelCombinedOrder={handleCancelCombinedOrder}
              onUpdateCombinedOrderStatus={handleUpdateCombinedOrderStatus}
              onUpdateCombinedActualPrice={handleUpdateCombinedActualPrice}
              onUpdateOrder={(orderId, data, reason) => banterStore.updateOrder(orderId, data, reason)}
              onSaveShoppingRealization={(orderId, items, reason) => banterStore.saveShoppingRealization(orderId, items, reason)}
              onRecordPaymentForOrder={(ord) => {
                const drv = drivers.find((d) => d.id === ord.driver_id);
                setPreSelectedDriverForPayment(drv || null);
                setCurrentTab('driver-payments');
              }}
              onRecordReceiptForOrder={(ord) => {
                setPreSelectedOrderForReceipt(ord);
                setCurrentTab('customer-payments');
              }}
              selectedOrderFromNav={selectedOrderForDetail}
            />
          )}

          {currentTab === 'drivers' && (
            <DriversView
              drivers={drivers}
              orders={orders}
              payments={payments}
              onAddDriver={(drv) => banterStore.addDriver(drv)}
              onUpdateDriver={(drv) => banterStore.updateDriver(drv)}
              onPayDriver={(drv) => {
                setPreSelectedDriverForPayment(drv);
                setCurrentTab('driver-payments');
              }}
            />
          )}

          {currentTab === 'monitoring-driver' && (
            <DriverTrackingView
              orders={orders}
              onSelectDriverDetail={(driverId) => {
                const drv = drivers.find((d) => d.id === driverId);
                if (drv) {
                  setPreSelectedDriverForPayment(drv);
                  setCurrentTab('drivers');
                }
              }}
              onSelectOrder={(ord) => {
                setSelectedOrderForDetail(ord);
                setCurrentTab('orders');
              }}
            />
          )}

          {currentTab === 'customer-payments' && (
            <CustomerPaymentsView
              receipts={receipts}
              orders={orders}
              onRecordReceipt={handleRecordReceipt}
              preSelectedOrder={preSelectedOrderForReceipt}
            />
          )}

          {currentTab === 'driver-payments' && (
            <DriverPaymentsView
              payments={payments}
              drivers={drivers}
              orders={orders}
              onRecordDriverPayment={handleRecordDriverPayment}
              preSelectedDriver={preSelectedDriverForPayment}
            />
          )}

          {currentTab === 'expenses' && (
            <ExpensesView
              expenses={expenses}
              orders={orders}
              onAddExpense={(ordId, item) => banterStore.addExpenseItem(ordId, item)}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView
              orders={orders}
              receipts={receipts}
              payments={payments}
              expenses={expenses}
              drivers={drivers}
            />
          )}

          {currentTab === 'audit' && <AuditView logs={auditLogs} />}

          {(currentTab === 'settings' || currentTab === 'users') && (
            <SettingsView
              currentUser={currentUser}
              users={users}
              tariffConfig={tariffConfig}
              onUpdateTariff={(cfg, reason) => banterStore.updateTariffConfig(cfg, reason)}
              onUpdateUserRole={(uid, role, active) => banterStore.updateUserRole(uid, role, active)}
              onAddUser={(usr) => banterStore.addUser(usr)}
              supabaseConfig={supabaseConfig}
              onSaveSupabaseConfig={(cfg) => banterStore.setSupabaseConfig(cfg)}
              onResetDatabase={() => banterStore.resetToSeed()}
            />
          )}
        </main>
      </div>

      {/* Floating Bottom Nav for Mobile Screens */}
      <BottomNav
        currentTab={currentTab}
        onNavigate={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Global Notifications Modal */}
      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        unpaidOrders={unpaidDriverOrders}
        drivers={drivers}
        onSelectOrder={(ord) => {
          setSelectedOrderForDetail(ord);
          setCurrentTab('orders');
        }}
        onNavigateToPayments={() => setCurrentTab('driver-payments')}
      />

      {/* Global New Order Modal */}
      <NewOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        drivers={drivers}
        tariffConfig={tariffConfig}
        initialData={newOrderInitialData}
        onSubmit={handleCreateOrder}
      />

      {/* Global Combined Order Modal */}
      <CombinedOrderModal
        isOpen={isCombinedOrderModalOpen}
        onClose={() => setIsCombinedOrderModalOpen(false)}
        drivers={drivers}
        tariffConfig={tariffConfig}
        onSubmit={handleCreateCombinedOrder}
      />
    </div>
  );
}
