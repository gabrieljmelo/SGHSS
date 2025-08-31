const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const EncryptionUtils = require('../utils/encryption');

const Paciente = sequelize.define('Paciente', {
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
  rg: {
    type: DataTypes.TEXT // Criptografado
  },
  data_nascimento: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  telefone: {
    type: DataTypes.TEXT // Criptografado
  },
  endereco: {
    type: DataTypes.TEXT // Criptografado
  },
  cidade: {
    type: DataTypes.STRING
  },
  estado: {
    type: DataTypes.STRING(2)
  },
  cep: {
    type: DataTypes.STRING(10)
  },
  plano_saude: {
    type: DataTypes.STRING
  },
  numero_carteira: {
    type: DataTypes.TEXT // Criptografado
  },
  contato_emergencia_nome: {
    type: DataTypes.STRING
  },
  contato_emergencia_telefone: {
    type: DataTypes.TEXT // Criptografado
  },
  observacoes_medicas: {
    type: DataTypes.TEXT
  },
  consentimento_lgpd: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  data_consentimento_lgpd: {
    type: DataTypes.DATE
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'pacientes',
  hooks: {
    beforeCreate: (paciente) => {
      // Criptografar dados sensíveis antes de salvar
      if (paciente.cpf) {
        paciente.cpf = JSON.stringify(EncryptionUtils.encrypt(paciente.cpf));
      }
      if (paciente.rg) {
        paciente.rg = JSON.stringify(EncryptionUtils.encrypt(paciente.rg));
      }
      if (paciente.telefone) {
        paciente.telefone = JSON.stringify(EncryptionUtils.encrypt(paciente.telefone));
      }
      if (paciente.endereco) {
        paciente.endereco = JSON.stringify(EncryptionUtils.encrypt(paciente.endereco));
      }
      if (paciente.numero_carteira) {
        paciente.numero_carteira = JSON.stringify(EncryptionUtils.encrypt(paciente.numero_carteira));
      }
      if (paciente.contato_emergencia_telefone) {
        paciente.contato_emergencia_telefone = JSON.stringify(EncryptionUtils.encrypt(paciente.contato_emergencia_telefone));
      }
    },
    beforeUpdate: (paciente) => {
      // Criptografar dados sensíveis antes de atualizar
      if (paciente.changed('cpf') && paciente.cpf) {
        paciente.cpf = JSON.stringify(EncryptionUtils.encrypt(paciente.cpf));
      }
      if (paciente.changed('rg') && paciente.rg) {
        paciente.rg = JSON.stringify(EncryptionUtils.encrypt(paciente.rg));
      }
      if (paciente.changed('telefone') && paciente.telefone) {
        paciente.telefone = JSON.stringify(EncryptionUtils.encrypt(paciente.telefone));
      }
      if (paciente.changed('endereco') && paciente.endereco) {
        paciente.endereco = JSON.stringify(EncryptionUtils.encrypt(paciente.endereco));
      }
      if (paciente.changed('numero_carteira') && paciente.numero_carteira) {
        paciente.numero_carteira = JSON.stringify(EncryptionUtils.encrypt(paciente.numero_carteira));
      }
      if (paciente.changed('contato_emergencia_telefone') && paciente.contato_emergencia_telefone) {
        paciente.contato_emergencia_telefone = JSON.stringify(EncryptionUtils.encrypt(paciente.contato_emergencia_telefone));
      }
    },
    afterFind: (result) => {
      // Descriptografar dados após buscar
      if (!result) return;
      
      const pacientes = Array.isArray(result) ? result : [result];
      
      pacientes.forEach(paciente => {
        if (paciente && paciente.dataValues) {
          try {
            if (paciente.cpf) {
              const encryptedCpf = JSON.parse(paciente.cpf);
              paciente.cpf = EncryptionUtils.decrypt(encryptedCpf);
            }
            if (paciente.rg) {
              const encryptedRg = JSON.parse(paciente.rg);
              paciente.rg = EncryptionUtils.decrypt(encryptedRg);
            }
            if (paciente.telefone) {
              const encryptedTelefone = JSON.parse(paciente.telefone);
              paciente.telefone = EncryptionUtils.decrypt(encryptedTelefone);
            }
            if (paciente.endereco) {
              const encryptedEndereco = JSON.parse(paciente.endereco);
              paciente.endereco = EncryptionUtils.decrypt(encryptedEndereco);
            }
            if (paciente.numero_carteira) {
              const encryptedCarteira = JSON.parse(paciente.numero_carteira);
              paciente.numero_carteira = EncryptionUtils.decrypt(encryptedCarteira);
            }
            if (paciente.contato_emergencia_telefone) {
              const encryptedContato = JSON.parse(paciente.contato_emergencia_telefone);
              paciente.contato_emergencia_telefone = EncryptionUtils.decrypt(encryptedContato);
            }
          } catch (error) {
            console.error('Erro ao descriptografar dados do paciente:', error);
          }
        }
      });
    }
  }
});

// Método para anonimizar dados (LGPD)
Paciente.prototype.anonimizar = function() {
  return {
    id: this.id,
    nome: EncryptionUtils.anonymize(this.nome, 'nome'),
    cpf: EncryptionUtils.anonymize(this.cpf, 'cpf'),
    telefone: EncryptionUtils.anonymize(this.telefone, 'telefone'),
    data_nascimento: this.data_nascimento,
    cidade: this.cidade,
    estado: this.estado,
    plano_saude: this.plano_saude,
    created_at: this.created_at
  };
};

module.exports = Paciente;
