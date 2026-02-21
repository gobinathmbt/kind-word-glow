# Design Document: Tender Module and Dealership Portal

## Overview

The Tender Module and Dealership Portal is a comprehensive system that enables company administrators to create vehicle tenders, manage dealerships, and send tenders to selected dealerships for quotes. Dealerships can respond through a dedicated portal with quotes for requested vehicles or alternate vehicles. The system uses a multi-tenant architecture where all data is stored within each company's database.

### Key Features

- Company admin tender management with CRUD operations
- Dealership management with user hierarchy
- Tender distribution to selected dealerships
- Dealership portal for quote submission
- Alternate vehicle quote capability
- Real-time status tracking and notifications
- Chat functionality between admins and dealerships
- Order management after quote approval
- Comprehensive history tracking and audit logs

### Technology Stack

**Backend:**
- Node.js with Express.js
- MongoDB with Mongoose ODM
- JWT for authentication
- Nodemailer for email notifications
- Multi-tenant database architecture

**Frontend:**
- React with TypeScript
- React Query for data fetching
- React Router for navigation
- Shadcn/UI component library
- Tailwind CSS for styling

## Architecture

### Multi-Tenant Architecture

The system uses a multi-tenant architecture where each company has its own database. All dealerships, users, tenders, and quotes are stored within the company's database.

```
Main Database
├── Company Collection
├── MasterAdmin Collection
└── User Collection (company admins)

Company Database (per company)
├── TenderDealership Collection
├── TenderDealershipUser Collection
├── Tender Collection
├── TenderVehicle Collection
├── TenderHistory Collection
├── TenderNotification Collection
└── Conversation Collection
```

### Authentication Flow

**Company Admin Authentication:**
1. User logs in with email and password
2. System validates credentials against User collection in main database
3. JWT token generated with company_id
4. Tenant context middleware connects to company database
5. All subsequent requests use company database

**Dealership User Authentication:**
1. User logs in with username, password, company_id, and dealership_id
2. System connects to company database using company_id
3. System validates credentials in TenderDealershipUser collection
4. JWT token generated with company_id, dealership_id, and user role
5. All subsequent requests use company database with dealership context

### Data Flow

**Tender Creation Flow:**
1. Company admin creates tender with customer and vehicle info
2. Tender stored in company database with status "Pending"
3. Admin selects dealerships and sends tender
4. System creates TenderVehicle records for each dealership
5. Email notifications sent to dealership users
6. Tender status updated to "Sent"
7. History records created for audit trail

**Quote Submission Flow:**
1. Dealership user views tender in portal
2. User edits vehicle details or adds alternate vehicle
3. User saves as draft (status: "In Progress") or submits
4. On submit, quote status updated to "Submitted"
5. Admin notified via email
6. Response count updated in admin view
7. History record created

**Order Creation Flow:**
1. Admin reviews submitted quotes
2. Admin approves one quote
3. Approved quote converted to order
4. All other quotes for same tender marked as "Closed"
5. Winning dealership notified
6. Other dealerships notified of rejection
7. Order appears in dealership's Orders section


## Components and Interfaces

### Backend Models

#### TenderDealership Model

```javascript
{
  tenderDealership_id: String (auto-generated from name + timestamp),
  dealership_name: String (required),
  address: {
    street: String,
    suburb: String,
    state: String
  },
  billing_address: {
    street: String,
    suburb: String,
    state: String
  },
  abn: String,
  dp_name: String,
  brand_or_make: String,
  email: String (required, unique per company),
  hubRecID: String,
  company_id: ObjectId (ref: Company, required),
  isActive: Boolean (default: true),
  created_by: ObjectId (ref: User, required),
  created_at: Date,
  updated_at: Date
}
```

**Indexes:**
- `{ company_id: 1, email: 1 }` (unique)
- `{ company_id: 1, isActive: 1 }`
- `{ tenderDealership_id: 1 }`

#### TenderDealershipUser Model

```javascript
{
  username: String (required, unique per company),
  email: String (required),
  password: String (default: "Welcome@123", hashed with bcrypt),
  tenderDealership_id: ObjectId (ref: TenderDealership, required),
  company_id: ObjectId (ref: Company, required),
  role: String (enum: ['primary_tender_dealership_user', 'tender_dealership_user', 'admin', 'salesman'], required),
  isActive: Boolean (default: true),
  created_by: ObjectId (ref: TenderDealershipUser, optional),
  created_at: Date,
  updated_at: Date
}
```

