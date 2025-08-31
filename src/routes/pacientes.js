const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const PacienteController = require('../controllers/PacienteController');
const { validate } = require('../middleware/validation');
const { body, param } = require('express-validator');

const router = express.Router();

// Validações para criação de paciente
const createPacienteValidation = [
  body('nome')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Nome deve ter pelo menos 2 caracteres'),
  body('cpf')
    .matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)
    .withMessage('CPF deve estar no formato XXX.XXX.XXX-XX'),
  body('data_nascimento')
    .isISO8601()
    .toDate()
    .withMessage('Data de nascimento deve ser uma data válida'),
  body('telefone')
    .matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)
    .withMessage('Telefone deve estar no formato (XX) XXXXX-XXXX'),
  body('endereco')
    .trim()
    .isLength({ min: 5 })
    .withMessage('Endereço deve ter pelo menos 5 caracteres'),
  body('cidade')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Cidade deve ter pelo menos 2 caracteres'),
  body('estado')
    .isLength({ min: 2, max: 2 })
    .withMessage('Estado deve ter 2 caracteres'),
  body('cep')
    .matches(/^\d{5}-\d{3}$/)
    .withMessage('CEP deve estar no formato XXXXX-XXX'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email deve ser válido'),
  body('senha')
    .isLength({ min: 8 })
    .withMessage('Senha deve ter no mínimo 8 caracteres'),
  body('consentimento_lgpd')
    .optional()
    .isBoolean()
    .withMessage('Consentimento LGPD deve ser verdadeiro ou falso')
];

// Validações para atualização de paciente
const updatePacienteValidation = [
  body('nome')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Nome deve ter pelo menos 2 caracteres'),
  body('telefone')
    .optional()
    .matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)
    .withMessage('Telefone deve estar no formato (XX) XXXXX-XXXX'),
  body('endereco')
    .optional()
    .trim()
    .isLength({ min: 5 })
    .withMessage('Endereço deve ter pelo menos 5 caracteres'),
  body('cidade')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Cidade deve ter pelo menos 2 caracteres'),
  body('estado')
    .optional()
    .isLength({ min: 2, max: 2 })
    .withMessage('Estado deve ter 2 caracteres'),
  body('cep')
    .optional()
    .matches(/^\d{5}-\d{3}$/)
    .withMessage('CEP deve estar no formato XXXXX-XXX')
];

// Validação de parâmetro ID
const idValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID deve ser um número inteiro válido')
];

/**
 * @route POST /api/pacientes
 * @desc Criar novo paciente
 * @access Private (Admin, Médico, Enfermeiro)
 */
router.post('/', 
  authenticateToken, 
  authorize('admin', 'medico', 'enfermeiro'),
  createPacienteValidation,
  validate,
  PacienteController.create
);

/**
 * @route GET /api/pacientes
 * @desc Listar pacientes com paginação
 * @access Private (Todos os tipos de usuário)
 */
router.get('/', 
  authenticateToken,
  PacienteController.list
);

/**
 * @route GET /api/pacientes/statistics
 * @desc Obter estatísticas de pacientes
 * @access Private (Admin)
 */
router.get('/statistics', 
  authenticateToken,
  authorize('admin'),
  PacienteController.statistics
);

/**
 * @route GET /api/pacientes/:id
 * @desc Obter paciente por ID
 * @access Private (Admin, Médico, Enfermeiro, próprio Paciente)
 */
router.get('/:id', 
  authenticateToken,
  idValidation,
  validate,
  PacienteController.getById
);

/**
 * @route PUT /api/pacientes/:id
 * @desc Atualizar dados do paciente
 * @access Private (Admin, Médico, Enfermeiro, próprio Paciente)
 */
router.put('/:id', 
  authenticateToken,
  idValidation,
  updatePacienteValidation,
  validate,
  PacienteController.update
);

/**
 * @route DELETE /api/pacientes/:id/deactivate
 * @desc Desativar paciente (soft delete)
 * @access Private (Admin)
 */
router.delete('/:id/deactivate', 
  authenticateToken,
  authorize('admin'),
  idValidation,
  validate,
  PacienteController.deactivate
);

/**
 * @route POST /api/pacientes/:id/anonymize
 * @desc Anonimizar dados do paciente (LGPD)
 * @access Private (Admin)
 */
router.post('/:id/anonymize', 
  authenticateToken,
  authorize('admin'),
  idValidation,
  validate,
  PacienteController.anonymize
);

module.exports = router;
