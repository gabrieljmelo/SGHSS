const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/config/database');

describe('Health Check', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('GET /api/health should return status ok', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.message).toBe('SGHSS API está funcionando');
  });

  test('GET /api/info should return API information', async () => {
    const response = await request(app)
      .get('/api/info')
      .expect(200);

    expect(response.body.name).toContain('SGHSS');
    expect(response.body.version).toBe('1.0.0');
    expect(response.body.features).toBeInstanceOf(Array);
  });
});