**Indexes:**
- `{ company_id: 1, username: 1 }` (unique)
- `{ company_id: 1, tenderDealership_id: 1 }`
- `{ company_id: 1, isActive: 1 }`

#### Tender Model

```javascript
{
  tender_id: String (auto-generated, format: "TND-{timestamp}-{random}"),
  customer_info: {
    name: String (required),
    email: String (required),
    phone: String,
    address: String
  },
  basic_vehicle_info: {
    make: String (required),
    model: String (required),
    year: String (required),
    variant: String,
    body_style: String,
    color: String
  },
  tender_expiry_time: Date (required),
  tender_status: String (enum: ['Pending', 'Sent', 'Quote Received', 'Approved', 'Closed'], default: 'Pending'),
  company_id: ObjectId (ref: Company, required),
  created_by: ObjectId (ref: User, required),
  isActive: Boolean (default: true),
  created_at: Date,
  updated_at: Date
}
```

**Indexes:**
- `{ company_id: 1, tender_status: 1 }`
- `{ company_id: 1, created_at: -1 }`
- `{ tender_id: 1 }` (unique)


#### TenderVehicle Model

```javascript
{
  tender_id: ObjectId (ref: Tender, required),
  tenderDealership_id: ObjectId (ref: TenderDealership, required),
  vehicle_type: String (enum: ['sent_vehicle', 'alternate_vehicle'], required),
  
  // Vehicle details
  make: String (required),
  model: String (required),
  year: String (required),
  variant: String,
  body_style: String,
  color: String,
  registration_number: String,
  vin: String,
  odometer_reading: Number,
  
  // Engine and specifications
  engine_details: {
    engine_type: String,
    engine_capacity: String,
    fuel_type: String,
    transmission: String
  },
  
  specifications: {
    doors: Number,
    seats: Number,
    drive_type: String,
    features: [String]
  },
  
  // Attachments
  attachments: [{
    url: String,
    key: String,
    type: String,
    uploaded_at: Date
  }],
  
  // Quote information
  quote_price: Number,
  quote_status: String (enum: ['Open', 'In Progress', 'Submitted', 'Withdrawn', 'Closed', 'Order - Approved', 'Accepted', 'Delivered', 'Aborted'], default: 'Open'),
  quote_notes: String,
  
  // Tracking
  created_by: ObjectId (ref: TenderDealershipUser),
  modified_by: ObjectId (ref: TenderDealershipUser),
  submitted_at: Date,
  created_at: Date,
  updated_at: Date
}
```

**Indexes:**
- `{ tender_id: 1, tenderDealership_id: 1 }`
- `{ tender_id: 1, vehicle_type: 1 }`
- `{ quote_status: 1 }`

#### TenderHistory Model

```javascript
{
  tender_id: ObjectId (ref: Tender, required),
  tenderDealership_id: ObjectId (ref: TenderDealership, optional),
  action_type: String (enum: ['created', 'sent', 'viewed', 'quote_submitted', 'quote_withdrawn', 'approved', 'rejected', 'closed', 'order_accepted', 'order_delivered', 'order_aborted'], required),
  old_status: String,
  new_status: String,
  performed_by: ObjectId (ref: User or TenderDealershipUser, required),
  performed_by_type: String (enum: ['admin', 'dealership_user'], required),
  notes: String,
  metadata: Mixed,
  created_at: Date
}
```

**Indexes:**
- `{ tender_id: 1, created_at: -1 }`
- `{ tenderDealership_id: 1, created_at: -1 }`

#### TenderNotification Model

```javascript
{
  recipient_id: ObjectId (required),
  recipient_type: String (enum: ['admin', 'dealership_user'], required),
  tender_id: ObjectId (ref: Tender, required),
  notification_type: String (enum: ['tender_sent', 'quote_submitted', 'quote_approved', 'quote_rejected', 'tender_closed', 'order_status_change'], required),
  message: String (required),
  is_read: Boolean (default: false),
  read_at: Date,
  created_at: Date
}
```

**Indexes:**
- `{ recipient_id: 1, is_read: 1, created_at: -1 }`
- `{ tender_id: 1 }`


### Backend API Endpoints

#### Tender Dealership Routes (`/api/tender-dealership`)

