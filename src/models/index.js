const Usuario = require('./Usuario');
const Paciente = require('./Paciente');
const Profissional = require('./Profissional');
const Consulta = require('./Consulta');
const AuditLog = require('./AuditLog');

// Definir associações entre modelos
Usuario.hasOne(Paciente, { foreignKey: 'usuario_id', as: 'paciente' });
Paciente.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

Usuario.hasOne(Profissional, { foreignKey: 'usuario_id', as: 'profissional' });
Profissional.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

Paciente.hasMany(Consulta, { foreignKey: 'paciente_id', as: 'consultas' });
Consulta.belongsTo(Paciente, { foreignKey: 'paciente_id', as: 'paciente' });

Profissional.hasMany(Consulta, { foreignKey: 'profissional_id', as: 'consultas' });
Consulta.belongsTo(Profissional, { foreignKey: 'profissional_id', as: 'profissional' });

Usuario.hasMany(AuditLog, { foreignKey: 'usuario_id', as: 'logs' });
AuditLog.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

module.exports = {
  Usuario,
  Paciente,
  Profissional,
  Consulta,
  AuditLog
};
