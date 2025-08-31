const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const AuthController = require('../controllers/AuthController');

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Registrar novo usuário
 * @access Public 
 */
router.post('/register', AuthController.register);

/**
 * @route POST /api/auth/login
 * @desc Login de usuário
 * @access Public
 */
router.post('/login', AuthController.login);

/**
 * @route POST /api/auth/logout
 * @desc Logout de usuário
 * @access Private
 */
router.post('/logout', authenticateToken, AuthController.logout);

/**
 * @route GET /api/auth/verify
 * @desc Verificar token de autenticação
 * @access Private
 */
router.get('/verify', authenticateToken, AuthController.verifyToken);

/**
 * @route PUT /api/auth/change-password
 * @desc Alterar senha do usuário
 * @access Private
 */
router.put('/change-password', authenticateToken, AuthController.changePassword);

/**
 * @route GET /api/auth/profile
 * @desc Obter perfil do usuário logado
 * @access Private
 */
router.get('/profile', authenticateToken, AuthController.getProfile);

/**
 * @route PUT /api/auth/profile
 * @desc Atualizar perfil do usuário logado
 * @access Private
 */
router.put('/profile', authenticateToken, AuthController.updateProfile);

/**
 * @route POST /api/auth/refresh
 * @desc Renovar token de autenticação
 * @access Private
 */
router.post('/refresh', authenticateToken, AuthController.refreshToken);

module.exports = router;
