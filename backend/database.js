const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Utwórz/otwórz bazę danych
const db = new sqlite3.Database(path.join(__dirname, 'talk2me.db'));

// Inicjalizuj tabele
db.serialize(() => {
  // Tabela użytkowników
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      subscription_type TEXT DEFAULT 'free',
      is_verified BOOLEAN DEFAULT 0
    )
  `);

  // Tabela historii czatów
  db.run(`
    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      response TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_favorite BOOLEAN DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Tabela sesji
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);
});

// Funkcje pomocnicze
const database = {
  // Utwórz użytkownika
  createUser: async (email, password, name) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
        [email, hashedPassword, name],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, email, name });
        }
      );
    });
  },

  // Znajdź użytkownika po emailu
  findUserByEmail: (email) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE email = ?',
        [email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  // Znajdź użytkownika po ID
  findUserById: (id) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT id, email, name, subscription_type, created_at FROM users WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  // Weryfikuj hasło
  verifyPassword: async (password, hashedPassword) => {
    return bcrypt.compare(password, hashedPassword);
  },

  // Zapisz historię czatu
  saveChatHistory: (userId, message, response) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO chat_history (user_id, message, response) VALUES (?, ?, ?)',
        [userId, message, response],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  },

  // Pobierz historię czatów użytkownika
  getChatHistory: (userId, limit = 20) => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM chat_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
        [userId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Oznacz czat jako ulubiony
  toggleFavorite: (chatId, userId) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE chat_history SET is_favorite = NOT is_favorite WHERE id = ? AND user_id = ?',
        [chatId, userId],
        function(err) {
          if (err) reject(err);
          else resolve({ affected: this.changes });
        }
      );
    });
  },

  // Pobierz ulubione czaty
  getFavoriteChats: (userId) => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM chat_history WHERE user_id = ? AND is_favorite = 1 ORDER BY created_at DESC',
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Pobierz pojedynczy czat
  getChatById: (chatId, userId) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM chat_history WHERE id = ? AND user_id = ?',
        [chatId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }
};

module.exports = { db, database };