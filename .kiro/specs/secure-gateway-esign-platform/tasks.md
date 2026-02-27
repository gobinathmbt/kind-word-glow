# Implementation Plan: Secure Gateway E-Sign Platform

## Overview

This implementation plan breaks down the Secure Gateway E-Sign Platform into discrete, actionable coding tasks. The platform is a MERN-stack electronic signature system that integrates with an existing multi-tenant SaaS application. Implementation follows a phased approach: Foundation & Integration → Settings & Templates → Document Workflow → Message Center & Operations → Testing & Deployment.

The system consists of 7 core modules: Settings, Templates, External API, E-Sign Public Page, Document Engine, Message Center, and Audit Log. All tasks build incrementally, with each phase completing functional components before moving to the next.

## Tasks

- [x] 1. Foundation & Infrastructure Setup
  - [x] 1.1 Set up AWS SQS infrastructure and MongoDB models
    - Add SQS connection configuration in backend/src/config/sqs.js
    - Configure SQS client with AWS credentials from master admin settings
    - Create MongoDB models for OTP storage, distributed locks, rate limiting, idempotency, and short links
    - Add SQS health check endpoint
    - _Requirements: 31.7, 27.6, 39.4_
  
  - [x] 1.2 Create PDF service infrastructure
    - Set up Node.js service with Puppeteer or Python service with WeasyPrint
    - Implement HTML-to-PDF conversion endpoint
    - Implement PDF-to-HTML conversion endpoint for template editing
    - Add timeout and retry configuration (30s timeout, 2 retries)
    - _Requirements: 3.1, 3.2, 41.1, 41.2, 41.3, 51.3, 51.4, 51.6_
  
  - [x] 1.3 Create Mongoose model schemas for e-sign collections
    - Create backend/src/models/EsignTemplate.js with all fields and indexes
    - Create backend/src/models/EsignDocument.js with recipient schema and indexes
    - Create backend/src/models/EsignProviderConfig.js with encryption fields
    - Create backend/src/models/EsignAPIKey.js with scope enum
    - Create backend/src/models/EsignSigningGroup.js
    - Create backend/src/models/EsignBulkJob.js with progress tracking
    - Create backend/src/models/EsignAuditLog.js (or plan to use existing GlobalLog)
    - Register all models in backend/src/models/modelRegistry.js
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.1, 4.1, 5.1_


  - [x] 1.4 Create core service modules
    - Implement backend/src/services/esign/encryption.service.js for AES-256 credential encryption/decryption
    - Implement backend/src/services/esign/token.service.js for JWT generation, validation, and rotation
    - Implement backend/src/services/esign/otp.service.js for OTP generation, hashing, verification with MongoDB storage
    - Implement backend/src/services/esign/lock.service.js for distributed locks using MongoDB
    - Implement backend/src/services/esign/audit.service.js for centralized audit logging
    - _Requirements: 1.4, 1.5, 1.6, 8.1, 8.2, 9.5, 9.6, 9.7, 28.1, 28.2, 31.1, 31.2, 31.7, 49.1, 49.2_
  
  - [x] 1.5 Create authentication and rate limiting middleware
    - Create backend/src/middleware/esignAPIAuth.js for API key validation
    - Create backend/src/middleware/esignRateLimit.js for MongoDB-based rate limiting (100 req/min)
    - Create backend/src/middleware/esignIdempotency.js for idempotency key handling with MongoDB
    - _Requirements: 2.7, 6.1, 6.2, 6.3, 6.4, 6.5, 27.1, 27.2, 27.3, 39.1, 39.2, 39.3, 39.4_
  
  - [x] 1.6 Add e-sign module to existing system
    - Create migration script to add 'esign_documents' module to CustomModuleConfig for all companies
    - Update existing moduleAccess.js middleware to recognize 'esign_documents' module
    - Add e-sign navigation menu items to src/components/layout/DashboardLayout.tsx
    - Configure routes in src/App.tsx with requiredModule="esign_documents"
    - _Requirements: All requirements depend on module access control_

- [-] 2. Settings Module - Provider Configuration
  - [ ] 2.1 Create provider configuration backend routes and controllers
    - Create backend/src/routes/esignSettings.routes.js with provider CRUD endpoints
    - Create backend/src/controllers/esignSettings.controller.js
    - Implement POST /api/company/esign/settings/providers (create/update provider)
    - Implement GET /api/company/esign/settings/providers (list providers)
    - Implement POST /api/company/esign/settings/providers/:id/test (connection test)
    - Apply auth, tenantContext, and moduleAccess('esign_documents') middleware
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  
  - [ ] 2.2 Implement storage provider adapters
    - Create backend/src/services/esign/storage/StorageAdapter.js interface
    - Implement S3StorageAdapter.js (reuse existing Company.s3_config)
    - Implement AzureBlobStorageAdapter.js
    - Implement GoogleDriveStorageAdapter.js
    - Implement DropboxStorageAdapter.js
    - Each adapter: upload(), download(), generatePresignedUrl(), testConnection()
    - _Requirements: 1.8, 1.9, 12.9, 12.10, 12.11, 18.1, 18.2, 32.1, 32.2, 32.3, 32.4, 32.5_
  
  - [ ] 2.3 Implement notification provider integration
    - Integrate with existing NotificationConfiguration model
    - Add e-sign event types: 'esign.document.created', 'esign.document.signed', etc.
    - Create backend/src/services/esign/notification.service.js
    - Implement email sending via SMTP/SendGrid using active Email_Provider
    - Implement SMS sending via Twilio/SendGrid SMS using active SMS_Provider
    - Implement retry logic with exponential backoff (2s, 4s, 8s delays, max 3 retries)
    - _Requirements: 1.9, 1.10, 13.2, 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7, 25.1-25.8_
  
  - [ ] 2.4 Implement connection testing for all providers
    - Storage test: write test file, read it back, delete it, return success/failure
    - Email test: send test email to requesting user's email address
    - SMS test: send test OTP to provided phone number
    - Return success status within 10 seconds or descriptive error message
    - Log all test results to audit log
    - _Requirements: 1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 69.1, 69.2_


  - [ ] 2.5 Create provider configuration frontend pages
    - Create src/pages/company/esign/EsignSettings.tsx
    - Implement provider configuration forms (storage, email, SMS)
    - Add credential input fields with masking for sensitive data
    - Implement connection test buttons with loading states
    - Use existing Shadcn/ui components (Button, Input, Select, Dialog)
    - Add provider configuration to src/api/services.ts esignServices
    - _Requirements: 1.1, 1.2, 1.3, 1.7, 1.8, 1.9, 1.10_

- [ ] 3. Settings Module - API Key Management
  - [ ] 3.1 Create API key management backend routes and controllers
    - Add API key endpoints to backend/src/routes/esignSettings.routes.js
    - Implement POST /api/company/esign/settings/api-keys (generate key)
    - Implement GET /api/company/esign/settings/api-keys (list keys)
    - Implement DELETE /api/company/esign/settings/api-keys/:id (revoke key)
    - Generate unique key pair (API_Key and API_Secret) with crypto.randomBytes
    - Hash API_Secret with bcrypt before storage
    - Display plain API_Secret only once in response
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  
  - [ ] 3.2 Create API key management frontend page
    - Create src/pages/company/esign/EsignAPIKeys.tsx
    - Use existing DataTableLayout for API keys list
    - Implement key generation dialog with scope selection
    - Display generated API_Secret once with copy-to-clipboard
    - Show only first 8 characters of API_Key in list
    - Implement revoke confirmation dialog
    - Add API key services to src/api/services.ts esignServices
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 2.6_

