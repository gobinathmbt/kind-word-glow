# Requirements Document

## Introduction

The Secure Gateway E-Sign Platform is a MERN-stack electronic signature system designed to enable secure, compliant, and auditable document signing workflows. The platform supports multiple signature types (single, parallel, sequential, broadcast), configurable multi-factor authentication, pluggable storage and notification providers, and comprehensive audit trails. The system consists of seven core modules: Settings, Templates, External API, E-Sign Public Page, Document Engine, Message Center, and Audit Log.

## Glossary

- **System**: The Secure Gateway E-Sign Platform
- **Company_Admin**: A user with administrative privileges for company-level configuration
- **Super_Admin**: A user with elevated privileges to configure sensitive settings (storage, email, SMS, API keys)
- **Template_Creator**: A user authorized to create and configure document templates
- **External_System**: A third-party application (CRM, ERP, custom app) that initiates e-sign workflows via API
- **Signer**: An individual who receives and completes a signature request
- **Document**: An instance of a template with specific payload data sent for signature
- **Template**: A reusable configuration defining document structure, signature requirements, and workflow behavior
- **Recipient**: A signer assigned to a specific document instance
- **Storage_Provider**: A configured service for storing signed PDFs (AWS S3, Dropbox, Google Drive)
- **Email_Provider**: A configured service for sending emails (SMTP, SendGrid)
- **SMS_Provider**: A configured service for sending SMS messages (Twilio, SendGrid SMS)
- **PDF_Service**: The Python microservice that converts HTML to PDF
- **Token**: A JWT used to authenticate signer access to documents
- **OTP**: One-Time Password used for multi-factor authentication
- **Delimiter**: A placeholder in template HTML (e.g., {{client_name}}) replaced with payload data
- **Audit_Log**: An immutable record of all system events
- **API_Key**: A credential used by External_Systems to authenticate API requests
- **Master_DB**: The MongoDB database storing companies and users
- **Company_DB**: A per-company MongoDB database storing templates, documents, and audit logs
- **Sequential_Signing**: A signature workflow where signers must sign in a specific order
- **Parallel_Signing**: A signature workflow where all signers can sign simultaneously
- **Hierarchy_Signing**: Synonym for Sequential_Signing
- **Broadcast_Signing**: A signature workflow where the same document is sent to multiple signers independently
- **Preview_Mode**: A workflow where company users review documents before distribution to signers
- **Idempotency_Key**: A unique identifier used to prevent duplicate API requests
- **SHA_256_Hash**: A cryptographic hash used to verify PDF integrity
- **SigningGroup**: A collection of users where any member can sign on behalf of the group
- **BulkJob**: A batch operation that creates multiple documents from CSV data
- **Certificate_of_Completion**: A separate PDF document summarizing all signing events and verification data
- **Kiosk_Signing**: An in-person signing mode where a host facilitates signature capture at a physical location
- **Grace_Period**: A configurable time window after link expiry during which signing is still permitted with a warning
- **Routing_Rule**: A conditional logic configuration that determines workflow behavior based on delimiter values
- **Delegate**: A person who receives signing authority from the original assigned Signer
- **Evidence_Package**: A ZIP file containing the signed PDF, audit trail, certificate, and verification data

## Requirements

### Requirement 1: Provider Configuration Management

**User Story:** As a Company_Admin, I want to configure storage, email, and SMS providers, so that the System can store signed documents and send notifications.

#### Acceptance Criteria

1. THE System SHALL store exactly one active Storage_Provider per company at any time
2. THE System SHALL store exactly one active Email_Provider per company at any time
3. THE System SHALL store exactly one active SMS_Provider per company at any time
4. WHEN a Super_Admin saves storage configuration, THE System SHALL encrypt credentials using AES-256 before persisting to Company_DB
5. WHEN a Super_Admin saves email configuration, THE System SHALL encrypt credentials using AES-256 before persisting to Company_DB
6. WHEN a Super_Admin saves SMS configuration, THE System SHALL encrypt credentials using AES-256 before persisting to Company_DB
7. WHEN a Super_Admin requests settings retrieval, THE System SHALL mask sensitive credential fields in the response
8. WHEN a Super_Admin triggers a storage connection test, THE System SHALL attempt to write and read a test file to the configured Storage_Provider
9. WHEN a Super_Admin triggers an email connection test, THE System SHALL send a test email to the requesting user's email address
10. WHEN a Super_Admin triggers an SMS connection test, THE System SHALL send a test OTP to the provided phone number
11. WHEN a connection test succeeds, THE System SHALL return a success status within 10 seconds
12. WHEN a connection test fails, THE System SHALL return a descriptive error message indicating the failure reason
13. THE System SHALL log all provider configuration changes to the Audit_Log with actor, timestamp, and IP address

### Requirement 2: API Key Management

**User Story:** As a Super_Admin, I want to generate and manage API keys, so that External_Systems can securely authenticate API requests.

#### Acceptance Criteria

1. WHEN a Super_Admin generates an API_Key, THE System SHALL create a unique key pair (API_Key and API_Secret)
2. WHEN an API_Key is generated, THE System SHALL display the plain API_Secret exactly once
3. WHEN an API_Key is stored, THE System SHALL hash the API_Secret using bcrypt before persisting to Company_DB
4. WHEN a Super_Admin lists API_Keys, THE System SHALL display only the first 8 characters of each API_Key
5. WHEN a Super_Admin revokes an API_Key, THE System SHALL mark it as inactive and prevent future authentication
6. THE System SHALL log all API_Key operations (generate, revoke) to the Audit_Log
7. WHEN an API_Key is revoked, THE System SHALL reject all subsequent API requests using that API_Key with HTTP 401


### Requirement 3: Template Creation with PDF Upload and Field Placement

**User Story:** As a Template_Creator, I want to upload a PDF and drag-and-drop signature fields onto it, so that I can create templates without writing HTML.

#### Acceptance Criteria

1. WHEN a Template_Creator uploads a PDF file, THE System SHALL send the PDF to the PDF_Service for conversion to HTML
2. WHEN the PDF_Service completes conversion, THE System SHALL store the HTML content in the Template
3. WHEN a Template_Creator opens the visual editor, THE System SHALL display the HTML content in a canvas
4. WHEN a Template_Creator drags a signature field onto the canvas, THE System SHALL insert a Delimiter at the drop coordinates
5. WHEN a Template_Creator drags a text field onto the canvas, THE System SHALL insert a Delimiter at the drop coordinates
6. WHEN a Template_Creator drags a date field onto the canvas, THE System SHALL insert a Delimiter at the drop coordinates
7. WHEN a Template_Creator drags an email field onto the canvas, THE System SHALL insert a Delimiter at the drop coordinates
8. WHEN a Template_Creator drags a phone field onto the canvas, THE System SHALL insert a Delimiter at the drop coordinates
9. WHEN a Template_Creator assigns a field to a Recipient, THE System SHALL associate the Delimiter with the Recipient's signature order
10. WHEN a Template_Creator saves the template, THE System SHALL extract all Delimiters from the HTML content
11. THE System SHALL prevent Template_Creator from assigning the same field to multiple Recipients
12. WHEN a Template_Creator removes a field from the canvas, THE System SHALL remove the corresponding Delimiter from the HTML

### Requirement 4: Template Configuration

**User Story:** As a Template_Creator, I want to configure template behavior, so that documents follow the correct signing workflow and notification rules.

#### Acceptance Criteria

1. WHEN a Template_Creator sets signature type to "single", THE System SHALL require exactly one Recipient
2. WHEN a Template_Creator sets signature type to "multiple", THE System SHALL allow two or more Recipients with parallel signing
3. WHEN a Template_Creator sets signature type to "hierarchy", THE System SHALL enforce sequential signing order
4. WHEN a Template_Creator sets signature type to "send_to_all", THE System SHALL create independent Document instances for each Recipient
5. WHEN a Template_Creator enables MFA, THE System SHALL require OTP verification before Signer can view the Document
6. WHEN a Template_Creator sets MFA channel to "email", THE System SHALL send OTP via the active Email_Provider
7. WHEN a Template_Creator sets MFA channel to "sms", THE System SHALL send OTP via the active SMS_Provider
8. WHEN a Template_Creator sets MFA channel to "both", THE System SHALL send OTP via both Email_Provider and SMS_Provider
9. WHEN a Template_Creator configures link expiry, THE System SHALL set Document expiration based on the configured value and unit
10. WHEN a Template_Creator enables preview mode, THE System SHALL require Company_Admin approval before distributing to Signers
11. WHEN a Template_Creator configures notification events, THE System SHALL send notifications when those events occur
12. WHEN a Template_Creator configures API callback, THE System SHALL send HTTP POST to the callback URL when Document is completed
13. THE System SHALL validate that all Delimiters referenced in email templates exist in the Template configuration
14. THE System SHALL prevent Template_Creator from activating a Template with missing required configuration


### Requirement 5: Template Immutability for In-Flight Documents

**User Story:** As a Template_Creator, I want template changes to not affect existing documents, so that in-flight signatures remain consistent.

#### Acceptance Criteria

1. WHEN a Document is created, THE System SHALL snapshot the complete Template configuration
2. WHEN a Template is modified, THE System SHALL not alter existing Document instances
3. WHEN a Document is processed, THE System SHALL use only the snapshotted Template configuration
4. THE System SHALL store the Template snapshot in the Document record at creation time
5. WHEN a Template is deleted, THE System SHALL preserve the Template snapshot in all associated Documents

### Requirement 6: External API Authentication

**User Story:** As an External_System, I want to authenticate API requests using API keys, so that I can securely initiate e-sign workflows.

#### Acceptance Criteria

1. WHEN an External_System sends an API request, THE System SHALL require an x-api-key header
2. WHEN the x-api-key header is missing, THE System SHALL return HTTP 401 with error message "API key required"
3. WHEN the x-api-key header is invalid, THE System SHALL return HTTP 401 with error message "Invalid API key"
4. WHEN the x-api-key header is valid, THE System SHALL identify the associated company
5. WHEN an API_Key is revoked, THE System SHALL reject all requests using that API_Key with HTTP 401
6. THE System SHALL log all API authentication attempts to the Audit_Log with IP address and timestamp
7. WHEN an API request includes an Idempotency_Key header, THE System SHALL prevent duplicate Document creation for 24 hours

### Requirement 7: Document Initiation via External API

**User Story:** As an External_System, I want to initiate e-sign workflows via API, so that I can automate document signing from my application.

#### Acceptance Criteria

1. WHEN an External_System calls the initiation endpoint, THE System SHALL validate the API_Key
2. WHEN the Template is not found, THE System SHALL return HTTP 404 with error message "Template not found"
3. WHEN the Template status is not "active", THE System SHALL return HTTP 400 with error message "Template is not active"
4. WHEN required Delimiter values are missing from the payload, THE System SHALL return HTTP 400 with error message listing missing Delimiters
5. WHEN Delimiter values do not match the configured type, THE System SHALL return HTTP 400 with error message indicating type mismatch
6. WHEN all validations pass, THE System SHALL create a Document with status "new"
7. WHEN a Document is created, THE System SHALL generate a unique Token for each Recipient
8. WHEN a Document is created, THE System SHALL set the expiration timestamp based on Template link_expiry configuration
9. WHEN preview mode is disabled, THE System SHALL send notification to all active Recipients immediately
10. WHEN preview mode is enabled, THE System SHALL return a preview URL and set Document status to "draft_preview"
11. WHEN a Document is created, THE System SHALL return the Document ID and Recipient URLs in the API response
12. THE System SHALL complete Document creation within 5 seconds for documents with up to 10 Recipients
13. WHEN an Idempotency_Key is provided, THE System SHALL return the existing Document if one was created with the same key within 24 hours


