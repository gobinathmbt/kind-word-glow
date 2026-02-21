# Implementation Plan: Tender Module and Dealership Portal

## Overview

This implementation plan breaks down the Tender Module and Dealership Portal feature into discrete, manageable tasks. The implementation follows a bottom-up approach, starting with backend models and authentication, then building API endpoints, and finally implementing frontend components. Each task builds on previous work to ensure incremental progress and early validation.

## Tasks

- [x] 1. Set up backend models and database schemas
  - [x] 1.1 Create TenderDealership model with schema and indexes
    - Define schema with all fields (name, address, billing_address, ABN, etc.)
    - Add pre-save hook to generate tenderDealership_id from name + timestamp
    - Register with ModelRegistry as company database model
    - _Requirements: 1.1, 1.4, 1.10_
  
  - [x] 1.2 Create TenderDealershipUser model with schema and indexes
    - Define schema with username, email, password, role, etc.
    - Add password hashing with bcrypt in pre-save hook
    - Add indexes for company_id + username uniqueness
    - Register with ModelRegistry as company database model
    - _Requirements: 2.1, 2.2, 2.9, 23.2_
  
  - [x] 1.3 Create Tender model with schema and indexes
    - Define schema with customer_info, basic_vehicle_info, expiry, status
    - Add pre-save hook to generate tender_id (format: TND-{timestamp}-{random})
    - Add indexes for company_id, status, and created_at
    - Register with ModelRegistry as company database model
    - _Requirements: 3.1, 3.2, 3.3, 3.10_
  
  - [x] 1.4 Create TenderVehicle model with schema and indexes
    - Define schema with vehicle details, quote info, status
    - Add indexes for tender_id + tenderDealership_id
    - Register with ModelRegistry as company database model
    - _Requirements: 4.10, 9.1, 10.3_
  
  - [x] 1.5 Create TenderHistory model with schema and indexes
    - Define schema with action tracking fields
    - Add indexes for tender_id and created_at
    - Register with ModelRegistry as company database model
    - _Requirements: 17.1, 17.2, 17.6_
  
  - [x] 1.6 Create TenderNotification model with schema and indexes
    - Define schema with recipient, tender, notification type
    - Add indexes for recipient_id and is_read
    - Register with ModelRegistry as company database model
    - _Requirements: 16.1, 16.9_


- [x] 2. Implement dealership authentication and middleware
  - [x] 2.1 Create dealership authentication controller
    - Implement dealershipLogin function with username, password, company_id, dealership_id
    - Connect to company database using company_id
    - Validate credentials against TenderDealershipUser model
    - Generate JWT token with company_id, dealership_id, role
    - Return user info and token
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 2.2 Create protectDealership middleware
    - Verify JWT token from Authorization header
    - Decode token and extract dealership user info
    - Validate user is active
    - Attach user info to req.dealershipUser
    - Handle token expiration and invalid tokens
    - _Requirements: 6.10, 23.1, 23.7, 23.8_
  
  - [x] 2.3 Update tenant context middleware for dealership users
    - Detect dealership user authentication
    - Connect to company database using company_id from token
    - Attach req.getModel helper for dealership context
    - Handle cleanup on request finish
    - _Requirements: 19.1, 19.2, 19.7_
  
  - [ ]* 2.4 Write property test for dealership authentication
    - **Property 7: Authentication Requires Valid Credentials**
    - **Validates: Requirements 6.1, 6.3**
    - Generate random valid and invalid credentials
    - Verify authentication succeeds only for valid credentials
    - Verify inactive users cannot authenticate

- [x] 3. Implement tender dealership management API
  - [x] 3.1 Create tender dealership controller with CRUD operations
    - Implement getTenderDealerships with pagination and search
    - Implement getTenderDealership by ID
    - Implement createTenderDealership with validation
    - Implement updateTenderDealership with validation
    - Implement deleteTenderDealership (permanent deletion)
    - Implement toggleTenderDealershipStatus
    - _Requirements: 1.1, 1.5, 1.6, 1.7, 1.8_
  
  - [x] 3.2 Add primary user creation in createTenderDealership
    - Create TenderDealershipUser with role "primary_tender_dealership_user"
    - Set email from dealership email
    - Set default password "Welcome@123"
    - Send email invitation with credentials
    - _Requirements: 1.2, 1.3, 2.1, 2.2, 16.1_
  
  - [x] 3.3 Create tender dealership routes
    - Define routes for all CRUD operations
    - Apply protect middleware for authentication
    - Apply authorize middleware for admin-only access
    - Apply companyScopeCheck middleware
    - _Requirements: 1.1, 1.5, 1.6, 1.7, 1.8_
  
  - [ ]* 3.4 Write property test for dealership creation
    - **Property 1: Dealership Creation Creates Primary User**
    - **Validates: Requirements 1.1, 1.2**
    - Generate random dealership data
    - Verify primary user is created with correct email and role
  
  - [ ]* 3.5 Write property test for cascade deletion
    - **Property 2: Cascade Deletion of Dealership Users**
    - **Validates: Requirements 1.7**
    - Create dealership with multiple users
    - Delete dealership and verify all users are deleted
  
  - [ ]* 3.6 Write property test for inactive dealerships
    - **Property 3: Inactive Entities Cannot Participate**
    - **Validates: Requirements 1.6**
    - Mark dealership as inactive
    - Verify it cannot receive tenders


