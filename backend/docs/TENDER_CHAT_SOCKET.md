# Tender Chat Socket.IO Documentation

## Overview

The tender chat functionality uses **Socket.IO exclusively** for real-time communication between company admins and dealership users. There are no REST API endpoints - all chat operations happen through WebSocket connections.

## Namespace

**Namespace:** `/tender-chat`

## Authentication

Connect to the socket with a JWT token in the auth handshake:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000/tender-chat', {
  auth: {
    token: 'your-jwt-token-here'
  }
});
```

**Supported User Types:**
- Company Admin (`company_super_admin`, `company_admin`)
- Dealership User (with `tenderDealership_id` in token)

## Connection Events

### Client → Server

#### 1. Connection Established
Automatically triggered on successful connection.

**Response:**
```javascript
socket.on('tender_chat_connected', (data) => {
  console.log(data);
  // {
  //   message: "Successfully connected to tender chat server",
  //   user: { id, name, type },
  //   namespace: "tender-chat"
  // }
});
```

#### 2. Get Conversation
Fetch conversation history for a tender-dealership pair.

```javascript
socket.emit('get_tender_conversation', {
  tender_id: '507f1f77bcf86cd799439011',
  dealership_id: '507f1f77bcf86cd799439012'
});

socket.on('tender_conversation_data', (data) => {
  console.log(data.conversation);
  // { _id, tender_id, tenderDealership_id, messages: [...], ... }
});
```

#### 3. Join Conversation
Join a specific tender-dealership conversation room.

```javascript
socket.emit('join_tender_conversation', {
  tender_id: '507f1f77bcf86cd799439011',
  dealership_id: '507f1f77bcf86cd799439012'
});

socket.on('joined_tender_conversation', (data) => {
  console.log('Joined conversation:', data.tender_id);
  // Messages are automatically marked as read
});
```

#### 4. Leave Conversation
Leave a conversation room.

```javascript
socket.emit('leave_tender_conversation', {
  tender_id: '507f1f77bcf86cd799439011',
  dealership_id: '507f1f77bcf86cd799439012'
});
```

#### 5. Send Message
Send a text or file message.

```javascript
socket.emit('send_tender_message', {
  tender_id: '507f1f77bcf86cd799439011',
  dealership_id: '507f1f77bcf86cd799439012',
  content: 'Hello, regarding this tender...',
  message_type: 'text', // 'text', 'image', 'video', 'file', 'audio'
  file_data: { // Optional, for file attachments
    url: 'https://s3.amazonaws.com/...',
    key: 's3-key',
    size: 1024000,
    type: 'application/pdf',
    name: 'quote.pdf'
  }
});
```

**Note:** Files should be uploaded to S3 first, then pass the file metadata.

#### 6. Typing Indicators
Show when user is typing.

```javascript
// Start typing
socket.emit('tender_typing_start', {
  tender_id: '507f1f77bcf86cd799439011',
  dealership_id: '507f1f77bcf86cd799439012'
});

// Stop typing
socket.emit('tender_typing_stop', {
  tender_id: '507f1f77bcf86cd799439011',
  dealership_id: '507f1f77bcf86cd799439012'
});
```

#### 7. Mark Messages as Read
Mark all unread messages as read.

```javascript
socket.emit('mark_tender_messages_read', {
  tender_id: '507f1f77bcf86cd799439011',
  dealership_id: '507f1f77bcf86cd799439012'
});

socket.on('tender_messages_marked_read', (data) => {
  console.log('Messages marked as read');
});
```

#### 8. Get User Status
Check if a user is online.

```javascript
socket.emit('get_tender_user_status', {
  user_type: 'admin', // or 'dealership'
  user_id: '507f1f77bcf86cd799439013'
});

socket.on('tender_user_status', (data) => {
  console.log(data.online); // true/false
  console.log(data.last_seen); // Date
});
```

#### 9. Ping/Pong
Test connection health.

```javascript
socket.emit('tender_ping', { timestamp: Date.now() });