### Requirement 8: Signer Token Validation and Access Control

**User Story:** As a Signer, I want to access my signing link securely, so that only I can sign the document assigned to me.

#### Acceptance Criteria

1. WHEN a Signer opens a signing URL, THE System SHALL validate the Token
2. WHEN the Token is invalid, THE System SHALL display an error page with message "Invalid or expired link"
3. WHEN the Token is expired, THE System SHALL display an error page with message "This link has expired"
4. WHEN the Document status is "completed", THE System SHALL display a message "This document has already been signed"
5. WHEN the Document status is "cancelled", THE System SHALL display a message "This document has been cancelled"
6. WHEN the Document status is "rejected", THE System SHALL display a message "This document has been declined"
7. WHEN the Recipient has already signed, THE System SHALL display a message "You have already signed this document"
8. WHEN signature type is "hierarchy" and it is not the Recipient's turn, THE System SHALL display a message "Waiting for previous signer"
9. WHEN all validations pass, THE System SHALL load the Document HTML with Delimiter values injected
10. THE System SHALL log all Token validation attempts to the Audit_Log with IP address, user agent, and timestamp

### Requirement 9: Multi-Factor Authentication for Signers

**User Story:** As a Signer, I want to verify my identity with OTP, so that my signature is secure.

#### Acceptance Criteria

1. WHEN MFA is enabled and a Signer accesses the Document, THE System SHALL display an OTP entry form
2. WHEN MFA channel is "email", THE System SHALL send a 6-digit OTP to the Recipient's email address
3. WHEN MFA channel is "sms", THE System SHALL send a 6-digit OTP to the Recipient's phone number
4. WHEN MFA channel is "both", THE System SHALL send a 6-digit OTP to both email and phone
5. WHEN an OTP is generated, THE System SHALL hash the OTP using bcrypt before storing in MongoDB EsignOTP collection
6. WHEN an OTP is generated, THE System SHALL set expiration to the configured otp_expiry_min value
7. WHEN a Signer submits an OTP, THE System SHALL verify it against the hashed value
8. WHEN an OTP is incorrect, THE System SHALL increment the attempt counter
9. WHEN OTP attempts reach 5, THE System SHALL lock the Recipient for 30 minutes
10. WHEN an OTP is verified successfully, THE System SHALL rotate the Token to a short-lived session Token
11. WHEN a Token is rotated, THE System SHALL invalidate the previous Token
12. THE System SHALL log all OTP generation and verification attempts to the Audit_Log

### Requirement 10: Signature Capture and Submission

**User Story:** As a Signer, I want to draw, type, or upload my signature, so that I can complete the signing process.

#### Acceptance Criteria

1. WHEN a Signer accesses the Document, THE System SHALL display signature input options (draw, type, upload)
2. WHEN a Signer draws a signature, THE System SHALL capture it as a base64-encoded PNG image
3. WHEN a Signer types a signature, THE System SHALL render it in a signature font and convert to base64-encoded PNG
4. WHEN a Signer uploads a signature, THE System SHALL validate the file type is PNG, JPG, or JPEG
5. WHEN a Signer uploads a signature, THE System SHALL validate the file size is less than 2MB
6. WHEN a Signer submits a signature, THE System SHALL require explicit intent confirmation
7. WHEN a Signer confirms intent, THE System SHALL store the signature image in the Recipient record
8. WHEN a Signer submits a signature, THE System SHALL record the IP address, user agent, and timestamp
9. WHEN a Signer submits a signature, THE System SHALL update the Recipient status to "signed"
10. WHEN signature type is "single", THE System SHALL update Document status to "signed" immediately
11. WHEN signature type is "multiple" or "hierarchy" and all Recipients have signed, THE System SHALL update Document status to "signed"
12. WHEN signature type is "hierarchy" and a Recipient signs, THE System SHALL activate the next Recipient in sequence
13. WHEN the next Recipient is activated, THE System SHALL generate a new Token and send notification
14. THE System SHALL log all signature submissions to the Audit_Log


### Requirement 11: Document Rejection

**User Story:** As a Signer, I want to decline a signature request, so that I can opt out of signing.

#### Acceptance Criteria

1. WHEN a Signer clicks the decline button, THE System SHALL display a confirmation dialog
2. WHEN a Signer confirms decline, THE System SHALL update the Recipient status to "rejected"
3. WHEN a Recipient declines, THE System SHALL update the Document status to "rejected"
4. WHEN a Document is rejected, THE System SHALL send notifications to configured recipients per Template configuration
5. WHEN a Document is rejected, THE System SHALL invalidate all Recipient Tokens
6. THE System SHALL log all rejection events to the Audit_Log with reason if provided

### Requirement 12: PDF Generation and Storage

**User Story:** As the System, I want to generate a signed PDF and store it securely, so that the completed document is preserved.

#### Acceptance Criteria

1. WHEN all Recipients have signed, THE System SHALL acquire a distributed lock on the Document
2. WHEN the lock is acquired, THE System SHALL inject all signature images into the HTML at the designated Delimiter positions
3. WHEN signatures are injected, THE System SHALL append an audit footer with signing timestamps and IP addresses
4. WHEN the HTML is prepared, THE System SHALL send it to the PDF_Service for conversion
5. WHEN the PDF_Service fails, THE System SHALL retry up to 2 times with 5-second delays between attempts
6. WHEN the PDF_Service times out after 30 seconds, THE System SHALL log an error and retry
7. WHEN the PDF is generated, THE System SHALL compute a SHA_256_Hash of the PDF buffer
8. WHEN the hash is computed, THE System SHALL store it in the Document record
9. WHEN the PDF is ready, THE System SHALL upload it to the active Storage_Provider
10. WHEN the upload succeeds, THE System SHALL store the storage URL in the Document record
11. WHEN the upload fails, THE System SHALL retry up to 3 times with exponential backoff
12. WHEN all retries fail, THE System SHALL log an error and set Document status to "error"
13. WHEN the PDF is stored, THE System SHALL release the distributed lock
14. THE System SHALL complete PDF generation and storage within 60 seconds for documents up to 50 pages
15. THE System SHALL log all PDF generation events to the Audit_Log

### Requirement 13: Post-Signature Processing

**User Story:** As a Company_Admin, I want the System to execute post-signature actions, so that stakeholders are notified and integrations are triggered.

#### Acceptance Criteria

1. WHEN a Document is completed, THE System SHALL send completion notifications per Template configuration
2. WHEN post-sign email is configured, THE System SHALL send the signed PDF as an attachment to configured recipients
3. WHEN API callback is configured, THE System SHALL send an HTTP POST to the callback URL with Document metadata
4. WHEN an API callback fails, THE System SHALL retry up to 3 times with exponential backoff (2s, 4s, 8s delays)
5. WHEN retry_backoff is "exponential", THE System SHALL wait 2^n seconds between retries where n is the attempt number
6. WHEN retry_backoff is "fixed", THE System SHALL wait 5 seconds between retries
7. WHEN all callback retries fail, THE System SHALL log an error and mark the callback as failed
8. WHEN a callback succeeds, THE System SHALL log the response status and body to the Audit_Log
9. THE System SHALL execute all post-signature actions asynchronously without blocking the Signer's success page
10. THE System SHALL log all post-signature actions to the Audit_Log


### Requirement 14: Document Expiry Management

**User Story:** As the System, I want to automatically expire documents that exceed their link expiry time, so that stale signing links are invalidated.

#### Acceptance Criteria

1. THE System SHALL run an expiry check cron job every 15 minutes
2. WHEN the cron job runs, THE System SHALL query all Documents with status "distributed", "opened", or "partially_signed"
3. WHEN a Document's expires_at timestamp is in the past, THE System SHALL update the Document status to "expired"
4. WHEN a Document is expired, THE System SHALL invalidate all Recipient Tokens
5. WHEN a Document is expired, THE System SHALL send expiry notifications per Template configuration
6. THE System SHALL log all expiry events to the Audit_Log
7. WHEN an expired Token is used, THE System SHALL display an error page with message "This link has expired"

### Requirement 15: Message Center Document Tracking

**User Story:** As a Company_Admin, I want to view all sent documents and their status, so that I can track signing progress.

#### Acceptance Criteria

1. WHEN a Company_Admin accesses the Message Center, THE System SHALL display a paginated list of all Documents
2. WHEN a Company_Admin filters by status, THE System SHALL return only Documents matching the selected status
3. WHEN a Company_Admin filters by Template, THE System SHALL return only Documents created from the selected Template
4. WHEN a Company_Admin filters by date range, THE System SHALL return only Documents created within the range
5. WHEN a Company_Admin searches by Recipient email, THE System SHALL return Documents with matching Recipients
6. WHEN a Company_Admin clicks a Document, THE System SHALL display a detail drawer with overview, Recipients, timeline, and audit tabs
7. WHEN a Company_Admin views the timeline tab, THE System SHALL display events in chronological order
8. WHEN a Company_Admin views the audit tab, THE System SHALL display all Audit_Log entries for the Document
9. THE System SHALL load the Message Center list within 2 seconds for up to 10,000 Documents

### Requirement 16: Document Resend and Reminder

**User Story:** As a Company_Admin, I want to resend signing links or send reminders, so that I can prompt Signers to complete their signatures.

#### Acceptance Criteria

1. WHEN a Company_Admin clicks resend for a Recipient, THE System SHALL generate a new Token respecting the original expiry
2. WHEN a new Token is generated, THE System SHALL invalidate the previous Token
3. WHEN a new Token is generated, THE System SHALL send notification to the Recipient via configured channels
4. WHEN a Company_Admin clicks remind for a Document, THE System SHALL send reminder notifications to all pending Recipients
5. THE System SHALL prevent resend if the Document status is "completed", "cancelled", or "expired"
6. THE System SHALL log all resend and reminder actions to the Audit_Log

### Requirement 17: Document Cancellation

**User Story:** As a Company_Admin, I want to cancel pending documents, so that I can void signing requests that are no longer needed.

#### Acceptance Criteria

1. WHEN a Company_Admin cancels a Document, THE System SHALL update the Document status to "cancelled"
2. WHEN a Document is cancelled, THE System SHALL invalidate all Recipient Tokens
3. WHEN a Document is cancelled, THE System SHALL send cancellation notifications to all pending Recipients
4. THE System SHALL prevent cancellation if the Document status is "completed"
5. THE System SHALL log all cancellation actions to the Audit_Log with the cancelling user and reason if provided


### Requirement 18: Signed PDF Download and Verification

**User Story:** As a Company_Admin, I want to download signed PDFs and verify their integrity, so that I can ensure documents have not been tampered with.

#### Acceptance Criteria

1. WHEN a Company_Admin requests a PDF download, THE System SHALL generate a presigned URL from the Storage_Provider
2. WHEN a presigned URL is generated, THE System SHALL set expiration to 1 hour
3. WHEN a Company_Admin requests PDF verification, THE System SHALL compute the SHA_256_Hash of the downloaded PDF
4. WHEN the computed hash matches the stored hash, THE System SHALL return a verification success message
5. WHEN the computed hash does not match the stored hash, THE System SHALL return a verification failure message
6. THE System SHALL prevent PDF download if the Document status is not "completed"
7. THE System SHALL log all PDF download and verification requests to the Audit_Log

### Requirement 19: Audit Log Immutability and Completeness

**User Story:** As a Company_Admin, I want all system events to be logged immutably, so that I have a complete audit trail for compliance.

#### Acceptance Criteria