- [x] 4. Implement tender dealership user management API
  - [x] 4.1 Create tender dealership user controller
    - Implement getTenderDealershipUsers (filtered by dealership)
    - Implement getTenderDealershipUser by ID
    - Implement createTenderDealershipUser with validation
    - Implement updateTenderDealershipUser
    - Implement deleteTenderDealershipUser (permanent)
    - Implement toggleTenderDealershipUserStatus
    - Implement resetTenderDealershipUserPassword
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 2.7_
  
  - [x] 4.2 Add email notifications for user operations
    - Send email when user is created with credentials
    - Send email when password is reset
    - Use email templates from mailer config
    - _Requirements: 2.3, 16.2_
  
  - [x] 4.3 Create tender dealership user routes
    - Define routes for all operations
    - Apply protectDealership middleware
    - Restrict to primary users and admins
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 2.7_
  
  - [ ]* 4.4 Write property test for user creation
    - **Property 3: Inactive Entities Cannot Participate**
    - **Validates: Requirements 2.6**
    - Create user and mark as inactive
    - Verify login fails for inactive user
  
  - [ ]* 4.5 Write unit tests for user management
    - Test user creation with default password
    - Test email sending on user creation
    - Test role assignment validation
    - _Requirements: 2.1, 2.2, 2.3, 2.10_

- [ ] 5. Implement tender management API
  - [x] 5.1 Create tender controller with CRUD operations
    - Implement getTenders with pagination, search, and status filter
    - Implement getTender by ID with response count calculation
    - Implement createTender with validation
    - Implement updateTender with validation
    - Implement deleteTender (permanent deletion)
    - Implement toggleTenderStatus
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7, 3.8, 3.9_
  
  - [x] 5.2 Implement response count calculation
    - Count TenderVehicle records with status "Submitted"
    - Count total TenderVehicle records for tender
    - Format as "X/Y" string
    - Include in tender response
    - _Requirements: 3.5, 3.6_
  
  - [x] 5.3 Add tender expiry validation
    - Validate expiry time is in the future on create/update
    - Return error if expiry time is in the past
    - _Requirements: 21.3_
  
  - [x] 5.4 Create tender routes
    - Define routes for all CRUD operations
    - Apply protect middleware
    - Apply authorize middleware for admin access
    - Apply companyScopeCheck middleware
    - _Requirements: 3.1, 3.4, 3.7, 3.8, 3.9_
  
  - [ ]* 5.5 Write property test for response count
    - **Property 4: Response Count Accuracy**
    - **Validates: Requirements 3.5, 3.6**
    - Generate tender with random number of recipients
    - Submit random number of quotes
    - Verify response count is correct and formatted as "X/Y"
  
  - [ ]* 5.6 Write property test for tender status
    - **Property 12: Tender Status State Machine**
    - **Validates: Requirements 14.1, 14.2, 14.6**
    - Verify initial status is "Pending"
    - Test valid status transitions
    - Verify invalid transitions are rejected
  
  - [ ]* 5.7 Write property test for past date rejection
    - **Property 17: Past Date Rejection**
    - **Validates: Requirements 21.3**
    - Generate random past dates
    - Verify tender creation fails with error