```
GET    /api/tender-dealership              - Get all dealerships (paginated, searchable)
GET    /api/tender-dealership/:id          - Get single dealership
POST   /api/tender-dealership              - Create new dealership
PUT    /api/tender-dealership/:id          - Update dealership
DELETE /api/tender-dealership/:id          - Delete dealership (permanent)
PATCH  /api/tender-dealership/:id/toggle   - Toggle active status
GET    /api/tender-dealership/:id/users    - Get dealership users
```

#### Tender Dealership User Routes (`/api/tender-dealership-user`)

```
GET    /api/tender-dealership-user                    - Get users for dealership
GET    /api/tender-dealership-user/:id                - Get single user
POST   /api/tender-dealership-user                    - Create new user
PUT    /api/tender-dealership-user/:id                - Update user
DELETE /api/tender-dealership-user/:id                - Delete user (permanent)
PATCH  /api/tender-dealership-user/:id/toggle         - Toggle active status
POST   /api/tender-dealership-user/reset-password/:id - Reset user password
```

#### Tender Routes (`/api/tender`)

```
GET    /api/tender                         - Get all tenders (paginated, filtered)
GET    /api/tender/:id                     - Get single tender
POST   /api/tender                         - Create new tender
PUT    /api/tender/:id                     - Update tender
DELETE /api/tender/:id                     - Delete tender (permanent)
PATCH  /api/tender/:id/toggle              - Toggle active status
POST   /api/tender/:id/send                - Send tender to dealerships
GET    /api/tender/:id/recipients          - Get dealerships that received tender
GET    /api/tender/:id/history             - Get tender history
POST   /api/tender/:id/approve-quote       - Approve a quote
POST   /api/tender/:id/close               - Close tender
```

#### Tender Dealership Auth Routes (`/api/tender-dealership-auth`)

```
POST   /api/tender-dealership-auth/login              - Dealership user login
GET    /api/tender-dealership-auth/profile            - Get user profile
PUT    /api/tender-dealership-auth/profile            - Update user profile
POST   /api/tender-dealership-auth/change-password    - Change password
GET    /api/tender-dealership-auth/tenders            - Get tenders for dealership
GET    /api/tender-dealership-auth/tenders/:id        - Get tender details
POST   /api/tender-dealership-auth/tenders/:id/quote  - Submit/update quote
POST   /api/tender-dealership-auth/tenders/:id/withdraw - Withdraw quote
GET    /api/tender-dealership-auth/quotes             - Get quotes by status
GET    /api/tender-dealership-auth/orders             - Get orders by status
POST   /api/tender-dealership-auth/orders/:id/accept  - Accept order
POST   /api/tender-dealership-auth/orders/:id/deliver - Mark order as delivered
```

#### Conversation Routes (`/api/tender-conversation`)

```
GET    /api/tender-conversation/:tenderId/:dealershipId  - Get conversation
POST   /api/tender-conversation/:tenderId/:dealershipId  - Send message
PATCH  /api/tender-conversation/:tenderId/:dealershipId/read - Mark as read
```


### Frontend Components

#### Admin Side Components

**TenderDealership.tsx** - Main dealership management page
- Uses DataTableLayout component
- Displays dealerships in table format
- Columns: ID, HubRecID, Name, Address, Billing Address, ABN, DP Name, Brand/Make
- Actions: Active/Inactive toggle, Edit, Delete, Settings
- Settings modal shows dealership users with CRUD operations
- Create/Edit modal for dealership information

**TenderModule.tsx** - Main tender management page
- Uses DataTableLayout component
- Displays tenders in table format
- Columns: Tender ID, Customer Info, Vehicle Info, Status, Response Count (X/Y format)
- Actions: Active/Inactive toggle, Edit, Delete, Send, View, History, Chat
- Create/Edit modal for tender information
- Send modal with dealership selection (checkboxes)
- View modal showing recipient dealerships with status
- History modal showing all tender actions
- Chat integration for dealership communication

**CreateTenderModal.tsx** - Modal for creating/editing tenders
- Customer information form (name, email, phone, address)
- Vehicle information using VehicleMetadataSelector
- Tender expiry date/time picker
- Form validation

**SendTenderModal.tsx** - Modal for sending tenders to dealerships
- List of active dealerships with checkboxes
- Filters out dealerships that already received the tender
- Bulk select/deselect functionality
- Confirmation before sending

**TenderRecipientsModal.tsx** - Modal showing tender recipients
- List of dealerships that received the tender
- Each dealership shows: Name, Status, Response Date
- View icon opens TenderVehicleSideModal
- Status badges with color coding