1. THE System SHALL log all authentication attempts (success and failure) to the Audit_Log
2. THE System SHALL log all provider configuration changes to the Audit_Log
3. THE System SHALL log all Template creation, modification, and deletion events to the Audit_Log
4. THE System SHALL log all Document creation, status changes, and completion events to the Audit_Log
5. THE System SHALL log all Recipient Token generation, validation, and rotation events to the Audit_Log
6. THE System SHALL log all OTP generation and verification attempts to the Audit_Log
7. THE System SHALL log all signature submissions and rejections to the Audit_Log
8. THE System SHALL log all PDF generation, storage, and download events to the Audit_Log
9. THE System SHALL log all API callback attempts and responses to the Audit_Log
10. THE System SHALL log all notification sending events to the Audit_Log
11. WHEN an event is logged, THE System SHALL capture event type, actor, timestamp, IP address, user agent, and metadata
12. WHEN an event is logged, THE System SHALL capture geo location based on IP address
13. THE System SHALL prevent modification or deletion of Audit_Log entries
14. THE System SHALL support Audit_Log export in CSV and JSON formats
15. WHEN a Company_Admin exports Audit_Log, THE System SHALL include all fields in the export

### Requirement 20: Sequential Signing Order Enforcement

**User Story:** As a Template_Creator, I want to enforce signing order, so that documents are signed in the correct sequence.

#### Acceptance Criteria

1. WHEN signature type is "hierarchy", THE System SHALL activate only the first Recipient at Document creation
2. WHEN a Recipient in a sequential workflow signs, THE System SHALL activate the next Recipient in order
3. WHEN a Recipient attempts to access a Document before their turn, THE System SHALL display an error message
4. WHEN the last Recipient in a sequential workflow signs, THE System SHALL update Document status to "signed"
5. THE System SHALL prevent out-of-order signing by validating Recipient signature_order against current active Recipient


### Requirement 21: Parallel Signing Support

**User Story:** As a Template_Creator, I want multiple signers to sign simultaneously, so that documents can be completed faster.

#### Acceptance Criteria

1. WHEN signature type is "multiple", THE System SHALL activate all Recipients at Document creation
2. WHEN signature type is "multiple", THE System SHALL allow Recipients to sign in any order
3. WHEN all Recipients in a parallel workflow have signed, THE System SHALL update Document status to "signed"
4. THE System SHALL prevent duplicate signature submission from the same Recipient

### Requirement 22: Broadcast Signing Support

**User Story:** As a Template_Creator, I want to send the same document to multiple signers independently, so that each signer receives their own copy.

#### Acceptance Criteria

1. WHEN signature type is "send_to_all", THE System SHALL create a separate Document instance for each Recipient
2. WHEN a Recipient in a broadcast workflow signs, THE System SHALL update only their Document instance status to "signed"
3. WHEN a Recipient in a broadcast workflow signs, THE System SHALL not affect other Recipients' Document instances
4. THE System SHALL generate independent PDFs for each Document instance in a broadcast workflow

### Requirement 23: Preview Mode Approval Gate

**User Story:** As a Company_Admin, I want to review documents before they are sent to signers, so that I can verify accuracy.

#### Acceptance Criteria

1. WHEN preview mode is enabled and a Document is created, THE System SHALL set Document status to "draft_preview"
2. WHEN a Document is in "draft_preview" status, THE System SHALL not send notifications to Recipients
3. WHEN a Company_Admin views a preview Document, THE System SHALL display the rendered HTML with all Delimiter values injected
4. WHEN a Company_Admin approves a preview Document, THE System SHALL update Document status to "distributed"
5. WHEN a Document status changes to "distributed", THE System SHALL send notifications to all active Recipients
6. WHEN a Company_Admin rejects a preview Document, THE System SHALL update Document status to "cancelled"

### Requirement 24: Notification Delivery

**User Story:** As a Signer, I want to receive notifications when documents are ready for signature, so that I am aware of pending actions.

#### Acceptance Criteria

1. WHEN a Document is distributed, THE System SHALL send notifications to all active Recipients via configured channels
2. WHEN MFA is enabled, THE System SHALL include instructions for OTP verification in the notification
3. WHEN a notification is sent via email, THE System SHALL use the active Email_Provider
4. WHEN a notification is sent via SMS, THE System SHALL use the active SMS_Provider
5. WHEN a notification fails to send, THE System SHALL retry up to 3 times with exponential backoff (2s, 4s, 8s delays)
6. WHEN all notification retries fail, THE System SHALL log an error to the Audit_Log
7. THE System SHALL log all notification sending attempts to the Audit_Log with delivery status


### Requirement 25: Event-Based Notifications

**User Story:** As a Company_Admin, I want to receive notifications when specific document events occur, so that I am informed of signing progress.

#### Acceptance Criteria

1. WHEN a Document is opened and the Template has "opened" event tracking enabled, THE System SHALL send notifications to configured recipients
2. WHEN a Document is signed and the Template has "signed" event tracking enabled, THE System SHALL send notifications to configured recipients
3. WHEN a Document is rejected and the Template has "rejected" event tracking enabled, THE System SHALL send notifications to configured recipients
4. WHEN a Document is expired and the Template has "expired" event tracking enabled, THE System SHALL send notifications to configured recipients
5. WHEN an event notification is configured with "email" channel, THE System SHALL send via the active Email_Provider
6. WHEN an event notification is configured with "sms" channel, THE System SHALL send via the active SMS_Provider
7. WHEN an event notification is configured with "both" channel, THE System SHALL send via both Email_Provider and SMS_Provider
8. THE System SHALL replace Delimiters in notification content with actual payload values

### Requirement 26: Template Payload Schema Generation

**User Story:** As an External_System developer, I want to retrieve the payload schema for a Template, so that I know what data to send in API requests.

#### Acceptance Criteria

1. WHEN a developer requests a Template payload schema, THE System SHALL return a JSON structure with all Delimiter definitions
2. WHEN a Delimiter is required, THE System SHALL mark it as required in the schema
3. WHEN a Delimiter has a type, THE System SHALL include the type in the schema
4. WHEN a Delimiter has a default value, THE System SHALL include the default value in the schema
5. THE System SHALL include example values for each Delimiter in the schema

### Requirement 27: API Idempotency

**User Story:** As an External_System, I want to prevent duplicate document creation, so that network retries do not create multiple documents.

#### Acceptance Criteria

1. WHEN an External_System includes an Idempotency_Key header, THE System SHALL check if a Document was created with that key within 24 hours
2. WHEN a matching Idempotency_Key is found, THE System SHALL return the existing Document without creating a new one
3. WHEN a matching Idempotency_Key is found, THE System SHALL return HTTP 200 with the existing Document data
4. WHEN no matching Idempotency_Key is found, THE System SHALL create a new Document and store the Idempotency_Key
5. WHEN an Idempotency_Key is older than 24 hours, THE System SHALL allow creation of a new Document with the same key
6. THE System SHALL store Idempotency_Keys in MongoDB EsignIdempotency collection with 24-hour TTL using MongoDB TTL index for automatic expiration

### Requirement 28: Token Rotation on Security Events

**User Story:** As the System, I want to rotate tokens after sensitive events, so that security is maintained.

#### Acceptance Criteria

1. WHEN a Signer successfully verifies OTP, THE System SHALL generate a new short-lived Token
2. WHEN a Token is rotated, THE System SHALL invalidate the previous Token
3. WHEN a Recipient in a sequential workflow signs, THE System SHALL rotate the Token for the next Recipient
4. WHEN a Token is rotated, THE System SHALL set expiration to 1 hour for session Tokens
5. THE System SHALL log all Token rotation events to the Audit_Log


### Requirement 29: OTP Throttling and Lockout

**User Story:** As the System, I want to prevent brute-force OTP attacks, so that unauthorized access is prevented.

#### Acceptance Criteria

1. WHEN a Signer submits an incorrect OTP, THE System SHALL increment the attempt counter for that Recipient
2. WHEN the attempt counter reaches 5, THE System SHALL lock the Recipient for 30 minutes
3. WHEN a Recipient is locked, THE System SHALL reject all OTP verification attempts with error message "Too many attempts. Try again in 30 minutes"
4. WHEN the lockout period expires, THE System SHALL reset the attempt counter to 0
5. WHEN a Signer submits a correct OTP, THE System SHALL reset the attempt counter to 0
6. THE System SHALL log all OTP lockout events to the Audit_Log

### Requirement 30: PDF Integrity Verification

**User Story:** As a Company_Admin, I want to verify that signed PDFs have not been tampered with, so that I can trust document authenticity.

#### Acceptance Criteria

1. WHEN a PDF is generated, THE System SHALL compute a SHA_256_Hash of the PDF buffer
2. WHEN a PDF hash is computed, THE System SHALL store it in the Document record with the algorithm name "SHA-256"
3. WHEN a Company_Admin requests PDF verification, THE System SHALL download the PDF from Storage_Provider
4. WHEN the PDF is downloaded, THE System SHALL compute a SHA_256_Hash of the downloaded file
5. WHEN the computed hash matches the stored hash, THE System SHALL return verification status "valid"
6. WHEN the computed hash does not match the stored hash, THE System SHALL return verification status "invalid"
7. THE System SHALL log all verification attempts to the Audit_Log

### Requirement 31: Distributed Lock for PDF Generation

**User Story:** As the System, I want to prevent concurrent PDF generation for the same document, so that duplicate PDFs are not created.

#### Acceptance Criteria

1. WHEN all Recipients have signed, THE System SHALL attempt to acquire a distributed lock on the Document
2. WHEN the lock is acquired, THE System SHALL proceed with PDF generation
3. WHEN the lock cannot be acquired, THE System SHALL wait and retry up to 3 times
4. WHEN the lock is held by another process, THE System SHALL not proceed with PDF generation
5. WHEN PDF generation completes, THE System SHALL release the distributed lock
6. WHEN PDF generation fails, THE System SHALL release the distributed lock
7. THE System SHALL store distributed locks in MongoDB EsignLock collection with 5-minute TTL using MongoDB TTL index for automatic expiration

### Requirement 32: Storage Provider Failover

**User Story:** As the System, I want to retry storage operations on failure, so that transient errors do not cause document loss.

#### Acceptance Criteria

1. WHEN a PDF upload to Storage_Provider fails, THE System SHALL retry up to 3 times with exponential backoff
2. WHEN retry 1 fails, THE System SHALL wait 2 seconds before retry 2
3. WHEN retry 2 fails, THE System SHALL wait 4 seconds before retry 3
4. WHEN all 3 retries fail, THE System SHALL log an error and set Document status to "error"
5. WHEN all retries fail, THE System SHALL log an error to the Audit_Log and set Document status to "error"
6. WHEN a storage operation succeeds on retry, THE System SHALL log the retry count to the Audit_Log


### Requirement 33: Template Delimiter Extraction

**User Story:** As a Template_Creator, I want the System to automatically extract delimiters from HTML, so that I don't have to manually define them.

#### Acceptance Criteria

1. WHEN a Template_Creator saves HTML content, THE System SHALL scan for all delimiter patterns matching {{key_name}}
2. WHEN delimiters are found, THE System SHALL extract the key names
3. WHEN delimiters are extracted, THE System SHALL populate the delimiters array with default type "text"
4. WHEN a delimiter already exists in the configuration, THE System SHALL preserve its existing type and settings
5. WHEN a delimiter is removed from HTML, THE System SHALL mark it as unused but not delete it
6. THE System SHALL validate that all delimiters in email templates exist in the HTML content

### Requirement 34: Template Validation Before Activation

**User Story:** As a Template_Creator, I want the System to validate my template configuration, so that I don't activate incomplete templates.