- [x] 6. Implement tender distribution functionality
  - [x] 6.1 Create sendTender controller function
    - Accept array of dealership IDs
    - Filter out inactive dealerships
    - Filter out dealerships that already received tender
    - Create TenderVehicle record for each recipient
    - Update tender status to "Sent"
    - Create history records for each send
    - Create notifications for each dealership
    - Send email notifications to dealership users
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_
  
  - [x] 6.2 Create getTenderRecipients controller function
    - Get all dealerships that received the tender
    - Include quote status for each dealership
    - Include response date if quote submitted
    - _Requirements: 5.1, 5.2_
  
  - [x] 6.3 Create getAvailableDealerships controller function
    - Get all active dealerships
    - Filter out dealerships that already received tender
    - Return list for send modal
    - _Requirements: 4.1, 4.5, 4.8_
  
  - [x] 6.4 Add tender distribution routes
    - POST /api/tender/:id/send
    - GET /api/tender/:id/recipients
    - GET /api/tender/:id/available-dealerships
    - _Requirements: 4.1, 4.2, 5.1_
  
  - [ ]* 6.5 Write property test for tender distribution
    - **Property 5: Tender Distribution Creates Vehicle Records**
    - **Validates: Requirements 4.2, 4.10**
    - Send tender to N dealerships
    - Verify exactly N TenderVehicle records created
  
  - [ ]* 6.6 Write property test for dealership filtering
    - **Property 6: Dealership Filtering on Resend**
    - **Validates: Requirements 4.5, 4.8**
    - Send tender to some dealerships
    - Verify resend only shows remaining active dealerships
  
  - [ ]* 6.7 Write unit tests for email notifications
    - Test email sent to all dealership users
    - Test email content includes tender details
    - _Requirements: 4.4, 16.3_

- [x] 7. Implement tender viewing and history
  - [x] 7.1 Create getTenderHistory controller function
    - Get all history records for tender
    - Sort by created_at descending
    - Include user information for performed_by
    - _Requirements: 5.5, 17.6_
  
  - [x] 7.2 Create history tracking helper function
    - Accept tender_id, action_type, old_status, new_status, performed_by
    - Create TenderHistory record
    - Include metadata if provided
    - _Requirements: 17.1, 17.2, 17.7_
  
  - [x] 7.3 Add history tracking to all tender operations
    - Track tender creation, send, view, status changes
    - Track quote submissions, approvals, rejections
    - Track order status changes
    - _Requirements: 17.3, 17.4, 17.5, 17.6, 17.7, 17.8_
  
  - [x] 7.4 Create tender history routes
    - GET /api/tender/:id/history
    - _Requirements: 5.5_
  
  - [ ]* 7.5 Write property test for history tracking
    - **Property 13: History Record Creation**
    - **Validates: Requirements 17.1**
    - Perform random tender actions
    - Verify each action creates exactly one history record

- [ ] 8. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [x] 9. Implement dealership portal tender viewing API
  - [x] 9.1 Create dealership tender controller
    - Implement getDealershipTenders (filtered by dealership_id)
    - Implement getDealershipTender by ID
    - Filter by quote status (Open, In Progress, Submitted, etc.)
    - Include tender details and vehicle information
    - _Requirements: 8.1, 8.2, 11.1_
  
  - [x] 9.2 Create dealership quote submission controller
    - Implement submitQuote function
    - Accept vehicle details and quote price
    - Support both sent vehicle edits and alternate vehicles
    - Validate required fields
    - Update quote status to "In Progress" for draft
    - Update quote status to "Submitted" for submission
    - Create history record
    - Send notification to admin
    - Increment response count
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_
  
  - [x] 9.3 Create dealership quote withdrawal controller
    - Update quote status to "Withdrawn"
    - Create history record
    - Send notification to admin
    - _Requirements: 11.5_
  
  - [x] 9.4 Create dealership tender routes
    - GET /api/tender-dealership-auth/tenders
    - GET /api/tender-dealership-auth/tenders/:id
    - POST /api/tender-dealership-auth/tenders/:id/quote
    - POST /api/tender-dealership-auth/tenders/:id/withdraw
    - Apply protectDealership middleware
    - _Requirements: 8.1, 8.2, 9.1, 11.5_
  
  - [ ]* 9.5 Write property test for quote status transitions
    - **Property 8: Quote Status Transitions**
    - **Validates: Requirements 9.2, 9.4, 15.1, 15.6**
    - Test all valid status transitions
    - Verify invalid transitions are rejected
  
  - [ ]* 9.6 Write property test for response count increment
    - **Property 9: Response Count Increment**
    - **Validates: Requirements 9.8**
    - Submit quote and verify count increases by 1
  
  - [ ]* 9.7 Write property test for alternate vehicle type
    - **Property 10: Alternate Vehicle Type Assignment**
    - **Validates: Requirements 10.3**
    - Create alternate vehicle quote
    - Verify vehicle_type is "alternate_vehicle"

