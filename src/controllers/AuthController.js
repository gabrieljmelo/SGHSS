const jwt = require('jsonwebtoken');
const { Usuario, Paciente, Profissional } = require('../models');
const logger = require('../utils/logger');
const { createError } = require('../middleware/errorHandler');
const EncryptionUtils = require('../utils/encryption');

/**
 * Controller de autenticação
 */
class AuthController {
  /**
   * Login de usuário
   */
  static async login(req, res, next) {
    try {
      const { email, senha } = req.body;

      // Buscar usuário por email
      const usuario = await Usuario.findOne({ 
        where: { email },
        include: [
          { model: Paciente, as: 'paciente' },
          { model: Profissional, as: 'profissional' }
        ]
      });

      if (!usuario) {
        logger.audit('LOGIN_FAILED', null, 'AUTH', email, {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          reason: 'User not found'
        });
        
        throw createError('Credenciais inválidas', 401);
      }

      // Verificar se conta está ativa
      if (!usuario.ativo) {
        logger.audit('LOGIN_FAILED', usuario.id, 'AUTH', email, {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          reason: 'Account inactive'
        });
        
        throw createError('Conta desativada', 403);
      }

      // Verificar se conta está bloqueada
      if (usuario.bloqueado_ate && new Date() < usuario.bloqueado_ate) {
        logger.audit('LOGIN_FAILED', usuario.id, 'AUTH', email, {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          reason: 'Account blocked'
        });
        
        throw createError('Conta temporariamente bloqueada', 423);
      }

      // Verificar senha
      const senhaValida = await usuario.verificarSenha(senha);
      
      if (!senhaValida) {
        // Incrementar tentativas de login
        await usuario.update({
          tentativas_login: usuario.tentativas_login + 1,
          bloqueado_ate: usuario.tentativas_login >= 4 ? 
            new Date(Date.now() + 15 * 60 * 1000) : null // Bloquear por 15 minutos após 5 tentativas
        });

        logger.audit('LOGIN_FAILED', usuario.id, 'AUTH', email, {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          reason: 'Invalid password',
          attempts: usuario.tentativas_login + 1
        });
        
        throw createError('Credenciais inválidas', 401);
      }

      // Reset tentativas e atualizar último login
      await usuario.update({
        tentativas_login: 0,
        bloqueado_ate: null,
        ultimo_login: new Date()
      });

      // Gerar token JWT
      const token = jwt.sign(
        { 
          userId: usuario.id,
          email: usuario.email,
          tipo: usuario.tipo
        },
        process.env.JWT_SECRET,
        { 
          expiresIn: process.env.JWT_EXPIRES_IN || '24h',
          issuer: 'SGHSS',
          audience: 'sghss-api'
        }
      );

      // Log de sucesso
      logger.audit('LOGIN_SUCCESS', usuario.id, 'AUTH', email, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Preparar resposta com dados do usuário
      const userData = {
        id: usuario.id,
        email: usuario.email,
        tipo: usuario.tipo,
        ultimo_login: usuario.ultimo_login
      };

      // Adicionar dados específicos do tipo de usuário
      if (usuario.paciente) {
        userData.paciente = {
          id: usuario.paciente.id,
          nome: usuario.paciente.nome,
          consentimento_lgpd: usuario.paciente.consentimento_lgpd
        };
      }

      if (usuario.profissional) {
        userData.profissional = {
          id: usuario.profissional.id,
          nome: usuario.profissional.nome,
          cargo: usuario.profissional.cargo,
          especialidade: usuario.profissional.especialidade
        };
      }

      res.json({
        message: 'Login realizado com sucesso',
        token,
        usuario: userData,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Registro de novo usuário
   */
  static async register(req, res, next) {
    try {
      const { email, senha, tipo } = req.body;

      // Verificar se email já existe
      const usuarioExistente = await Usuario.findOne({ where: { email } });
      
      if (usuarioExistente) {
        logger.audit('REGISTER_FAILED', null, 'AUTH', email, {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          reason: 'Email already exists'
        });
        
        throw createError('Email já está em uso', 409);
      }

      // Criar usuário
      const novoUsuario = await Usuario.create({
        email,
        senha,
        tipo
      });

      // Log de sucesso
      logger.audit('REGISTER_SUCCESS', novoUsuario.id, 'AUTH', email, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        tipo
      });

      res.status(201).json({
        message: 'Usuário criado com sucesso',
        usuario: {
          id: novoUsuario.id,
          email: novoUsuario.email,
          tipo: novoUsuario.tipo,
          ativo: novoUsuario.ativo
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Verificar token e retornar dados do usuário
   */
  static async me(req, res, next) {
    try {
      const usuario = await Usuario.findByPk(req.user.id, {
        include: [
          { model: Paciente, as: 'paciente' },
          { model: Profissional, as: 'profissional' }
        ]
      });

      if (!usuario) {
        throw createError('Usuário não encontrado', 404);
      }

      const userData = {
        id: usuario.id,
        email: usuario.email,
        tipo: usuario.tipo,
        ativo: usuario.ativo,
        ultimo_login: usuario.ultimo_login
      };

      if (usuario.paciente) {
        userData.paciente = usuario.paciente;
      }

      if (usuario.profissional) {
        userData.profissional = usuario.profissional;
      }

      res.json({
        usuario: userData
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout (invalidar token - implementação básica)
   */
  static async logout(req, res, next) {
    try {
      // Log de logout
      logger.audit('LOGOUT', req.user.id, 'AUTH', req.user.email, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Logout realizado com sucesso'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Verificar token de autenticação
   */
  static async verifyToken(req, res, next) {
    try {
      // O token já foi verificado pelo middleware authenticateToken
      res.json({
        valid: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          tipo: req.user.tipo
        },
        message: 'Token válido'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Obter perfil do usuário logado (alias para me)
   */
  static async getProfile(req, res, next) {
    return AuthController.me(req, res, next);
  }

  /**
   * Alterar senha
   */
  static async changePassword(req, res, next) {
    try {
      const { senhaAtual, novaSenha } = req.body;

      const usuario = await Usuario.findByPk(req.user.id);
      
      if (!usuario) {
        throw createError('Usuário não encontrado', 404);
      }

      // Verificar senha atual
      const senhaValida = await usuario.verificarSenha(senhaAtual);
      
      if (!senhaValida) {
        logger.audit('PASSWORD_CHANGE_FAILED', usuario.id, 'AUTH', usuario.email, {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          reason: 'Invalid current password'
        });
        
        throw createError('Senha atual incorreta', 401);
      }

      // Atualizar senha
      await usuario.update({ senha: novaSenha });

      logger.audit('PASSWORD_CHANGE_SUCCESS', usuario.id, 'AUTH', usuario.email, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Senha alterada com sucesso'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Atualizar perfil do usuário
   */
  static async updateProfile(req, res, next) {
    try {
      const { email } = req.body;
      
      const usuario = await Usuario.findByPk(req.user.id);
      
      if (!usuario) {
        throw createError('Usuário não encontrado', 404);
      }

      // Verificar se email já existe
      if (email && email !== usuario.email) {
        const emailExiste = await Usuario.findOne({ where: { email } });
        if (emailExiste) {
          throw createError('Este email já está em uso', 409);
        }
      }

      // Atualizar dados
      if (email) {
        await usuario.update({ email });
      }

      logger.audit('PROFILE_UPDATED', usuario.id, 'AUTH', usuario.email, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        changes: { email: !!email }
      });

      res.json({
        message: 'Perfil atualizado com sucesso',
        usuario: {
          id: usuario.id,
          email: usuario.email,
          tipo: usuario.tipo
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Renovar token de autenticação
   */
  static async refreshToken(req, res, next) {
    try {
      const usuario = await Usuario.findByPk(req.user.id);
      
      if (!usuario || !usuario.ativo) {
        throw createError('Usuário não encontrado ou inativo', 404);
      }

      // Gerar novo token
      const novoToken = jwt.sign(
        { 
          id: usuario.id, 
          email: usuario.email, 
          tipo: usuario.tipo 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
      );

      // Log de refresh
      logger.audit('TOKEN_REFRESHED', usuario.id, 'AUTH', usuario.email, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Token renovado com sucesso',
        token: novoToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '1h'
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
