const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  usuario_id: {
    type: DataTypes.UUID,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  acao: {
    type: DataTypes.STRING,
    allowNull: false
  },
  recurso_tipo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  recurso_id: {
    type: DataTypes.UUID
  },
  dados_anteriores: {
    type: DataTypes.TEXT
  },
  dados_novos: {
    type: DataTypes.TEXT
  },
  ip_address: {
    type: DataTypes.STRING
  },
  user_agent: {
    type: DataTypes.TEXT
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  sucesso: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  erro_mensagem: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'audit_logs',
  indexes: [
    {
      fields: ['usuario_id']
    },
    {
      fields: ['acao']
    },
    {
      fields: ['recurso_tipo']
    },
    {
      fields: ['timestamp']
    }
  ]
});

module.exports = AuditLog;