- [x] 10. Implement quote approval and order management API
  - [x] 10.1 Create approveQuote controller function
    - Update approved quote status to "Order - Approved"
    - Update tender status to "Approved"
    - Update all other quotes for tender to "Closed"
    - Create history records
    - Send notifications to all dealerships
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.9_
  
  - [x] 10.2 Create closeTender controller function
    - Update tender status to "Closed"
    - Update all quotes to "Closed"
    - Create history record
    - _Requirements: 14.5_
  
  - [x] 10.3 Create order management controller functions
    - Implement acceptOrder (dealership accepts approved quote)
    - Implement deliverOrder (dealership marks as delivered)
    - Implement abortOrder (cancel order)
    - Update statuses and create history records
    - _Requirements: 12.6, 12.7, 12.8, 12.9_
  
  - [x] 10.4 Create order routes
    - POST /api/tender/:id/approve-quote
    - POST /api/tender/:id/close
    - POST /api/tender-dealership-auth/orders/:id/accept
    - POST /api/tender-dealership-auth/orders/:id/deliver
    - POST /api/tender-dealership-auth/orders/:id/abort
    - _Requirements: 13.1, 12.6, 12.7_
  
  - [ ]* 10.5 Write property test for quote approval
    - **Property 11: Quote Approval Cancels Others**
    - **Validates: Requirements 12.3**
    - Create tender with multiple quotes
    - Approve one quote
    - Verify all others are marked "Closed"
  
  - [ ]* 10.6 Write unit tests for order management
    - Test order acceptance
    - Test order delivery
    - Test order abortion
    - Test email notifications
    - _Requirements: 12.6, 12.7, 12.8, 12.9_


- [x] 11. Implement chat functionality
  - [x] 11.1 Create or update Conversation model for tender chats
    - Add support for tender-dealership conversations
    - Store messages with sender type (admin/dealership)
    - Track read/unread status
    - _Requirements: 18.3, 18.4, 18.6_
  
  - [x] 11.2 Create tender conversation controller
    - Implement getConversation (get messages for tender-dealership pair)
    - Implement sendMessage (admin or dealership sends message)
    - Implement markAsRead (mark messages as read)
    - Send email notification on new message
    - _Requirements: 18.2, 18.4, 18.5, 18.7, 18.8, 18.9_
  
  - [x] 11.3 Create conversation routes
    - GET /api/tender-conversation/:tenderId/:dealershipId
    - POST /api/tender-conversation/:tenderId/:dealershipId
    - PATCH /api/tender-conversation/:tenderId/:dealershipId/read
    - Apply appropriate middleware for admin and dealership access
    - _Requirements: 18.1, 18.2_
  
  - [ ]* 11.4 Write unit tests for chat functionality
    - Test message sending
    - Test message retrieval
    - Test read status updates
    - Test email notifications
    - _Requirements: 18.2, 18.4, 18.5, 18.7_

- [x] 12. Implement multi-tenant data isolation
  - [x] 12.1 Add company_id validation middleware
    - Validate company_id in all requests
    - Reject requests with invalid company_id
    - Prevent cross-company data access
    - _Requirements: 19.4, 19.5_
  
  - [x] 12.2 Add automatic company_id filtering to queries
    - Ensure all queries filter by company_id
    - Add to all model find operations
    - _Requirements: 19.3, 19.6_
  
  - [x] 12.3 Add security logging for cross-company attempts
    - Log all cross-company access attempts
    - Include user info and attempted resource
    - _Requirements: 19.10_
  
  - [ ]* 12.4 Write property test for data isolation
    - **Property 14: Multi-Tenant Data Isolation**
    - **Validates: Requirements 19.1, 19.3, 19.5**
    - Create data in multiple companies
    - Verify queries only return data for authenticated company
    - Verify cross-company access is rejected
  
  - [ ]* 12.5 Write property test for role-based access
    - **Property 15: Role-Based Tender Access**
    - **Validates: Requirements 20.3**
    - Create dealership with admin and salesman users
    - Verify both can access all dealership tenders

- [ ] 13. Implement validation and error handling
  - [ ] 13.1 Add comprehensive input validation
    - Validate required fields for all models
    - Validate email formats
    - Validate date formats and ranges
    - Validate enum values
    - _Requirements: 21.1, 21.2, 21.8, 21.9_
  
  - [ ] 13.2 Add error response formatting
    - Create consistent error response structure
    - Include field-level errors
    - Include error codes
    - _Requirements: 21.1, 21.6_
  
  - [ ] 13.3 Add transaction rollback on errors
    - Wrap multi-step operations in transactions
    - Rollback on any error
    - _Requirements: 21.6_
  
  - [ ]* 13.4 Write property test for required field validation
    - **Property 16: Required Field Validation**
    - **Validates: Requirements 21.1**
    - Generate requests with missing required fields
    - Verify error messages indicate which fields are required
  
  - [ ]* 13.5 Write unit tests for validation
    - Test email validation
    - Test phone validation
    - Test duplicate detection
    - _Requirements: 21.2, 21.4, 21.5, 21.8_