#### Acceptance Criteria

1. WHEN a Template_Creator attempts to activate a Template, THE System SHALL validate that HTML content is not empty
2. WHEN a Template_Creator attempts to activate a Template, THE System SHALL validate that at least one delimiter exists
3. WHEN a Template_Creator attempts to activate a Template, THE System SHALL validate that signature configuration is complete
4. WHEN a Template_Creator attempts to activate a Template, THE System SHALL validate that email subject and body are not empty
5. WHEN a Template_Creator attempts to activate a Template, THE System SHALL validate that all required delimiters are defined
6. WHEN validation fails, THE System SHALL return a list of validation errors
7. WHEN validation succeeds, THE System SHALL update Template status to "active"

### Requirement 35: Geo Location Capture

**User Story:** As a Company_Admin, I want to capture signer geo location, so that I have additional verification data.

#### Acceptance Criteria

1. WHEN a Signer accesses a Document, THE System SHALL capture the IP address from the request
2. WHEN an IP address is captured, THE System SHALL perform a geo lookup to determine country, region, and city
3. WHEN geo lookup succeeds, THE System SHALL store the location data in the Audit_Log entry
4. WHEN geo lookup fails, THE System SHALL store the IP address only
5. THE System SHALL use a geo IP lookup service with 1-second timeout
6. THE System SHALL not block Document access if geo lookup fails

### Requirement 36: Template Duplication

**User Story:** As a Template_Creator, I want to duplicate existing templates, so that I can create variations without starting from scratch.

#### Acceptance Criteria

1. WHEN a Template_Creator duplicates a Template, THE System SHALL create a new Template with all configuration copied
2. WHEN a Template is duplicated, THE System SHALL append " (Copy)" to the Template name
3. WHEN a Template is duplicated, THE System SHALL set the new Template status to "draft"
4. WHEN a Template is duplicated, THE System SHALL assign a new unique ID
5. THE System SHALL log Template duplication to the Audit_Log


### Requirement 37: Short Link Generation

**User Story:** As a Template_Creator, I want to generate short links for signing URLs, so that links are easier to share.

#### Acceptance Criteria

1. WHEN a Template has short link generation enabled, THE System SHALL generate a short code for each Recipient Token
2. WHEN a short code is generated, THE System SHALL ensure it is unique across all Documents
3. WHEN a short code is generated, THE System SHALL be 8 characters long using alphanumeric characters
4. WHEN a Signer accesses a short link, THE System SHALL redirect to the full signing URL
5. THE System SHALL store the mapping between short codes and full Tokens in MongoDB EsignShortLink collection with expiration matching Token expiry using MongoDB TTL index for automatic expiration

### Requirement 38: Template Deletion Protection

**User Story:** As a Template_Creator, I want to prevent deletion of templates with active documents, so that in-flight workflows are not broken.

#### Acceptance Criteria

1. WHEN a Template_Creator attempts to delete a Template, THE System SHALL check for Documents with status "distributed", "opened", or "partially_signed"
2. WHEN active Documents exist, THE System SHALL prevent deletion and return error message "Cannot delete template with active documents"
3. WHEN no active Documents exist, THE System SHALL soft-delete the Template by setting isDeleted to true
4. WHEN a Template is soft-deleted, THE System SHALL exclude it from Template lists
5. WHEN a Template is soft-deleted, THE System SHALL preserve all Document snapshots
6. THE System SHALL log Template deletion attempts to the Audit_Log

### Requirement 39: API Rate Limiting

**User Story:** As the System, I want to rate limit API requests, so that abuse is prevented.

#### Acceptance Criteria

1. THE System SHALL limit API requests to 100 requests per minute per API_Key
2. WHEN the rate limit is exceeded, THE System SHALL return HTTP 429 with error message "Rate limit exceeded"
3. WHEN the rate limit is exceeded, THE System SHALL include a Retry-After header indicating seconds until reset
4. THE System SHALL store rate limit counters in MongoDB EsignRateLimit collection with 1-minute TTL using MongoDB TTL index for automatic expiration
5. THE System SHALL log all rate limit violations to the Audit_Log

### Requirement 40: Webhook Signature Verification

**User Story:** As an External_System, I want to verify webhook authenticity, so that I can trust callback requests.

#### Acceptance Criteria

1. WHEN the System sends an API callback, THE System SHALL include an X-Signature header
2. WHEN the X-Signature header is generated, THE System SHALL compute HMAC-SHA256 of the request body using the API_Secret
3. WHEN an External_System receives a callback, THE External_System SHALL verify the X-Signature header
4. THE System SHALL include a timestamp in the callback payload
5. THE System SHALL recommend that External_Systems reject callbacks older than 5 minutes


### Requirement 41: PDF Service Timeout and Retry

**User Story:** As the System, I want to handle PDF service failures gracefully, so that temporary issues do not cause document loss.

#### Acceptance Criteria

1. WHEN the System sends HTML to the PDF_Service, THE System SHALL set a 30-second timeout
2. WHEN the PDF_Service does not respond within 30 seconds, THE System SHALL retry up to 2 times
3. WHEN each retry fails, THE System SHALL wait 5 seconds before the next attempt
4. WHEN the PDF_Service fails after all retries (1 initial + 2 retries = 3 total attempts), THE System SHALL log an error and set Document status to "error"
5. WHEN the PDF_Service returns an error, THE System SHALL log the error details to the Audit_Log
6. THE System SHALL not retry if the PDF_Service returns HTTP 400 (invalid input)

### Requirement 42: Delimiter Type Validation

**User Story:** As the System, I want to validate delimiter values match their configured types, so that data integrity is maintained.

#### Acceptance Criteria

1. WHEN a delimiter type is "email", THE System SHALL validate the value matches email format
2. WHEN a delimiter type is "phone", THE System SHALL validate the value matches phone format
3. WHEN a delimiter type is "date", THE System SHALL validate the value is a valid date
4. WHEN a delimiter type is "number", THE System SHALL validate the value is numeric
5. WHEN validation fails, THE System SHALL return HTTP 400 with error message indicating which delimiter failed validation
6. WHEN a delimiter is required and the value is empty, THE System SHALL return HTTP 400 with error message "Required delimiter missing"

### Requirement 43: Recipient Field Isolation

**User Story:** As a Signer, I want to only edit fields assigned to me, so that I cannot modify other signers' data.

#### Acceptance Criteria

1. WHEN a Signer views a Document, THE System SHALL disable all fields not assigned to that Recipient
2. WHEN a Signer attempts to submit data for fields not assigned to them, THE System SHALL reject the submission
3. WHEN a Signer views a Document, THE System SHALL visually indicate which fields are assigned to them
4. THE System SHALL validate on the backend that submitted field data matches the Recipient's assigned fields

### Requirement 44: Template Preview with Sample Data

**User Story:** As a Template_Creator, I want to preview templates with sample data, so that I can verify the layout before activation.

#### Acceptance Criteria

1. WHEN a Template_Creator requests a preview, THE System SHALL render the HTML with sample delimiter values
2. WHEN sample values are not provided, THE System SHALL use the default values from delimiter configuration
3. WHEN default values are not configured, THE System SHALL use placeholder text in the format "[delimiter_name]"
4. WHEN a Template_Creator provides custom sample values, THE System SHALL use those values in the preview
5. THE System SHALL render the preview in a read-only view


### Requirement 45: Audit Log Export

**User Story:** As a Company_Admin, I want to export audit logs, so that I can perform compliance reporting.

#### Acceptance Criteria

1. WHEN a Company_Admin requests audit log export, THE System SHALL support CSV and JSON formats
2. WHEN CSV format is selected, THE System SHALL include all audit log fields as columns
3. WHEN JSON format is selected, THE System SHALL include all audit log fields as properties
4. WHEN a date range filter is applied, THE System SHALL export only logs within that range
5. WHEN an event type filter is applied, THE System SHALL export only logs matching that event type
6. THE System SHALL complete export generation within 30 seconds for up to 100,000 log entries
7. THE System SHALL log all export requests to the Audit_Log

### Requirement 46: Notification Template Customization

**User Story:** As a Template_Creator, I want to customize notification content, so that messages are relevant to my use case.

#### Acceptance Criteria

1. WHEN a Template_Creator configures email notifications, THE System SHALL allow custom subject and body
2. WHEN a Template_Creator configures SMS notifications, THE System SHALL allow custom message body
3. WHEN notification content includes delimiters, THE System SHALL replace them with actual payload values
4. WHEN a delimiter is not found in the payload, THE System SHALL replace it with an empty string
5. THE System SHALL validate that notification content does not exceed provider limits (160 characters for SMS)

### Requirement 47: Document Status Polling

**User Story:** As an External_System, I want to poll document status, so that I can track signing progress.

#### Acceptance Criteria

1. WHEN an External_System requests document status, THE System SHALL return the current status
2. WHEN an External_System requests document status, THE System SHALL return the status of all Recipients
3. WHEN an External_System requests document status, THE System SHALL return timestamps for key events
4. WHEN a Document is completed, THE System SHALL include the PDF download URL in the status response
5. THE System SHALL return status within 500 milliseconds

### Requirement 48: Signature Intent Confirmation

**User Story:** As the System, I want to require explicit intent confirmation, so that signatures are legally binding.

#### Acceptance Criteria

1. WHEN a Signer submits a signature, THE System SHALL require a checkbox confirmation
2. WHEN the checkbox is not checked, THE System SHALL prevent signature submission
3. WHEN the checkbox is checked, THE System SHALL store the intent confirmation text in the Recipient record
4. THE System SHALL display intent text such as "I agree that this is my legal signature and I am bound by the terms of this document"
5. THE System SHALL include intent confirmation in the audit footer of the signed PDF


### Requirement 49: Credential Encryption at Rest

**User Story:** As a Super_Admin, I want all sensitive credentials encrypted, so that data breaches do not expose provider credentials.

#### Acceptance Criteria

1. WHEN provider credentials are saved, THE System SHALL encrypt them using AES-256
2. WHEN provider credentials are retrieved, THE System SHALL decrypt them before use
3. THE System SHALL store the encryption key in environment variables, not in the database
4. THE System SHALL rotate encryption keys on a configurable schedule
5. WHEN encryption keys are rotated, THE System SHALL re-encrypt all existing credentials with the new key

### Requirement 50: HTML Sanitization

**User Story:** As the System, I want to sanitize HTML content, so that XSS attacks are prevented.

#### Acceptance Criteria

1. WHEN a Template_Creator saves HTML content, THE System SHALL sanitize it to remove script tags
2. WHEN HTML content includes event handlers (onclick, onload), THE System SHALL remove them
3. WHEN HTML content includes iframe tags, THE System SHALL remove them
4. THE System SHALL allow safe HTML tags (div, span, p, h1-h6, table, tr, td, img, a)
5. THE System SHALL allow style attributes for formatting
6. WHEN a Signer views a Document, THE System SHALL render sanitized HTML only

### Requirement 51: PDF to HTML Conversion

**User Story:** As a Template_Creator, I want to upload PDFs and have them converted to HTML, so that I can use existing documents as templates.

#### Acceptance Criteria

1. WHEN a Template_Creator uploads a PDF, THE System SHALL validate the file type is PDF
2. WHEN a Template_Creator uploads a PDF, THE System SHALL validate the file size is less than 10MB
3. WHEN a PDF is uploaded, THE System SHALL send it to the PDF_Service for conversion
4. WHEN the PDF_Service completes conversion, THE System SHALL store the HTML in the Template
5. WHEN the PDF_Service fails, THE System SHALL return an error message to the Template_Creator
6. THE System SHALL complete PDF to HTML conversion within 30 seconds for PDFs up to 50 pages