**TenderVehicleSideModal.tsx** - Side modal for viewing dealership quote
- Similar to VehicleTradeSideModal.tsx
- Read-only view of vehicle information
- Shows quote price if submitted
- Shows alternate vehicles if provided

**TenderHistoryModal.tsx** - Modal showing tender history
- Timeline view of all actions
- Shows: Action type, Timestamp, Performed by, Old/New status, Notes
- Filterable by action type and date range


#### Dealership Portal Components

**TenderDealershipLayout.tsx** - Main layout for dealership portal
- Similar to SupplierLayout.tsx
- Navigation menu: Dashboard, Users (admin only), Tender Requests, Profile
- Displays dealership name and user info in header
- Logout functionality

**TenderDealershipDashboard.tsx** - Dashboard page
- Statistics cards: Total Tenders, Open Quotes, Submitted Quotes, Orders
- Recent tenders list
- Quick actions

**TenderDealershipUsers.tsx** - User management page (admin only)
- Uses DataTableLayout component
- CRUD operations for dealership users
- Columns: Username, Email, Role, Status, Actions
- Create/Edit modal for user information

**TenderRequests.tsx** - Main tender requests page
- Uses DataTableLayout component
- Displays incoming tenders
- Columns: Tender ID, Customer, Vehicle, Expiry, Status, Actions
- View action opens TenderQuoteSideModal

**TenderQuoteSideModal.tsx** - Side modal for quote submission
- Two tabs: Sent Vehicle, Alternate Vehicle
- Sent Vehicle tab:
  - Make/Model/Year/Variant read-only
  - Other fields editable
  - Quote price input
- Alternate Vehicle tab:
  - Full VehicleMetadataSelector
  - All fields editable
  - Quote price input
- Actions: Save as Draft, Submit
- Form validation

**QuotesByStatus.tsx** - Quotes organized by status tabs
- Tabs: Open, In Progress, Submitted, Withdrawn, Closed
- Each tab shows quotes in that status
- Uses DataTableLayout component
- View action opens TenderQuoteSideModal (read-only for submitted)

**OrdersByStatus.tsx** - Orders organized by status tabs
- Tabs: Approved, Accepted, Delivered, Aborted
- Each tab shows orders in that status
- Uses DataTableLayout component
- Actions: Accept Order, Mark as Delivered
- View action opens order details modal

**TenderDealershipProfile.tsx** - User profile page
- Display user information
- Change password functionality
- Update profile information


## Data Models

### Tender Status State Machine

**Admin Side Statuses:**
```
Pending → Sent → Quote Received → Approved
                              ↓
                           Closed
```

**Dealership Side Quote Statuses:**
```
Open → In Progress → Submitted → Order - Approved → Accepted → Delivered
                  ↓                                          ↓
              Withdrawn                                   Aborted
                  ↓
              Closed
```

### Status Transition Rules

**Admin Side:**
- `Pending` → `Sent`: When tender is sent to dealerships
- `Sent` → `Quote Received`: When first quote is submitted
- `Quote Received` → `Approved`: When admin approves a quote
- `Any Status` → `Closed`: When admin closes tender

**Dealership Side:**
- `Open` → `In Progress`: When dealership saves draft
- `In Progress` → `Submitted`: When dealership submits quote
- `Submitted` → `Order - Approved`: When admin approves quote
- `Order - Approved` → `Accepted`: When dealership accepts order
- `Accepted` → `Delivered`: When dealership marks as delivered
- `Any Status` → `Withdrawn`: When dealership withdraws quote
- `Any Status` → `Closed`: When admin closes tender or approves another quote
- `Any Status` → `Aborted`: When order is cancelled

### Response Count Calculation

Response count is displayed as "X/Y" where:
- X = Number of dealerships that submitted quotes (quote_status = 'Submitted')
- Y = Total number of dealerships that received the tender

Example: "3/5" means 3 out of 5 dealerships submitted quotes

### Email Notification Templates

**Dealership Created:**
- To: Primary dealership user email
- Subject: "Welcome to [Company Name] Tender Portal"
- Content: Login credentials, portal URL, instructions

**Tender Sent:**
- To: All dealership users
- Subject: "New Tender Request: [Tender ID]"
- Content: Customer info, vehicle details, expiry time, portal link