- [ ] 14. Checkpoint - Ensure all backend implementation complete
  - Ensure all tests pass, ask the user if questions arise.


- [x] 15. Create frontend API service layer
  - [x] 15.1 Create tenderDealershipService with API methods
    - getTenderDealerships (with pagination and search)
    - getTenderDealership (by ID)
    - createTenderDealership
    - updateTenderDealership
    - deleteTenderDealership
    - toggleTenderDealershipStatus
    - getTenderDealershipUsers
    - _Requirements: 1.1, 1.5, 1.6, 1.7, 1.8, 1.9_
  
  - [x] 15.2 Create tenderDealershipUserService with API methods
    - getTenderDealershipUsers
    - getTenderDealershipUser
    - createTenderDealershipUser
    - updateTenderDealershipUser
    - deleteTenderDealershipUser
    - toggleTenderDealershipUserStatus
    - resetTenderDealershipUserPassword
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 2.7_
  
  - [x] 15.3 Create tenderService with API methods
    - getTenders (with pagination, search, filters)
    - getTender (by ID)
    - createTender
    - updateTender
    - deleteTender
    - toggleTenderStatus
    - sendTender
    - getTenderRecipients
    - getAvailableDealerships
    - getTenderHistory
    - approveQuote
    - closeTender
    - _Requirements: 3.1, 3.4, 3.7, 3.8, 3.9, 4.1, 4.2, 5.1, 5.5, 13.1_
  
  - [x] 15.4 Create tenderDealershipAuthService with API methods
    - login (with username, password, company_id, dealership_id)
    - getProfile
    - updateProfile
    - changePassword
    - getTenders (for dealership)
    - getTender (by ID)
    - submitQuote
    - withdrawQuote
    - getQuotesByStatus
    - getOrdersByStatus
    - acceptOrder
    - deliverOrder
    - _Requirements: 6.1, 8.1, 8.2, 9.1, 11.1, 11.5, 12.6, 12.7_
  
  - [x] 15.5 Create tenderConversationService with API methods
    - getConversation
    - sendMessage
    - markAsRead
    - _Requirements: 18.1, 18.2_

- [x] 16. Implement admin side - Tender Dealership Management page
  - [x] 16.1 Create TenderDealership.tsx page component
    - Use DataTableLayout component
    - Display dealerships in table with columns: ID, HubRecID, Name, Address, Billing Address, ABN, DP Name, Brand/Make
    - Add action buttons: Active/Inactive toggle, Edit, Delete, Settings
    - Implement pagination and search
    - _Requirements: 1.5, 1.6, 1.7, 1.8, 1.9_
  
  - [x] 16.2 Create CreateTenderDealershipModal component
    - Form fields for all dealership information
    - Address and billing address sections
    - Form validation
    - Submit to create/update dealership
    - _Requirements: 1.1, 1.4, 1.8_
  
  - [x] 16.3 Create TenderDealershipSettingsModal component
    - Display list of dealership users
    - CRUD operations for users
    - Only accessible by super admin
    - _Requirements: 1.9, 2.1, 2.4, 2.5, 2.6, 2.7_
  
  - [ ]* 16.4 Write unit tests for TenderDealership page
    - Test table rendering
    - Test action buttons
    - Test modal interactions
    - _Requirements: 1.5, 1.6, 1.7, 1.8_


