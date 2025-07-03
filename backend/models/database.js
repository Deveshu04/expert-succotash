const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const DB_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Create the database connection with better options
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(DB_DIR, 'stocksense.sqlite'),
  logging: process.env.NODE_ENV === 'development',
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: false
  }
});

// Test the connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
}

// Initialize database and sync models
async function initDatabase() {
  try {
    // Import models
    const User = require('./user');
    const Portfolio = require('./portfolio');

    // Define associations
    User.hasMany(Portfolio, {
      foreignKey: 'userId',
      onDelete: 'CASCADE' // Delete portfolios when user is deleted
    });
    Portfolio.belongsTo(User, { foreignKey: 'userId' });

    // Sync models with database - use force: false in production
    const syncOptions = {
      alter: process.env.NODE_ENV === 'development',
      force: false
    };

    await sequelize.sync(syncOptions);
    console.log('Database synchronized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}

module.exports = {
  sequelize,
  testConnection,
  initDatabase
};