**Quote Submitted:**
- To: Company admin
- Subject: "Quote Received for Tender [Tender ID]"
- Content: Dealership name, vehicle details, quote price, view link

**Quote Approved:**
- To: Winning dealership users
- Subject: "Your Quote Has Been Approved - [Tender ID]"
- Content: Congratulations message, order details, next steps

**Quote Not Selected:**
- To: Other dealership users
- Subject: "Tender [Tender ID] - Quote Not Selected"
- Content: Thank you message, encouragement for future tenders

**Tender Expiring Soon:**
- To: Dealerships with pending quotes
- Subject: "Reminder: Tender [Tender ID] Expires Soon"
- Content: Expiry time, current status, submit quote link


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Dealership Creation Creates Primary User

*For any* valid dealership data with an email address, creating a dealership should result in exactly one primary dealership user being created with that email address and the role "primary_tender_dealership_user".

**Validates: Requirements 1.1, 1.2**

### Property 2: Cascade Deletion of Dealership Users

*For any* dealership with associated users, deleting the dealership should result in all associated users being permanently removed from the database.

**Validates: Requirements 1.7**

### Property 3: Inactive Entities Cannot Participate

*For any* dealership or user marked as inactive (isActive = false), the system should prevent them from receiving tenders (dealerships) or logging in (users).

**Validates: Requirements 1.6, 2.6**

### Property 4: Response Count Accuracy

*For any* tender, the response count should equal the number of dealerships with submitted quotes divided by the total number of dealerships that received the tender, formatted as "X/Y".

**Validates: Requirements 3.5, 3.6**

### Property 5: Tender Distribution Creates Vehicle Records

*For any* tender sent to N dealerships, the system should create exactly N TenderVehicle records with vehicle_type "sent_vehicle", one for each recipient dealership.

**Validates: Requirements 4.2, 4.10**

### Property 6: Dealership Filtering on Resend

*For any* tender that has been previously sent to some dealerships, attempting to send it again should only display dealerships that have not yet received the tender and are active.

**Validates: Requirements 4.5, 4.8**

### Property 7: Authentication Requires Valid Credentials

*For any* dealership user login attempt, authentication should succeed if and only if the username, password, company_id, and dealership_id all match an active user record in the correct company database.

**Validates: Requirements 6.1, 6.3**

### Property 8: Quote Status Transitions

*For any* quote, the status transitions should follow the valid state machine: Open → In Progress → Submitted → Order - Approved → Accepted → Delivered, with Withdrawn and Closed as terminal states reachable from any state.

**Validates: Requirements 9.2, 9.4, 15.1, 15.6**

### Property 9: Response Count Increment

*For any* tender, when a dealership submits a quote (status changes to "Submitted"), the response count numerator (X in "X/Y") should increase by exactly 1.

**Validates: Requirements 9.8**

### Property 10: Alternate Vehicle Type Assignment

*For any* alternate vehicle quote created by a dealership, the TenderVehicle record should have vehicle_type set to "alternate_vehicle" and be associated with the correct tender_id and tenderDealership_id.

**Validates: Requirements 10.3**

### Property 11: Quote Approval Cancels Others

*For any* tender with multiple submitted quotes, when one quote is approved, all other quotes for that tender should have their status updated to "Closed".

**Validates: Requirements 12.3**

### Property 12: Tender Status State Machine

*For any* tender, the status transitions should follow the valid state machine: Pending → Sent → Quote Received → Approved, with Closed as a terminal state reachable from any state.

**Validates: Requirements 14.1, 14.2, 14.6**

### Property 13: History Record Creation

*For any* tender action (create, send, view, quote submit, approve, close), the system should create exactly one history record with the correct action_type, timestamp, and performed_by information.

**Validates: Requirements 17.1**

### Property 14: Multi-Tenant Data Isolation

*For any* authenticated user, all database queries should automatically filter by the user's company_id, and attempts to access data from a different company should be rejected.

**Validates: Requirements 19.1, 19.3, 19.5**

### Property 15: Role-Based Tender Access

*For any* salesman or admin user within a dealership, they should have access to all tenders sent to their dealership, regardless of which user created the quote.

**Validates: Requirements 20.3**

### Property 16: Required Field Validation

*For any* API request with missing required fields, the system should return a validation error response with clear messages indicating which fields are required.

**Validates: Requirements 21.1**

### Property 17: Past Date Rejection