- [x] 17. Implement admin side - Tender Module page
  - [x] 17.1 Create TenderModule.tsx page component
    - Use DataTableLayout component
    - Display tenders in table with columns: Tender ID, Customer Info, Vehicle Info, Status, Response Count
    - Add action buttons: Active/Inactive toggle, Edit, Delete, Send, View, History, Chat
    - Implement pagination, search, and status filters
    - Display response count in "X/Y" format
    - _Requirements: 3.4, 3.5, 3.6, 3.7, 3.8, 4.1, 5.1, 5.5, 18.1_
  
  - [x] 17.2 Create CreateTenderModal component
    - Customer information form section
    - Vehicle information using VehicleMetadataSelector
    - Tender expiry date/time picker
    - Form validation
    - Submit to create/update tender
    - _Requirements: 3.1, 3.2, 3.3, 3.9_
  
  - [x] 17.3 Create SendTenderModal component
    - Display list of available dealerships with checkboxes
    - Filter out inactive dealerships
    - Filter out dealerships that already received tender
    - Bulk select/deselect functionality
    - Confirmation before sending
    - _Requirements: 4.1, 4.2, 4.5, 4.8_
  
  - [x] 17.4 Create TenderRecipientsModal component
    - Display list of dealerships that received tender
    - Show dealership name, status, response date
    - View icon opens TenderVehicleSideModal
    - Status badges with color coding
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 17.5 Create TenderVehicleSideModal component
    - Similar to VehicleTradeSideModal.tsx
    - Read-only view of vehicle information
    - Show quote price if submitted
    - Show alternate vehicles if provided
    - Approve quote button for admin
    - _Requirements: 5.3, 5.4, 13.1, 13.2_
  
  - [x] 17.6 Create TenderHistoryModal component
    - Timeline view of all tender actions
    - Display: Action type, Timestamp, Performed by, Old/New status, Notes
    - Filter by action type and date range
    - _Requirements: 5.5, 5.6, 17.6_
  
  - [ ]* 17.7 Write unit tests for TenderModule page
    - Test table rendering with response count
    - Test action buttons
    - Test modal interactions
    - Test status filters
    - _Requirements: 3.4, 3.5, 3.6, 4.1, 5.1_

- [x] 18. Implement dealership portal layout and authentication
  - [x] 18.1 Create TenderDealershipLayout.tsx component
    - Similar to SupplierLayout.tsx
    - Navigation menu: Dashboard, Users (admin only), Tender Requests, Profile
    - Display dealership name and user info in header
    - Logout functionality
    - Role-based menu visibility
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.9_
  
  - [x] 18.2 Create TenderDealershipLogin.tsx page
    - Login form with username, password, company_id, dealership_id fields
    - Form validation
    - Submit to dealership auth endpoint
    - Store token and user info in session storage
    - Redirect to dashboard on success
    - _Requirements: 6.1, 6.2, 6.6_
  
  - [x] 18.3 Add dealership auth routes to App.tsx
    - /tender-dealership/login
    - /tender-dealership/dashboard
    - /tender-dealership/users
    - /tender-dealership/tenders
    - /tender-dealership/quotes/:status
    - /tender-dealership/orders/:status
    - /tender-dealership/profile
    - _Requirements: 7.1, 7.2_
  
  - [ ]* 18.4 Write unit tests for dealership layout
    - Test navigation menu rendering
    - Test role-based visibility
    - Test logout functionality
    - _Requirements: 7.1, 7.2, 7.3, 7.4_


- [x] 19. Implement dealership portal - Dashboard and Users pages
  - [x] 19.1 Create TenderDealershipDashboard.tsx page
    - Statistics cards: Total Tenders, Open Quotes, Submitted Quotes, Orders
    - Recent tenders list
    - Quick actions
    - _Requirements: 7.1_
  
  - [x] 19.2 Create TenderDealershipUsers.tsx page (admin only)
    - Use DataTableLayout component
    - Display users in table with columns: Username, Email, Role, Status, Actions
    - CRUD operations for users
    - Only visible to primary users and admins
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 2.7, 7.3_
  
  - [x] 19.3 Create CreateTenderDealershipUserModal component
    - Form fields for username, email, role
    - Form validation
    - Submit to create/update user
    - _Requirements: 2.1, 2.5_
  
  - [ ]* 19.4 Write unit tests for dashboard and users pages
    - Test statistics display
    - Test user table rendering
    - Test user CRUD operations
    - _Requirements: 7.1, 2.4, 2.5_

- [x] 20. Implement dealership portal - Tender Requests page
  - [x] 20.1 Create TenderRequests.tsx page
    - Use DataTableLayout component
    - Display incoming tenders in table
    - Columns: Tender ID, Customer, Vehicle, Expiry, Status, Actions
    - View action opens TenderQuoteSideModal
    - Filter by status
    - _Requirements: 8.1, 8.2, 8.9_
  
  - [x] 20.2 Create TenderQuoteSideModal component
    - Two tabs: Sent Vehicle, Alternate Vehicle
    - Sent Vehicle tab: Make/Model/Year/Variant read-only, other fields editable
    - Alternate Vehicle tab: Full VehicleMetadataSelector
    - Quote price input
    - Actions: Save as Draft, Submit
    - Form validation
    - Prevent submission after expiry
    - _Requirements: 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.10, 9.1, 9.2, 9.3, 9.9_
  
  - [ ]* 20.3 Write unit tests for tender requests page
    - Test table rendering
    - Test modal tabs
    - Test form validation
    - Test draft and submit actions
    - _Requirements: 8.1, 8.2, 8.3, 9.1, 9.2, 9.3_

