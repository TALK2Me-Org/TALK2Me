const jwt = require('jsonwebtoken');
const { database } = require('./database');

// Sekretny klucz JWT (w produkcji powinien być w .env)
const JWT_SECRET = process.env.JWT_SECRET || 'talk2me-secret-key-2024';

// Generuj token JWT
const generateToken = (userId) => {
  return jwt.sign(
    { userId, timestamp: Date.now() },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Middleware do weryfikacji tokena
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Brak tokena autoryzacji' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await database.findUserById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'Nieprawidłowy token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token wygasł lub jest nieprawidłowy' });
  }
};

// Opcjonalna autoryzacja (dla endpointów które mogą działać bez logowania)
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await database.findUserById(decoded.userId);
      if (user) {
        req.user = user;
      }
    } catch (error) {
      // Ignoruj błędy - użytkownik po prostu nie będzie zalogowany
    }
  }

  next();
};

module.exports = {
  generateToken,
  authenticateToken,
  optionalAuth,
  JWT_SECRET
};