### Requirement 52: Delimiter Validation in Templates

**User Story:** As the System, I want to validate that email templates only reference defined delimiters, so that rendering errors are prevented.

#### Acceptance Criteria

1. WHEN a Template_Creator saves email content, THE System SHALL scan for delimiter patterns
2. WHEN a delimiter in email content is not defined in the Template, THE System SHALL return a validation error
3. WHEN a delimiter in email subject is not defined in the Template, THE System SHALL return a validation error
4. THE System SHALL list all undefined delimiters in the error message
5. THE System SHALL prevent Template activation if email content contains undefined delimiters


### Requirement 53: Signature Image Format and Size

**User Story:** As a Signer, I want to upload signature images in common formats, so that I can use my existing signature.

#### Acceptance Criteria

1. WHEN a Signer uploads a signature image, THE System SHALL accept PNG, JPG, and JPEG formats
2. WHEN a Signer uploads a signature image, THE System SHALL validate the file size is less than 2MB
3. WHEN a signature image exceeds 2MB, THE System SHALL return error message "Signature image must be less than 2MB"
4. WHEN a signature image is uploaded, THE System SHALL convert it to PNG format
5. WHEN a signature image is stored, THE System SHALL encode it as base64
6. THE System SHALL resize signature images to a maximum width of 400 pixels while maintaining aspect ratio

### Requirement 54: Document Search and Filtering

**User Story:** As a Company_Admin, I want to search and filter documents, so that I can find specific documents quickly.

#### Acceptance Criteria

1. WHEN a Company_Admin searches by recipient email, THE System SHALL return documents with matching recipients
2. WHEN a Company_Admin searches by document ID, THE System SHALL return the matching document
3. WHEN a Company_Admin filters by status, THE System SHALL return only documents with that status
4. WHEN a Company_Admin filters by template, THE System SHALL return only documents created from that template
5. WHEN a Company_Admin filters by date range, THE System SHALL return only documents created within that range
6. WHEN multiple filters are applied, THE System SHALL return documents matching all filters (AND logic)
7. THE System SHALL return search results within 2 seconds for up to 10,000 documents

### Requirement 55: Bulk Document Operations

**User Story:** As a Company_Admin, I want to perform bulk operations on documents, so that I can manage multiple documents efficiently.

#### Acceptance Criteria

1. WHEN a Company_Admin selects multiple documents, THE System SHALL enable bulk action buttons
2. WHEN a Company_Admin clicks bulk cancel, THE System SHALL cancel all selected documents
3. WHEN a Company_Admin clicks bulk download, THE System SHALL generate a ZIP file with all completed documents
4. WHEN a bulk operation is initiated, THE System SHALL display a progress indicator
5. WHEN a bulk operation completes, THE System SHALL display a summary of successful and failed operations
6. THE System SHALL log all bulk operations to the Audit_Log

### Requirement 56: Template Version History

**User Story:** As a Template_Creator, I want to view template change history, so that I can track modifications.

#### Acceptance Criteria

1. WHEN a Template is modified, THE System SHALL create a version history entry
2. WHEN a version history entry is created, THE System SHALL store the modified fields, actor, and timestamp
3. WHEN a Template_Creator views version history, THE System SHALL display entries in reverse chronological order
4. WHEN a Template_Creator views a version entry, THE System SHALL display the changes made
5. THE System SHALL retain version history for at least 90 days


### Requirement 57: Recipient Email and Phone Validation

**User Story:** As the System, I want to validate recipient contact information, so that notifications are delivered successfully.

#### Acceptance Criteria

1. WHEN a Document is created with recipient email, THE System SHALL validate the email format
2. WHEN a Document is created with recipient phone, THE System SHALL validate the phone format
3. WHEN email format is invalid, THE System SHALL return HTTP 400 with error message "Invalid email format for recipient [name]"
4. WHEN phone format is invalid, THE System SHALL return HTTP 400 with error message "Invalid phone format for recipient [name]"
5. THE System SHALL accept international phone formats with country codes
6. THE System SHALL normalize phone numbers to E.164 format before storage

### Requirement 58: Document Timeline Visualization

**User Story:** As a Company_Admin, I want to view a visual timeline of document events, so that I can understand the signing flow.

#### Acceptance Criteria

1. WHEN a Company_Admin views a document detail, THE System SHALL display a timeline of all events
2. WHEN an event is displayed, THE System SHALL show the event type, timestamp, and actor
3. WHEN an event has metadata, THE System SHALL display it in an expandable section
4. THE System SHALL display events in chronological order with the most recent at the top
5. THE System SHALL use visual indicators (icons, colors) to distinguish event types

### Requirement 59: Storage Path Customization

**User Story:** As a Company_Admin, I want to customize storage paths, so that documents are organized according to my preferences.

#### Acceptance Criteria

1. WHEN a Company_Admin configures storage settings, THE System SHALL allow custom folder path
2. WHEN a Company_Admin configures storage settings, THE System SHALL allow custom file prefix
3. WHEN a Company_Admin configures storage settings, THE System SHALL allow custom file suffix
4. WHEN a Company_Admin configures storage settings, THE System SHALL allow custom file delimiter
5. WHEN a PDF is uploaded, THE System SHALL construct the path as: folder_path/prefix-document_id-suffix.pdf
6. THE System SHALL validate that folder path does not contain invalid characters

### Requirement 60: API Response Time Requirements

**User Story:** As an External_System, I want fast API responses, so that my application remains responsive.

#### Acceptance Criteria

1. THE System SHALL respond to document initiation requests within 5 seconds
2. THE System SHALL respond to status polling requests within 500 milliseconds
3. THE System SHALL respond to authentication requests within 200 milliseconds
4. WHEN response time exceeds the threshold, THE System SHALL log a performance warning
5. THE System SHALL include response time in API response headers

### Requirement 61: Pre-Expiry Reminder Notifications

**User Story:** As a Company_Admin, I want to send reminder notifications before links expire, so that Signers have time to complete their signatures.

#### Acceptance Criteria

1. WHEN a Template_Creator configures pre-expiry reminders, THE System SHALL allow configuration of reminder intervals (e.g., 24 hours, 1 hour before expiry)
2. THE System SHALL run a reminder check cron job every 15 minutes
3. WHEN the cron job runs, THE System SHALL query all Documents with status "distributed", "opened", or "partially_signed"
4. WHEN a Document's expires_at timestamp minus current time matches a configured reminder interval, THE System SHALL send reminder notifications to pending Recipients
5. WHEN a reminder is sent, THE System SHALL record the reminder timestamp to prevent duplicate reminders
6. THE System SHALL support multiple reminder intervals per Template (e.g., T-24h and T-1h)
7. THE System SHALL log all reminder notifications to the Audit_Log

### Requirement 62: OTP Resend Throttling

**User Story:** As the System, I want to throttle OTP resend requests, so that SMS/email abuse is prevented.

#### Acceptance Criteria

1. WHEN a Signer requests OTP resend, THE System SHALL check the timestamp of the last OTP sent to that Recipient
2. WHEN less than 60 seconds have elapsed since the last OTP, THE System SHALL reject the resend request with error message "Please wait 60 seconds before requesting a new code"
3. WHEN 60 or more seconds have elapsed since the last OTP, THE System SHALL generate and send a new OTP
4. WHEN a new OTP is sent, THE System SHALL invalidate the previous OTP
5. WHEN a new OTP is sent, THE System SHALL update the last_otp_sent_at timestamp for the Recipient
6. THE System SHALL log all OTP resend requests to the Audit_Log with success or throttle status

### Requirement 63: MFA Channel Fallback Behavior

**User Story:** As a Signer, I want to receive OTP via alternative channels if one fails, so that I can still access my document.

#### Acceptance Criteria

1. WHEN MFA channel is "both" and SMS sending fails, THE System SHALL still send OTP via email
2. WHEN MFA channel is "both" and email sending fails, THE System SHALL still send OTP via SMS
3. WHEN MFA channel is "both" and both SMS and email fail, THE System SHALL log an error and display message "Unable to send verification code. Please contact support"
4. WHEN MFA channel is "sms" and SMS sending fails, THE System SHALL log an error and display message "Unable to send SMS. Please contact support"
5. WHEN MFA channel is "email" and email sending fails, THE System SHALL log an error and display message "Unable to send email. Please contact support"
6. THE System SHALL log all MFA channel failures to the Audit_Log with provider error details

### Requirement 64: Draft and Archived Template Blocking

**User Story:** As the System, I want to prevent document creation from inactive templates, so that only approved templates are used.

#### Acceptance Criteria

1. WHEN an External_System attempts to create a Document from a Template with status "draft", THE System SHALL return HTTP 400 with error message "Template is not active"
2. WHEN an External_System attempts to create a Document from a Template with status "archived", THE System SHALL return HTTP 400 with error message "Template is archived and cannot be used"
3. WHEN an External_System attempts to create a Document from a Template with isDeleted set to true, THE System SHALL return HTTP 404 with error message "Template not found"
4. THE System SHALL only allow Document creation from Templates with status "active"
5. THE System SHALL log all rejected document creation attempts to the Audit_Log

### Requirement 65: Partially Signed Status Definition

**User Story:** As a Company_Admin, I want to track when documents are partially signed, so that I can monitor progress in multi-signer workflows.

#### Acceptance Criteria

1. WHEN signature type is "multiple" or "hierarchy" and at least one Recipient has signed but not all, THE System SHALL set Document status to "partially_signed"
2. WHEN signature type is "single", THE System SHALL never set status to "partially_signed"
3. WHEN a Document has status "partially_signed", THE System SHALL allow pending Recipients to access and sign
4. WHEN a Document has status "partially_signed", THE System SHALL allow Company_Admin to cancel, resend, or send reminders
5. WHEN all Recipients in a "partially_signed" Document complete signing, THE System SHALL transition status to "signed"
6. WHEN a Document with status "partially_signed" expires, THE System SHALL transition status to "expired"
7. THE System SHALL include "partially_signed" status in Message Center filters and status reports

### Requirement 66: Signer Concurrent Session Handling

**User Story:** As a Signer, I want to open my signing link in multiple tabs or devices, so that I have flexibility in how I access the document.

#### Acceptance Criteria

1. WHEN a Signer opens the same signing link in multiple browser tabs, THE System SHALL allow access in all tabs
2. WHEN a Signer submits a signature in one tab, THE System SHALL invalidate the session in other tabs
3. WHEN a Signer attempts to submit a signature in a second tab after signing in the first, THE System SHALL display message "You have already signed this document"
4. WHEN a Signer verifies OTP in one tab, THE System SHALL rotate the Token and invalidate access in other tabs
5. THE System SHALL use Token rotation to enforce single-session behavior after authentication
6. THE System SHALL log all concurrent access attempts to the Audit_Log

### Requirement 67: Server-Side Zone Ownership Validation

**User Story:** As the System, I want to validate zone ownership on signature submission, so that Signers cannot forge signatures for zones not assigned to them.

#### Acceptance Criteria

1. WHEN a Signer submits a signature with zone_id, THE System SHALL validate the zone_id exists in the Document configuration
2. WHEN a Signer submits a signature with zone_id, THE System SHALL validate the zone_id is assigned to the authenticated Recipient
3. WHEN zone_id validation fails, THE System SHALL return HTTP 403 with error message "You are not authorized to sign this zone"
4. WHEN zone_id is missing from the submission, THE System SHALL return HTTP 400 with error message "zone_id is required"
5. THE System SHALL perform zone validation on the server side, not relying on client-side checks
6. THE System SHALL log all zone validation failures to the Audit_Log

