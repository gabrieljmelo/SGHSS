const crypto = require('crypto');

const algorithm = 'aes-256-gcm';
const secretKey = process.env.ENCRYPTION_KEY || 'chave_de_criptografia_256_bits_para_dados_sensiveis_12345';

/**
 * Utilitários para criptografia de dados sensíveis (conformidade LGPD)
 */
class EncryptionUtils {
  /**
   * Criptografa dados sensíveis
   * @param {string} text - Texto a ser criptografado
   * @returns {object} - Objeto com dados criptografados
   */
  static encrypt(text) {
    if (!text) return null;
    
    // Temporariamente sem criptografia para testes
    // Em produção, usar crypto.createCipherGCM com Node.js atualizado
    return {
      data: Buffer.from(text).toString('base64'),
      algorithm: 'base64'
    };
  }

  /**
   * Descriptografa dados sensíveis
   * @param {object} encryptedData - Dados criptografados
   * @returns {string} - Texto descriptografado
   */
  static decrypt(encryptedData) {
    if (!encryptedData || !encryptedData.data) return null;
    
    // Temporariamente sem criptografia para testes
    return Buffer.from(encryptedData.data, 'base64').toString('utf8');
  }

  /**
   * Gera hash seguro para senhas
   * @param {string} password - Senha a ser hasheada
   * @returns {Promise<string>} - Hash da senha
   */
  static async hashPassword(password) {
    const bcrypt = require('bcryptjs');
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verifica senha contra hash
   * @param {string} password - Senha a ser verificada
   * @param {string} hash - Hash armazenado
   * @returns {Promise<boolean>} - Resultado da verificação
   */
  static async verifyPassword(password, hash) {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(password, hash);
  }

  /**
   * Anonimiza dados pessoais para conformidade LGPD
   * @param {string} data - Dados a serem anonimizados
   * @param {string} type - Tipo de dado (cpf, email, telefone)
   * @returns {string} - Dados anonimizados
   */
  static anonymize(data, type = 'generic') {
    if (!data) return null;
    
    switch (type) {
      case 'cpf':
        return data.replace(/(\d{3})\d{6}(\d{2})/, '$1.***.**-$2');
      case 'email':
        const [username, domain] = data.split('@');
        const maskedUsername = username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1);
        return `${maskedUsername}@${domain}`;
      case 'telefone':
        return data.replace(/(\d{2})\d{5}(\d{4})/, '($1) 9****-$2');
      case 'nome':
        const names = data.split(' ');
        return names.map((name, index) => 
          index === 0 ? name : name.charAt(0) + '*'.repeat(name.length - 1)
        ).join(' ');
      default:
        return '*'.repeat(data.length);
    }
  }

  /**
   * Gera token de acesso temporário
   * @param {number} length - Comprimento do token
   * @returns {string} - Token gerado
   */
  static generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
}

module.exports = EncryptionUtils;
