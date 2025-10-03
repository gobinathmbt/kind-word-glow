const jwt = require('jsonwebtoken');
const Env_Configuration = require('../config/env');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const BayBooking = require('../models/BayBooking');

// Store connected bay chat users: Map<userId, { socketId, user, company }>
const bayChatConnectedUsers = new Map();

// Bay chat authentication middleware
const bayChatAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, Env_Configuration.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = user;
    next();
  } catch (error) {
    console.error('Bay chat auth error:', error);
    next(new Error('Authentication failed'));
  }
};

// Get or create conversation for bay booking
const getOrCreateBayConversation = async (bookingId) => {
  try {
    const booking = await BayBooking.findById(bookingId)
      .populate('created_by', 'first_name last_name email username role')
      .populate('accepted_by', 'first_name last_name email username role');

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Check if conversation already exists in booking
    if (booking.conversation_id) {
      const existingConversation = await Conversation.findById(booking.conversation_id);
      if (existingConversation) {
        return existingConversation;
      }
    }

    // Create new conversation
    const participants = [booking.created_by._id];
    if (booking.accepted_by) {
      participants.push(booking.accepted_by._id);
    }

    const conversation = new Conversation({
      conversation_type: 'bay_booking',
      company_id: booking.company_id,
      booking_id: bookingId,
      participants: [...new Set(participants)], // Remove duplicates
      metadata: {
        vehicle_type: booking.vehicle_type,
        vehicle_stock_id: booking.vehicle_stock_id,
        field_id: booking.field_id,
        field_name: booking.field_name,
        bay_id: booking.bay_id
      }
    });

    await conversation.save();

    // Update booking with conversation ID
    booking.conversation_id = conversation._id;
    await booking.save();

    return conversation;
  } catch (error) {
    console.error('Get or create bay conversation error:', error);
    throw error;
  }
};

// Mark bay messages as read
const markBayMessagesAsRead = async (conversationId, userId) => {
  try {
    await Conversation.updateMany(
      {
        conversation_id: conversationId,
        sender_id: { $ne: userId },
        read_by: { $nin: [userId] }
      },
      {
        $addToSet: { read_by: userId }
      }
    );
  } catch (error) {
    console.error('Mark bay messages as read error:', error);
  }
};

// Emit bay chat user status
const emitBayChatUserStatus = (io, userId, status, additionalData = {}) => {
  io.emit('bay-user-status', {
    userId,
    status,
    timestamp: new Date(),
    ...additionalData
  });
};

// Initialize bay chat handlers
const initializeBayChatHandlers = (io) => {
  io.on('connection', async (socket) => {
    console.log(`Bay chat user connected: ${socket.user.email} (${socket.id})`);

    // Store connected user
    bayChatConnectedUsers.set(socket.user.id.toString(), {
      socketId: socket.id,
      user: socket.user,
      company: socket.user.company_id
    });

    // Join user's personal room
    socket.join(`bay-user-${socket.user.id}`);

    // Emit online status
    emitBayChatUserStatus(io, socket.user.id, 'online');

    // Handle joining bay booking conversation
    socket.on('join-bay-conversation', async (data) => {
      try {
        const { bookingId } = data;

        const conversation = await getOrCreateBayConversation(bookingId);
        
        // Join conversation room
        socket.join(`bay-conversation-${conversation._id}`);

        // Mark messages as read
        await markBayMessagesAsRead(conversation._id, socket.user.id);

        socket.emit('bay-conversation-joined', {
          conversationId: conversation._id,
          booking: conversation.metadata
        });

        console.log(`User ${socket.user.email} joined bay conversation ${conversation._id}`);
      } catch (error) {
        console.error('Join bay conversation error:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Handle sending bay message
    socket.on('send-bay-message', async (data) => {
      try {
        const { conversationId, message, attachments } = data;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return socket.emit('error', { message: 'Conversation not found' });
        }

        // Check if user is participant
        if (!conversation.participants.some(p => p.toString() === socket.user.id.toString())) {
          return socket.emit('error', { message: 'Not authorized' });
        }

        // Create message
        const newMessage = new Conversation({
          conversation_id: conversationId,
          sender_id: socket.user.id,
          message,
          attachments: attachments || [],
          read_by: [socket.user.id]
        });

        await newMessage.save();

        // Update conversation last message
        conversation.last_message = message;
        conversation.last_message_at = new Date();
        await conversation.save();

        // Populate sender info
        await newMessage.populate('sender_id', 'first_name last_name email username role');

        // Emit to conversation room
        io.to(`bay-conversation-${conversationId}`).emit('bay-message-received', {
          message: newMessage,
          conversationId
        });

        // Send notification to other participants
        const otherParticipants = conversation.participants.filter(
          p => p.toString() !== socket.user.id.toString()
        );

        otherParticipants.forEach(participantId => {
          io.to(`bay-user-${participantId}`).emit('bay-new-message-notification', {
            conversationId,
            message: newMessage,
            from: socket.user
          });
        });

        console.log(`Bay message sent in conversation ${conversationId}`);
      } catch (error) {
        console.error('Send bay message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('bay-typing', (data) => {
      const { conversationId, isTyping } = data;
      socket.to(`bay-conversation-${conversationId}`).emit('bay-user-typing', {
        userId: socket.user.id,
        userName: `${socket.user.first_name} ${socket.user.last_name}`,
        isTyping
      });
    });

    // Handle messages read
    socket.on('bay-messages-read', async (data) => {
      try {
        const { conversationId } = data;
        await markBayMessagesAsRead(conversationId, socket.user.id);
        
        io.to(`bay-conversation-${conversationId}`).emit('bay-messages-marked-read', {
          userId: socket.user.id,
          conversationId
        });
      } catch (error) {
        console.error('Mark bay messages read error:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Bay chat user disconnected: ${socket.user.email}`);
      bayChatConnectedUsers.delete(socket.user.id.toString());
      emitBayChatUserStatus(io, socket.user.id, 'offline');
    });
  });
};

module.exports = {
  initializeBayChatHandlers,
  bayChatAuthMiddleware,
  bayChatConnectedUsers,
  getOrCreateBayConversation,
  markBayMessagesAsRead,
  emitBayChatUserStatus
};