### Requirement 68: Error Document Status Definition

**User Story:** As a Company_Admin, I want to identify documents that encountered errors, so that I can retry or investigate failures.

#### Acceptance Criteria

1. WHEN PDF generation fails after all retries, THE System SHALL set Document status to "error"
2. WHEN storage upload fails after all retries, THE System SHALL set Document status to "error"
3. WHEN a Document has status "error", THE System SHALL display the error reason in the Message Center
4. WHEN a Document has status "error", THE System SHALL allow Company_Admin to retry PDF generation
5. WHEN a Company_Admin retries a Document with status "error", THE System SHALL attempt PDF generation and storage again
6. WHEN retry succeeds, THE System SHALL transition Document status to "completed"
7. WHEN retry fails, THE System SHALL keep Document status as "error" and log the failure
8. THE System SHALL include "error" status in Message Center filters and status reports

### Requirement 69: Connection Test Cleanup

**User Story:** As a Super_Admin, I want test files to be cleaned up after connection tests, so that storage is not polluted with test data.

#### Acceptance Criteria

1. WHEN a Super_Admin triggers a storage connection test, THE System SHALL create a test file with name pattern "test-{timestamp}.txt"
2. WHEN the test file is successfully written and read, THE System SHALL delete the test file from the Storage_Provider
3. WHEN test file deletion fails, THE System SHALL log a warning but still return test success
4. WHEN the connection test fails before file creation, THE System SHALL not attempt cleanup
5. THE System SHALL complete test file cleanup within 5 seconds
6. THE System SHALL log all test file creation and deletion events to the Audit_Log

### Requirement 70: Next Signer Notification Template

**User Story:** As a Template_Creator, I want to customize the notification sent to the next signer in sequential workflows, so that messages are contextually appropriate.

#### Acceptance Criteria

1. WHEN a Template_Creator configures a Template with signature type "hierarchy", THE System SHALL allow configuration of a "next_signer_notification" template
2. WHEN a Recipient signs in a sequential workflow, THE System SHALL use the "next_signer_notification" template for the next Recipient
3. WHEN "next_signer_notification" template is not configured, THE System SHALL use the default "link_sent" notification template
4. WHEN the "next_signer_notification" template includes delimiters, THE System SHALL replace them with actual payload values
5. THE System SHALL include information about the previous signer in the notification context (name, signed timestamp)
6. THE System SHALL log all next signer notifications to the Audit_Log

### Requirement 71: Presigned URL Fallback for Storage Providers

**User Story:** As a Company_Admin, I want to download signed PDFs even when using storage providers that don't support presigned URLs, so that all storage options are viable.

#### Acceptance Criteria

1. WHEN a Storage_Provider supports presigned URLs (AWS S3, Azure Blob), THE System SHALL generate a presigned URL for PDF download
2. WHEN a Storage_Provider does not support presigned URLs (Google Drive), THE System SHALL proxy the download through the application server
3. WHEN proxying a download, THE System SHALL stream the file from Storage_Provider to the client without storing it on the server
4. WHEN proxying a download, THE System SHALL set appropriate Content-Type and Content-Disposition headers
5. WHEN a presigned URL is generated, THE System SHALL set expiration to 1 hour
6. WHEN a proxy download is initiated, THE System SHALL validate the requesting user has permission to access the Document
7. THE System SHALL log all PDF download requests to the Audit_Log with download method (presigned or proxy)

### Requirement 72: Mobile Responsive Signing Page

**User Story:** As a Signer, I want to sign documents on my mobile device, so that I can complete signatures on the go.

#### Acceptance Criteria

1. THE System SHALL render the signing page responsively across mobile (320px-767px), tablet (768px-1023px), and desktop (1024px+) viewports
2. WHEN a Signer accesses the signing page on mobile, THE System SHALL display signature input options in a mobile-optimized layout
3. WHEN a Signer draws a signature on a touch device, THE System SHALL capture touch events for signature drawing
4. WHEN a Signer views a Document on mobile, THE System SHALL ensure all text is readable without horizontal scrolling
5. WHEN a Signer views a Document on mobile, THE System SHALL ensure all interactive elements (buttons, inputs) are touch-friendly (minimum 44px touch target)
6. THE System SHALL test responsive behavior across iOS Safari, Android Chrome, and mobile browsers

### Requirement 73: Timezone Display Configuration

**User Story:** As a Company_Admin, I want to configure how timestamps are displayed, so that users see times in their preferred timezone.

#### Acceptance Criteria

1. WHEN a Company_Admin configures timezone settings, THE System SHALL allow selection of "UTC", "company_timezone", or "browser_timezone"
2. WHEN timezone setting is "UTC", THE System SHALL display all timestamps in UTC with "UTC" suffix
3. WHEN timezone setting is "company_timezone", THE System SHALL display all timestamps in the company's configured timezone
4. WHEN timezone setting is "browser_timezone", THE System SHALL display all timestamps in the user's browser timezone
5. WHEN displaying timestamps, THE System SHALL include the timezone abbreviation (e.g., "PST", "EST", "UTC")
6. THE System SHALL store all timestamps in UTC in the database regardless of display setting
7. THE System SHALL apply timezone display setting to Message Center, Document Timeline, and Audit Log views

### Requirement 74: API Key Scopes

**User Story:** As a Super_Admin, I want to assign scopes to API keys, so that External_Systems have granular permissions.

#### Acceptance Criteria

1. WHEN a Super_Admin generates an API_Key, THE System SHALL allow selection of one or more scopes from the available scope list
2. THE System SHALL support the following scopes: "esign:create", "esign:status", "esign:download", "esign:cancel", "template:read"
3. WHEN an External_System makes an API request, THE System SHALL validate the API_Key has the required scope for that operation
4. WHEN an API_Key lacks the required scope, THE System SHALL return HTTP 403 with error message "Insufficient permissions"
5. WHEN a Super_Admin views API_Keys, THE System SHALL display the assigned scopes for each key
6. WHEN a Super_Admin modifies API_Key scopes, THE System SHALL log the change to the Audit_Log
7. THE System SHALL enforce scope validation on all API endpoints

### Requirement 75: Read Before Sign Scroll Enforcement

**User Story:** As a Template_Creator, I want to require signers to scroll through the entire document, so that they review all content before signing.

#### Acceptance Criteria

1. WHEN a Template_Creator enables "require_scroll_completion" in Template configuration, THE System SHALL track scroll position on the signing page
2. WHEN scroll enforcement is enabled and a Signer has not scrolled to the bottom of the Document, THE System SHALL disable the signature submission button
3. WHEN a Signer scrolls to within 50 pixels of the Document bottom, THE System SHALL enable the signature submission button
4. WHEN scroll enforcement is disabled, THE System SHALL enable the signature submission button immediately
5. THE System SHALL log scroll completion events to the Audit_Log with timestamp
6. THE System SHALL display a visual indicator showing scroll progress when enforcement is enabled

### Requirement 76: Data Retention Policy

**User Story:** As a Company_Admin, I want to configure data retention periods, so that old data is automatically cleaned up per compliance requirements.

#### Acceptance Criteria

1. WHEN a Company_Admin configures retention policy, THE System SHALL allow setting retention periods for Documents, Audit_Logs, and signed PDFs
2. THE System SHALL support retention periods in days (e.g., 90, 180, 365, 730, or "indefinite")
3. THE System SHALL run a retention cleanup cron job daily at midnight UTC
4. WHEN the cron job runs, THE System SHALL identify Documents older than the configured retention period
5. WHEN a Document exceeds retention period, THE System SHALL delete the signed PDF from Storage_Provider
6. WHEN a Document exceeds retention period, THE System SHALL mark the Document record as "archived" but not delete it
7. WHEN Audit_Logs exceed retention period, THE System SHALL archive them to cold storage but not delete them
8. THE System SHALL log all retention cleanup operations to the Audit_Log

### Requirement 77: Evidence Package Download

**User Story:** As a Company_Admin, I want to download a complete evidence package, so that I have all materials needed for legal proceedings.

#### Acceptance Criteria

1. WHEN a Company_Admin requests an evidence package for a completed Document, THE System SHALL generate a ZIP file
2. WHEN the ZIP file is generated, THE System SHALL include the signed PDF
3. WHEN the ZIP file is generated, THE System SHALL include an audit trail CSV with all events
4. WHEN the ZIP file is generated, THE System SHALL include a verification file containing the SHA_256_Hash
5. WHEN the ZIP file is generated, THE System SHALL include a certificate of completion with all signer details
6. THE System SHALL complete evidence package generation within 30 seconds
7. THE System SHALL log all evidence package download requests to the Audit_Log

### Requirement 78: Conditional Routing

**User Story:** As a Template_Creator, I want to route documents based on field values, so that signing workflows adapt to document content.

#### Acceptance Criteria

1. WHEN a Template_Creator configures a Template, THE System SHALL allow definition of routing_rules with conditions
2. WHEN a routing_rule is defined, THE System SHALL support conditions based on delimiter values with operators: "equals", "not_equals", "greater_than", "less_than", "contains", "is_empty"
3. WHEN a routing_rule is defined, THE System SHALL support actions: "activate_signer", "skip_signer", "add_signer", "complete"
4. WHEN a routing_rule is configured, THE System SHALL specify which Recipient's completion triggers rule evaluation
5. WHEN a Recipient signs and routing_rules exist, THE System SHALL evaluate all rules in order
6. WHEN a routing condition is met, THE System SHALL execute the associated action
7. WHEN action is "skip_signer", THE System SHALL mark the target Recipient as "skipped" and activate the next Recipient
8. WHEN action is "add_signer", THE System SHALL create a new Recipient with the specified email and activate them
9. WHEN action is "complete", THE System SHALL mark all remaining Recipients as "skipped" and complete the Document
10. THE System SHALL log all routing decisions to the Audit_Log with condition evaluation results

### Requirement 79: Signing Groups

**User Story:** As a Company_Admin, I want to assign signing zones to groups, so that any group member can sign on behalf of the group.

#### Acceptance Criteria

1. WHEN a Company_Admin creates a SigningGroup, THE System SHALL allow adding multiple members with email addresses
2. WHEN a Template_Creator configures a signature zone, THE System SHALL allow setting recipient_type to "individual" or "group"
3. WHEN recipient_type is "group", THE System SHALL allow selection of a SigningGroup
4. WHEN a Document is created with a group recipient, THE System SHALL generate Tokens for all group members
5. WHEN a Document is created with a group recipient, THE System SHALL send notifications to all group members
6. WHEN a group member signs, THE System SHALL mark the zone as signed and invalidate all other group members' Tokens
7. WHEN a group member signs, THE System SHALL send notifications to other group members that the slot has been claimed
8. WHEN a group member signs, THE System SHALL record in the certificate "Signed by [Member Name] on behalf of [Group Name]"
9. THE System SHALL log all group signing events to the Audit_Log with group and member details

### Requirement 80: Delegated Signing

**User Story:** As a Signer, I want to delegate my signing responsibility to another person, so that documents can be signed when I am unavailable.

#### Acceptance Criteria

1. WHEN a Signer accesses a Document, THE System SHALL display a "Delegate" button
2. WHEN a Signer clicks delegate, THE System SHALL prompt for delegate email address and optional reason
3. WHEN a Signer submits delegation, THE System SHALL generate a new Token for the delegate
4. WHEN delegation is submitted, THE System SHALL invalidate the original Signer's Token
5. WHEN delegation is submitted, THE System SHALL send notification to the delegate with signing link
6. WHEN delegation is submitted, THE System SHALL send confirmation to the original Signer
7. WHEN a delegate signs, THE System SHALL record in the certificate "Signed by [Delegate Name] on behalf of [Original Signer Name]"
8. THE System SHALL log the complete delegation chain to the Audit_Log with timestamps and reasons
9. WHEN a delegate signs, THE System SHALL treat the delegate as the Recipient who signed for workflow purposes

