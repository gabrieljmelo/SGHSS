const { Profissional, Usuario } = require('../models');
const logger = require('../utils/logger');
const { createError } = require('../middleware/errorHandler');
const EncryptionUtils = require('../utils/encryption');
const { Op } = require('sequelize');

/**
 * Controller para gerenciamento de profissionais de saúde
 */
class ProfissionalController {
  /**
   * Criar novo profissional
   */
  static async create(req, res, next) {
    try {
      const {
        nome, cpf, rg, data_nascimento, telefone, endereco,
        cidade, estado, cep, especialidade, crm, cfm,
        registro_profissional, horario_atendimento, email, senha
      } = req.body;

      // Verificar se já existe profissional com esse CPF ou CRM/CFM
      const profissionalExistente = await Profissional.findOne({
        where: {
          [Op.or]: [
            { cpf },
            { crm: crm || null },
            { cfm: cfm || null }
          ]
        }
      });

      if (profissionalExistente) {
        throw createError('Já existe um profissional com este CPF ou registro profissional', 409);
      }

      // Criar usuário primeiro
      const novoUsuario = await Usuario.create({
        email,
        senha,
        tipo: especialidade === 'Medicina' ? 'medico' : 'enfermeiro'
      });

      // Criar profissional
      const novoProfissional = await Profissional.create({
        usuario_id: novoUsuario.id,
        nome,
        cpf,
        rg,
        data_nascimento,
        telefone,
        endereco,
        cidade,
        estado,
        cep,
        especialidade,
        crm,
        cfm,
        registro_profissional,
        horario_atendimento
      });

      // Log de auditoria
      logger.audit('PROFISSIONAL_CREATED', req.user.id, 'PROFISSIONAL', novoProfissional.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        especialidade,
        registro: crm || cfm || registro_profissional
      });

      res.status(201).json({
        message: 'Profissional criado com sucesso',
        profissional: {
          id: novoProfissional.id,
          nome: novoProfissional.nome,
          especialidade: novoProfissional.especialidade,
          registro_profissional: novoProfissional.registro_profissional,
          ativo: novoProfissional.ativo,
          created_at: novoProfissional.created_at
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Listar profissionais com paginação
   */
  static async list(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';
      const especialidade = req.query.especialidade || '';

      let whereClause = { ativo: true };

      // Se não for admin, mostrar apenas profissional próprio
      if (req.user.tipo === 'medico' || req.user.tipo === 'enfermeiro') {
        const profissionalLogado = await Profissional.findOne({
          where: { usuario_id: req.user.id }
        });
        
        if (profissionalLogado) {
          whereClause.id = profissionalLogado.id;
        } else {
          whereClause.id = 'inexistente';
        }
      }

      // Busca por nome
      if (search) {
        whereClause.nome = {
          [Op.like]: `%${search}%`
        };
      }

      // Filtro por especialidade
      if (especialidade) {
        whereClause.especialidade = especialidade;
      }

      const { count, rows: profissionais } = await Profissional.findAndCountAll({
        where: whereClause,
        include: [{
          model: Usuario,
          as: 'usuario',
          attributes: ['email', 'ativo', 'ultimo_login']
        }],
        limit,
        offset,
        order: [['nome', 'ASC']]
      });

      // Log de auditoria
      logger.audit('PROFISSIONAIS_LISTED', req.user.id, 'PROFISSIONAL', null, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        page,
        limit,
        search: search || 'none',
        especialidade: especialidade || 'all'
      });

      // Anonimizar dados sensíveis conforme tipo de usuário
      const profissionaisFormatados = profissionais.map(profissional => {
        const dadosBase = {
          id: profissional.id,
          nome: profissional.nome,
          especialidade: profissional.especialidade,
          horario_atendimento: profissional.horario_atendimento,
          ativo: profissional.ativo,
          created_at: profissional.created_at,
          usuario: profissional.usuario
        };

        // Admins veem mais detalhes
        if (req.user.tipo === 'admin') {
          dadosBase.cpf = EncryptionUtils.anonymize(profissional.cpf, 'cpf');
          dadosBase.telefone = EncryptionUtils.anonymize(profissional.telefone, 'telefone');
          dadosBase.registro_profissional = profissional.registro_profissional;
          dadosBase.crm = profissional.crm;
          dadosBase.cfm = profissional.cfm;
        }

        return dadosBase;
      });

      res.json({
        profissionais: profissionaisFormatados,
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
   * Obter profissional por ID
   */
  static async getById(req, res, next) {
    try {
      const { id } = req.params;

      const profissional = await Profissional.findByPk(id, {
        include: [{
          model: Usuario,
          as: 'usuario',
          attributes: ['email', 'ativo', 'ultimo_login']
        }]
      });

      if (!profissional) {
        throw createError('Profissional não encontrado', 404);
      }

      // Verificar se é o próprio profissional ou um admin
      if ((req.user.tipo === 'medico' || req.user.tipo === 'enfermeiro') && req.user.tipo !== 'admin') {
        const profissionalLogado = await Profissional.findOne({
          where: { usuario_id: req.user.id }
        });
        
        if (!profissionalLogado || profissionalLogado.id !== profissional.id) {
          throw createError('Acesso negado', 403);
        }
      }

      // Log de auditoria
      logger.audit('PROFISSIONAL_VIEWED', req.user.id, 'PROFISSIONAL', profissional.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Admins e o próprio profissional veem dados completos
      let dadosResposta;
      
      if (req.user.tipo === 'admin' || 
          (req.user.tipo === 'medico' || req.user.tipo === 'enfermeiro')) {
        dadosResposta = profissional.toJSON();
      } else {
        // Outros usuários veem dados básicos
        dadosResposta = {
          id: profissional.id,
          nome: profissional.nome,
          especialidade: profissional.especialidade,
          horario_atendimento: profissional.horario_atendimento,
          ativo: profissional.ativo
        };
      }

      res.json({
        profissional: dadosResposta
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Atualizar profissional
   */
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const dadosAtualizacao = req.body;

      const profissional = await Profissional.findByPk(id);

      if (!profissional) {
        throw createError('Profissional não encontrado', 404);
      }

      // Verificar se é o próprio profissional ou um admin
      if ((req.user.tipo === 'medico' || req.user.tipo === 'enfermeiro') && req.user.tipo !== 'admin') {
        const profissionalLogado = await Profissional.findOne({
          where: { usuario_id: req.user.id }
        });
        
        if (!profissionalLogado || profissionalLogado.id !== profissional.id) {
          throw createError('Acesso negado', 403);
        }
      }

      // Profissionais não podem alterar alguns campos
      if (req.user.tipo !== 'admin') {
        delete dadosAtualizacao.cpf;
        delete dadosAtualizacao.rg;
        delete dadosAtualizacao.crm;
        delete dadosAtualizacao.cfm;
        delete dadosAtualizacao.registro_profissional;
        delete dadosAtualizacao.ativo;
      }

      // Verificar se CRM/CFM já existe em outro profissional
      if (dadosAtualizacao.crm || dadosAtualizacao.cfm) {
        const profissionalExistente = await Profissional.findOne({
          where: {
            id: { [Op.ne]: id },
            [Op.or]: [
              { crm: dadosAtualizacao.crm || null },
              { cfm: dadosAtualizacao.cfm || null }
            ]
          }
        });

        if (profissionalExistente) {
          throw createError('Já existe outro profissional com este registro', 409);
        }
      }

      // Atualizar profissional
      await profissional.update(dadosAtualizacao);

      // Log de auditoria
      logger.audit('PROFISSIONAL_UPDATED', req.user.id, 'PROFISSIONAL', profissional.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        changes: Object.keys(dadosAtualizacao)
      });

      res.json({
        message: 'Profissional atualizado com sucesso',
        profissional: {
          id: profissional.id,
          nome: profissional.nome,
          especialidade: profissional.especialidade,
          updated_at: profissional.updated_at
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Desativar profissional
   */
  static async deactivate(req, res, next) {
    try {
      const { id } = req.params;

      const profissional = await Profissional.findByPk(id);

      if (!profissional) {
        throw createError('Profissional não encontrado', 404);
      }

      await profissional.update({ ativo: false });

      // Desativar usuário associado também
      await Usuario.update(
        { ativo: false },
        { where: { id: profissional.usuario_id } }
      );

      // Log de auditoria
      logger.audit('PROFISSIONAL_DEACTIVATED', req.user.id, 'PROFISSIONAL', profissional.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Profissional desativado com sucesso'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Listar profissionais por especialidade
   */
  static async listBySpecialty(req, res, next) {
    try {
      const { especialidade } = req.params;

      const profissionais = await Profissional.findAll({
        where: { 
          especialidade,
          ativo: true 
        },
        attributes: ['id', 'nome', 'horario_atendimento', 'registro_profissional'],
        order: [['nome', 'ASC']]
      });

      // Log de auditoria
      logger.audit('PROFISSIONAIS_BY_SPECIALTY_LISTED', req.user.id, 'PROFISSIONAL', null, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        especialidade
      });

      res.json({
        especialidade,
        profissionais
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Obter agenda do profissional
   */
  static async getSchedule(req, res, next) {
    try {
      const { id } = req.params;
      const { data } = req.query; // Data específica para consultar agenda

      const profissional = await Profissional.findByPk(id);

      if (!profissional) {
        throw createError('Profissional não encontrado', 404);
      }

      // Log de auditoria
      logger.audit('PROFISSIONAL_SCHEDULE_VIEWED', req.user.id, 'PROFISSIONAL', profissional.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        data: data || 'all'
      });

      res.json({
        profissional: {
          id: profissional.id,
          nome: profissional.nome,
          especialidade: profissional.especialidade
        },
        horario_atendimento: profissional.horario_atendimento,
        message: 'Para implementação completa da agenda, integrar com sistema de consultas'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Estatísticas de profissionais (apenas para admins)
   */
  static async statistics(req, res, next) {
    try {
      const totalProfissionais = await Profissional.count({ where: { ativo: true } });
      
      const profissionaisPorEspecialidade = await Profissional.findAll({
        where: { ativo: true },
        attributes: [
          'especialidade',
          [require('sequelize').fn('COUNT', require('sequelize').col('especialidade')), 'total']
        ],
        group: 'especialidade'
      });

      const profissionaisHoje = await Profissional.count({
        where: {
          ativo: true,
          created_at: {
            [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      });

      // Log de auditoria
      logger.audit('PROFISSIONAIS_STATISTICS_VIEWED', req.user.id, 'PROFISSIONAL', null, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        total_profissionais: totalProfissionais,
        profissionais_por_especialidade: profissionaisPorEspecialidade,
        profissionais_cadastrados_hoje: profissionaisHoje
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = ProfissionalController;
