// socketRoutes.js - Multiple socket connection routes
const express = require('express');
const { getChatSocketIO, getMetaSocketIO } = require('../controllers/socket.controller');

const router = express.Router();

// Chat Socket Health Check
router.get('/v1/chat_connection/health', (req, res) => {
  try {
    const chatIO = getChatSocketIO();
    const connectedClients = chatIO ? chatIO.engine.clientsCount : 0;
    
    res.json({
      status: 'healthy',
      service: 'chat_socket',
      connected_clients: connectedClients,
      namespace: '/chat',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      service: 'chat_socket',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Metadata Socket Health Check
router.get('/v1/metadata_connection/health', (req, res) => {
  try {
    const metaIO = getMetaSocketIO();
    const connectedClients = metaIO ? metaIO.engine.clientsCount : 0;
    
    res.json({
      status: 'healthy',
      service: 'metadata_socket',
      connected_clients: connectedClients,
      namespace: '/metadata',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      service: 'metadata_socket',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// General Socket Status
router.get('/status', (req, res) => {
  try {
    const chatIO = getChatSocketIO();
    const metaIO = getMetaSocketIO();
    
    res.json({
      status: 'healthy',
      services: {
        chat_socket: {
          connected: !!chatIO,
          clients: chatIO ? chatIO.engine.clientsCount : 0,
          namespace: '/chat'
        },
        metadata_socket: {
          connected: !!metaIO,
          clients: metaIO ? metaIO.engine.clientsCount : 0,
          namespace: '/metadata'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;