### Requirement 81: Bulk Send from CSV

**User Story:** As a Company_Admin, I want to send documents to multiple recipients from a CSV file, so that I can process large batches efficiently.

#### Acceptance Criteria

1. WHEN a Company_Admin uploads a CSV file for bulk send, THE System SHALL validate the file format
2. WHEN a CSV file is uploaded, THE System SHALL allow mapping of CSV columns to Template delimiters
3. WHEN column mapping is complete, THE System SHALL validate that all required delimiters are mapped
4. WHEN validation passes, THE System SHALL create a BulkJob record with status "queued"
5. WHEN a BulkJob is created, THE System SHALL process rows asynchronously via a job queue
6. WHEN processing a row, THE System SHALL create a Document using the mapped delimiter values
7. WHEN a row fails validation or document creation, THE System SHALL log the error and continue processing
8. WHEN all rows are processed, THE System SHALL update BulkJob status to "completed"
9. WHEN a BulkJob completes, THE System SHALL send a webhook notification if configured
10. WHEN a Company_Admin views a BulkJob, THE System SHALL display progress (total rows, processed, succeeded, failed)
11. WHEN a BulkJob has failures, THE System SHALL provide a downloadable error report CSV
12. THE System SHALL log all bulk send operations to the Audit_Log

### Requirement 82: Certificate of Completion

**User Story:** As a Company_Admin, I want a separate certificate of completion, so that I have a summary document for legal records.

#### Acceptance Criteria

1. WHEN all Recipients sign a Document, THE System SHALL generate a Certificate of Completion PDF
2. WHEN the certificate is generated, THE System SHALL include Document ID, Template name, and completion timestamp
3. WHEN the certificate is generated, THE System SHALL include a table of all signers with names, emails, IP addresses, timestamps, and geo locations
4. WHEN the certificate is generated, THE System SHALL include the SHA_256_Hash of the signed PDF
5. WHEN the certificate is generated, THE System SHALL include verification instructions
6. WHEN the certificate is generated, THE System SHALL store it alongside the signed PDF in Storage_Provider
7. WHEN post-sign email is sent, THE System SHALL attach both the signed PDF and certificate
8. WHEN a Company_Admin downloads a Document, THE System SHALL provide option to download certificate separately
9. THE System SHALL log certificate generation to the Audit_Log

### Requirement 83: In-Person/Kiosk Signing

**User Story:** As a Company_Admin, I want to facilitate in-person signing at a kiosk, so that signers can sign documents while physically present.

#### Acceptance Criteria

1. WHEN a Template_Creator configures a signature zone, THE System SHALL allow setting signature_type to "remote" or "in_person"
2. WHEN signature_type is "in_person", THE System SHALL generate a kiosk URL instead of sending notification to the Signer
3. WHEN a host (company employee) accesses the kiosk URL, THE System SHALL require host authentication
4. WHEN host authentication succeeds, THE System SHALL display the Document for the Signer
5. WHEN a kiosk session is initiated, THE System SHALL set a session timeout (default 5 minutes)
6. WHEN the session timeout expires, THE System SHALL lock the session and require host re-authentication
7. WHERE webcam capture is enabled, THE System SHALL capture a photo of the Signer before signature submission
8. WHEN a Signer completes in-person signing, THE System SHALL not require OTP verification
9. WHEN in-person signing is completed, THE System SHALL log the host identity, kiosk location, and timestamp to the Audit_Log
10. THE System SHALL include in-person signing indicator in the certificate and audit footer

### Requirement 84: Expiry Grace Period

**User Story:** As a Template_Creator, I want to configure a grace period after link expiry, so that signers have a buffer to complete signatures.

#### Acceptance Criteria

1. WHEN a Template_Creator configures link expiry, THE System SHALL allow setting an optional grace_period_hours value
2. WHEN a Document expires and grace_period_hours is configured, THE System SHALL not immediately invalidate Tokens
3. WHEN a Signer accesses a Document during the grace period, THE System SHALL display a warning banner "This link expired on [date]. You are in a grace period."
4. WHEN a Signer accesses a Document during the grace period, THE System SHALL allow signature submission
5. WHEN the grace period expires, THE System SHALL invalidate all Tokens and set Document status to "expired"
6. WHEN grace_period_hours is not configured, THE System SHALL invalidate Tokens immediately upon expiry
7. THE System SHALL send reminder notifications during the grace period at configured intervals
8. THE System SHALL log grace period access to the Audit_Log

### Requirement 85: Signing Order Visualization

**User Story:** As a Signer, I want to see the signing progress, so that I understand where I am in the workflow.

#### Acceptance Criteria

1. WHEN a Signer accesses a Document, THE System SHALL display a progress indicator showing all Recipients
2. WHEN the progress indicator is displayed, THE System SHALL show recipient names or initials (not full email addresses)
3. WHEN the progress indicator is displayed, THE System SHALL show status for each Recipient: "signed" (checkmark), "active" (highlighted), "pending" (grayed)
4. WHEN signature type is "hierarchy", THE System SHALL display Recipients in sequential order
5. WHEN signature type is "multiple", THE System SHALL display Recipients in a grid layout
6. THE System SHALL not expose full email addresses to protect privacy
7. THE System SHALL update the progress indicator in real-time as Recipients sign (if Signer refreshes page)


## Correctness Properties

These properties define invariants and relationships that must hold throughout the system's operation. They serve as the foundation for property-based testing and formal verification.

### Property 1: Single Active Provider Invariant

**Category:** Invariant

**Property:** For any company at any point in time, exactly one Storage_Provider, one Email_Provider, and one SMS_Provider SHALL be marked as active.

**Rationale:** Multiple active providers of the same type would create ambiguity about which provider to use for operations.

**Test Strategy:** Property-based test that generates random provider configurations and verifies only one provider per type is active.

### Property 2: Template Snapshot Immutability

**Category:** Invariant

**Property:** Once a Document is created with a Template snapshot, the snapshot SHALL never be modified, regardless of changes to the source Template.

**Rationale:** In-flight documents must maintain consistent behavior even if templates are updated.

**Test Strategy:** Create documents, modify templates, verify document snapshots remain unchanged.

### Property 3: Token Uniqueness

**Category:** Invariant

**Property:** All active Tokens across all Documents SHALL be unique.

**Rationale:** Token collisions would allow unauthorized access to documents.

**Test Strategy:** Generate large numbers of tokens and verify no duplicates exist.

### Property 4: Sequential Signing Order

**Category:** Invariant

**Property:** In a sequential signing workflow, Recipient N SHALL NOT be able to sign until all Recipients 1 through N-1 have signed.

**Rationale:** Sequential workflows require strict ordering for legal and business reasons.

**Test Strategy:** Attempt out-of-order signing and verify it is rejected.

### Property 5: Audit Log Immutability

**Category:** Invariant

**Property:** Once an Audit_Log entry is created, it SHALL never be modified or deleted.

**Rationale:** Audit logs must be tamper-proof for compliance and legal purposes.

**Test Strategy:** Attempt to modify or delete audit log entries and verify operations are rejected.

### Property 6: PDF Hash Integrity

**Category:** Round-Trip Property

**Property:** For any completed Document, computing the SHA_256_Hash of the stored PDF SHALL produce the same hash as stored in the Document record.

**Rationale:** Hash verification ensures PDFs have not been tampered with after generation.

**Test Strategy:** Generate documents, download PDFs, compute hashes, verify they match stored hashes.

### Property 7: Delimiter Round-Trip

**Category:** Round-Trip Property

**Property:** For any Template with HTML content, extracting delimiters then rendering the HTML with those delimiter values SHALL produce HTML that contains all original delimiter positions.

**Rationale:** Delimiter extraction and injection must be inverse operations.

**Test Strategy:** Create templates with various delimiter patterns, extract, inject, verify positions match.

### Property 8: Encryption Round-Trip

**Category:** Round-Trip Property

**Property:** For any provider credential, encrypting then decrypting SHALL produce the original credential value.

**Rationale:** Encryption must be reversible to use credentials.

**Test Strategy:** Encrypt various credential strings, decrypt, verify they match originals.


### Property 9: Idempotency

**Category:** Idempotence

**Property:** Calling the document initiation API with the same Idempotency_Key multiple times within 24 hours SHALL produce the same result as calling it once.

**Rationale:** Network retries should not create duplicate documents.

**Test Strategy:** Call initiation API multiple times with same idempotency key, verify only one document is created.

### Property 10: OTP Verification Idempotence

**Category:** Idempotence

**Property:** Verifying the same OTP multiple times SHALL produce the same result (success or failure) until the OTP expires or is invalidated.

**Rationale:** OTP verification should be deterministic within its validity period.

**Test Strategy:** Verify same OTP multiple times, verify consistent results.

### Property 11: Document Status Monotonicity

**Category:** Metamorphic Property

**Property:** Document status transitions SHALL follow the defined state machine and never regress to a previous state (except for error states).

**Rationale:** Document lifecycle should progress forward through defined states.

**Test Strategy:** Generate random sequences of operations, verify status transitions are valid.

### Property 12: Recipient Count Consistency

**Category:** Metamorphic Property

**Property:** The number of Recipients in a Document SHALL equal the number of Recipients defined in the Template snapshot at creation time.

**Rationale:** Recipient count should not change after document creation.

**Test Strategy:** Create documents with various recipient counts, verify counts remain constant.

### Property 13: Signature Completeness

**Category:** Metamorphic Property

**Property:** A Document SHALL transition to "signed" status if and only if all Recipients have status "signed".

**Rationale:** Document completion requires all signatures.

**Test Strategy:** Create documents with multiple recipients, sign subsets, verify status transitions correctly.

### Property 14: Token Expiry Ordering

**Category:** Metamorphic Property

**Property:** For any Document, all Recipient Token expiry timestamps SHALL be less than or equal to the Document expires_at timestamp.

**Rationale:** Individual tokens cannot outlive the document expiry.

**Test Strategy:** Create documents with various expiry settings, verify token expiries are within document expiry.

### Property 15: Notification Delivery Ordering

**Category:** Metamorphic Property

**Property:** In a sequential signing workflow, Recipient N SHALL NOT receive a notification until Recipient N-1 has signed.

**Rationale:** Sequential workflows should notify recipients in order.

**Test Strategy:** Create sequential documents, verify notification timestamps follow signing order.

### Property 16: Audit Log Completeness

**Category:** Metamorphic Property

**Property:** For any Document that reaches "completed" status, the Audit_Log SHALL contain entries for: document_created, link_sent, document_opened, signature_submitted, pdf_generated, and document_completed.

**Rationale:** Complete documents must have a full audit trail.

**Test Strategy:** Complete documents through full workflow, verify all expected audit entries exist.


### Property 17: Storage Provider Consistency

**Category:** Invariant

**Property:** All PDFs for a given company SHALL be stored using the Storage_Provider that was active at the time of PDF generation.

**Rationale:** Storage location should be determined by active provider at generation time.

**Test Strategy:** Change storage providers between document creations, verify PDFs are stored in correct locations.

### Property 18: MFA Enforcement

**Category:** Invariant

**Property:** When MFA is enabled for a Template, no Signer SHALL be able to view the Document without successfully verifying an OTP.

**Rationale:** MFA must be enforced when configured.

**Test Strategy:** Create MFA-enabled documents, attempt to access without OTP verification, verify access is denied.

