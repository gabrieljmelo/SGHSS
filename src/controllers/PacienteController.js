const { Paciente, Usuario } = require('../models');
const logger = require('../utils/logger');
const { createError } = require('../middleware/errorHandler');
const EncryptionUtils = require('../utils/encryption');
const { Op } = require('sequelize');

/**
 * Controller para gerenciamento de pacientes
 */
class PacienteController {
  /**
   * Criar novo paciente
   */
  static async create(req, res, next) {
    try {
      const {
        nome, cpf, rg, data_nascimento, telefone, endereco,
        cidade, estado, cep, plano_saude, numero_carteira,
        contato_emergencia_nome, contato_emergencia_telefone,
        observacoes_medicas, consentimento_lgpd, email, senha
      } = req.body;

      // Verificar se já existe paciente com esse CPF
      const pacienteExistente = await Paciente.findOne({
        where: { cpf }
      });

      if (pacienteExistente) {
        throw createError('Já existe um paciente com este CPF', 409);
      }

      // Criar usuário primeiro
      const novoUsuario = await Usuario.create({
        email,
        senha,
        tipo: 'paciente'
      });

      // Criar paciente
      const novoPaciente = await Paciente.create({
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
        plano_saude,
        numero_carteira,
        contato_emergencia_nome,
        contato_emergencia_telefone,
        observacoes_medicas,
        consentimento_lgpd: consentimento_lgpd || false,
        data_consentimento_lgpd: consentimento_lgpd ? new Date() : null
      });

      // Log de auditoria
      logger.audit('PACIENTE_CREATED', req.user.id, 'PACIENTE', novoPaciente.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        patientCpf: EncryptionUtils.anonymize(cpf, 'cpf')
      });

      res.status(201).json({
        message: 'Paciente criado com sucesso',
        paciente: {
          id: novoPaciente.id,
          nome: novoPaciente.nome,
          cpf: EncryptionUtils.anonymize(novoPaciente.cpf, 'cpf'),
          data_nascimento: novoPaciente.data_nascimento,
          consentimento_lgpd: novoPaciente.consentimento_lgpd,
          created_at: novoPaciente.created_at
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Listar pacientes com paginação
   */
  static async list(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';

      let whereClause = { ativo: true };

      // Se não for admin, mostrar apenas pacientes próprios
      if (req.user.tipo === 'paciente') {
        const pacienteLogado = await Paciente.findOne({
          where: { usuario_id: req.user.id }
        });
        
        if (pacienteLogado) {
          whereClause.id = pacienteLogado.id;
        } else {
          whereClause.id = 'inexistente'; // Garantir que não retorne nada
        }
      }

      // Busca por nome (se fornecida)
      if (search) {
        whereClause.nome = {
          [Op.like]: `%${search}%`
        };
      }

      const { count, rows: pacientes } = await Paciente.findAndCountAll({
        where: whereClause,
        include: [{
          model: Usuario,
          as: 'usuario',
          attributes: ['email', 'ativo']
        }],
        limit,
        offset,
        order: [['nome', 'ASC']]
      });

      // Log de auditoria
      logger.audit('PACIENTES_LISTED', req.user.id, 'PACIENTE', null, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        page,
        limit,
        search: search || 'none'
      });

      // Anonimizar dados sensíveis para visualização
      const pacientesFormatados = pacientes.map(paciente => ({
        id: paciente.id,
        nome: paciente.nome,
        cpf: EncryptionUtils.anonymize(paciente.cpf, 'cpf'),
        telefone: EncryptionUtils.anonymize(paciente.telefone, 'telefone'),
        data_nascimento: paciente.data_nascimento,
        cidade: paciente.cidade,
        estado: paciente.estado,
        plano_saude: paciente.plano_saude,
        consentimento_lgpd: paciente.consentimento_lgpd,
        ativo: paciente.ativo,
        created_at: paciente.created_at,
        usuario: paciente.usuario
      }));

      res.json({
        pacientes: pacientesFormatados,
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
   * Obter paciente por ID
   */
  static async getById(req, res, next) {
    try {
      const { id } = req.params;

      const paciente = await Paciente.findByPk(id, {
        include: [{
          model: Usuario,
          as: 'usuario',
          attributes: ['email', 'ativo', 'ultimo_login']
        }]
      });

      if (!paciente) {
        throw createError('Paciente não encontrado', 404);
      }

      // Verificar se é o próprio paciente ou um profissional/admin
      if (req.user.tipo === 'paciente') {
        const pacienteLogado = await Paciente.findOne({
          where: { usuario_id: req.user.id }
        });
        
        if (!pacienteLogado || pacienteLogado.id !== paciente.id) {
          throw createError('Acesso negado', 403);
        }
      }

      // Log de auditoria
      logger.audit('PACIENTE_VIEWED', req.user.id, 'PACIENTE', paciente.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Para pacientes, mostrar dados completos. Para outros, dados anonimizados em campos sensíveis
      let dadosResposta;
      
      if (req.user.tipo === 'admin' || req.user.tipo === 'medico' || req.user.tipo === 'enfermeiro') {
        // Profissionais e admins veem dados completos
        dadosResposta = paciente.toJSON();
      } else {
        // Outros veem dados anonimizados
        dadosResposta = {
          ...paciente.toJSON(),
          cpf: EncryptionUtils.anonymize(paciente.cpf, 'cpf'),
          rg: paciente.rg ? EncryptionUtils.anonymize(paciente.rg, 'generic') : null,
          numero_carteira: paciente.numero_carteira ? EncryptionUtils.anonymize(paciente.numero_carteira, 'generic') : null
        };
      }

      res.json({
        paciente: dadosResposta
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Atualizar paciente
   */
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const dadosAtualizacao = req.body;

      const paciente = await Paciente.findByPk(id);

      if (!paciente) {
        throw createError('Paciente não encontrado', 404);
      }

      // Verificar se é o próprio paciente ou um profissional/admin
      if (req.user.tipo === 'paciente') {
        const pacienteLogado = await Paciente.findOne({
          where: { usuario_id: req.user.id }
        });
        
        if (!pacienteLogado || pacienteLogado.id !== paciente.id) {
          throw createError('Acesso negado', 403);
        }
      }

      // Remover campos que não podem ser alterados pelos pacientes
      if (req.user.tipo === 'paciente') {
        delete dadosAtualizacao.cpf;
        delete dadosAtualizacao.rg;
        delete dadosAtualizacao.ativo;
      }

      // Guardar dados anteriores para auditoria
      const dadosAnteriores = paciente.toJSON();

      // Atualizar paciente
      await paciente.update(dadosAtualizacao);

      // Log de auditoria
      logger.audit('PACIENTE_UPDATED', req.user.id, 'PACIENTE', paciente.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        changes: Object.keys(dadosAtualizacao)
      });

      res.json({
        message: 'Paciente atualizado com sucesso',
        paciente: {
          id: paciente.id,
          nome: paciente.nome,
          updated_at: paciente.updated_at
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Desativar paciente (soft delete)
   */
  static async deactivate(req, res, next) {
    try {
      const { id } = req.params;

      const paciente = await Paciente.findByPk(id);

      if (!paciente) {
        throw createError('Paciente não encontrado', 404);
      }

      await paciente.update({ ativo: false });

      // Desativar usuário associado também
      await Usuario.update(
        { ativo: false },
        { where: { id: paciente.usuario_id } }
      );

      // Log de auditoria
      logger.audit('PACIENTE_DEACTIVATED', req.user.id, 'PACIENTE', paciente.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Paciente desativado com sucesso'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Anonimizar dados do paciente (LGPD)
   */
  static async anonymize(req, res, next) {
    try {
      const { id } = req.params;

      const paciente = await Paciente.findByPk(id);

      if (!paciente) {
        throw createError('Paciente não encontrado', 404);
      }

      // Log de auditoria antes da anonimização
      logger.audit('PACIENTE_ANONYMIZED', req.user.id, 'PACIENTE', paciente.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        originalName: EncryptionUtils.anonymize(paciente.nome, 'nome')
      });

      // Anonimizar dados
      await paciente.update({
        nome: 'Paciente Anonimizado',
        cpf: EncryptionUtils.encrypt('***.***.***-**'),
        rg: null,
        telefone: null,
        endereco: null,
        numero_carteira: null,
        contato_emergencia_nome: null,
        contato_emergencia_telefone: null,
        observacoes_medicas: 'Dados anonimizados conforme LGPD',
        ativo: false
      });

      res.json({
        message: 'Dados do paciente anonimizados com sucesso conforme LGPD'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Estatísticas de pacientes (apenas para admins)
   */
  static async statistics(req, res, next) {
    try {
      const totalPacientes = await Paciente.count({ where: { ativo: true } });
      const pacientesComConsentimento = await Paciente.count({ 
        where: { ativo: true, consentimento_lgpd: true } 
      });
      const pacientesHoje = await Paciente.count({
        where: {
          ativo: true,
          created_at: {
            [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      });

      // Log de auditoria
      logger.audit('PACIENTES_STATISTICS_VIEWED', req.user.id, 'PACIENTE', null, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        total_pacientes: totalPacientes,
        pacientes_com_consentimento_lgpd: pacientesComConsentimento,
        pacientes_cadastrados_hoje: pacientesHoje,
        taxa_consentimento_lgpd: totalPacientes > 0 ? 
          ((pacientesComConsentimento / totalPacientes) * 100).toFixed(2) + '%' : '0%'
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = PacienteController;
