const { body, param, query, validationResult } = require('express-validator');
const { createError } = require('./errorHandler');

/**
 * Middleware para verificar resultados de validação
 */
const checkValidationResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = createError('Dados de entrada inválidos', 400, {
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
    return next(error);
  }
  next();
};

/**
 * Validações para autenticação
 */
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Email deve ter um formato válido')
    .normalizeEmail(),
  body('senha')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres'),
  checkValidationResult
];

const validateRegister = [
  body('email')
    .isEmail()
    .withMessage('Email deve ter um formato válido')
    .normalizeEmail(),
  body('senha')
    .isLength({ min: 8 })
    .withMessage('Senha deve ter pelo menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula e 1 número'),
  body('tipo')
    .isIn(['admin', 'medico', 'enfermeiro', 'recepcionista', 'paciente'])
    .withMessage('Tipo de usuário inválido'),
  checkValidationResult
];

/**
 * Validações para pacientes
 */
const validatePaciente = [
  body('nome')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('cpf')
    .matches(/^\d{11}$/)
    .withMessage('CPF deve conter exatamente 11 dígitos'),
  body('data_nascimento')
    .isDate()
    .withMessage('Data de nascimento deve ser uma data válida'),
  body('telefone')
    .optional()
    .matches(/^\d{10,11}$/)
    .withMessage('Telefone deve ter 10 ou 11 dígitos'),
  body('email')
    .isEmail()
    .withMessage('Email deve ter um formato válido')
    .normalizeEmail(),
  body('cep')
    .optional()
    .matches(/^\d{8}$/)
    .withMessage('CEP deve ter 8 dígitos'),
  body('consentimento_lgpd')
    .isBoolean()
    .withMessage('Consentimento LGPD deve ser verdadeiro ou falso'),
  checkValidationResult
];

const validatePacienteUpdate = [
  body('nome')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('telefone')
    .optional()
    .matches(/^\d{10,11}$/)
    .withMessage('Telefone deve ter 10 ou 11 dígitos'),
  body('cep')
    .optional()
    .matches(/^\d{8}$/)
    .withMessage('CEP deve ter 8 dígitos'),
  checkValidationResult
];

/**
 * Validações para profissionais
 */
const validateProfissional = [
  body('nome')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('cpf')
    .matches(/^\d{11}$/)
    .withMessage('CPF deve conter exatamente 11 dígitos'),
  body('cargo')
    .isIn(['medico', 'enfermeiro', 'tecnico_enfermagem', 'fisioterapeuta', 'psicologo', 'admin'])
    .withMessage('Cargo inválido'),
  body('crm')
    .optional()
    .isLength({ min: 4, max: 10 })
    .withMessage('CRM deve ter entre 4 e 10 caracteres'),
  body('coren')
    .optional()
    .isLength({ min: 6, max: 15 })
    .withMessage('COREN deve ter entre 6 e 15 caracteres'),
  checkValidationResult
];

/**
 * Validações para consultas
 */
const validateConsulta = [
  body('paciente_id')
    .isUUID()
    .withMessage('ID do paciente deve ser um UUID válido'),
  body('profissional_id')
    .isUUID()
    .withMessage('ID do profissional deve ser um UUID válido'),
  body('data_consulta')
    .isISO8601()
    .withMessage('Data da consulta deve ser uma data válida'),
  body('tipo')
    .isIn(['presencial', 'telemedicina'])
    .withMessage('Tipo de consulta inválido'),
  body('motivo')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Motivo deve ter no máximo 500 caracteres'),
  checkValidationResult
];

/**
 * Validação de UUID em parâmetros
 */
const validateUUID = [
  param('id').isUUID().withMessage('ID deve ser um UUID válido'),
  checkValidationResult
];

/**
 * Validações para query parameters
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número maior que 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser um número entre 1 e 100'),
  checkValidationResult
];

/**
 * Validação customizada para CPF
 */
const isValidCPF = (cpf) => {
  cpf = cpf.replace(/[^\d]/g, '');
  
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  return remainder === parseInt(cpf.charAt(10));
};

// Adicionar validação customizada de CPF
body('cpf').custom((value) => {
  if (!isValidCPF(value)) {
    throw new Error('CPF inválido');
  }
  return true;
});

module.exports = {
  validateLogin,
  validateRegister,
  validatePaciente,
  validatePacienteUpdate,
  validateProfissional,
  validateConsulta,
  validateUUID,
  validatePagination,
  checkValidationResult,
  validate: checkValidationResult  // Adicionar alias
};