- [x] 21. Implement dealership portal - Quotes and Orders pages
  - [x] 21.1 Create QuotesByStatus.tsx page
    - Tabs: Open, In Progress, Submitted, Withdrawn, Closed
    - Each tab displays quotes in that status
    - Use DataTableLayout component
    - View action opens TenderQuoteSideModal (read-only for submitted)
    - Withdraw action for submitted quotes
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.7, 11.8_
  
  - [x] 21.2 Create OrdersByStatus.tsx page
    - Tabs: Approved, Accepted, Delivered, Aborted
    - Each tab displays orders in that status
    - Use DataTableLayout component
    - Actions: Accept Order, Mark as Delivered
    - View action opens order details modal
    - _Requirements: 12.1, 12.2, 12.4, 12.5, 12.6, 12.7, 12.8_
  
  - [x] 21.3 Create OrderDetailsModal component
    - Display order information
    - Display vehicle details
    - Display customer information
    - Show order status and history
    - _Requirements: 12.1, 12.5_
  
  - [ ]* 21.4 Write unit tests for quotes and orders pages
    - Test tab rendering
    - Test status filtering
    - Test action buttons
    - _Requirements: 11.1, 11.2, 12.1, 12.2_

- [x] 22. Implement dealership portal - Profile page
  - [x] 22.1 Create TenderDealershipProfile.tsx page
    - Display user information
    - Change password form
    - Update profile information form
    - _Requirements: 7.1_
  
  - [ ]* 22.2 Write unit tests for profile page
    - Test profile display
    - Test password change
    - Test profile update
    - _Requirements: 7.1_


- [ ] 23. Implement chat functionality UI
  - [ ] 23.1 Create TenderChatModal component
    - Display conversation messages
    - Message input and send button
    - Show sender information and timestamp
    - Indicate read/unread status
    - Auto-scroll to latest message
    - _Requirements: 18.2, 18.6, 18.7, 18.9_
  
  - [ ] 23.2 Add chat icon to TenderModule.tsx
    - Enable chat icon after dealerships confirmed
    - Open TenderChatModal on click
    - Show unread message indicator
    - _Requirements: 18.1_
  
  - [ ] 23.3 Add chat functionality to dealership portal
    - Add chat icon to tender details
    - Open TenderChatModal on click
    - Show unread message indicator
    - _Requirements: 18.2, 18.8_
  
  - [ ]* 23.4 Write unit tests for chat functionality
    - Test message display
    - Test message sending
    - Test read status updates
    - _Requirements: 18.2, 18.4, 18.6, 18.7_

- [ ] 24. Implement email notification system
  - [ ] 24.1 Create email templates for all notification types
    - Dealership created template
    - User created template
    - Tender sent template
    - Quote submitted template
    - Quote approved template
    - Quote not selected template
    - Tender expiring soon template
    - Order status change template
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8_
  
  - [ ] 24.2 Integrate email sending in all relevant operations
    - Send emails on dealership creation
    - Send emails on user creation
    - Send emails on tender distribution
    - Send emails on quote submission
    - Send emails on quote approval/rejection
    - Send emails on order status changes
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_
  
  - [ ] 24.3 Add email notification preferences (optional)
    - Allow users to configure notification preferences
    - Store preferences in user model
    - Respect preferences when sending emails
    - _Requirements: 16.9_
  
  - [ ]* 24.4 Write unit tests for email notifications
    - Test email template rendering
    - Test email sending on operations
    - Test email content includes correct details
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.9_

- [ ] 25. Implement security features
  - [ ] 25.1 Add password hashing with bcrypt
    - Hash passwords on user creation
    - Hash passwords on password change
    - Verify hashed passwords on login
    - _Requirements: 23.2, 23.3_
  
  - [ ] 25.2 Add JWT token management
    - Generate tokens with appropriate expiration
    - Validate tokens on protected routes
    - Invalidate tokens on logout
    - _Requirements: 23.7, 23.8_
  
  - [ ] 25.3 Add CSRF protection
    - Implement CSRF tokens for state-changing operations
    - Validate CSRF tokens on all POST/PUT/DELETE requests
    - _Requirements: 23.6_
  
  - [ ] 25.4 Add account lockout on failed attempts
    - Track failed login attempts
    - Lock account after 5 failed attempts
    - Implement unlock mechanism
    - _Requirements: 23.3_
  
  - [ ] 25.5 Add security event logging
    - Log all authentication attempts
    - Log authorization failures
    - Log cross-company access attempts
    - _Requirements: 23.10_
  
  - [ ]* 25.6 Write property test for password hashing
    - **Property 18: Password Hashing**
    - **Validates: Requirements 23.2**
    - Generate random passwords
    - Verify stored passwords are hashed
    - Verify plain text passwords are never stored
  
  - [ ]* 25.7 Write unit tests for security features
    - Test password hashing
    - Test JWT token generation and validation
    - Test account lockout
    - Test security logging
    - _Requirements: 23.2, 23.3, 23.7, 23.8, 23.10_


