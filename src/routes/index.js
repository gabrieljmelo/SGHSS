const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Importar todas as rotas
const authRoutes = require('./auth');
const pacientesRoutes = require('./pacientes');
const profissionaisRoutes = require('./profissionais');
const consultasRoutes = require('./consultas');
const auditRoutes = require('./audit');

/**
 * @route GET /api/health
 * @desc Health check da API
 * @access Public
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'SGHSS API está funcionando',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * @route GET /api/info
 * @desc Informações gerais da API
 * @access Public
 */
router.get('/info', (req, res) => {
  res.json({
    name: 'Sistema de Gestão Hospitalar e de Serviços de Saúde (SGHSS)',
    description: 'API para gerenciamento de hospital com foco em segurança e compliance LGPD',
    version: '1.0.0',
    features: [
      'Autenticação JWT',
      'Gerenciamento de usuários (Admin, Médicos, Enfermeiros, Pacientes)',
      'Agendamento e controle de consultas',
      'Auditoria completa de ações',
      'Criptografia de dados sensíveis',
      'Compliance LGPD',
      'Rate limiting',
      'Validação de dados'
    ],
    endpoints: {
      auth: '/api/auth',
      pacientes: '/api/pacientes',
      profissionais: '/api/profissionais',
      consultas: '/api/consultas',
      audit: '/api/audit'
    },
    documentation: 'Para documentação completa, consulte o README.md do projeto'
  });
});

/**
 * @route GET /api/status
 * @desc Status detalhado do sistema
 * @access Private (Admin)
 */
router.get('/status', 
  authenticateToken,
  authorize('admin'),
  async (req, res) => {
    try {
      const { sequelize } = require('../config/database');
      
      // Testar conexão com banco
      await sequelize.authenticate();
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          api: 'running',
          authentication: 'active'
        },
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        node_version: process.version
      });
      
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
        services: {
          database: 'disconnected',
          api: 'running',
          authentication: 'active'
        }
      });
    }
  }
);

// Registrar todas as rotas
router.use('/auth', authRoutes);
router.use('/pacientes', pacientesRoutes);
router.use('/profissionais', profissionaisRoutes);
router.use('/consultas', consultasRoutes);
router.use('/audit', auditRoutes);

// Middleware para rotas não encontradas
router.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    message: `A rota ${req.originalUrl} não existe`,
    availableEndpoints: {
      health: 'GET /api/health',
      info: 'GET /api/info',
      auth: '/api/auth/*',
      pacientes: '/api/pacientes/*',
      profissionais: '/api/profissionais/*',
      consultas: '/api/consultas/*',
      audit: '/api/audit/*'
    }
  });
});

module.exports = router;
