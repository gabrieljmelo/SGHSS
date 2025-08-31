const logger = require('../utils/logger');
const { AuditLog } = require('../models');

/**
 * Middleware global de tratamento de erros
 */
const errorHandler = async (err, req, res, next) => {
  // Log do erro
  logger.error('Erro na aplicação:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  // Registrar erro no audit log se usuário autenticado
  if (req.user) {
    try {
      await AuditLog.create({
        usuario_id: req.user.id,
        acao: 'ERROR',
        recurso_tipo: 'API',
        recurso_id: null,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        sucesso: false,
        erro_mensagem: err.message
      });
    } catch (auditError) {
      logger.error('Erro ao registrar audit log:', auditError);
    }
  }

  // Diferentes tipos de erro
  let statusCode = 500;
  let message = 'Erro interno do servidor';
  let details = {};

  // Erro de validação do Sequelize
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Dados inválidos';
    details = {
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message,
        value: e.value
      }))
    };
  }

  // Erro de constraint única (duplicação)
  else if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'Dados já existem';
    details = {
      field: err.errors[0]?.path,
      message: 'Este valor já está sendo usado por outro registro'
    };
  }

  // Erro de foreign key
  else if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Referência inválida';
    details = {
      message: 'O recurso referenciado não existe'
    };
  }

  // Erro de sintaxe JSON
  else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'JSON inválido';
    details = {
      message: 'Formato JSON da requisição é inválido'
    };
  }

  // Erro de autenticação JWT
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token inválido';
  }

  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expirado';
  }

  // Erro customizado da aplicação
  else if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details || {};
  }

  // Não expor detalhes internos em produção
  if (process.env.NODE_ENV === 'production') {
    if (statusCode === 500) {
      message = 'Erro interno do servidor';
      details = {};
    }
  } else {
    // Em desenvolvimento, incluir stack trace
    details.stack = err.stack;
  }

  res.status(statusCode).json({
    error: message,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    statusCode,
    ...details
  });
};

/**
 * Middleware para capturar requisições para rotas não encontradas
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Rota não encontrada: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Função para criar erros customizados
 */
const createError = (message, statusCode = 500, details = {}) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
};

module.exports = {
  errorHandler,
  notFoundHandler,
  createError
};