- [ ] 26. Implement reporting and analytics (optional)
  - [ ] 26.1 Create tender statistics API endpoints
    - Total tenders by status
    - Response rate metrics
    - Average response time
    - Dealership performance metrics
    - _Requirements: 24.1, 24.2, 24.3, 24.4_
  
  - [ ] 26.2 Create analytics dashboard page
    - Display tender statistics
    - Display response rate charts
    - Display dealership performance
    - Date range filters
    - Export to CSV/PDF
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7, 24.8, 24.9, 24.10_
  
  - [ ]* 26.3 Write unit tests for analytics
    - Test statistics calculation
    - Test chart rendering
    - Test export functionality
    - _Requirements: 24.1, 24.2, 24.3, 24.7_

- [ ] 27. Implement audit logging
  - [ ] 27.1 Create audit log model and schema
    - Store user identity, timestamp, action type, affected records
    - Store before and after values
    - Prevent modification or deletion
    - _Requirements: 25.1, 25.2, 25.6_
  
  - [ ] 27.2 Add audit logging to all data modifications
    - Log tender CRUD operations
    - Log quote submissions and modifications
    - Log user permission changes
    - _Requirements: 25.3, 25.4, 25.5_
  
  - [ ] 27.3 Create audit log viewing interface
    - Filter by user, date range, action type
    - Export audit logs
    - _Requirements: 25.8, 25.9_
  
  - [ ]* 27.4 Write unit tests for audit logging
    - Test log creation on operations
    - Test log immutability
    - Test log filtering and export
    - _Requirements: 25.1, 25.2, 25.3, 25.6, 25.7_

- [ ] 28. Performance optimization
  - [ ] 28.1 Add database indexes for frequently queried fields
    - Index company_id on all models
    - Index status fields
    - Index created_at for sorting
    - Compound indexes for common queries
    - _Requirements: 22.6_
  
  - [ ] 28.2 Implement pagination for large datasets
    - Paginate tender lists
    - Paginate dealership lists
    - Paginate quote lists
    - _Requirements: 22.5_
  
  - [ ] 28.3 Add caching for frequently accessed data
    - Cache dealership lists
    - Cache user permissions
    - Cache metadata
    - _Requirements: 22.8_
  
  - [ ]* 28.4 Write performance tests
    - Test response times with large datasets
    - Test concurrent user access
    - Test pagination performance
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.7_

- [ ] 29. Final integration and testing
  - [ ] 29.1 End-to-end testing of complete tender workflow
    - Create dealership and users
    - Create and send tender
    - Submit quotes from dealership portal
    - Approve quote and create order
    - Complete order delivery
    - Verify all notifications sent
    - Verify all history recorded
    - _Requirements: All requirements_
  
  - [ ] 29.2 Cross-browser testing
    - Test on Chrome, Firefox, Safari, Edge
    - Test responsive design on mobile devices
    - Fix any browser-specific issues
  
  - [ ] 29.3 Security testing
    - Test authentication and authorization
    - Test data isolation between companies
    - Test input validation and sanitization
    - Test CSRF protection
    - _Requirements: 19.1, 19.3, 19.5, 23.1, 23.4, 23.5, 23.6_
  
  - [ ] 29.4 Performance testing under load
    - Test with 100 concurrent users
    - Test with large datasets (1000+ tenders)
    - Identify and fix bottlenecks
    - _Requirements: 22.7_
  
  - [ ]* 29.5 Write integration tests for critical paths
    - Test complete tender lifecycle
    - Test dealership user management
    - Test quote submission and approval
    - Test order management
    - _Requirements: All requirements_

- [ ] 30. Final checkpoint - Ensure all tests pass and system is ready
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: models → API → UI
- Multi-tenant data isolation is enforced at every layer
- Security is built in from the start, not added later