### Property 19: Delimiter Type Validation

**Category:** Error Condition

**Property:** When a delimiter value does not match its configured type, the System SHALL reject the document creation request with HTTP 400.

**Rationale:** Type validation prevents data integrity issues.

**Test Strategy:** Generate invalid delimiter values for each type, verify rejection.

### Property 20: Token Expiry Enforcement

**Category:** Error Condition

**Property:** When a Token is expired, any attempt to use it SHALL be rejected with an appropriate error message.

**Rationale:** Expired tokens must not grant access.

**Test Strategy:** Create tokens with short expiry, wait for expiry, attempt to use, verify rejection.

### Property 21: API Key Revocation

**Category:** Error Condition

**Property:** When an API_Key is revoked, all subsequent API requests using that key SHALL be rejected with HTTP 401.

**Rationale:** Revoked keys must be immediately invalidated.

**Test Strategy:** Revoke API keys, attempt to use them, verify rejection.

### Property 22: OTP Lockout

**Category:** Error Condition

**Property:** When a Recipient exceeds 5 failed OTP attempts, all subsequent OTP verification attempts SHALL be rejected for 30 minutes.

**Rationale:** Lockout prevents brute-force attacks.

**Test Strategy:** Submit 5 incorrect OTPs, verify lockout is enforced.

### Property 23: Concurrent PDF Generation Prevention

**Category:** Invariant

**Property:** For any Document, at most one PDF generation process SHALL be active at any time.

**Rationale:** Distributed lock prevents duplicate PDF generation.

**Test Strategy:** Simulate concurrent completion of same document, verify only one PDF is generated.

### Property 24: Notification Retry Convergence

**Category:** Metamorphic Property

**Property:** When a notification fails, the System SHALL retry up to 3 times, and the total number of send attempts SHALL not exceed 4 (1 initial + 3 retries).

**Rationale:** Retry logic must have bounded attempts.

**Test Strategy:** Simulate notification failures, verify retry count is bounded.


### Property 25: Signature Image Size Constraint

**Category:** Error Condition

**Property:** When a Signer uploads a signature image larger than 2MB, the System SHALL reject the upload with an appropriate error message.

**Rationale:** Size limits prevent storage abuse and performance issues.

**Test Strategy:** Generate signature images of various sizes, verify rejection above 2MB.

### Property 26: Template Activation Validation

**Category:** Error Condition

**Property:** A Template SHALL NOT transition to "active" status if any required configuration is missing or invalid.

**Rationale:** Only complete templates should be activatable.

**Test Strategy:** Create templates with missing configuration, attempt activation, verify rejection.

### Property 27: Document Cancellation Finality

**Category:** Invariant

**Property:** Once a Document status is "cancelled", it SHALL never transition to any other status.

**Rationale:** Cancellation is a terminal state.

**Test Strategy:** Cancel documents, attempt to perform operations, verify status remains "cancelled".

### Property 28: Recipient Field Isolation

**Category:** Invariant

**Property:** A Signer SHALL only be able to modify fields assigned to their Recipient record, and SHALL NOT be able to modify fields assigned to other Recipients.

**Rationale:** Field isolation prevents unauthorized data modification.

**Test Strategy:** Attempt to submit data for fields not assigned to the signer, verify rejection.

### Property 29: API Rate Limit Reset

**Category:** Metamorphic Property

**Property:** After a rate limit window expires (1 minute), the request counter SHALL reset to 0, allowing new requests.

**Rationale:** Rate limits should reset after the window.

**Test Strategy:** Exhaust rate limit, wait 1 minute, verify new requests are allowed.

### Property 30: Webhook Signature Verification

**Category:** Round-Trip Property

**Property:** For any webhook payload, computing HMAC-SHA256 using the API_Secret SHALL produce the same signature as included in the X-Signature header.

**Rationale:** Signature verification ensures webhook authenticity.

**Test Strategy:** Generate webhooks, compute signatures, verify they match.

### Property 31: Storage Retry Exponential Backoff

**Category:** Metamorphic Property

**Property:** When storage upload fails, the System SHALL retry up to 3 times with delays of 2 seconds, 4 seconds, and 8 seconds for retries 1, 2, and 3 respectively (4 total attempts).

**Rationale:** Exponential backoff reduces load during failures and retry attempts must be bounded.

**Test Strategy:** Simulate storage failures, measure retry delays, verify exponential pattern and total attempt count.

### Property 32: Template Deletion Protection

**Category:** Error Condition

**Property:** A Template with active Documents (status "distributed", "opened", or "partially_signed") SHALL NOT be deletable.

**Rationale:** Deletion protection prevents breaking in-flight workflows.

**Test Strategy:** Create active documents, attempt template deletion, verify rejection.


### Property 33: Broadcast Document Independence

**Category:** Invariant

**Property:** In a broadcast signing workflow, signing one Document instance SHALL NOT affect the status of other Document instances created for other Recipients.

**Rationale:** Broadcast documents are independent.

**Test Strategy:** Create broadcast documents, sign one, verify others remain unaffected.

### Property 34: Preview Mode Distribution Gate

**Category:** Invariant

**Property:** When preview mode is enabled, no Recipient SHALL receive a notification until a Company_Admin approves the Document.

**Rationale:** Preview mode requires explicit approval before distribution.

**Test Strategy:** Create preview documents, verify no notifications are sent until approval.

### Property 35: Geo Location Capture Non-Blocking

**Category:** Invariant

**Property:** Failure of geo location lookup SHALL NOT prevent Document access or signature submission.

**Rationale:** Geo lookup is supplementary and should not block core functionality.

**Test Strategy:** Simulate geo lookup failures, verify document access continues.

### Property 36: API Key Scope Enforcement

**Category:** Invariant

**Property:** For any API request, the System SHALL reject the request with HTTP 403 if the API_Key does not have the required scope for that operation.

**Rationale:** Scope-based permissions ensure granular access control.

**Test Strategy:** Generate API keys with various scope combinations, attempt operations, verify enforcement.

### Property 37: Conditional Routing Evaluation Correctness

**Category:** Metamorphic Property

**Property:** For any routing_rule with a condition, the System SHALL evaluate the condition against delimiter values and execute the action if and only if the condition evaluates to true.

**Rationale:** Routing decisions must be deterministic based on conditions.

**Test Strategy:** Create templates with various routing rules, provide delimiter values that match and don't match conditions, verify correct actions are taken.

### Property 38: Signing Group Slot Claim Atomicity

**Category:** Invariant

**Property:** For any signing group assignment, exactly one group member SHALL be able to claim the signing slot, and all other members' Tokens SHALL be invalidated atomically.

**Rationale:** Prevents race conditions where multiple group members could sign.

**Test Strategy:** Simulate concurrent signing attempts by multiple group members, verify only one succeeds.

### Property 39: Delegation Chain Integrity

**Category:** Invariant

**Property:** For any delegated signature, the Audit_Log SHALL contain a complete chain from original Signer to delegate(s), and the certificate SHALL reflect the final delegate who signed.

**Rationale:** Delegation chain must be traceable for legal validity.

**Test Strategy:** Create delegation chains of various lengths, verify audit log completeness and certificate accuracy.

### Property 40: Bulk Job Progress Accuracy

**Category:** Metamorphic Property

**Property:** For any BulkJob, the sum of succeeded and failed row counts SHALL equal the total number of rows processed, and SHALL never exceed the total row count in the CSV.

**Rationale:** Progress tracking must be accurate and consistent.

**Test Strategy:** Process bulk jobs with various success/failure combinations, verify count accuracy.

### Property 41: Certificate Hash Matching

**Category:** Round-Trip Property

**Property:** For any completed Document, the SHA_256_Hash included in the Certificate of Completion SHALL match the hash of the signed PDF.

**Rationale:** Certificate must accurately reference the PDF it describes.

**Test Strategy:** Generate certificates, extract hashes, compute PDF hashes, verify they match.

### Property 42: Kiosk Session Timeout Enforcement

**Category:** Error Condition

**Property:** When a kiosk session exceeds the configured timeout (default 5 minutes) without activity, the System SHALL lock the session and require host re-authentication.

**Rationale:** Timeout prevents unauthorized access to abandoned kiosk sessions.

**Test Strategy:** Initiate kiosk sessions, wait for timeout, attempt operations, verify lockout.

### Property 43: Grace Period Boundary Enforcement

**Category:** Metamorphic Property

**Property:** During the grace period (expires_at < current_time < expires_at + grace_period_hours), Tokens SHALL remain valid. After the grace period ends, Tokens SHALL be invalidated.

**Rationale:** Grace period must have clear boundaries.

**Test Strategy:** Create documents with grace periods, test access at various times relative to expiry, verify boundary enforcement.

### Property 44: Scroll Completion Requirement

**Category:** Invariant

**Property:** When require_scroll_completion is enabled, a Signer SHALL NOT be able to submit a signature until scroll position reaches within 50 pixels of document bottom.

**Rationale:** Ensures signers review full document content.

**Test Strategy:** Enable scroll enforcement, attempt signature submission at various scroll positions, verify enforcement.

### Property 45: Retention Policy Compliance

**Category:** Metamorphic Property

**Property:** For any Document older than the configured retention period, the signed PDF SHALL be deleted from Storage_Provider, and the Document record SHALL be marked as "archived".

**Rationale:** Retention policy must be enforced consistently.

**Test Strategy:** Create documents with various ages, run retention cleanup, verify PDFs are deleted and records are archived correctly.

---

## Summary

This requirements document defines 85 functional requirements and 45 correctness properties for the Secure Gateway E-Sign Platform. All requirements follow EARS patterns and INCOSE quality rules to ensure clarity, testability, and completeness.

The requirements cover:
- **Module 1 (Settings):** Provider configuration, API key management with scopes, credential encryption, connection test cleanup
- **Module 2 (Templates):** PDF upload, field placement, configuration, validation, notification templates, conditional routing, scroll enforcement
- **Module 3 (External API):** Authentication with scopes, document initiation, idempotency, template status validation, bulk send from CSV
- **Module 4 (E-Sign Public Page):** Token validation, MFA with fallback, signature capture, zone validation, concurrent sessions, mobile responsiveness, signing order visualization, delegated signing
- **Module 5 (Document Engine):** PDF generation, storage with fallback, post-signature processing, status definitions (partially_signed, error), certificate of completion, in-person/kiosk signing
- **Module 6 (Message Center):** Document tracking, search, bulk operations, timezone display, evidence package download
- **Module 7 (Audit Log):** Immutable logging, export, compliance, data retention policy
- **Cross-Cutting Concerns:** Pre-expiry reminders with grace periods, OTP resend throttling, retry logic standardization, signing groups

The correctness properties provide a foundation for property-based testing and include:
- **Invariants:** Single active provider, template immutability, token uniqueness, audit log immutability, API scope enforcement, signing group atomicity, delegation chain integrity, scroll completion
- **Round-Trip Properties:** PDF hash integrity, delimiter extraction/injection, encryption/decryption, webhook signatures, certificate hash matching
- **Idempotence:** API idempotency, OTP verification
- **Metamorphic Properties:** Status transitions, recipient counts, notification ordering, retry behavior with standardized counts, conditional routing evaluation, bulk job progress, grace period boundaries, retention policy compliance
- **Error Conditions:** Type validation, token expiry, API key revocation, OTP lockout, rate limiting, kiosk session timeout

These requirements and properties ensure the platform is secure, reliable, auditable, legally compliant, and feature-rich with DocuSign-inspired capabilities including conditional routing, signing groups, delegated signing, bulk operations, certificates of completion, and in-person signing support.
