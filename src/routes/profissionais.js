const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const ProfissionalController = require('../controllers/ProfissionalController');
const { validate } = require('../middleware/validation');
const { body, param } = require('express-validator');

const router = express.Router();

// Validações para criação de profissional
const createProfissionalValidation = [
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
  body('especialidade')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Especialidade é obrigatória'),
  body('registro_profissional')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Registro profissional é obrigatório'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email deve ser válido'),
  body('senha')
    .isLength({ min: 8 })
    .withMessage('Senha deve ter no mínimo 8 caracteres'),
  body('crm')
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage('CRM deve ter pelo menos 3 caracteres'),
  body('cfm')
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage('CFM deve ter pelo menos 3 caracteres')
];

// Validações para atualização de profissional
const updateProfissionalValidation = [
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
    .withMessage('CEP deve estar no formato XXXXX-XXX'),
  body('especialidade')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Especialidade deve ter pelo menos 2 caracteres'),
  body('horario_atendimento')
    .optional()
    .trim()
    .isLength({ min: 5 })
    .withMessage('Horário de atendimento deve ser especificado')
];

// Validação de parâmetro ID
const idValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID deve ser um número inteiro válido')
];

// Validação de especialidade
const especialidadeValidation = [
  param('especialidade')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Especialidade deve ter pelo menos 2 caracteres')
];

/**
 * @route POST /api/profissionais
 * @desc Criar novo profissional
 * @access Private (Admin)
 */
router.post('/', 
  authenticateToken, 
  authorize('admin'),
  createProfissionalValidation,
  validate,
  ProfissionalController.create
);

/**
 * @route GET /api/profissionais
 * @desc Listar profissionais com paginação
 * @access Private (Todos os tipos de usuário)
 */
router.get('/', 
  authenticateToken,
  ProfissionalController.list
);

/**
 * @route GET /api/profissionais/statistics
 * @desc Obter estatísticas de profissionais
 * @access Private (Admin)
 */
router.get('/statistics', 
  authenticateToken,
  authorize('admin'),
  ProfissionalController.statistics
);

/**
 * @route GET /api/profissionais/especialidade/:especialidade
 * @desc Listar profissionais por especialidade
 * @access Private (Todos os tipos de usuário)
 */
router.get('/especialidade/:especialidade', 
  authenticateToken,
  especialidadeValidation,
  validate,
  ProfissionalController.listBySpecialty
);

/**
 * @route GET /api/profissionais/:id
 * @desc Obter profissional por ID
 * @access Private (Admin, próprio Profissional)
 */
router.get('/:id', 
  authenticateToken,
  idValidation,
  validate,
  ProfissionalController.getById
);

/**
 * @route GET /api/profissionais/:id/agenda
 * @desc Obter agenda do profissional
 * @access Private (Admin, Médico, Enfermeiro)
 */
router.get('/:id/agenda', 
  authenticateToken,
  authorize('admin', 'medico', 'enfermeiro'),
  idValidation,
  validate,
  ProfissionalController.getSchedule
);

/**
 * @route PUT /api/profissionais/:id
 * @desc Atualizar dados do profissional
 * @access Private (Admin, próprio Profissional)
 */
router.put('/:id', 
  authenticateToken,
  idValidation,
  updateProfissionalValidation,
  validate,
  ProfissionalController.update
);

/**
 * @route DELETE /api/profissionais/:id/deactivate
 * @desc Desativar profissional
 * @access Private (Admin)
 */
router.delete('/:id/deactivate', 
  authenticateToken,
  authorize('admin'),
  idValidation,
  validate,
  ProfissionalController.deactivate
);

module.exports = router;
