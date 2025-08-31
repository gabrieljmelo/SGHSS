const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Profissional = sequelize.define('Profissional', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  usuario_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cpf: {
    type: DataTypes.TEXT, // Criptografado
    allowNull: false,
    unique: true
  },
  crm: {
    type: DataTypes.STRING,
    unique: true
  },
  coren: {
    type: DataTypes.STRING,
    unique: true
  },
  especialidade: {
    type: DataTypes.STRING
  },
  telefone: {
    type: DataTypes.TEXT // Criptografado
  },
  cargo: {
    type: DataTypes.ENUM('medico', 'enfermeiro', 'tecnico_enfermagem', 'fisioterapeuta', 'psicologo', 'admin'),
    allowNull: false
  },
  departamento: {
    type: DataTypes.STRING
  },
  data_admissao: {
    type: DataTypes.DATEONLY
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  pode_prescrever: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  pode_telemedicina: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'profissionais'
});

module.exports = Profissional;