- [ ] 4. Templates Module - Core Template Management
  - [ ] 4.1 Create template backend routes and controllers
    - Create backend/src/routes/esignTemplate.routes.js
    - Create backend/src/controllers/esignTemplate.controller.js
    - Implement POST /api/company/esign/templates (create template)
    - Implement GET /api/company/esign/templates (list with pagination)
    - Implement GET /api/company/esign/templates/:id (get details)
    - Implement PUT /api/company/esign/templates/:id (update template)
    - Implement DELETE /api/company/esign/templates/:id (soft delete)
    - Implement POST /api/company/esign/templates/:id/duplicate (duplicate template)
    - Implement POST /api/company/esign/templates/:id/activate (activate template)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 4.13, 4.14, 36.1-36.5_
  
  - [ ] 4.2 Implement PDF upload and conversion
    - Implement POST /api/company/esign/templates/:id/upload-pdf endpoint
    - Validate PDF file type and size (max 10MB)
    - Send PDF to PDF_Service for HTML conversion
    - Store converted HTML in template.html_content
    - Handle conversion failures with descriptive error messages
    - Complete conversion within 30 seconds for PDFs up to 50 pages
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 51.1-51.6_
  
  - [ ] 4.3 Implement delimiter extraction and validation
    - Create backend/src/services/esign/delimiter.service.js
    - Scan HTML for delimiter patterns matching {{key_name}}
    - Extract delimiter keys and populate delimiters array with default type "text"
    - Preserve existing delimiter configuration when re-scanning
    - Validate all delimiters in email templates exist in HTML content
    - Mark unused delimiters but don't delete them
    - _Requirements: 33.1, 33.2, 33.3, 33.4, 33.5, 33.6, 52.1, 52.2, 52.3, 52.4, 52.5_
  
  - [ ] 4.4 Implement template validation before activation
    - Validate HTML content is not empty
    - Validate at least one delimiter exists
    - Validate signature configuration is complete
    - Validate email subject and body are not empty
    - Validate all required delimiters are defined
    - Return list of validation errors if validation fails
    - Update template status to "active" only if validation succeeds
    - _Requirements: 34.1, 34.2, 34.3, 34.4, 34.5, 34.6, 34.7_


  - [ ] 4.5 Implement template deletion protection
    - Check for active documents (status "distributed", "opened", "partially_signed") before deletion
    - Return error "Cannot delete template with active documents" if active documents exist
    - Soft-delete template by setting isDeleted=true if no active documents
    - Exclude soft-deleted templates from template lists
    - Preserve template snapshots in all documents
    - Log deletion attempts to audit log
    - _Requirements: 38.1, 38.2, 38.3, 38.4, 38.5, 38.6_
  
  - [ ] 4.6 Create template frontend pages
    - Create src/pages/company/esign/EsignTemplates.tsx with DataTableLayout
    - Create src/pages/company/esign/TemplateEditor.tsx
    - Implement template list with filters (status, created date)
    - Implement template creation and editing forms
    - Add template services to src/api/services.ts esignServices
    - Use React Hook Form for form handling
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 4.13, 4.14_

- [ ] 5. Templates Module - Visual Editor & Field Placement
  - [ ] 5.1 Create visual field placement editor component
    - Create src/components/esign/FieldPlacer.tsx
    - Render HTML content in canvas with drag-and-drop zones
    - Implement field palette (signature, text, date, email, phone fields)
    - Drag field from palette to canvas to insert delimiter at coordinates
    - Store field position (x, y, page) in delimiter configuration
    - Assign fields to recipients by signature_order
    - Prevent assigning same field to multiple recipients
    - Remove delimiter when field is removed from canvas
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12_
  
  - [ ] 5.2 Implement template preview with sample data
    - Implement GET /api/company/esign/templates/:id/preview endpoint
    - Render HTML with sample delimiter values
    - Use default values from delimiter configuration if no sample provided
    - Use placeholder text "[delimiter_name]" if no default value
    - Allow custom sample values in preview request
    - Render preview in read-only view
    - _Requirements: 44.1, 44.2, 44.3, 44.4, 44.5_
  
  - [ ] 5.3 Implement template payload schema generation
    - Implement GET /api/company/esign/templates/:id/schema endpoint
    - Return JSON structure with all delimiter definitions
    - Mark required delimiters in schema
    - Include delimiter types in schema
    - Include default values in schema
    - Include example values for each delimiter
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5_

- [ ] 6. Templates Module - Workflow Configuration
  - [ ] 6.1 Implement template workflow configuration
    - Configure signature type (single, multiple, hierarchy, send_to_all)
    - Validate recipient count based on signature type (single=1, others>=2)
    - Configure recipient details (email, phone, name, signature_order)
    - Configure MFA settings (enabled, channel, otp_expiry_min)
    - Configure link expiry (value, unit, grace_period_hours)
    - Configure preview mode (boolean)
    - Configure notification settings (send_on_create, send_on_complete, etc.)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 4.13_
  
  - [ ] 6.2 Implement conditional routing rules configuration
    - Configure routing rules with triggered_by (recipient signature_order)
    - Configure condition (delimiter_key, operator, value)
    - Support operators: equals, not_equals, greater_than, less_than, contains, is_empty
    - Configure action (type, target_order, email)
    - Support action types: activate_signer, skip_signer, add_signer, complete
    - Validate routing rules reference valid delimiters and recipients
    - _Requirements: 78.1, 78.2, 78.3, 78.4, 78.5, 78.6, 78.7, 78.8, 78.9, 78.10_
  
  - [ ] 6.3 Implement signing groups configuration
    - Create backend/src/routes/esignSigningGroup.routes.js
    - Implement signing group CRUD operations
    - Configure group members (email, name)
    - Allow template recipients to reference signing groups
    - Set recipient_type to "group" and store signing_group_id
    - _Requirements: 79.1, 79.2, 79.3_


  - [ ] 6.4 Implement notification template customization
    - Allow custom email subject and body in template configuration
    - Allow custom SMS message body
    - Support delimiter replacement in notification content
    - Replace missing delimiters with empty string
    - Validate SMS content does not exceed 160 characters
    - _Requirements: 46.1, 46.2, 46.3, 46.4, 46.5_
  
  - [ ] 6.5 Implement HTML sanitization
    - Sanitize HTML content on save to remove script tags
    - Remove event handlers (onclick, onload, etc.)
    - Remove iframe tags
    - Allow safe HTML tags (div, span, p, h1-h6, table, tr, td, img, a)
    - Allow style attributes for formatting
    - Render only sanitized HTML to signers
    - _Requirements: 50.1, 50.2, 50.3, 50.4, 50.5, 50.6_

