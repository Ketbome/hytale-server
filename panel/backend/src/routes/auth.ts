import { type Response, Router, type Router as RouterType } from 'express';
import config from '../config/index.js';
import { type AuthenticatedRequest, generateToken, requireAuth } from '../middleware/auth.js';

const router: RouterType = Router();

function isSecureConnection(req: AuthenticatedRequest): boolean {
  // Check X-Forwarded-Proto header (reverse proxy with SSL termination)
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (forwardedProto === 'https') return true;

  // Check if request was made over HTTPS directly
  if (req.secure) return true;

  // Check protocol from host header or origin
  const origin = req.headers.origin || '';
  if (origin.startsWith('https://')) return true;

  return false;
}

router.post('/login', async (req: AuthenticatedRequest, res) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password required' });
      return;
    }

    if (username !== config.auth.username) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (password !== config.auth.password) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken(username);
    const secure = isSecureConnection(req);

    res.cookie('token', token, {
      httpOnly: true,
      secure,
      sameSite: secure ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({ success: true, token });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

router.get('/status', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    authenticated: true,
    username: req.user?.username,
    authDisabled: config.auth.disabled
  });
});

router.get('/check-defaults', (_req, res) => {
  const usingDefaults = config.auth.username === 'admin' && config.auth.password === 'admin';

  res.json({
    usingDefaults,
    authDisabled: config.auth.disabled
  });
});

export default router;