socket.on('tender_pong', (data) => {
  console.log('Latency:', Date.now() - data.timestamp);
});
```

### Server → Client

#### 1. New Message
Receive new messages in real-time.

```javascript
socket.on('new_tender_message', (data) => {
  console.log('New message:', data.message);
  // {
  //   conversation_id,
  //   tender_id,
  //   dealership_id,
  //   message: {
  //     sender_id, sender_type, sender_name,
  //     content, message_type, created_at, ...
  //   }
  // }
});
```

#### 2. Conversation Update
Receive conversation updates (new message notification).

```javascript
socket.on('tender_conversation_update', (data) => {
  console.log('Conversation updated:', data);
  // {
  //   conversation_id,
  //   tender_id,
  //   dealership_id,
  //   last_message,
  //   last_message_at,
  //   unread_count,
  //   sender_type
  // }
});
```

#### 3. User Typing
See when other users are typing.

```javascript
socket.on('tender_user_typing', (data) => {
  if (data.typing) {
    console.log(`${data.user_name} is typing...`);
  } else {
    console.log(`${data.user_name} stopped typing`);
  }
});
```

#### 4. User Status Change
Receive online/offline status updates.

```javascript
socket.on('user_status_change', (data) => {
  console.log(`User ${data.user_id} is now ${data.online ? 'online' : 'offline'}`);
});
```

#### 5. Error
Handle errors.

```javascript
socket.on('error', (data) => {
  console.error('Socket error:', data.message);
});
```

## Message Structure

```javascript
{
  sender_id: ObjectId,
  sender_type: 'admin' | 'dealership',
  sender_name: String,
  message_type: 'text' | 'image' | 'video' | 'file' | 'audio',
  content: String,
  file_url: String, // Optional
  file_key: String, // Optional
  file_size: Number, // Optional
  file_type: String, // Optional
  file_name: String, // Optional
  is_read: Boolean,
  read_at: Date, // Optional
  created_at: Date
}
```

## Conversation Structure

```javascript
{
  _id: ObjectId,
  tender_id: ObjectId,
  tenderDealership_id: ObjectId,
  company_id: ObjectId,
  messages: [Message],
  unread_count_admin: Number,
  unread_count_dealership: Number,
  last_message_at: Date,
  is_archived_admin: Boolean,
  is_archived_dealership: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## Rooms

Users are automatically joined to these rooms:

1. **Personal Room:** `tender_chat_{type}_{user_id}`
   - Receives personal notifications

2. **Company/Dealership Room:** 
   - Admin: `tender_chat_company_{company_id}`
   - Dealership: `tender_chat_dealership_{dealership_id}`
   - Receives status updates

3. **Conversation Room:** `tender_conversation_{tender_id}_{dealership_id}`
   - Joined when calling `join_tender_conversation`
   - Receives real-time messages

## Email Notifications

Email notifications are automatically sent when:
- A message is sent and the recipient is offline
- Includes message content and sender information
- Links to the portal to view and respond

## File Attachments

**File Upload Flow:**
1. Upload file to S3 using your file upload service
2. Get the file URL, key, size, type, and name
3. Send message with `file_data` object
4. File size limit: 10MB

## Error Handling

Common errors:
- `"Authentication error: No token provided"` - Missing JWT token
- `"Access denied"` - Dealership user trying to access another dealership's conversation
- `"Tender not found"` - Invalid tender ID
- `"Dealership not found"` - Invalid dealership ID
- `"Conversation not found"` - Conversation doesn't exist
- `"File size exceeds 10MB limit"` - File too large

## Example: Complete Chat Implementation

```javascript
import io from 'socket.io-client';

class TenderChatService {
  constructor(token) {
    this.socket = io('http://localhost:5000/tender-chat', {
      auth: { token }
    });
    
    this.setupListeners();
  }
  
  setupListeners() {
    this.socket.on('tender_chat_connected', (data) => {
      console.log('Connected:', data.user);
    });
    
    this.socket.on('new_tender_message', (data) => {
      this.handleNewMessage(data);
    });
    
    this.socket.on('tender_user_typing', (data) => {
      this.handleTyping(data);
    });
    
    this.socket.on('error', (data) => {
      console.error('Error:', data.message);
    });
  }
  
  joinConversation(tenderId, dealershipId) {
    this.socket.emit('join_tender_conversation', {
      tender_id: tenderId,
      dealership_id: dealershipId
    });
  }
  
  sendMessage(tenderId, dealershipId, content) {
    this.socket.emit('send_tender_message', {
      tender_id: tenderId,
      dealership_id: dealershipId,
      content,
      message_type: 'text'
    });
  }
  
  startTyping(tenderId, dealershipId) {
    this.socket.emit('tender_typing_start', {
      tender_id: tenderId,
      dealership_id: dealershipId
    });
  }
  
  stopTyping(tenderId, dealershipId) {
    this.socket.emit('tender_typing_stop', {
      tender_id: tenderId,
      dealership_id: dealershipId
    });
  }
  
  markAsRead(tenderId, dealershipId) {
    this.socket.emit('mark_tender_messages_read', {
      tender_id: tenderId,
      dealership_id: dealershipId
    });
  }
  
  handleNewMessage(data) {
    // Update UI with new message
    console.log('New message:', data.message);
  }
  
  handleTyping(data) {
    // Show typing indicator
    console.log(`${data.user_name} is ${data.typing ? 'typing' : 'not typing'}`);
  }
  
  disconnect() {
    this.socket.disconnect();
  }
}

// Usage
const chatService = new TenderChatService(userToken);
chatService.joinConversation(tenderId, dealershipId);
chatService.sendMessage(tenderId, dealershipId, 'Hello!');
```

## Best Practices

1. **Always join conversation** before sending messages
2. **Leave conversation** when navigating away
3. **Mark messages as read** when user views them
4. **Handle reconnection** - Socket.IO handles this automatically
5. **Upload files first** to S3, then send file metadata
6. **Implement typing indicators** for better UX
7. **Show online status** to indicate availability
8. **Handle errors gracefully** and show user-friendly messages

## Security

- JWT authentication required
- Dealership users can only access their own conversations
- Company admins can access all conversations for their company
- Multi-tenant data isolation enforced
- File size limits enforced (10MB)
- All messages stored in company database

## Performance

- Real-time message delivery (< 100ms)
- Automatic reconnection on connection loss
- Efficient room-based broadcasting
- Connected users tracking
- Minimal bandwidth usage

## Troubleshooting

**Connection Issues:**
- Check JWT token is valid and not expired
- Verify Socket.IO server is running
- Check CORS configuration
- Ensure correct namespace (`/tender-chat`)

**Messages Not Received:**
- Verify user joined the conversation room
- Check user has proper permissions
- Ensure conversation exists

**Typing Indicators Not Working:**
- Must be in the same conversation room
- Check event names match exactly
- Verify socket connection is active
