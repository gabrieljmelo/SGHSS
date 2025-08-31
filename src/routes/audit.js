const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const AuditController = require('../controllers/AuditController');
const { validate } = require('../middleware/validation');
const { param, query } = require('express-validator');

const router = express.Router();

// Validação de parâmetro ID
const idValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID deve ser um número inteiro válido')
];

// Validações para relatório de usuário
const userReportValidation = [
  query('usuario_id')
    .isInt({ min: 1 })
    .withMessage('ID do usuário deve ser um número inteiro válido'),
  query('data_inicio')
    .optional()
    .isISO8601()
    .withMessage('Data de início deve ser uma data válida'),
  query('data_fim')
    .optional()
    .isISO8601()
    .withMessage('Data de fim deve ser uma data válida')
];

// Validações para export
const exportValidation = [
  query('data_inicio')
    .isISO8601()
    .withMessage('Data de início é obrigatória e deve ser válida'),
  query('data_fim')
    .isISO8601()
    .withMessage('Data de fim é obrigatória e deve ser válida'),
  query('formato')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('Formato deve ser json ou csv')
];

/**
 * @route GET /api/audit
 * @desc Listar logs de auditoria com filtros
 * @access Private (Admin)
 */
router.get('/', 
  authenticateToken,
  authorize('admin'),
  AuditController.list
);

/**
 * @route GET /api/audit/statistics
 * @desc Estatísticas gerais de auditoria
 * @access Private (Admin)
 */
router.get('/statistics', 
  authenticateToken,
  authorize('admin'),
  AuditController.statistics
);

/**
 * @route GET /api/audit/user-activity
 * @desc Relatório de atividades por usuário
 * @access Private (Admin)
 */
router.get('/user-activity', 
  authenticateToken,
  authorize('admin'),
  userReportValidation,
  validate,
  AuditController.userActivityReport
);

/**
 * @route GET /api/audit/security-report
 * @desc Relatório de segurança - tentativas de login
 * @access Private (Admin)
 */
router.get('/security-report', 
  authenticateToken,
  authorize('admin'),
  AuditController.securityReport
);

/**
 * @route GET /api/audit/export
 * @desc Exportar logs para compliance
 * @access Private (Admin)
 */
router.get('/export', 
  authenticateToken,
  authorize('admin'),
  exportValidation,
  validate,
  AuditController.exportLogs
);

/**
 * @route GET /api/audit/:id
 * @desc Obter log específico por ID
 * @access Private (Admin)
 */
router.get('/:id', 
  authenticateToken,
  authorize('admin'),
  idValidation,
  validate,
  AuditController.getById
);

module.exports = router;
