const { RateLimiterMemory } = require('rate-limiter-flexible');
const logger = require('../utils/logger');

// Configurações de rate limiting
const rateLimiters = {
  // Rate limiter geral (100 req/15min por IP)
  general: new RateLimiterMemory({
    keyPrefix: 'general',
    points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 1000 || 900, // 15 minutos
  }),

  // Rate limiter para login (5 tentativas/15min por IP)
  login: new RateLimiterMemory({
    keyPrefix: 'login',
    points: 5,
    duration: 900, // 15 minutos
    blockDuration: 900, // Bloquear por 15 minutos após limite atingido
  }),

  // Rate limiter para registro (3 registros/hora por IP)
  register: new RateLimiterMemory({
    keyPrefix: 'register',
    points: 3,
    duration: 3600, // 1 hora
    blockDuration: 3600,
  }),

  // Rate limiter para APIs sensíveis (10 req/min)
  sensitive: new RateLimiterMemory({
    keyPrefix: 'sensitive',
    points: 10,
    duration: 60, // 1 minuto
    blockDuration: 300, // Bloquear por 5 minutos
  })
};

/**
 * Middleware de rate limiting geral
 */
const generalRateLimit = async (req, res, next) => {
  try {
    const key = req.ip;
    await rateLimiters.general.consume(key);
    next();
  } catch (rejRes) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent'),
      resetTime: secs
    });

    res.set('Retry-After', String(secs));
    res.status(429).json({
      error: 'Muitas requisições',
      message: `Limite de requisições excedido. Tente novamente em ${secs} segundos.`,
      retryAfter: secs
    });
  }
};

/**
 * Rate limiter específico para login
 */
const loginRateLimit = async (req, res, next) => {
  try {
    const key = req.ip;
    await rateLimiters.login.consume(key);
    next();
  } catch (rejRes) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    
    logger.warn(`Login rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      email: req.body.email,
      userAgent: req.get('User-Agent'),
      resetTime: secs
    });

    res.set('Retry-After', String(secs));
    res.status(429).json({
      error: 'Muitas tentativas de login',
      message: `Muitas tentativas de login falharam. Tente novamente em ${Math.ceil(secs / 60)} minutos.`,
      retryAfter: secs
    });
  }
};

/**
 * Rate limiter para registro de usuários
 */
const registerRateLimit = async (req, res, next) => {
  try {
    const key = req.ip;
    await rateLimiters.register.consume(key);
    next();
  } catch (rejRes) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    
    logger.warn(`Register rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      email: req.body.email,
      userAgent: req.get('User-Agent'),
      resetTime: secs
    });

    res.set('Retry-After', String(secs));
    res.status(429).json({
      error: 'Muitos registros',
      message: `Limite de registros excedido. Tente novamente em ${Math.ceil(secs / 60)} minutos.`,
      retryAfter: secs
    });
  }
};

/**
 * Rate limiter para APIs sensíveis (dados de pacientes, etc.)
 */
const sensitiveRateLimit = async (req, res, next) => {
  try {
    const key = req.ip;
    await rateLimiters.sensitive.consume(key);
    next();
  } catch (rejRes) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    
    logger.warn(`Sensitive API rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      path: req.path,
      userId: req.user?.id,
      userAgent: req.get('User-Agent'),
      resetTime: secs
    });

    res.set('Retry-After', String(secs));
    res.status(429).json({
      error: 'Muitas requisições sensíveis',
      message: `Limite de requisições para dados sensíveis excedido. Tente novamente em ${secs} segundos.`,
      retryAfter: secs
    });
  }
};

module.exports = {
  generalRateLimit,
  loginRateLimit,
  registerRateLimit,
  sensitiveRateLimit
};