*For any* tender creation or update with an expiry time in the past, the system should reject the operation and return an error message.

**Validates: Requirements 21.3**

### Property 18: Password Hashing

*For any* user password stored in the database, it should be hashed using bcrypt and never stored in plain text.

**Validates: Requirements 23.2**


## Error Handling

### API Error Responses

All API endpoints should return consistent error responses:

```javascript
{
  success: false,
  message: "Human-readable error message",
  errors: [
    {
      field: "field_name",
      message: "Specific field error"
    }
  ],
  code: "ERROR_CODE"
}
```

### Error Categories

**Validation Errors (400):**
- Missing required fields
- Invalid data format
- Business rule violations (e.g., past expiry date)
- Duplicate entries (email, username)

**Authentication Errors (401):**
- Invalid credentials
- Expired token
- Missing authentication token
- Inactive user account

**Authorization Errors (403):**
- Insufficient permissions
- Cross-company data access attempt
- Role-based access denial

**Not Found Errors (404):**
- Resource not found
- Invalid ID

**Conflict Errors (409):**
- Duplicate email/username
- Invalid state transition
- Concurrent modification

**Server Errors (500):**
- Database connection failures
- Email service failures
- Unexpected exceptions

### Frontend Error Handling

**Form Validation:**
- Client-side validation before submission
- Display field-level errors inline
- Prevent submission until errors resolved
- Show toast notifications for submission errors

**API Error Handling:**
- Display user-friendly error messages
- Log detailed errors to console
- Retry logic for network failures
- Fallback UI for critical failures

**Loading States:**
- Show loading indicators during API calls
- Disable form inputs during submission
- Prevent duplicate submissions
- Timeout handling for long requests


## Testing Strategy

### Dual Testing Approach

The system requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests:**
- Specific examples and edge cases
- Integration points between components
- Error conditions and validation
- UI component rendering
- API endpoint responses

**Property-Based Tests:**
- Universal properties across all inputs
- State machine transitions
- Data integrity constraints
- Business rule enforcement
- Comprehensive input coverage through randomization

Together, unit tests catch concrete bugs while property tests verify general correctness.

### Property-Based Testing Configuration

**Library Selection:**
- Backend (JavaScript): Use `fast-check` library
- Frontend (TypeScript): Use `fast-check` library

**Test Configuration:**
- Minimum 100 iterations per property test
- Each test must reference its design document property
- Tag format: `Feature: tender-module-dealership-portal, Property {number}: {property_text}`

**Example Property Test Structure:**

```javascript
// Feature: tender-module-dealership-portal, Property 1: Dealership Creation Creates Primary User
describe('Property 1: Dealership Creation Creates Primary User', () => {
  it('should create exactly one primary user for any valid dealership', async () => {
    await fc.assert(
      fc.asyncProperty(
        dealershipArbitrary(),
        async (dealershipData) => {
          const dealership = await createDealership(dealershipData);
          const users = await findUsersByDealership(dealership._id);
          const primaryUsers = users.filter(u => u.role === 'primary_tender_dealership_user');
          
          expect(primaryUsers).toHaveLength(1);
          expect(primaryUsers[0].email).toBe(dealershipData.email);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing Strategy

**Backend Unit Tests:**
- Controller function tests with mocked models
- Model validation tests
- Middleware tests (authentication, tenant context)
- Utility function tests
- Email template generation tests

**Frontend Unit Tests:**
- Component rendering tests
- Form validation tests
- User interaction tests
- API integration tests with mocked responses
- State management tests

**Integration Tests:**
- End-to-end API flows
- Database operations
- Email sending
- File uploads
- Multi-tenant data isolation

### Test Coverage Goals

- Minimum 80% code coverage for backend
- Minimum 70% code coverage for frontend
- 100% coverage of critical paths (authentication, tender creation, quote submission)
- All correctness properties implemented as property-based tests

### Testing Tools

**Backend:**
- Jest for unit and integration tests
- fast-check for property-based tests
- Supertest for API endpoint tests
- MongoDB Memory Server for test database
- Sinon for mocking

**Frontend:**
- Vitest for unit tests
- React Testing Library for component tests
- fast-check for property-based tests
- MSW (Mock Service Worker) for API mocking

### Continuous Integration

- Run all tests on every pull request
- Fail build if tests fail or coverage drops
- Run property tests with increased iterations (1000) in CI
- Generate coverage reports
- Run linting and type checking

