const { Consulta, Paciente, Profissional, Usuario } = require('../models');
const logger = require('../utils/logger');
const { createError } = require('../middleware/errorHandler');
const EncryptionUtils = require('../utils/encryption');
const { Op } = require('sequelize');

/**
 * Controller para gerenciamento de consultas
 */
class ConsultaController {
  /**
   * Agendar nova consulta
   */
  static async create(req, res, next) {
    try {
      const {
        paciente_id, profissional_id, data_consulta, 
        tipo_consulta, observacoes, urgente
      } = req.body;

      // Verificar se paciente existe
      const paciente = await Paciente.findByPk(paciente_id);
      if (!paciente || !paciente.ativo) {
        throw createError('Paciente não encontrado ou inativo', 404);
      }

      // Verificar se profissional existe
      const profissional = await Profissional.findByPk(profissional_id);
      if (!profissional || !profissional.ativo) {
        throw createError('Profissional não encontrado ou inativo', 404);
      }

      // Verificar se já existe consulta no mesmo horário para o profissional
      const consultaExistente = await Consulta.findOne({
        where: {
          profissional_id,
          data_consulta,
          status: {
            [Op.notIn]: ['cancelada', 'concluida']
          }
        }
      });

      if (consultaExistente) {
        throw createError('Já existe uma consulta agendada neste horário para o profissional', 409);
      }

      // Verificar se a data é no futuro
      if (new Date(data_consulta) <= new Date()) {
        throw createError('A data da consulta deve ser no futuro', 400);
      }

      // Criar consulta
      const novaConsulta = await Consulta.create({
        paciente_id,
        profissional_id,
        data_consulta,
        tipo_consulta,
        observacoes,
        urgente: urgente || false,
        status: 'agendada'
      });

      // Buscar dados completos para resposta
      const consultaCompleta = await Consulta.findByPk(novaConsulta.id, {
        include: [
          {
            model: Paciente,
            as: 'paciente',
            attributes: ['id', 'nome']
          },
          {
            model: Profissional,
            as: 'profissional',
            attributes: ['id', 'nome', 'especialidade']
          }
        ]
      });

      // Log de auditoria
      logger.audit('CONSULTA_CREATED', req.user.id, 'CONSULTA', novaConsulta.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        paciente_id,
        profissional_id,
        data_consulta,
        tipo_consulta,
        urgente
      });

      res.status(201).json({
        message: 'Consulta agendada com sucesso',
        consulta: {
          id: consultaCompleta.id,
          data_consulta: consultaCompleta.data_consulta,
          tipo_consulta: consultaCompleta.tipo_consulta,
          status: consultaCompleta.status,
          urgente: consultaCompleta.urgente,
          paciente: consultaCompleta.paciente,
          profissional: consultaCompleta.profissional,
          created_at: consultaCompleta.created_at
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Listar consultas com filtros
   */
  static async list(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      
      const { status, data_inicio, data_fim, paciente_id, profissional_id, urgente } = req.query;

      let whereClause = {};

      // Filtros baseados no tipo de usuário
      if (req.user.tipo === 'paciente') {
        // Pacientes só veem suas próprias consultas
        const paciente = await Paciente.findOne({
          where: { usuario_id: req.user.id }
        });
        
        if (paciente) {
          whereClause.paciente_id = paciente.id;
        } else {
          whereClause.paciente_id = 'inexistente';
        }
      } else if (req.user.tipo === 'medico' || req.user.tipo === 'enfermeiro') {
        // Profissionais só veem suas consultas
        const profissional = await Profissional.findOne({
          where: { usuario_id: req.user.id }
        });
        
        if (profissional) {
          whereClause.profissional_id = profissional.id;
        } else {
          whereClause.profissional_id = 'inexistente';
        }
      }

      // Aplicar filtros adicionais
      if (status) {
        whereClause.status = status;
      }

      if (paciente_id && req.user.tipo === 'admin') {
        whereClause.paciente_id = paciente_id;
      }

      if (profissional_id && req.user.tipo === 'admin') {
        whereClause.profissional_id = profissional_id;
      }

      if (urgente !== undefined) {
        whereClause.urgente = urgente === 'true';
      }

      // Filtro de data
      if (data_inicio || data_fim) {
        whereClause.data_consulta = {};
        if (data_inicio) {
          whereClause.data_consulta[Op.gte] = new Date(data_inicio);
        }
        if (data_fim) {
          whereClause.data_consulta[Op.lte] = new Date(data_fim + ' 23:59:59');
        }
      }

      const { count, rows: consultas } = await Consulta.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Paciente,
            as: 'paciente',
            attributes: ['id', 'nome']
          },
          {
            model: Profissional,
            as: 'profissional',
            attributes: ['id', 'nome', 'especialidade']
          }
        ],
        limit,
        offset,
        order: [['data_consulta', 'ASC']]
      });

      // Log de auditoria
      logger.audit('CONSULTAS_LISTED', req.user.id, 'CONSULTA', null, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        filters: { status, data_inicio, data_fim, paciente_id, profissional_id, urgente },
        page,
        limit
      });