- [ ] 7. External API Module - Authentication & Document Initiation
  - [ ] 7.1 Create external API routes with API key authentication
    - Create backend/src/routes/esignAPI.routes.js at /api/v1/esign/*
    - Create backend/src/controllers/esignAPI.controller.js
    - Apply esignAPIAuth middleware (no auth/tenantContext middleware)
    - Apply esignRateLimit middleware
    - Apply esignIdempotency middleware for document creation
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  
  - [ ] 7.2 Implement document initiation endpoint
    - Implement POST /api/v1/esign/documents/initiate
    - Validate API_Key and identify company
    - Validate template exists and status is "active"
    - Validate required delimiter values are present in payload
    - Validate delimiter values match configured types (email, phone, date, number)
    - Create document with status "new" and template snapshot
    - Generate unique token for each recipient with expiration
    - Set document expiration based on template link_expiry configuration
    - Return document ID and recipient URLs in response
    - Complete within 5 seconds for documents with up to 10 recipients
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 42.1-42.6_
  
  - [ ] 7.3 Implement idempotency handling
    - Check Idempotency_Key header in document initiation requests
    - Store idempotency key in MongoDB with 24-hour TTL
    - Return existing document if matching key found within 24 hours
    - Return HTTP 200 with existing document data
    - Allow new document creation if key is older than 24 hours
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6_
  
  - [ ] 7.4 Implement preview mode and distribution logic
    - If preview_mode disabled: send notifications immediately, set status to "distributed"
    - If preview_mode enabled: return preview URL, set status to "draft_preview"
    - Do not send notifications to recipients when status is "draft_preview"
    - Implement POST /api/company/esign/documents/:id/approve (Company_Admin only)
    - On approval: update status to "distributed", send notifications to all active recipients
    - Implement POST /api/company/esign/documents/:id/reject (Company_Admin only)
    - On rejection: update status to "cancelled"
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6_
  
  - [ ] 7.5 Implement document status polling endpoint
    - Implement GET /api/v1/esign/documents/:id/status
    - Return current document status
    - Return status of all recipients with timestamps
    - Include PDF download URL if document is completed
    - Include certificate URL if available
    - Return within 500 milliseconds
    - _Requirements: 47.1, 47.2, 47.3, 47.4, 47.5_
  
  - [ ] 7.6 Implement webhook delivery with signature verification
    - Send HTTP POST to callback_url when document is completed
    - Include event type, document_id, timestamp, and data in payload
    - Compute HMAC-SHA256 signature of request body using API_Secret
    - Include signature in X-Signature header
    - Include timestamp in payload
    - Retry up to 3 times with exponential backoff (2s, 4s, 8s) on failure
    - Support retry_backoff: "exponential" or "fixed" (5s)
    - Log callback attempts and responses to audit log
    - _Requirements: 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 40.1, 40.2, 40.3, 40.4, 40.5_


  - [ ] 7.7 Implement bulk document initiation from CSV
    - Implement POST /api/v1/esign/bulk/initiate endpoint
    - Accept CSV file upload with column mapping to delimiters
    - Create EsignBulkJob record with status "queued"
    - Process CSV rows asynchronously (job queue or cron)
    - Create document for each valid row
    - Track progress (total, processed, succeeded, failed)
    - Store errors with row numbers
    - Update bulk job status to "completed" or "failed"
    - Send webhook notification when bulk job completes
    - _Requirements: 81.1, 81.2, 81.3, 81.4, 81.5, 81.6, 81.7, 81.8, 81.9, 81.10_

- [ ] 8. Public Signing Page Module - Token Validation & Access Control
  - [ ] 8.1 Create public signing page routes
    - Create backend/src/routes/esignPublic.routes.js at /esign/public/*
    - Create backend/src/controllers/esignPublic.controller.js
    - No auth middleware (public access via token)
    - Implement GET /sign/:token (access signing page)
    - Implement POST /sign/:token/send-otp (send OTP)
    - Implement POST /sign/:token/verify-otp (verify OTP)
    - Implement POST /sign/:token/submit (submit signature)
    - Implement POST /sign/:token/decline (decline signature)
    - Implement POST /sign/:token/delegate (delegate signing)
    - Implement GET /sign/:token/scroll-complete (mark scroll completion)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_
  
  - [ ] 8.2 Implement token validation and access control
    - Validate token is valid JWT and not expired
    - Return error "Invalid or expired link" if token is invalid
    - Return error "This link has expired" if token is expired
    - Check document status and return appropriate messages for completed/cancelled/rejected
    - Check if recipient has already signed
    - For hierarchy signature type: check if it's recipient's turn, return "Waiting for previous signer" if not
    - Load document HTML with delimiter values injected
    - Log all token validation attempts to audit log with IP, user agent, timestamp
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_
  
  - [ ] 8.3 Implement short link generation and redirect
    - Generate 8-character alphanumeric short code for each recipient token
    - Ensure short code is unique across all documents
    - Store mapping in MongoDB with expiration matching token expiry
    - Implement GET /s/:shortCode endpoint
    - Redirect to full signing URL /sign/:token
    - _Requirements: 37.1, 37.2, 37.3, 37.4, 37.5_
  
  - [ ] 8.4 Implement geo location capture
    - Capture IP address from request
    - Perform geo lookup to determine country, region, city (1-second timeout)
    - Store location data in audit log entry
    - Store IP address only if geo lookup fails
    - Do not block document access if geo lookup fails
    - _Requirements: 35.1, 35.2, 35.3, 35.4, 35.5, 35.6_

- [ ] 9. Public Signing Page Module - Multi-Factor Authentication
  - [ ] 9.1 Implement OTP generation and delivery
    - Generate 6-digit OTP when MFA is enabled
    - Hash OTP with bcrypt before storing in MongoDB
    - Set OTP expiration based on template otp_expiry_min configuration
    - Send OTP via email if channel is "email"
    - Send OTP via SMS if channel is "sms"
    - Send OTP via both email and SMS if channel is "both"
    - Store OTP in MongoDB with recipient_id as key
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ] 9.2 Implement OTP verification with lockout
    - Verify submitted OTP against hashed value in MongoDB
    - Increment attempt counter on incorrect OTP
    - Lock recipient for 30 minutes after 5 failed attempts
    - Return error "Too many attempts. Try again in 30 minutes" when locked
    - Reset attempt counter to 0 on successful verification
    - Reset attempt counter to 0 when lockout period expires
    - Log all OTP generation and verification attempts to audit log
    - _Requirements: 9.7, 9.8, 9.9, 9.10, 9.11, 9.12, 29.1, 29.2, 29.3, 29.4, 29.5, 29.6_


  - [ ] 9.3 Implement token rotation after OTP verification
    - Generate new short-lived token (1 hour expiration) after successful OTP verification
    - Invalidate previous token
    - Return new token to client
    - Log token rotation events to audit log
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5_
  
  - [ ] 9.4 Implement OTP resend throttling
    - Track OTP send attempts in MongoDB
    - Limit to 3 OTP sends per 15-minute window per recipient
    - Return error "Too many OTP requests. Try again later" if limit exceeded
    - Reset counter after 15 minutes
    - _Requirements: 83.1, 83.2, 83.3, 83.4_

- [ ] 10. Public Signing Page Module - Signature Capture & Submission
  - [ ] 10.1 Create signature capture frontend component
    - Create src/components/esign/SignatureCapture.tsx
    - Implement draw signature with canvas (capture as base64 PNG)
    - Implement type signature (render in signature font, convert to base64 PNG)
    - Implement upload signature (validate PNG/JPG/JPEG, max 2MB)
    - Resize uploaded images to max 400px width maintaining aspect ratio
    - Convert all signatures to base64-encoded PNG
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 53.1, 53.2, 53.3, 53.4, 53.5, 53.6_
  
  - [ ] 10.2 Implement signature submission with intent confirmation
    - Display intent confirmation checkbox with text "I agree that this is my legal signature..."
    - Prevent submission if checkbox is not checked
    - Store intent confirmation text in recipient record
    - Capture IP address, user agent, and timestamp on submission
    - Store signature image in recipient record
    - Update recipient status to "signed"
    - _Requirements: 10.6, 10.7, 10.8, 10.9, 48.1, 48.2, 48.3, 48.4, 48.5_
  
  - [ ] 10.3 Implement recipient field isolation
    - Disable all fields not assigned to current recipient
    - Visually indicate which fields are assigned to current recipient
    - Validate on backend that submitted field data matches recipient's assigned fields
    - Reject submission if recipient attempts to modify other recipients' fields
    - _Requirements: 43.1, 43.2, 43.3, 43.4_
  
  - [ ] 10.4 Implement scroll completion enforcement
    - Track scroll position on signing page
    - Require scroll to within 50 pixels of document bottom if require_scroll_completion enabled
    - Block signature submission until scroll requirement met
    - Store scroll_completed_at timestamp in recipient record
    - _Requirements: 75.1, 75.2, 75.3, 75.4_
  
  - [ ] 10.5 Implement document status updates after signature
    - For single signature type: update document status to "signed" immediately
    - For multiple/hierarchy: update to "partially_signed" until all recipients sign
    - Update to "signed" when all recipients have signed
    - For hierarchy: activate next recipient in sequence after current signs
    - Generate new token for next recipient and send notification
    - Log all signature submissions to audit log
    - _Requirements: 10.10, 10.11, 10.12, 10.13, 10.14_

- [ ] 11. Public Signing Page Module - Advanced Features
  - [ ] 11.1 Implement document rejection/decline
    - Display decline button with confirmation dialog
    - Update recipient status to "rejected" on confirmation
    - Update document status to "rejected"
    - Send rejection notifications per template configuration
    - Invalidate all recipient tokens
    - Log rejection events to audit log with reason if provided
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
  
  - [ ] 11.2 Implement signing delegation
    - Implement POST /sign/:token/delegate endpoint
    - Accept delegate email, name, and optional reason
    - Validate recipient email and phone
    - Generate new token for delegate
    - Send notification to delegate with signing link
    - Store delegation chain (original signer → delegate) in recipient record
    - Log delegation events to audit log
    - _Requirements: 80.1, 80.2, 80.3, 80.4, 80.5, 80.6, 80.7, 80.8_


  - [ ] 11.3 Implement signing groups with atomic slot claiming
    - When recipient_type is "group", allow any group member to sign
    - Use MongoDB distributed lock to ensure only one group member can claim slot
    - Invalidate tokens for all other group members atomically when one signs
    - Store which group member signed in recipient.group_member_email
    - Log signing group events to audit log
    - _Requirements: 79.1, 79.2, 79.3, 79.4, 79.5, 79.6, 79.7_
  
  - [ ] 11.4 Implement kiosk/in-person signing
    - Create backend/src/routes/esignKiosk.routes.js
    - Implement GET /kiosk/:token (kiosk signing page)
    - Implement POST /kiosk/:token/authenticate-host (host authentication)
    - Implement POST /kiosk/:token/capture-photo (capture signer photo)
    - Implement POST /kiosk/:token/submit (submit in-person signature)
    - Store kiosk_host_id, kiosk_location, and signer_photo in recipient record
    - Implement session timeout (default 5 minutes) with host re-authentication
    - _Requirements: 82.1, 82.2, 82.3, 82.4, 82.5, 82.6, 82.7, 82.8_
  
  - [ ] 11.5 Implement grace period handling
    - Check if current time is within grace period (expires_at < now < expires_at + grace_period_hours)
    - Allow token access during grace period with warning message
    - Invalidate token after grace period ends
    - Display warning "This link has expired but is still accessible during grace period"
    - _Requirements: 84.1, 84.2, 84.3, 84.4, 84.5_
  
  - [ ] 11.6 Create public signing page frontend
    - Create src/pages/esign/public/SigningPage.tsx (no auth required)
    - Create src/pages/esign/public/KioskSigningPage.tsx
    - Create src/pages/esign/public/SigningComplete.tsx
    - Create src/pages/esign/public/SigningError.tsx
    - Implement mobile-responsive design with Tailwind CSS
    - Implement OTP input component
    - Integrate SignatureCapture component
    - Display document HTML with delimiter values injected
    - _Requirements: 8.9, 9.1, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 12. Document Engine Module - PDF Generation & Storage
  - [ ] 12.1 Implement PDF generation workflow
    - Create backend/src/services/esign/pdf.service.js
    - Acquire distributed lock on document before PDF generation
    - Inject all signature images into HTML at designated delimiter positions
    - Append audit footer with signing timestamps, IP addresses, and geo locations
    - Send prepared HTML to PDF_Service for conversion
    - Set 30-second timeout for PDF_Service
    - Retry up to 2 times with 5-second delays on failure
    - Do not retry if PDF_Service returns HTTP 400 (invalid input)
    - Release distributed lock after completion or failure
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.13, 12.14, 31.1-31.7, 41.1-41.6_
  
  - [ ] 12.2 Implement PDF hash computation and integrity verification
    - Compute SHA_256_Hash of generated PDF buffer
    - Store hash in document record with algorithm name "SHA-256"
    - Implement GET /api/company/esign/documents/:id/verify endpoint
    - Download PDF from storage provider
    - Compute SHA_256_Hash of downloaded file
    - Return verification status "valid" if hashes match, "invalid" if not
    - Log all verification attempts to audit log
    - _Requirements: 12.7, 12.8, 30.1, 30.2, 30.3, 30.4, 30.5, 30.6, 30.7_
  
  - [ ] 12.3 Implement storage upload with retry logic
    - Upload PDF to active storage provider
    - Retry up to 3 times with exponential backoff (2s, 4s, 8s) on failure
    - Store storage URL in document record on success
    - Set document status to "error" if all retries fail
    - Log error to audit log if all retries fail
    - Log retry count to audit log on success
    - Complete PDF generation and storage within 60 seconds for documents up to 50 pages
    - _Requirements: 12.9, 12.10, 12.11, 12.12, 12.13, 12.14, 12.15, 32.1-32.6_
  
  - [ ] 12.4 Implement certificate of completion generation
    - Create backend/src/services/esign/certificate.service.js
    - Generate certificate PDF with document metadata
    - Include all signer information (name, email, signed_at, IP, geo location)
    - Include PDF hash for verification
    - Include verification URL
    - Upload certificate to storage provider
    - Store certificate URL in document record
    - _Requirements: 85.1, 85.2, 85.3, 85.4, 85.5, 85.6_


  - [ ] 12.5 Implement evidence package generation
    - Create backend/src/services/esign/evidencePackage.service.js
    - Generate ZIP file containing: signed PDF, certificate, audit trail CSV, verification JSON
    - Include complete audit trail for document in CSV format
    - Include verification data (hash, algorithm, timestamp) in JSON format
    - Implement GET /api/company/esign/documents/:id/evidence-package endpoint
    - Return ZIP file as download
    - _Requirements: 86.1, 86.2, 86.3, 86.4, 86.5_

- [ ] 13. Document Engine Module - Post-Signature Processing
  - [ ] 13.1 Implement post-signature notification workflow
    - Send completion notifications per template configuration when document is completed
    - Send post-sign email with signed PDF attachment to configured recipients
    - Replace delimiters in notification content with actual payload values
    - Execute all post-signature actions asynchronously without blocking signer's success page
    - Log all post-signature actions to audit log
    - _Requirements: 13.1, 13.2, 13.9, 13.10, 25.8_
  
  - [ ] 13.2 Implement conditional routing evaluation
    - Evaluate routing rules after each signature submission
    - Check if rule is triggered_by current recipient's signature_order
    - Evaluate condition against delimiter values
    - Execute action if condition evaluates to true
    - Support actions: activate_signer, skip_signer, add_signer, complete
    - Log routing decisions to audit log
    - _Requirements: 78.1, 78.2, 78.3, 78.4, 78.5, 78.6, 78.7, 78.8, 78.9, 78.10_

- [ ] 14. Message Center Module - Document Tracking & Management
  - [ ] 14.1 Create message center backend routes and controllers
    - Create backend/src/routes/esignDocument.routes.js
    - Create backend/src/controllers/esignDocument.controller.js
    - Implement GET /api/company/esign/documents (list with pagination)
    - Implement GET /api/company/esign/documents/:id (get details)
    - Implement POST /api/company/esign/documents/:id/resend (resend link)
    - Implement POST /api/company/esign/documents/:id/remind (send reminder)
    - Implement POST /api/company/esign/documents/:id/cancel (cancel document)
    - Implement GET /api/company/esign/documents/:id/download (download PDF)
    - Implement GET /api/company/esign/documents/:id/timeline (get timeline)
    - Apply auth, tenantContext, and moduleAccess('esign_documents') middleware
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9, 16.1-16.6, 17.1-17.5, 18.1-18.7_
  
  - [ ] 14.2 Implement document search and filtering
    - Filter by status (multiple statuses supported)
    - Filter by template_id
    - Filter by recipient email
    - Filter by date range (created_at)
    - Search by document ID
    - Support multiple filters with AND logic
    - Return results within 2 seconds for up to 10,000 documents
    - _Requirements: 54.1, 54.2, 54.3, 54.4, 54.5, 54.6, 54.7_
  
  - [ ] 14.3 Implement document resend and reminder
    - Generate new token respecting original expiry when resending
    - Invalidate previous token
    - Send notification to recipient via configured channels
    - Send reminder notifications to all pending recipients
    - Prevent resend if document status is "completed", "cancelled", or "expired"
    - Log all resend and reminder actions to audit log
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_
  
  - [ ] 14.4 Implement document cancellation
    - Update document status to "cancelled"
    - Invalidate all recipient tokens
    - Send cancellation notifications to all pending recipients
    - Prevent cancellation if document status is "completed"
    - Log cancellation actions to audit log with cancelling user and reason
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_
  
  - [ ] 14.5 Implement PDF download with presigned URLs
    - Generate presigned URL from storage provider with 1-hour expiration
    - Prevent download if document status is not "completed"
    - Log all download requests to audit log
    - _Requirements: 18.1, 18.2, 18.6, 18.7_


  - [ ] 14.6 Implement document timeline generation
    - Query all audit log entries for document
    - Generate timeline events in chronological order
    - Include event type, timestamp, actor, and metadata
    - Use visual indicators (icons, colors) to distinguish event types
    - Display most recent events at top
    - _Requirements: 58.1, 58.2, 58.3, 58.4, 58.5_
  
  - [ ] 14.7 Implement bulk operations
    - Implement POST /api/company/esign/documents/bulk endpoint
    - Support actions: cancel, download, resend, delete
    - Process selected document IDs
    - Display progress indicator during processing
    - Return summary of successful and failed operations
    - Log all bulk operations to audit log
    - _Requirements: 55.1, 55.2, 55.3, 55.4, 55.5, 55.6_
  
  - [ ] 14.8 Create message center frontend pages
    - Create src/pages/company/esign/EsignDocuments.tsx with DataTableLayout
    - Create src/pages/company/esign/DocumentDetail.tsx
    - Implement document list with filters (status, template, date range, recipient)
    - Implement document detail view with tabs (overview, recipients, timeline, audit)
    - Implement bulk selection and bulk action buttons
    - Add document services to src/api/services.ts esignServices
    - _Requirements: 15.1-15.9, 54.1-54.7, 55.1-55.6, 58.1-58.5_
  
  - [ ] 14.9 Create dashboard page with statistics
    - Create src/pages/company/esign/EsignDashboard.tsx
    - Display document statistics (total, pending, completed, expired)
    - Display recent documents list
    - Display activity timeline
    - Use TanStack Query for data fetching
    - _Requirements: General dashboard requirements_

- [ ] 15. Audit Log Module - Logging & Compliance
  - [ ] 15.1 Implement comprehensive audit logging
    - Log all authentication attempts (success and failure)
    - Log all provider configuration changes
    - Log all template creation, modification, and deletion events
    - Log all document creation, status changes, and completion events
    - Log all recipient token generation, validation, and rotation events
    - Log all OTP generation and verification attempts
    - Log all signature submissions and rejections
    - Log all PDF generation, storage, and download events
    - Log all API callback attempts and responses
    - Log all notification sending events
    - Capture event type, actor, timestamp, IP address, user agent, and metadata
    - Capture geo location based on IP address
    - _Requirements: 19.1-19.12_
  
  - [ ] 15.2 Implement audit log immutability
    - Prevent modification or deletion of audit log entries
    - Use append-only operations for audit log
    - Option 1: Use existing GlobalLog with module='esign'
    - Option 2: Use dedicated EsignAuditLog collection
    - _Requirements: 19.13_
  
  - [ ] 15.3 Create audit log query and export endpoints
    - Create backend/src/routes/esignAudit.routes.js
    - Create backend/src/controllers/esignAudit.controller.js
    - Implement GET /api/company/esign/audit-logs (query with filters)
    - Implement POST /api/company/esign/audit-logs/export (export CSV/JSON)
    - Support filters: event types, resource type, resource ID, actor email, date range
    - Include all fields in export
    - Complete export within 30 seconds for up to 100,000 entries
    - Log all export requests to audit log
    - _Requirements: 19.14, 19.15, 45.1-45.7_
  
  - [ ] 15.4 Implement data retention policy
    - Create backend/src/jobs/esignRetentionCron.js
    - Run retention cleanup cron job daily
    - Query documents older than configured retention period
    - Delete signed PDFs from storage provider
    - Mark document records as "archived"
    - Preserve audit log entries
    - Log retention cleanup actions to audit log
    - _Requirements: 76.1, 76.2, 76.3, 76.4, 76.5, 76.6, 76.7_


- [ ] 16. Scheduled Jobs & Background Processing
  - [ ] 16.1 Implement document expiry cron job
    - Create backend/src/jobs/esignExpiryCron.js
    - Run every 15 minutes
    - Query documents with status "distributed", "opened", or "partially_signed"
    - Check if expires_at timestamp is in the past
    - Update document status to "expired"
    - Invalidate all recipient tokens
    - Send expiry notifications per template configuration
    - Log all expiry events to audit log
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_
  
  - [ ] 16.2 Implement pre-expiry reminder cron job
    - Create backend/src/jobs/esignReminderCron.js
    - Run every 15 minutes
    - Query documents with status "distributed", "opened", or "partially_signed"
    - Check if expires_at minus current time matches configured reminder intervals
    - Send reminder notifications to pending recipients
    - Track sent reminders to avoid duplicates
    - Log reminder events to audit log
    - _Requirements: 61.1, 61.2, 61.3, 61.4, 61.5, 61.6_
  
  - [ ] 16.3 Implement async PDF generation job queue
    - Option 1: Use existing cron job pattern
    - Option 2: Implement AWS SQS job queue for better scalability
    - Create PDF generation jobs when all recipients sign
    - Process jobs asynchronously
    - Handle job failures with retry logic
    - Update document status based on job result
    - _Requirements: 12.1-12.15_
  
  - [ ] 16.4 Implement async notification job queue
    - Create notification jobs for all notification events
    - Process jobs asynchronously
    - Handle delivery failures with retry logic
    - Log delivery status to audit log
    - _Requirements: 24.1-24.7, 25.1-25.8_

- [ ] 17. Checkpoint - Core Functionality Complete
  - Ensure all tests pass for modules 1-16
  - Verify provider configuration, API keys, templates, documents, signing workflow, and audit logging work end-to-end
  - Test all signature types (single, parallel, sequential, broadcast)
  - Test MFA flows (email, SMS, both)
  - Ask the user if questions arise

- [ ] 18. Testing - Unit Tests
  - [ ]* 18.1 Write unit tests for Settings Module
    - Test provider CRUD operations
    - Test connection tests for all provider types
    - Test API key generation, listing, and revocation
    - Test credential encryption and decryption
    - _Requirements: 1.1-1.13, 2.1-2.7_
  
  - [ ]* 18.2 Write unit tests for Templates Module
    - Test template CRUD operations
    - Test PDF upload and conversion
    - Test delimiter extraction and validation
    - Test template validation before activation
    - Test template deletion protection
    - Test HTML sanitization
    - _Requirements: 3.1-3.12, 4.1-4.14, 33.1-33.6, 34.1-34.7, 38.1-38.6, 50.1-50.6_
  
  - [ ]* 18.3 Write unit tests for External API Module
    - Test API key authentication
    - Test document initiation with validation
    - Test idempotency handling
    - Test status polling
    - Test webhook delivery with signature verification
    - Test bulk document initiation
    - _Requirements: 6.1-6.7, 7.1-7.13, 27.1-27.6, 40.1-40.5, 47.1-47.5_
  
  - [ ]* 18.4 Write unit tests for Public Signing Page Module
    - Test token validation and access control
    - Test OTP generation, verification, and lockout
    - Test signature capture and submission
    - Test document rejection
    - Test delegation
    - Test signing groups
    - Test kiosk signing
    - _Requirements: 8.1-8.10, 9.1-9.12, 10.1-10.14, 11.1-11.6, 28.1-28.5, 29.1-29.6_


  - [ ]* 18.5 Write unit tests for Document Engine Module
    - Test PDF generation workflow
    - Test signature injection
    - Test distributed locking
    - Test hash computation and verification
    - Test storage upload with retry logic
    - Test certificate generation
    - Test evidence package generation
    - _Requirements: 12.1-12.15, 30.1-30.7, 31.1-31.7, 32.1-32.6_
  
  - [ ]* 18.6 Write unit tests for Message Center Module
    - Test document listing with filters
    - Test document search
    - Test resend and reminder
    - Test cancellation
    - Test PDF download
    - Test timeline generation
    - Test bulk operations
    - _Requirements: 15.1-15.9, 16.1-16.6, 17.1-17.5, 18.1-18.7, 54.1-54.7, 55.1-55.6_
  
  - [ ]* 18.7 Write unit tests for Audit Log Module
    - Test audit log creation for all event types
    - Test audit log immutability
    - Test audit log querying with filters
    - Test audit log export (CSV, JSON)
    - Test retention policy enforcement
    - _Requirements: 19.1-19.15, 45.1-45.7, 76.1-76.7_
  
  - [ ]* 18.8 Write unit tests for workflow logic
    - Test sequential signing order enforcement
    - Test parallel signing independence
    - Test broadcast document independence
    - Test conditional routing evaluation
    - Test signing group slot claiming
    - Test delegation chain integrity
    - Test preview mode distribution gate
    - _Requirements: 20.1-20.5, 21.1-21.4, 22.1-22.4, 23.1-23.6, 78.1-78.10, 79.1-79.7, 80.1-80.8_

- [ ] 19. Testing - Property-Based Tests
  - [ ]* 19.1 Write property test for Single Active Provider Invariant
    - **Property 1: Single Active Provider Invariant**
    - **Validates: Requirements 1.1, 1.2, 1.3**
    - For any provider type, at most one provider SHALL be active at any time
    - Use fast-check to generate arrays of provider configurations
    - Verify only one provider per type has is_active=true
  
  - [ ]* 19.2 Write property test for Encryption Round-Trip
    - **Property 2: Encryption Round-Trip**
    - **Validates: Requirements 1.4, 1.5, 1.6, 49.1, 49.2**
    - For any credential string, encrypting then decrypting SHALL produce the original value
    - Use fast-check to generate random credential strings
    - Verify encryption/decryption round-trip
  
  - [ ]* 19.3 Write property test for API Key Uniqueness
    - **Property 3: API Key Uniqueness**
    - **Validates: Requirements 2.1**
    - For any set of generated API keys, all key prefixes SHALL be unique
    - Use fast-check to generate multiple API keys
    - Verify no duplicate key prefixes exist
  
  - [ ]* 19.4 Write property test for Token Invalidation
    - **Property 4: Token Invalidation**
    - **Validates: Requirements 2.7, 6.5, 8.2, 8.3**
    - When an API key is revoked, all subsequent requests using that key SHALL be rejected
    - Use fast-check to generate API keys and revocation scenarios
    - Verify revoked keys are rejected
  
  - [ ]* 19.5 Write property test for Delimiter Extraction
    - **Property 5: Delimiter Extraction**
    - **Validates: Requirements 33.1, 33.2, 33.3**
    - For any HTML content, extracting delimiters SHALL find all {{key}} patterns
    - Use fast-check to generate HTML with various delimiter patterns
    - Verify all delimiters are extracted
  
  - [ ]* 19.6 Write property test for Template Snapshot Immutability
    - **Property 6: Template Snapshot Immutability**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
    - For any document, the template snapshot SHALL never change after creation
    - Use fast-check to generate documents and template modifications
    - Verify template snapshot remains unchanged


  - [ ]* 19.7 Write property test for API Idempotency
    - **Property 7: API Idempotency**
    - **Validates: Requirements 27.1, 27.2, 27.3, 27.4, 27.5**
    - Calling document initiation with same idempotency key multiple times SHALL produce same result
    - Use fast-check to generate document initiation requests
    - Verify only one document is created for duplicate idempotency keys
  
  - [ ]* 19.8 Write property test for Required Field Validation
    - **Property 8: Required Field Validation**
    - **Validates: Requirements 7.4, 42.6**
    - When required delimiter values are missing, document creation SHALL be rejected
    - Use fast-check to generate payloads with missing required fields
    - Verify rejection with appropriate error message
  
  - [ ]* 19.9 Write property test for Token Expiry
    - **Property 9: Token Expiry**
    - **Validates: Requirements 8.2, 8.3, 14.7**
    - When a token is expired, any attempt to use it SHALL be rejected
    - Use fast-check to generate tokens with various expiry times
    - Verify expired tokens are rejected
  
  - [ ]* 19.10 Write property test for OTP Lockout
    - **Property 10: OTP Lockout**
    - **Validates: Requirements 29.1, 29.2, 29.3, 29.4**
    - After 5 failed OTP attempts, recipient SHALL be locked for 30 minutes
    - Use fast-check to generate OTP verification attempts
    - Verify lockout is enforced
  
  - [ ]* 19.11 Write property test for Document Status Transition
    - **Property 11: Document Status Monotonicity**
    - **Validates: Requirements 7.6, 10.10, 10.11, 11.3, 14.3, 17.1**
    - Document status transitions SHALL follow state machine and never regress
    - Use fast-check to generate sequences of operations
    - Verify status transitions are valid
  
  - [ ]* 19.12 Write property test for Distributed Lock
    - **Property 12: Concurrent PDF Generation Prevention**
    - **Validates: Requirements 31.1, 31.2, 31.3, 31.4, 31.5, 31.6, 31.7**
    - For any document, at most one PDF generation process SHALL be active at any time
    - Simulate concurrent completion of same document
    - Verify only one PDF is generated
  
  - [ ]* 19.13 Write property test for Hash Integrity
    - **Property 13: PDF Hash Integrity**
    - **Validates: Requirements 12.7, 12.8, 30.1, 30.2, 30.3, 30.4, 30.5**
    - For any PDF, computing hash of stored PDF SHALL match stored hash
    - Use fast-check to generate PDF buffers
    - Verify hash computation and verification
  
  - [ ]* 19.14 Write property test for Retry with Backoff
    - **Property 14: Storage Retry Exponential Backoff**
    - **Validates: Requirements 32.1, 32.2, 32.3, 32.4, 32.5, 32.6**
    - Storage upload failures SHALL retry with exponential backoff (2s, 4s, 8s)
    - Simulate storage failures
    - Measure retry delays and verify exponential pattern
  
  - [ ]* 19.15 Write property test for Audit Log Immutability
    - **Property 15: Audit Log Immutability**
    - **Validates: Requirements 19.13**
    - Once created, audit log entries SHALL never be modified or deleted
    - Attempt to modify/delete audit log entries
    - Verify operations are rejected
  
  - [ ]* 19.16 Write property test for Sequential Signing Order
    - **Property 16: Sequential Signing Order Enforcement**
    - **Validates: Requirements 20.1, 20.2, 20.3, 20.5**
    - In hierarchy workflow, recipient N SHALL NOT sign until recipients 1 through N-1 have signed
    - Use fast-check to generate signing sequences
    - Verify out-of-order signing is rejected
  
  - [ ]* 19.17 Write property test for Parallel Signing Independence
    - **Property 17: Parallel Signing Independence**
    - **Validates: Requirements 21.1, 21.2, 21.4**
    - In parallel workflow, recipients SHALL sign in any order without affecting each other
    - Use fast-check to generate parallel signing scenarios
    - Verify any signing order produces same result


  - [ ]* 19.18 Write property test for Broadcast Document Independence
    - **Property 18: Broadcast Document Independence**
    - **Validates: Requirements 22.1, 22.2, 22.3**
    - In broadcast workflow, signing one document SHALL NOT affect other document instances
    - Use fast-check to generate broadcast scenarios
    - Verify document independence
  
  - [ ]* 19.19 Write property test for Template Deletion Protection
    - **Property 19: Template Deletion Protection**
    - **Validates: Requirements 38.1, 38.2**
    - Templates with active documents SHALL NOT be deletable
    - Use fast-check to generate templates with various document states
    - Verify deletion is rejected for active documents
  
  - [ ]* 19.20 Write property test for API Rate Limit Enforcement
    - **Property 20: API Rate Limit Enforcement**
    - **Validates: Requirements 39.1, 39.2, 39.3**
    - When request count exceeds 100/minute, system SHALL return HTTP 429
    - Simulate high request rates
    - Verify rate limit is enforced
  
  - [ ]* 19.21 Write property test for Webhook Signature Verification
    - **Property 21: Webhook Signature Verification**
    - **Validates: Requirements 40.2, 40.3**
    - Computing HMAC-SHA256 of webhook payload SHALL match X-Signature header
    - Use fast-check to generate webhook payloads
    - Verify signature computation and verification
  
  - [ ]* 19.22 Write property test for Recipient Field Isolation
    - **Property 22: Recipient Field Isolation**
    - **Validates: Requirements 43.1, 43.2, 43.4**
    - Signers SHALL only modify fields assigned to them
    - Use fast-check to generate field modification attempts
    - Verify unauthorized modifications are rejected
  
  - [ ]* 19.23 Write property test for HTML Sanitization
    - **Property 23: HTML Sanitization**
    - **Validates: Requirements 50.1, 50.2, 50.3**
    - Script tags, event handlers, and iframes SHALL be removed from HTML
    - Use fast-check to generate HTML with malicious content
    - Verify sanitization removes dangerous elements
  
  - [ ]* 19.24 Write property test for Signature Image Size Constraint
    - **Property 24: Signature Image Size Constraint**
    - **Validates: Requirements 53.2, 53.3**
    - Signature images larger than 2MB SHALL be rejected
    - Use fast-check to generate images of various sizes
    - Verify rejection above 2MB
  
  - [ ]* 19.25 Write property test for Bulk Operation Progress Accuracy
    - **Property 25: Bulk Operation Progress Accuracy**
    - **Validates: Requirements 55.5, 81.10**
    - Sum of succeeded and failed counts SHALL equal total processed
    - Use fast-check to generate bulk operations
    - Verify count accuracy
  
  - [ ]* 19.26 Write property test for API Scope Enforcement
    - **Property 26: API Scope Enforcement**
    - **Validates: Requirements 74.3, 74.4, 74.7**
    - API requests without required scope SHALL return HTTP 403
    - Use fast-check to generate API keys with various scopes
    - Verify scope enforcement
  
  - [ ]* 19.27 Write property test for Scroll Completion Requirement
    - **Property 27: Scroll Completion Requirement**
    - **Validates: Requirements 75.2, 75.3**
    - Signature submission SHALL be blocked until scroll within 50px of bottom
    - Use fast-check to generate scroll positions
    - Verify enforcement
  
  - [ ]* 19.28 Write property test for Retention Policy Compliance
    - **Property 28: Retention Policy Compliance**
    - **Validates: Requirements 76.4, 76.5, 76.6**
    - Documents older than retention period SHALL have PDFs deleted and be marked archived
    - Use fast-check to generate documents with various ages
    - Verify retention policy enforcement


  - [ ]* 19.29 Write property test for Conditional Routing Evaluation
    - **Property 29: Conditional Routing Evaluation**
    - **Validates: Requirements 78.5, 78.6, 78.10**
    - Routing rules SHALL execute action if and only if condition evaluates to true
    - Use fast-check to generate routing rules and delimiter values
    - Verify correct action execution
  
  - [ ]* 19.30 Write property test for Signing Group Slot Claim Atomicity
    - **Property 30: Signing Group Slot Claim Atomicity**
    - **Validates: Requirements 79.4, 79.5, 79.6**
    - Exactly one group member SHALL claim signing slot, others' tokens invalidated
    - Simulate concurrent signing attempts by group members
    - Verify only one succeeds
  
  - [ ]* 19.31 Write property test for Delegation Chain Integrity
    - **Property 31: Delegation Chain Integrity**
    - **Validates: Requirements 80.3, 80.4, 80.7, 80.8**
    - Audit log SHALL contain complete delegation chain
    - Use fast-check to generate delegation chains
    - Verify audit log completeness
  
  - [ ]* 19.32 Write property test for Grace Period Boundary Enforcement
    - **Property 32: Grace Period Boundary Enforcement**
    - **Validates: Requirements 84.2, 84.3, 84.4, 84.5**
    - Tokens SHALL be valid during grace period, invalid after
    - Use fast-check to generate times relative to expiry
    - Verify boundary enforcement
  
  - [ ]* 19.33 Write property test for Connection Test Cleanup
    - **Property 33: Connection Test Cleanup**
    - **Validates: Requirements 69.1, 69.2**
    - Test files SHALL be deleted after connection test
    - Simulate connection tests
    - Verify test files are removed
  
  - [ ]* 19.34 Write property test for Preview Mode Distribution Gate
    - **Property 34: Preview Mode Distribution Gate**
    - **Validates: Requirements 23.1, 23.2, 23.4, 23.5**
    - No recipient SHALL receive notification until admin approves
    - Use fast-check to generate preview mode documents
    - Verify no notifications sent until approval
  
  - [ ]* 19.35 Write property test for Document Status Monotonicity
    - **Property 35: Document Status Monotonicity**
    - **Validates: Requirements 7.6, 10.10, 10.11, 11.3, 14.3, 17.1**
    - Status transitions SHALL follow state machine, never regress
    - Use fast-check to generate operation sequences
    - Verify valid transitions only

- [ ] 20. Testing - Integration Tests
  - [ ]* 20.1 Write integration test for end-to-end single signature workflow
    - Create template, initiate document, sign, verify PDF generated
    - Test with MFA enabled (email, SMS, both)
    - Verify notifications sent
    - Verify audit log entries created
    - _Requirements: All single signature requirements_
  
  - [ ]* 20.2 Write integration test for parallel signature workflow
    - Create template with multiple recipients
    - Sign in various orders
    - Verify document completes when all sign
    - _Requirements: 21.1-21.4_
  
  - [ ]* 20.3 Write integration test for sequential signature workflow
    - Create template with hierarchy signature type
    - Verify recipients sign in order
    - Verify out-of-order signing is rejected
    - _Requirements: 20.1-20.5_
  
  - [ ]* 20.4 Write integration test for broadcast signature workflow
    - Create template with send_to_all signature type
    - Verify separate document instances created
    - Verify independence of document instances
    - _Requirements: 22.1-22.4_
  
  - [ ]* 20.5 Write integration test for conditional routing
    - Create template with routing rules
    - Provide delimiter values that trigger rules
    - Verify correct actions executed
    - _Requirements: 78.1-78.10_


  - [ ]* 20.6 Write integration test for signing groups
    - Create template with signing group recipient
    - Simulate concurrent signing attempts by group members
    - Verify only one member can sign
    - _Requirements: 79.1-79.7_
  
  - [ ]* 20.7 Write integration test for delegation
    - Create document, delegate to another signer
    - Verify delegation chain in audit log
    - Verify certificate reflects delegate
    - _Requirements: 80.1-80.8_
  
  - [ ]* 20.8 Write integration test for bulk operations
    - Upload CSV with multiple rows
    - Verify documents created for each row
    - Verify progress tracking
    - Verify error handling for invalid rows
    - _Requirements: 81.1-81.10_
  
  - [ ]* 20.9 Write integration test for kiosk signing
    - Initiate kiosk session
    - Authenticate host
    - Capture signer photo
    - Submit in-person signature
    - Verify session timeout
    - _Requirements: 82.1-82.8_
  
  - [ ]* 20.10 Write integration test for preview mode
    - Create document with preview mode enabled
    - Verify no notifications sent
    - Approve document
    - Verify notifications sent after approval
    - _Requirements: 23.1-23.6_

- [ ] 21. Deployment & Documentation
  - [ ] 21.1 Create deployment configuration
    - Update Docker Compose with PDF service
    - Configure environment variables (AWS credentials, SQS queue names, PDF service URL, encryption keys)
    - Update backend package.json with new dependencies
    - Update frontend package.json with new dependencies
    - Create database migration script for e-sign module
    - _Requirements: All infrastructure requirements_
  
  - [ ] 21.2 Create API documentation
    - Document all external API endpoints (/api/v1/esign/*)
    - Include request/response examples
    - Document authentication with API keys
    - Document webhook payload format and signature verification
    - Document idempotency key usage
    - Document rate limiting
    - _Requirements: 6.1-6.7, 7.1-7.13, 27.1-27.6, 39.1-39.5, 40.1-40.5_
  
  - [ ] 21.3 Create user documentation
    - Write template creation guide
    - Write document signing guide for signers
    - Write admin guide for settings configuration
    - Write guide for API integration
    - Write webhook integration guide
    - _Requirements: All user-facing requirements_
  
  - [ ] 21.4 Deploy to staging environment
    - Deploy AWS SQS queues
    - Deploy PDF service
    - Deploy backend with new routes and models
    - Deploy frontend with new pages and components
    - Run database migrations
    - Configure environment variables
    - Run smoke tests
    - _Requirements: All deployment requirements_
  
  - [ ] 21.5 Deploy to production
    - Deploy with feature flag enabled
    - Monitor logs and metrics
    - Verify all endpoints responding
    - Verify background jobs running
    - Monitor error rates and performance
    - _Requirements: All deployment requirements_

- [ ] 22. Final Checkpoint - Complete System Verification
  - Ensure all tests pass (unit, property-based, integration)
  - Verify all 85 requirements are implemented
  - Verify all 45 correctness properties are tested
  - Test complete workflows end-to-end in staging
  - Verify performance benchmarks met (document initiation < 5s, status polling < 500ms, etc.)
  - Verify security requirements (encryption, sanitization, rate limiting, etc.)
  - Ask the user if questions arise before production deployment

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end workflows
- All tasks build incrementally - each phase completes functional components before moving to next
- Implementation uses TypeScript for frontend (React) and JavaScript/TypeScript for backend (Node.js/Express)
- System integrates with existing MERN SaaS application infrastructure
- AWS SQS is used for async job queuing (PDF generation, notifications, webhooks)
- MongoDB is used for state storage (OTP, locks, rate limits, idempotency) with TTL indexes
- PDF service can be Node.js with Puppeteer or Python with WeasyPrint
- All e-sign data stored in per-company databases using model registry pattern
- Module access control gates all e-sign features with 'esign_documents' module
