const { DataTypes } = require('sequelize');
const { sequelize } = require('./database');

const Portfolio = sequelize.define('Portfolio', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    validate: {
      notNull: {
        msg: 'User ID is required'
      }
    }
  },
  symbol: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Stock symbol is required'
      },
      len: {
        args: [1, 20],
        msg: 'Stock symbol must be between 1 and 20 characters'
      },
      isUppercase: function(value) {
        if (value !== value.toUpperCase()) {
          throw new Error('Stock symbol must be uppercase');
        }
      }
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: {
        args: [0],
        msg: 'Quantity cannot be negative'
      },
      isInt: {
        msg: 'Quantity must be an integer'
      }
    }
  },
  purchasePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: {
        args: [0],
        msg: 'Purchase price cannot be negative'
      }
    }
  },
  purchaseDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    // Create a unique index on userId and symbol
    {
      unique: true,
      fields: ['userId', 'symbol'],
      name: 'portfolio_user_symbol_unique'
    }
  ],
  hooks: {
    // Normalize stock symbols to uppercase
    beforeValidate: (portfolio) => {
      if (portfolio.symbol) {
        portfolio.symbol = portfolio.symbol.toUpperCase();
      }
    }
  }
});

module.exports = Portfolio;
