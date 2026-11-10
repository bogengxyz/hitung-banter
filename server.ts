import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { authenticateUser, validateSessionToken, invalidateToken } from './src/server/authHandler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json());

  // Security Headers
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // ---------------------------------------------------------------------------
  // AUTH API ENDPOINTS
  // ---------------------------------------------------------------------------

  /**
   * POST /api/auth/login
   * Validates credentials securely on server side
   */
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { username, password } = req.body || {};
    const result = authenticateUser(username, password);

    if (!result.success) {
      return res.status(result.code || 401).json({
        success: false,
        error: result.error || 'Autentikasi gagal',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Login berhasil sebagai Administrator',
      session: result.session,
    });
  });

  /**
   * GET /api/auth/session
   * Validates active session token and enforces admin role
   */
  app.get('/api/auth/session', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Sesi tidak ditemukan atau belum login.',
      });
    }

    const token = authHeader.substring(7).trim();
    const result = validateSessionToken(token);

    if (!result.valid) {
      return res.status(result.code || 401).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      session: {
        token,
        user: result.user,
      },
    });
  });

  /**
   * POST /api/auth/logout
   * Invalidates token on server
   */
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      invalidateToken(token);
    }
    return res.status(200).json({
      success: true,
      message: 'Sesi berhasil diakhiri.',
    });
  });

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'hitung-banter-auth', timestamp: new Date().toISOString() });
  });

  // ---------------------------------------------------------------------------
  // VITE / STATIC FILE SERVING
  // ---------------------------------------------------------------------------
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`[HITUNG BANTER Server] Running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('[HITUNG BANTER Server Error]', err);
  process.exit(1);
});
