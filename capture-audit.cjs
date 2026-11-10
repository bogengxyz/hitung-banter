const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const screenshotDir = path.resolve('C:/Users/bogen/.gemini/antigravity/brain/ac58dbf9-bd22-4c19-aa73-9371297c56ef/scratch/screenshots');
fs.mkdirSync(screenshotDir, { recursive: true });

async function run() {
  console.log('Starting server...');
  const server = spawn('npx.cmd', ['tsx', 'server.ts'], {
    env: { ...process.env, PORT: '3001' },
    stdio: 'pipe',
    shell: true,
  });

  // Wait for server ready
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('http://localhost:3001/api/health');
      if (res.ok) {
        ready = true;
        console.log('Server is ready on port 3001');
        break;
      }
    } catch (e) {
      // wait
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!ready) {
    console.error('Server failed to start within timeout');
    server.kill();
    process.exit(1);
  }

  console.log('Launching browser (channel: chrome)...');
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
  });

  try {
    // 1. Audit Login Screen (Desktop & Mobile)
    const contextDesktop = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await contextDesktop.newPage();

    console.log('Navigating to login page...');
    await page.goto('http://localhost:3001');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, '01-login-desktop.png') });

    // Mobile Login
    const contextMobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
    });
    const pageMobile = await contextMobile.newPage();
    await pageMobile.goto('http://localhost:3001');
    await pageMobile.waitForTimeout(1000);
    await pageMobile.screenshot({ path: path.join(screenshotDir, '01-login-mobile.png') });
    await contextMobile.close();

    // 2. Perform Login on Desktop
    console.log('Logging in on desktop...');
    await page.fill('#username-input', 'admin_banter');
    await page.fill('#password-input', 'bantermas99');
    await page.click('button[type="submit"]');

    // Wait for Dashboard to appear
    await page.waitForSelector('text=Selamat Datang', { timeout: 15000 });
    console.log('Login successful! Capturing Dashboard...');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screenshotDir, '02-dashboard-desktop.png') });

    // Re-use session storage for mobile context
    const storageState = await contextDesktop.storageState();
    const authedMobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      storageState,
    });
    const authedMobilePage = await authedMobileContext.newPage();
    await authedMobilePage.goto('http://localhost:3001');
    await authedMobilePage.waitForSelector('text=Selamat Datang', { timeout: 15000 });
    await authedMobilePage.waitForTimeout(1500);
    await authedMobilePage.screenshot({ path: path.join(screenshotDir, '02-dashboard-mobile.png') });

    // Helper to capture tab on both desktop and mobile
    const captureTab = async (tabName, navText, filePrefix) => {
      console.log(`Navigating to ${tabName}...`);
      // Desktop
      await page.click(`aside button:has-text("${navText}")`);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(screenshotDir, `${filePrefix}-${tabName}-desktop.png`) });

      // Mobile
      if (tabName === 'calculator') {
        await authedMobilePage.click('nav.fixed button:nth-child(2)');
      } else if (tabName === 'orders') {
        await authedMobilePage.click('nav.fixed button:nth-child(3)');
      } else if (tabName === 'reports') {
        await authedMobilePage.click('nav.fixed button:nth-child(4)');
      } else if (tabName === 'settings') {
        await authedMobilePage.click('nav.fixed button:nth-child(5)');
      } else {
        await authedMobilePage.click('button[aria-label="Buka Menu"]');
        await authedMobilePage.waitForTimeout(400);
        await authedMobilePage.click(`div.fixed >> button:has-text("${navText}")`);
      }
      await authedMobilePage.waitForTimeout(1200);
      await authedMobilePage.screenshot({ path: path.join(screenshotDir, `${filePrefix}-${tabName}-mobile.png`) });
    };

    await captureTab('calculator', 'Kalkulator', '03');
    await captureTab('orders', 'Pesanan', '04');
    await captureTab('drivers', 'Driver', '05');
    await captureTab('monitoring-driver', 'Monitoring Driver', '06');
    await captureTab('customer-payments', 'Pembayaran Customer', '07');
    await captureTab('driver-payments', 'Pembayaran Driver', '08');
    await captureTab('expenses', 'Modal & Pengeluaran', '09');
    await captureTab('reports', 'Laporan Keuangan', '10');
    await captureTab('audit', 'Riwayat & Audit', '11');
    await captureTab('settings', 'Pengaturan Tarif', '12');

    console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
    await authedMobileContext.close();
    await contextDesktop.close();
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
    server.kill();
    console.log('Finished and cleaned up.');
  }
}

run();