      res.json({
        consultas,
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
   * Obter consulta por ID
   */
  static async getById(req, res, next) {
    try {
      const { id } = req.params;

      const consulta = await Consulta.findByPk(id, {
        include: [
          {
            model: Paciente,
            as: 'paciente',
            attributes: ['id', 'nome', 'cpf', 'telefone', 'data_nascimento']
          },
          {
            model: Profissional,
            as: 'profissional',
            attributes: ['id', 'nome', 'especialidade', 'registro_profissional']
          }
        ]
      });

      if (!consulta) {
        throw createError('Consulta não encontrada', 404);
      }

      // Verificar permissão de acesso
      let temPermissao = false;

      if (req.user.tipo === 'admin') {
        temPermissao = true;
      } else if (req.user.tipo === 'paciente') {
        const paciente = await Paciente.findOne({
          where: { usuario_id: req.user.id }
        });
        temPermissao = paciente && paciente.id === consulta.paciente_id;
      } else if (req.user.tipo === 'medico' || req.user.tipo === 'enfermeiro') {
        const profissional = await Profissional.findOne({
          where: { usuario_id: req.user.id }
        });
        temPermissao = profissional && profissional.id === consulta.profissional_id;
      }

      if (!temPermissao) {
        throw createError('Acesso negado', 403);
      }

      // Log de auditoria
      logger.audit('CONSULTA_VIEWED', req.user.id, 'CONSULTA', consulta.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Anonimizar CPF do paciente para não-admins
      if (req.user.tipo !== 'admin' && consulta.paciente.cpf) {
        consulta.paciente.cpf = EncryptionUtils.anonymize(consulta.paciente.cpf, 'cpf');
      }

      res.json({
        consulta
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Atualizar consulta
   */
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const dadosAtualizacao = req.body;

      const consulta = await Consulta.findByPk(id);

      if (!consulta) {
        throw createError('Consulta não encontrada', 404);
      }

      // Verificar permissão de atualização
      let temPermissao = false;

      if (req.user.tipo === 'admin') {
        temPermissao = true;
      } else if (req.user.tipo === 'medico' || req.user.tipo === 'enfermeiro') {
        const profissional = await Profissional.findOne({
          where: { usuario_id: req.user.id }
        });
        temPermissao = profissional && profissional.id === consulta.profissional_id;
      }

      if (!temPermissao) {
        throw createError('Acesso negado', 403);
      }

      // Pacientes não podem alterar dados da consulta diretamente
      if (req.user.tipo === 'paciente') {
        throw createError('Pacientes não podem alterar consultas diretamente. Entre em contato com a recepção.', 403);
      }

      // Validar mudança de horário se fornecida
      if (dadosAtualizacao.data_consulta) {
        const novaData = new Date(dadosAtualizacao.data_consulta);
        
        if (novaData <= new Date()) {
          throw createError('A nova data da consulta deve ser no futuro', 400);
        }

        // Verificar conflito de horário
        const consultaConflito = await Consulta.findOne({
          where: {
            id: { [Op.ne]: id },
            profissional_id: consulta.profissional_id,
            data_consulta: dadosAtualizacao.data_consulta,
            status: {
              [Op.notIn]: ['cancelada', 'concluida']
            }
          }
        });

        if (consultaConflito) {
          throw createError('Já existe uma consulta agendada neste horário', 409);
        }
      }

      // Guardar dados anteriores para auditoria
      const dadosAnteriores = {
        status: consulta.status,
        data_consulta: consulta.data_consulta
      };

      // Atualizar consulta
      await consulta.update(dadosAtualizacao);

      // Log de auditoria
      logger.audit('CONSULTA_UPDATED', req.user.id, 'CONSULTA', consulta.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        changes: Object.keys(dadosAtualizacao),
        previousData: dadosAnteriores
      });

      res.json({
        message: 'Consulta atualizada com sucesso',
        consulta: {
          id: consulta.id,
          status: consulta.status,
          data_consulta: consulta.data_consulta,
          updated_at: consulta.updated_at
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancelar consulta
   */
  static async cancel(req, res, next) {
    try {
      const { id } = req.params;
      const { motivo_cancelamento } = req.body;

      const consulta = await Consulta.findByPk(id);

      if (!consulta) {
        throw createError('Consulta não encontrada', 404);
      }

      if (consulta.status === 'cancelada') {
        throw createError('Consulta já está cancelada', 400);
      }

      if (consulta.status === 'concluida') {
        throw createError('Não é possível cancelar uma consulta já concluída', 400);
      }

      // Verificar permissão
      let temPermissao = false;

      if (req.user.tipo === 'admin') {
        temPermissao = true;
      } else if (req.user.tipo === 'paciente') {
        const paciente = await Paciente.findOne({
          where: { usuario_id: req.user.id }
        });
        temPermissao = paciente && paciente.id === consulta.paciente_id;
      } else if (req.user.tipo === 'medico' || req.user.tipo === 'enfermeiro') {
        const profissional = await Profissional.findOne({
          where: { usuario_id: req.user.id }
        });
        temPermissao = profissional && profissional.id === consulta.profissional_id;
      }

      if (!temPermissao) {
        throw createError('Acesso negado', 403);
      }

      // Cancelar consulta
      await consulta.update({
        status: 'cancelada',
        motivo_cancelamento,
        data_cancelamento: new Date()
      });

      // Log de auditoria
      logger.audit('CONSULTA_CANCELLED', req.user.id, 'CONSULTA', consulta.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        motivo_cancelamento
      });

      res.json({
        message: 'Consulta cancelada com sucesso'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Confirmar comparecimento da consulta
   */
  static async checkIn(req, res, next) {
    try {
      const { id } = req.params;

      const consulta = await Consulta.findByPk(id);

      if (!consulta) {
        throw createError('Consulta não encontrada', 404);
      }

      if (consulta.status !== 'agendada') {
        throw createError('Apenas consultas agendadas podem ter comparecimento confirmado', 400);
      }

      // Atualizar status
      await consulta.update({
        status: 'em_andamento',
        compareceu: true,
        data_comparecimento: new Date()
      });

      // Log de auditoria
      logger.audit('CONSULTA_CHECKIN', req.user.id, 'CONSULTA', consulta.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Comparecimento confirmado',
        consulta: {
          id: consulta.id,
          status: consulta.status,
          compareceu: consulta.compareceu,
          data_comparecimento: consulta.data_comparecimento
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Concluir consulta com prontuário
   */
  static async complete(req, res, next) {
    try {
      const { id } = req.params;
      const { 
        diagnostico, 
        prescricao, 
        observacoes_medicas, 
        exames_solicitados,
        retorno_necessario,
        data_retorno 
      } = req.body;

      const consulta = await Consulta.findByPk(id);

      if (!consulta) {
        throw createError('Consulta não encontrada', 404);
      }

      if (consulta.status === 'concluida') {
        throw createError('Consulta já está concluída', 400);
      }

      if (consulta.status === 'cancelada') {
        throw createError('Não é possível concluir uma consulta cancelada', 400);
      }

      // Verificar se é o profissional responsável
      if (req.user.tipo !== 'admin') {
        const profissional = await Profissional.findOne({
          where: { usuario_id: req.user.id }
        });
        
        if (!profissional || profissional.id !== consulta.profissional_id) {
          throw createError('Apenas o profissional responsável pode concluir a consulta', 403);
        }
      }

      // Concluir consulta
      await consulta.update({
        status: 'concluida',
        diagnostico,
        prescricao,
        observacoes_medicas,
        exames_solicitados,
        retorno_necessario: retorno_necessario || false,
        data_retorno: retorno_necessario ? data_retorno : null,
        data_conclusao: new Date()
      });

      // Log de auditoria
      logger.audit('CONSULTA_COMPLETED', req.user.id, 'CONSULTA', consulta.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        retorno_necessario,
        data_retorno
      });

      res.json({
        message: 'Consulta concluída com sucesso',
        consulta: {
          id: consulta.id,
          status: consulta.status,
          data_conclusao: consulta.data_conclusao,
          retorno_necessario: consulta.retorno_necessario,
          data_retorno: consulta.data_retorno
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Relatório de consultas (apenas admins)
   */
  static async report(req, res, next) {
    try {
      const { data_inicio, data_fim, status, profissional_id } = req.query;

      let whereClause = {};

      // Filtros de data
      if (data_inicio || data_fim) {
        whereClause.data_consulta = {};
        if (data_inicio) {
          whereClause.data_consulta[Op.gte] = new Date(data_inicio);
        }
        if (data_fim) {
          whereClause.data_consulta[Op.lte] = new Date(data_fim + ' 23:59:59');
        }
      }

      if (status) {
        whereClause.status = status;
      }

      if (profissional_id) {
        whereClause.profissional_id = profissional_id;
      }

      // Estatísticas gerais
      const totalConsultas = await Consulta.count({ where: whereClause });
      const consultasRealizadas = await Consulta.count({ 
        where: { ...whereClause, status: 'concluida' } 
      });
      const consultasCanceladas = await Consulta.count({ 
        where: { ...whereClause, status: 'cancelada' } 
      });
      const consultasAgendadas = await Consulta.count({ 
        where: { ...whereClause, status: 'agendada' } 
      });

      // Consultas por profissional
      const consultasPorProfissional = await Consulta.findAll({
        where: whereClause,
        include: [{
          model: Profissional,
          as: 'profissional',
          attributes: ['id', 'nome', 'especialidade']
        }],
        attributes: [
          'profissional_id',
          [require('sequelize').fn('COUNT', require('sequelize').col('Consulta.id')), 'total']
        ],
        group: ['profissional_id', 'profissional.id']
      });

      // Log de auditoria
      logger.audit('CONSULTAS_REPORT_GENERATED', req.user.id, 'CONSULTA', null, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        filters: { data_inicio, data_fim, status, profissional_id }
      });

      res.json({
        periodo: {
          data_inicio: data_inicio || 'todas',
          data_fim: data_fim || 'todas'
        },
        estatisticas: {
          total_consultas: totalConsultas,
          consultas_realizadas: consultasRealizadas,
          consultas_canceladas: consultasCanceladas,
          consultas_agendadas: consultasAgendadas,
          taxa_realizacao: totalConsultas > 0 ? 
            ((consultasRealizadas / totalConsultas) * 100).toFixed(2) + '%' : '0%'
        },
        consultas_por_profissional: consultasPorProfissional
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = ConsultaController;
