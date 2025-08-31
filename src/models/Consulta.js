const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Consulta = sequelize.define('Consulta', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  paciente_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'pacientes',
      key: 'id'
    }
  },
  profissional_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'profissionais',
      key: 'id'
    }
  },
  data_consulta: {
    type: DataTypes.DATE,
    allowNull: false
  },
  tipo: {
    type: DataTypes.ENUM('presencial', 'telemedicina'),
    defaultValue: 'presencial'
  },
  status: {
    type: DataTypes.ENUM('agendada', 'em_andamento', 'concluida', 'cancelada', 'nao_compareceu'),
    defaultValue: 'agendada'
  },
  motivo: {
    type: DataTypes.TEXT
  },
  sintomas: {
    type: DataTypes.TEXT
  },
  diagnostico: {
    type: DataTypes.TEXT
  },
  prescricao: {
    type: DataTypes.TEXT
  },
  observacoes: {
    type: DataTypes.TEXT
  },
  valor: {
    type: DataTypes.DECIMAL(10, 2)
  },
  forma_pagamento: {
    type: DataTypes.ENUM('dinheiro', 'cartao', 'pix', 'plano_saude')
  },
  sala: {
    type: DataTypes.STRING
  },
  link_telemedicina: {
    type: DataTypes.TEXT
  },
  duracao_minutos: {
    type: DataTypes.INTEGER
  }
}, {
  tableName: 'consultas'
});

module.exports = Consulta;
