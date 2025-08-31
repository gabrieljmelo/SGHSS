const { AuditLog, Usuario } = require('../models');
const logger = require('../utils/logger');
const { createError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

/**
 * Controller para gerenciamento de logs de auditoria
 */
class AuditController {
  /**
   * Listar logs de auditoria com filtros (apenas admins)
   */
  static async list(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;
      
      const { 
        usuario_id, 
        acao, 
        recurso_tipo, 
        data_inicio, 
        data_fim,
        ip 
      } = req.query;

      let whereClause = {};

      // Filtros
      if (usuario_id) {
        whereClause.usuario_id = usuario_id;
      }

      if (acao) {
        whereClause.acao = acao;
      }

      if (recurso_tipo) {
        whereClause.recurso_tipo = recurso_tipo;
      }

      if (ip) {
        whereClause['detalhes.ip'] = ip;
      }

      // Filtro de data
      if (data_inicio || data_fim) {
        whereClause.created_at = {};
        if (data_inicio) {
          whereClause.created_at[Op.gte] = new Date(data_inicio);
        }
        if (data_fim) {
          whereClause.created_at[Op.lte] = new Date(data_fim + ' 23:59:59');
        }
      }

      const { count, rows: logs } = await AuditLog.findAndCountAll({
        where: whereClause,
        include: [{
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'email', 'tipo']
        }],
        limit,
        offset,
        order: [['created_at', 'DESC']]
      });

      // Log desta consulta
      logger.audit('AUDIT_LOGS_VIEWED', req.user.id, 'AUDIT', null, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        filters: { usuario_id, acao, recurso_tipo, data_inicio, data_fim, ip },
        page,
        limit
      });

      res.json({
        logs,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Obter log específico por ID
   */
  static async getById(req, res, next) {
    try {
      const { id } = req.params;

      const log = await AuditLog.findByPk(id, {
        include: [{
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'email', 'tipo']
        }]
      });

      if (!log) {
        throw createError('Log de auditoria não encontrado', 404);
      }

      // Log desta consulta
      logger.audit('AUDIT_LOG_DETAILED_VIEW', req.user.id, 'AUDIT', log.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        log
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Relatório de atividades por usuário
   */
  static async userActivityReport(req, res, next) {
    try {
      const { usuario_id, data_inicio, data_fim } = req.query;

      if (!usuario_id) {
        throw createError('ID do usuário é obrigatório', 400);
      }

      let whereClause = { usuario_id };

      // Filtro de data
      if (data_inicio || data_fim) {
        whereClause.created_at = {};
        if (data_inicio) {
          whereClause.created_at[Op.gte] = new Date(data_inicio);
        }
        if (data_fim) {
          whereClause.created_at[Op.lte] = new Date(data_fim + ' 23:59:59');
        }
      }

      // Buscar informações do usuário
      const usuario = await Usuario.findByPk(usuario_id, {
        attributes: ['id', 'email', 'tipo', 'ativo', 'created_at', 'ultimo_login']
      });

      if (!usuario) {
        throw createError('Usuário não encontrado', 404);
      }

      // Atividades por ação
      const atividadesPorAcao = await AuditLog.findAll({
        where: whereClause,
        attributes: [
          'acao',
          [require('sequelize').fn('COUNT', require('sequelize').col('acao')), 'total']
        ],
        group: 'acao'
      });

      // Atividades por recurso
      const atividadesPorRecurso = await AuditLog.findAll({
        where: whereClause,
        attributes: [
          'recurso_tipo',
          [require('sequelize').fn('COUNT', require('sequelize').col('recurso_tipo')), 'total']
        ],
        group: 'recurso_tipo'
      });

      // Últimas atividades
      const ultimasAtividades = await AuditLog.findAll({
        where: whereClause,
        limit: 20,
        order: [['created_at', 'DESC']]
      });

      // Total de atividades
      const totalAtividades = await AuditLog.count({ where: whereClause });

      // Log desta consulta
      logger.audit('USER_ACTIVITY_REPORT_GENERATED', req.user.id, 'AUDIT', null, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        target_user_id: usuario_id,
        data_inicio,
        data_fim
      });

      res.json({
        usuario,
        periodo: {
          data_inicio: data_inicio || 'todas',
          data_fim: data_fim || 'todas'
        },
        resumo: {
          total_atividades: totalAtividades,
          atividades_por_acao: atividadesPorAcao,
          atividades_por_recurso: atividadesPorRecurso
        },
        ultimas_atividades: ultimasAtividades
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Relatório de segurança - tentativas de login
   */
  static async securityReport(req, res, next) {
    try {
      const { data_inicio, data_fim, ip } = req.query;

      let whereClause = {
        acao: {
          [Op.in]: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'ACCOUNT_LOCKED', 'PASSWORD_CHANGED']
        }
      };

      // Filtro de IP
      if (ip) {
        whereClause['detalhes.ip'] = ip;
      }

      // Filtro de data
      if (data_inicio || data_fim) {
        whereClause.created_at = {};
        if (data_inicio) {
          whereClause.created_at[Op.gte] = new Date(data_inicio);
        }
        if (data_fim) {
          whereClause.created_at[Op.lte] = new Date(data_fim + ' 23:59:59');
        }
      }

      // Tentativas de login por resultado
      const tentativasPorResultado = await AuditLog.findAll({
        where: whereClause,
        attributes: [
          'acao',
          [require('sequelize').fn('COUNT', require('sequelize').col('acao')), 'total']
        ],
        group: 'acao'
      });

      // IPs com mais tentativas
      const tentativasPorIP = await AuditLog.findAll({
        where: {
          ...whereClause,
          acao: 'LOGIN_FAILED'
        },
        attributes: [
          [require('sequelize').literal('JSON_EXTRACT(detalhes, "$.ip")'), 'ip'],
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'tentativas']
        ],
        group: [require('sequelize').literal('JSON_EXTRACT(detalhes, "$.ip")')],
        order: [[require('sequelize').literal('tentativas'), 'DESC']],
        limit: 10
      });

      // Contas bloqueadas recentemente
      const contasBloqueadas = await AuditLog.findAll({
        where: {
          ...whereClause,
          acao: 'ACCOUNT_LOCKED'
        },
        include: [{
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'email', 'tipo']
        }],
        limit: 10,
        order: [['created_at', 'DESC']]
      });

      // Log desta consulta
      logger.audit('SECURITY_REPORT_GENERATED', req.user.id, 'AUDIT', null, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        filters: { data_inicio, data_fim, ip }
      });

      res.json({
        periodo: {
          data_inicio: data_inicio || 'todas',
          data_fim: data_fim || 'todas'
        },
        tentativas_por_resultado: tentativasPorResultado,
        ips_suspeitos: tentativasPorIP,
        contas_bloqueadas_recentemente: contasBloqueadas
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Exportar logs para compliance (apenas super admin)
   */
  static async exportLogs(req, res, next) {
    try {
      const { data_inicio, data_fim, formato = 'json' } = req.query;

      let whereClause = {};

      // Filtro de data obrigatório para exports
      if (!data_inicio || !data_fim) {
        throw createError('Data de início e fim são obrigatórias para export', 400);
      }

      whereClause.created_at = {
        [Op.gte]: new Date(data_inicio),
        [Op.lte]: new Date(data_fim + ' 23:59:59')
      };

      const logs = await AuditLog.findAll({
        where: whereClause,
        include: [{
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'email', 'tipo']
        }],
        order: [['created_at', 'ASC']]
      });

      // Log desta exportação
      logger.audit('AUDIT_LOGS_EXPORTED', req.user.id, 'AUDIT', null, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        data_inicio,
        data_fim,
        formato,
        total_logs: logs.length
      });

      if (formato === 'csv') {
        // Para CSV, converter para formato tabular
        const csvData = logs.map(log => ({
          id: log.id,
          data: log.created_at,
          usuario_email: log.usuario ? log.usuario.email : 'N/A',
          usuario_tipo: log.usuario ? log.usuario.tipo : 'N/A',
          acao: log.acao,
          recurso_tipo: log.recurso_tipo,
          recurso_id: log.recurso_id,
          ip: log.detalhes?.ip || 'N/A',
          user_agent: log.detalhes?.userAgent || 'N/A'
        }));

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${data_inicio}_${data_fim}.csv`);
        
        // Aqui você implementaria a conversão para CSV
        res.json({
          message: 'Export CSV será implementado',
          data: csvData
        });
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${data_inicio}_${data_fim}.json`);
        
        res.json({
          export_info: {
            data_inicio,
            data_fim,
            total_registros: logs.length,
            exportado_em: new Date(),
            exportado_por: req.user.email
          },
          logs
        });
      }

    } catch (error) {
      next(error);
    }
  }

  /**
   * Estatísticas gerais de auditoria
   */
  static async statistics(req, res, next) {
    try {
      const { data_inicio, data_fim } = req.query;

      let whereClause = {};

      // Filtro de data
      if (data_inicio || data_fim) {
        whereClause.created_at = {};
        if (data_inicio) {
          whereClause.created_at[Op.gte] = new Date(data_inicio);
        }
        if (data_fim) {
          whereClause.created_at[Op.lte] = new Date(data_fim + ' 23:59:59');
        }
      }

      const totalLogs = await AuditLog.count({ where: whereClause });
      
      const logsPorAcao = await AuditLog.findAll({
        where: whereClause,
        attributes: [
          'acao',
          [require('sequelize').fn('COUNT', require('sequelize').col('acao')), 'total']
        ],
        group: 'acao',
        order: [[require('sequelize').literal('total'), 'DESC']]
      });

      const logsPorRecurso = await AuditLog.findAll({
        where: whereClause,
        attributes: [
          'recurso_tipo',
          [require('sequelize').fn('COUNT', require('sequelize').col('recurso_tipo')), 'total']
        ],
        group: 'recurso_tipo',
        order: [[require('sequelize').literal('total'), 'DESC']]
      });

      const usuariosMaisAtivos = await AuditLog.findAll({
        where: whereClause,
        attributes: [
          'usuario_id',
          [require('sequelize').fn('COUNT', require('sequelize').col('usuario_id')), 'total']
        ],
        include: [{
          model: Usuario,
          as: 'usuario',
          attributes: ['email', 'tipo']
        }],
        group: ['usuario_id'],
        order: [[require('sequelize').literal('total'), 'DESC']],
        limit: 10
      });

      // Log desta consulta
      logger.audit('AUDIT_STATISTICS_VIEWED', req.user.id, 'AUDIT', null, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        data_inicio,
        data_fim
      });

      res.json({
        periodo: {
          data_inicio: data_inicio || 'todas',
          data_fim: data_fim || 'todas'
        },
        total_logs: totalLogs,
        logs_por_acao: logsPorAcao,
        logs_por_recurso: logsPorRecurso,
        usuarios_mais_ativos: usuariosMaisAtivos
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuditController;
