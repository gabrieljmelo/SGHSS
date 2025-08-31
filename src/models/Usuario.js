const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const EncryptionUtils = require('../utils/encryption');

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  senha: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  tipo: {
    type: DataTypes.ENUM('admin', 'medico', 'enfermeiro', 'recepcionista', 'paciente'),
    allowNull: false,
    defaultValue: 'paciente'
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  ultimo_login: {
    type: DataTypes.DATE
  },
  tentativas_login: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  bloqueado_ate: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'usuarios',
  hooks: {
    beforeCreate: async (usuario) => {
      if (usuario.senha) {
        usuario.senha = await EncryptionUtils.hashPassword(usuario.senha);
      }
    },
    beforeUpdate: async (usuario) => {
      if (usuario.changed('senha') && usuario.senha) {
        usuario.senha = await EncryptionUtils.hashPassword(usuario.senha);
      }
    }
  }
});

// Método para verificar senha
Usuario.prototype.verificarSenha = async function(senha) {
  return await EncryptionUtils.verifyPassword(senha, this.senha);
};

// Método para serializar dados (sem dados sensíveis)
Usuario.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.senha;
  return values;
};

module.exports = Usuario;
