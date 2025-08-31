const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/config/database');

describe('Auth Controller', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        senha: 'Password123!',
        confirmarSenha: 'Password123!',
        tipo: 'admin'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toContain('sucesso');
      expect(response.body.usuario.email).toBe(userData.email);
      expect(response.body.usuario.tipo).toBe(userData.tipo);
    });

    test('should not register user with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        senha: 'Password123!',
        confirmarSenha: 'Password123!',
        tipo: 'admin'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    test('should not register user with weak password', async () => {
      const userData = {
        email: 'test2@example.com',
        senha: '123',
        confirmarSenha: '123',
        tipo: 'admin'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Criar usuário para teste de login
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'login@example.com',
          senha: 'Password123!',
          confirmarSenha: 'Password123!',
          tipo: 'admin'
        });
    });

    test('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'login@example.com',
        senha: 'Password123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.message).toContain('sucesso');
      expect(response.body.token).toBeDefined();
      expect(response.body.usuario.email).toBe(loginData.email);
    });

    test('should not login with invalid credentials', async () => {
      const loginData = {
        email: 'login@example.com',
        senha: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.message).toContain('inválidas');
    });
  });
});
