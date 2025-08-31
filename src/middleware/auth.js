const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');
const logger = require('../utils/logger');

/**
 * Middleware de autenticação JWT
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Token de acesso requerido',
        message: 'Forneça um token válido no header Authorization'
      });
    }

    // Verificar e decodificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuário no banco de dados
    const usuario = await Usuario.findByPk(decoded.userId);
    
    if (!usuario) {
      return res.status(401).json({
        error: 'Usuário não encontrado',
        message: 'Token válido mas usuário não existe'
      });
    }

    if (!usuario.ativo) {
      return res.status(403).json({
        error: 'Usuário inativo',
        message: 'Conta de usuário foi desativada'
      });
    }

    // Adicionar informações do usuário à requisição
    req.user = {
      id: usuario.id,
      email: usuario.email,
      tipo: usuario.tipo
    };

    // Log de acesso para auditoria
    logger.audit('ACCESS', usuario.id, 'API', req.path, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      method: req.method
    });

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token inválido',
        message: 'O token fornecido não é válido'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado',
        message: 'O token fornecido expirou'
      });
    }

    logger.error('Erro na autenticação:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao verificar autenticação'
    });
  }
};

/**
 * Middleware de autorização por tipo de usuário
 */
const authorize = (...allowedTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Usuário não autenticado',
        message: 'Faça login para acessar este recurso'
      });
    }

    if (!allowedTypes.includes(req.user.tipo)) {
      logger.audit('UNAUTHORIZED_ACCESS', req.user.id, 'API', req.path, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requiredTypes: allowedTypes,
        userType: req.user.tipo
      });

      return res.status(403).json({
        error: 'Acesso negado',
        message: `Apenas usuários do tipo: ${allowedTypes.join(', ')} podem acessar este recurso`
      });
    }

    next();
  };
};

/**
 * Middleware para verificar se o usuário pode acessar apenas seus próprios dados
 */
const authorizeOwnerOrAdmin = (resourceUserIdField = 'usuario_id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Usuário não autenticado'
      });
    }

    // Administradores podem acessar qualquer recurso
    if (req.user.tipo === 'admin') {
      return next();
    }

    // Verificar se o usuário está tentando acessar seus próprios dados
    const resourceUserId = req.params.id || req.body[resourceUserIdField];
    
    if (resourceUserId && resourceUserId !== req.user.id) {
      logger.audit('UNAUTHORIZED_RESOURCE_ACCESS', req.user.id, 'API', req.path, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        attemptedResourceUserId: resourceUserId
      });

      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Você só pode acessar seus próprios dados'
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorize,
  authorizeOwnerOrAdmin
};
