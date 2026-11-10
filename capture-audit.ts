import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { authenticateUser, validateSessionToken, invalidateToken } from './src/server/authHandler';
import { chromium } from 'playwright';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotDir = path.resolve('C:/Users/bogen/.gemini/antigravity/brain/ac58dbf9-bd22-4c19-aa73-9371297c56ef/scratch/screenshots');
fs.mkdirSync(screenshotDir, { recursive: true });

async function main() {
  const app = express();
  app.use(express.json());

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { username, password } = req.body || {};
    const result = authenticateUser(username, password);
    if (!result.success) {
      return res.status(result.code || 401).json({ success: false, error: result.error || 'Autentikasi gagal' });
    }
    return res.status(200).json({ success: true, message: 'Login berhasil sebagai Administrator', session: result.session });
  });

  app.get('/api/auth/session', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Sesi tidak ditemukan atau belum login.' });
    }
    const token = authHeader.substring(7).trim();
    const result = validateSessionToken(token);
    if (!result.valid) {
      return res.status(result.code || 401).json({ success: false, error: result.error });
    }
    return res.status(200).json({ success: true, session: { token, user: result.user } });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      invalidateToken(token);
    }
    return res.status(200).json({ success: true, message: 'Sesi berhasil diakhiri.' });
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'hitung-banter-auth', timestamp: new Date().toISOString() });
  });

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  const port = 3005;
  const server = app.listen(port, '127.0.0.1', () => {
    console.log(`[Test Server] Running on http://127.0.0.1:${port}`);
  });

  console.log('Launching browser (channel: chrome)...');
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
  });

  try {
    // 1. Audit Login Screen
    const contextDesktop = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await contextDesktop.newPage();

    console.log('Navigating to login page...');
    await page.goto(`http://127.0.0.1:${port}`);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, '01-login-desktop.png') });

    // Mobile Login
    const contextMobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
    });
    const pageMobile = await contextMobile.newPage();
    await pageMobile.goto(`http://127.0.0.1:${port}`);
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
    await authedMobilePage.goto(`http://127.0.0.1:${port}`);
    await authedMobilePage.waitForSelector('text=Selamat Datang', { timeout: 15000 });
    await authedMobilePage.waitForTimeout(1500);
    await authedMobilePage.screenshot({ path: path.join(screenshotDir, '02-dashboard-mobile.png') });

    // Helper to capture tab on both desktop and mobile
    const captureTab = async (tabName: string, navText: string, filePrefix: string) => {
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
    await vite.close();
    server.close();
    console.log('Finished and cleaned up.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

