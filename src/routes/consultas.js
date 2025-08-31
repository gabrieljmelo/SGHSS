const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const ConsultaController = require('../controllers/ConsultaController');
const { validate } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

const router = express.Router();

// Validações para criação de consulta
const createConsultaValidation = [
  body('paciente_id')
    .isInt({ min: 1 })
    .withMessage('ID do paciente deve ser um número inteiro válido'),
  body('profissional_id')
    .isInt({ min: 1 })
    .withMessage('ID do profissional deve ser um número inteiro válido'),
  body('data_consulta')
    .isISO8601()
    .toDate()
    .withMessage('Data da consulta deve ser uma data válida'),
  body('tipo_consulta')
    .isIn(['consulta', 'retorno', 'emergencia', 'exame'])
    .withMessage('Tipo de consulta inválido'),
  body('observacoes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Observações não podem exceder 1000 caracteres'),
  body('urgente')
    .optional()
    .isBoolean()
    .withMessage('Campo urgente deve ser verdadeiro ou falso')
];

// Validações para atualização de consulta
const updateConsultaValidation = [
  body('data_consulta')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Data da consulta deve ser uma data válida'),
  body('tipo_consulta')
    .optional()
    .isIn(['consulta', 'retorno', 'emergencia', 'exame'])
    .withMessage('Tipo de consulta inválido'),
  body('status')
    .optional()
    .isIn(['agendada', 'em_andamento', 'concluida', 'cancelada'])
    .withMessage('Status inválido'),
  body('observacoes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Observações não podem exceder 1000 caracteres'),
  body('urgente')
    .optional()
    .isBoolean()
    .withMessage('Campo urgente deve ser verdadeiro ou falso')
];

// Validações para conclusão de consulta
const completeConsultaValidation = [
  body('diagnostico')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Diagnóstico deve ter pelo menos 10 caracteres'),
  body('prescricao')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Prescrição não pode exceder 2000 caracteres'),
  body('observacoes_medicas')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Observações médicas não podem exceder 2000 caracteres'),
  body('exames_solicitados')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Exames solicitados não podem exceder 1000 caracteres'),
  body('retorno_necessario')
    .optional()
    .isBoolean()
    .withMessage('Campo retorno necessário deve ser verdadeiro ou falso'),
  body('data_retorno')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Data de retorno deve ser uma data válida')
];

// Validações para cancelamento
const cancelConsultaValidation = [
  body('motivo_cancelamento')
    .trim()
    .isLength({ min: 5 })
    .withMessage('Motivo do cancelamento deve ter pelo menos 5 caracteres')
];

// Validação de parâmetro ID
const idValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID deve ser um número inteiro válido')
];

/**
 * @route POST /api/consultas
 * @desc Agendar nova consulta
 * @access Private (Admin, Médico, Enfermeiro)
 */
router.post('/', 
  authenticateToken, 
  authorize('admin', 'medico', 'enfermeiro'),
  createConsultaValidation,
  validate,
  ConsultaController.create
);

/**
 * @route GET /api/consultas
 * @desc Listar consultas com filtros
 * @access Private (Todos os tipos de usuário)
 */
router.get('/', 
  authenticateToken,
  ConsultaController.list
);

/**
 * @route GET /api/consultas/report
 * @desc Relatório de consultas
 * @access Private (Admin)
 */
router.get('/report', 
  authenticateToken,
  authorize('admin'),
  ConsultaController.report
);

/**
 * @route GET /api/consultas/:id
 * @desc Obter consulta por ID
 * @access Private (Admin, Médico, Enfermeiro, Paciente relacionado)
 */
router.get('/:id', 
  authenticateToken,
  idValidation,
  validate,
  ConsultaController.getById
);

/**
 * @route PUT /api/consultas/:id
 * @desc Atualizar consulta
 * @access Private (Admin, Médico, Enfermeiro responsável)
 */
router.put('/:id', 
  authenticateToken,
  authorize('admin', 'medico', 'enfermeiro'),
  idValidation,
  updateConsultaValidation,
  validate,
  ConsultaController.update
);

/**
 * @route POST /api/consultas/:id/cancel
 * @desc Cancelar consulta
 * @access Private (Admin, Médico, Enfermeiro, Paciente relacionado)
 */
router.post('/:id/cancel', 
  authenticateToken,
  idValidation,
  cancelConsultaValidation,
  validate,
  ConsultaController.cancel
);

/**
 * @route POST /api/consultas/:id/checkin
 * @desc Confirmar comparecimento na consulta
 * @access Private (Admin, Médico, Enfermeiro)
 */
router.post('/:id/checkin', 
  authenticateToken,
  authorize('admin', 'medico', 'enfermeiro'),
  idValidation,
  validate,
  ConsultaController.checkIn
);

/**
 * @route POST /api/consultas/:id/complete
 * @desc Concluir consulta com prontuário
 * @access Private (Admin, Médico, Enfermeiro responsável)
 */
router.post('/:id/complete', 
  authenticateToken,
  authorize('admin', 'medico', 'enfermeiro'),
  idValidation,
  completeConsultaValidation,
  validate,
  ConsultaController.complete
);

module.exports = router;
