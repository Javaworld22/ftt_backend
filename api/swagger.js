/**
 * OpenAPI 3.0 Specification
 * FTT Backend API
 */

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'FTT Backend API',
    version: '1.0.0',
    description:
      'REST API for managing fundraising campaigns, donations, donors, seasons, agents, corporate agents, and project owners.',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1',
    },
  ],

  // ─── Reusable Schemas ─────────────────────────────────────────────────────
  components: {
    schemas: {
      // ── Pagination ──────────────────────────────────────────────────────
      Pagination: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 100 },
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          pages: { type: 'integer', example: 10 },
          hasNextPage: { type: 'boolean' },
          hasPrevPage: { type: 'boolean' },
          nextPage: { type: 'integer', nullable: true },
          prevPage: { type: 'integer', nullable: true },
        },
      },

      // ── Campaign ─────────────────────────────────────────────────────────
      Campaign: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
          name: { type: 'string', example: 'Summer Scholarship Fund' },
          description: { type: 'string', example: 'Supporting students in need' },
          goal: { type: 'number', example: 50000 },
          totalRaised: { type: 'number', example: 12500 },
          donationCount: { type: 'integer', example: 25 },
          status: {
            type: 'string',
            enum: ['draft', 'active', 'paused', 'completed', 'cancelled'],
            example: 'active',
          },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      CampaignInput: {
        type: 'object',
        required: ['name', 'goal', 'startDate', 'endDate'],
        properties: {
          name: { type: 'string', maxLength: 200, example: 'Summer Scholarship Fund' },
          description: { type: 'string', maxLength: 2000, example: 'Supporting students in need' },
          goal: { type: 'number', minimum: 0, example: 50000 },
          startDate: { type: 'string', format: 'date', example: '2024-06-01' },
          endDate: { type: 'string', format: 'date', example: '2024-08-31' },
          status: {
            type: 'string',
            enum: ['draft', 'active', 'paused', 'completed', 'cancelled'],
            default: 'draft',
          },
        },
      },

      // ── Donor ────────────────────────────────────────────────────────────
      Donor: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '507f1f77bcf86cd799439012' },
          firstName: { type: 'string', example: 'John' },
          lastName: { type: 'string', example: 'Doe' },
          email: { type: 'string', format: 'email', example: 'john.doe@example.com' },
          phone: { type: 'string', example: '+1-555-0123' },
          donorType: {
            type: 'string',
            enum: ['individual', 'organization', 'foundation'],
            example: 'individual',
          },
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              zipCode: { type: 'string' },
              country: { type: 'string', default: 'USA' },
            },
          },
          tags: { type: 'array', items: { type: 'string' }, example: ['major-donor'] },
          isActive: { type: 'boolean', example: true },
          totalDonated: { type: 'number', example: 5000 },
          donationCount: { type: 'integer', example: 10 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      DonorInput: {
        type: 'object',
        required: ['firstName', 'lastName', 'email'],
        properties: {
          firstName: { type: 'string', maxLength: 100, example: 'John' },
          lastName: { type: 'string', maxLength: 100, example: 'Doe' },
          email: { type: 'string', format: 'email', example: 'john.doe@example.com' },
          phone: { type: 'string', example: '+1-555-0123' },
          donorType: {
            type: 'string',
            enum: ['individual', 'organization', 'foundation'],
            default: 'individual',
          },
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              zipCode: { type: 'string' },
              country: { type: 'string', default: 'USA' },
            },
          },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },

      // ── Donation ─────────────────────────────────────────────────────────
      Donation: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '507f1f77bcf86cd799439013' },
          campaign: { type: 'string', example: '507f1f77bcf86cd799439011' },
          donor: { type: 'string', example: '507f1f77bcf86cd799439012' },
          season: { type: 'string', nullable: true },
          cycle: { type: 'string', nullable: true },
          amount: { type: 'number', example: 500 },
          currency: { type: 'string', default: 'USD', example: 'USD' },
          donationType: {
            type: 'string',
            enum: ['one-time', 'recurring', 'pledge'],
            example: 'one-time',
          },
          paymentMethod: {
            type: 'string',
            enum: ['credit_card', 'debit_card', 'bank_transfer', 'cash', 'check', 'paypal', 'other'],
            example: 'credit_card',
          },
          transactionId: { type: 'string', nullable: true },
          status: {
            type: 'string',
            enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
            example: 'completed',
          },
          donationDate: { type: 'string', format: 'date-time' },
          notes: { type: 'string', nullable: true },
          isAnonymous: { type: 'boolean', default: false },
          receiptSent: { type: 'boolean', default: false },
          receiptSentDate: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      DonationInput: {
        type: 'object',
        required: ['campaign', 'donor', 'amount', 'paymentMethod'],
        properties: {
          campaign: { type: 'string', example: '507f1f77bcf86cd799439011' },
          donor: { type: 'string', example: '507f1f77bcf86cd799439012' },
          season: { type: 'string', example: '507f1f77bcf86cd799439014' },
          cycle: { type: 'string', example: '507f1f77bcf86cd799439015' },
          amount: { type: 'number', minimum: 0.01, example: 500 },
          currency: { type: 'string', default: 'USD' },
          donationType: {
            type: 'string',
            enum: ['one-time', 'recurring', 'pledge'],
            default: 'one-time',
          },
          paymentMethod: {
            type: 'string',
            enum: ['credit_card', 'debit_card', 'bank_transfer', 'cash', 'check', 'paypal', 'other'],
          },
          transactionId: { type: 'string' },
          status: {
            type: 'string',
            enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
            default: 'pending',
          },
          donationDate: { type: 'string', format: 'date-time' },
          notes: { type: 'string' },
          isAnonymous: { type: 'boolean', default: false },
        },
      },

      // ── Season ───────────────────────────────────────────────────────────
      Season: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '507f1f77bcf86cd799439014' },
          name: { type: 'string', example: 'Spring Season 2024' },
          campaign: { type: 'string', example: '507f1f77bcf86cd799439011' },
          description: { type: 'string' },
          goal: { type: 'number', example: 20000 },
          totalRaised: { type: 'number', example: 8000 },
          donationCount: { type: 'integer', example: 16 },
          status: {
            type: 'string',
            enum: ['upcoming', 'active', 'completed'],
            example: 'active',
          },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      SeasonInput: {
        type: 'object',
        required: ['name', 'campaign', 'startDate', 'endDate'],
        properties: {
          name: { type: 'string', example: 'Spring Season 2024' },
          campaign: { type: 'string', example: '507f1f77bcf86cd799439011' },
          description: { type: 'string' },
          goal: { type: 'number', example: 20000 },
          status: {
            type: 'string',
            enum: ['upcoming', 'active', 'completed'],
            default: 'upcoming',
          },
          startDate: { type: 'string', format: 'date', example: '2024-03-01' },
          endDate: { type: 'string', format: 'date', example: '2024-05-31' },
        },
      },

      // ── Project ───────────────────────────────────────────────────────────
      Project: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '507f1f77bcf86cd799439030' },
          title: { type: 'string', example: 'Build a School in Rural Kogi' },
          category: {
            type: 'string',
            enum: ['education', 'health', 'environment', 'humanitarian', 'community', 'religion', 'arts', 'technology', 'sports', 'other'],
            example: 'education',
          },
          description: { type: 'string', example: 'We aim to build a primary school for 500 children in rural Kogi State.' },
          goal: { type: 'number', example: 5000000 },
          totalRaised: { type: 'number', example: 1200000 },
          donationCount: { type: 'integer', example: 24 },
          progressPercent: { type: 'number', example: 24.0 },
          status: { type: 'string', enum: ['draft', 'active', 'completed', 'cancelled'], example: 'active' },
          createdBy: { type: 'string', example: '507f1f77bcf86cd799439022', nullable: true },
          createdByModel: { type: 'string', enum: ['ProjectOwner', 'Agent', 'CorporateAgent'], nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      ProjectInput: {
        type: 'object',
        required: ['title', 'category', 'description', 'goal'],
        properties: {
          title: { type: 'string', maxLength: 200, example: 'Build a School in Rural Kogi' },
          category: {
            type: 'string',
            enum: ['education', 'health', 'environment', 'humanitarian', 'community', 'religion', 'arts', 'technology', 'sports', 'other'],
            example: 'education',
          },
          description: { type: 'string', maxLength: 3000, example: 'We aim to build a primary school for 500 children in rural Kogi State.' },
          goal: { type: 'number', minimum: 1, example: 5000000 },
          status: { type: 'string', enum: ['draft', 'active', 'completed', 'cancelled'], default: 'draft' },
          createdBy: { type: 'string', example: '507f1f77bcf86cd799439022' },
          createdByModel: { type: 'string', enum: ['ProjectOwner', 'Agent', 'CorporateAgent'], example: 'ProjectOwner' },
        },
      },

      // ── Login ─────────────────────────────────────────────────────────────
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', example: 'Secret123' },
        },
      },

      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Login successful' },
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          data: { type: 'object', description: 'Authenticated user data (password excluded)' },
        },
      },

      // ── Agent ────────────────────────────────────────────────────────────
      Agent: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '507f1f77bcf86cd799439020' },
          name: { type: 'string', example: 'Emeka Okafor' },
          email: { type: 'string', format: 'email', example: 'emeka@example.com' },
          phone: { type: 'string', example: '+2348012345678' },
          houseAddress: { type: 'string', example: '12 Adeola Odeku St, Victoria Island' },
          officeAddress: { type: 'string', example: '5 Broad Street, Lagos Island' },
          cac: { type: 'string', example: 'RC1234567' },
          nin: { type: 'string', example: '12345678901' },
          isActive: { type: 'boolean', example: true },
          isVerified: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      AgentRegisterInput: {
        type: 'object',
        required: ['name', 'email', 'password', 'confirmPassword', 'phone', 'houseAddress', 'officeAddress', 'cac', 'nin'],
        properties: {
          name: { type: 'string', example: 'Emeka Okafor' },
          email: { type: 'string', format: 'email', example: 'emeka@example.com' },
          password: { type: 'string', minLength: 8, example: 'Secret123' },
          confirmPassword: { type: 'string', example: 'Secret123' },
          phone: { type: 'string', example: '+2348012345678' },
          houseAddress: { type: 'string', example: '12 Adeola Odeku St, Victoria Island' },
          officeAddress: { type: 'string', example: '5 Broad Street, Lagos Island' },
          cac: { type: 'string', example: 'RC1234567' },
          nin: { type: 'string', example: '12345678901', description: 'Must be exactly 11 digits' },
        },
      },

      // ── Corporate Agent ───────────────────────────────────────────────────
      CorporateAgent: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '507f1f77bcf86cd799439021' },
          name: { type: 'string', example: 'Zenith Logistics Ltd' },
          email: { type: 'string', format: 'email', example: 'info@zenithlogistics.com' },
          phone: { type: 'string', example: '+2349012345678' },
          houseAddress: { type: 'string', example: '7 Marina Road, Lagos' },
          officeAddress: { type: 'string', example: '22 Commerce Drive, Apapa' },
          cac: { type: 'string', example: 'RC9876543' },
          nin: { type: 'string', example: '98765432101' },
          isActive: { type: 'boolean', example: true },
          isVerified: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      CorporateAgentRegisterInput: {
        type: 'object',
        required: ['name', 'email', 'password', 'confirmPassword', 'phone', 'houseAddress', 'officeAddress', 'cac', 'nin'],
        properties: {
          name: { type: 'string', example: 'Zenith Logistics Ltd' },
          email: { type: 'string', format: 'email', example: 'info@zenithlogistics.com' },
          password: { type: 'string', minLength: 8, example: 'Corporate123' },
          confirmPassword: { type: 'string', example: 'Corporate123' },
          phone: { type: 'string', example: '+2349012345678' },
          houseAddress: { type: 'string', example: '7 Marina Road, Lagos' },
          officeAddress: { type: 'string', example: '22 Commerce Drive, Apapa' },
          cac: { type: 'string', example: 'RC9876543' },
          nin: { type: 'string', example: '98765432101', description: 'NIN of authorised representative, must be exactly 11 digits' },
        },
      },

      // ── Project Owner ─────────────────────────────────────────────────────
      ProjectOwner: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '507f1f77bcf86cd799439022' },
          name: { type: 'string', example: 'Amaka Chukwu' },
          email: { type: 'string', format: 'email', example: 'amaka@ngofund.org' },
          phone: { type: 'string', example: '+2347012345678' },
          organization: { type: 'string', example: 'NGO Fund Initiative' },
          nin: { type: 'string', example: '11223344556' },
          isActive: { type: 'boolean', example: true },
          isVerified: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      ProjectOwnerRegisterInput: {
        type: 'object',
        required: ['name', 'email', 'password', 'confirmPassword', 'phone', 'organization', 'nin'],
        properties: {
          name: { type: 'string', example: 'Amaka Chukwu' },
          email: { type: 'string', format: 'email', example: 'amaka@ngofund.org' },
          password: { type: 'string', minLength: 8, example: 'Secure456' },
          confirmPassword: { type: 'string', example: 'Secure456' },
          phone: { type: 'string', example: '+2347012345678' },
          organization: { type: 'string', example: 'NGO Fund Initiative' },
          nin: { type: 'string', example: '11223344556', description: 'Must be exactly 11 digits' },
        },
      },

      // ── Error ─────────────────────────────────────────────────────────────
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Resource not found' },
          message: { type: 'string' },
        },
      },
    },

    // ── Reusable Parameters ──────────────────────────────────────────────────
    parameters: {
      idParam: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', example: '507f1f77bcf86cd799439011' },
        description: 'MongoDB ObjectId',
      },
      pageParam: {
        name: 'page',
        in: 'query',
        schema: { type: 'integer', default: 1, minimum: 1 },
        description: 'Page number',
      },
      limitParam: {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 },
        description: 'Items per page (max 100)',
      },
      sortParam: {
        name: 'sort',
        in: 'query',
        schema: { type: 'string', example: '-createdAt' },
        description: "Sort field. Prefix with '-' for descending order.",
      },
    },
  },

  // ─── Tags ─────────────────────────────────────────────────────────────────
  tags: [
    { name: 'Campaigns', description: 'Fundraising campaign management' },
    { name: 'Donations', description: 'Donation management and processing' },
    { name: 'Donors', description: 'Donor management and analytics' },
    { name: 'Seasons', description: 'Campaign season management' },
    { name: 'Projects', description: 'Project / campaign creation and management' },
    { name: 'Agents', description: 'Individual agent registration and management' },
    { name: 'Corporate Agents', description: 'Corporate agent registration and management' },
    { name: 'Project Owners', description: 'Project owner registration and management' },
  ],

  // ─── Paths ────────────────────────────────────────────────────────────────
  paths: {

    // ═══════════════════════════════════════════════════════════════════════
    // CAMPAIGNS
    // ═══════════════════════════════════════════════════════════════════════

    '/campaigns': {
      get: {
        tags: ['Campaigns'],
        summary: 'Get all campaigns',
        description: 'Retrieve a paginated list of campaigns with optional filters.',
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['draft', 'active', 'paused', 'completed', 'cancelled'] },
          },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Full-text search' },
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          { $ref: '#/components/parameters/sortParam' },
          { name: 'minGoal', in: 'query', schema: { type: 'number' } },
          { name: 'maxGoal', in: 'query', schema: { type: 'number' } },
          { name: 'startDateFrom', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'startDateTo', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: {
            description: 'List of campaigns',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Campaign' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      post: {
        tags: ['Campaigns'],
        summary: 'Create a campaign',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CampaignInput' } } },
        },
        responses: {
          201: {
            description: 'Campaign created',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Campaign' } } } } },
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Campaign name already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/campaigns/{id}': {
      get: {
        tags: ['Campaigns'],
        summary: 'Get a campaign by ID',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'Campaign details', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Campaign' } } } } } },
          400: { description: 'Invalid ID format' },
          404: { description: 'Campaign not found' },
          500: { description: 'Server error' },
        },
      },
      put: {
        tags: ['Campaigns'],
        summary: 'Update a campaign',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CampaignInput' } } },
        },
        responses: {
          200: { description: 'Campaign updated', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Campaign' } } } } } },
          400: { description: 'Validation error or invalid ID' },
          404: { description: 'Campaign not found' },
          500: { description: 'Server error' },
        },
      },
      delete: {
        tags: ['Campaigns'],
        summary: 'Delete a campaign',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'Campaign deleted' },
          400: { description: 'Invalid ID format' },
          404: { description: 'Campaign not found' },
          409: { description: 'Campaign has existing donations and cannot be deleted' },
          500: { description: 'Server error' },
        },
      },
    },

    '/campaigns/{id}/stats': {
      get: {
        tags: ['Campaigns'],
        summary: 'Get campaign statistics',
        description: 'Comprehensive analytics: progress, timeline, donor analytics, payment breakdown.',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'Campaign statistics' },
          404: { description: 'Campaign not found' },
          500: { description: 'Server error' },
        },
      },
    },

    '/campaigns/{id}/donations': {
      get: {
        tags: ['Campaigns'],
        summary: 'Get donations for a campaign',
        parameters: [
          { $ref: '#/components/parameters/idParam' },
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          { $ref: '#/components/parameters/sortParam' },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'] },
          },
        ],
        responses: {
          200: { description: 'List of donations for the campaign' },
          404: { description: 'Campaign not found' },
          500: { description: 'Server error' },
        },
      },
    },

    '/campaigns/{id}/top-donors': {
      get: {
        tags: ['Campaigns'],
        summary: 'Get top donors for a campaign',
        parameters: [
          { $ref: '#/components/parameters/idParam' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 }, description: 'Number of top donors to return' },
        ],
        responses: {
          200: { description: 'Top donors ranked by total contribution' },
          404: { description: 'Campaign not found' },
          500: { description: 'Server error' },
        },
      },
    },

    '/campaigns/{id}/status': {
      patch: {
        tags: ['Campaigns'],
        summary: 'Update campaign status',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['draft', 'active', 'paused', 'completed', 'cancelled'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Status updated' },
          400: { description: 'Invalid status' },
          404: { description: 'Campaign not found' },
          500: { description: 'Server error' },
        },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // DONATIONS
    // ═══════════════════════════════════════════════════════════════════════

    '/donations/analytics': {
      get: {
        tags: ['Donations'],
        summary: 'Get donation analytics',
        description: 'Comprehensive analytics: summary, breakdown by payment method, type, month, day of week, amount range, top campaigns and donors.',
        parameters: [
          { name: 'campaign', in: 'query', schema: { type: 'string' }, description: 'Filter by campaign ID' },
          { name: 'donor', in: 'query', schema: { type: 'string' }, description: 'Filter by donor ID' },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'], default: 'completed' },
          },
        ],
        responses: {
          200: { description: 'Donation analytics data' },
          500: { description: 'Server error' },
        },
      },
    },

    '/donations': {
      get: {
        tags: ['Donations'],
        summary: 'Get all donations',
        parameters: [
          { name: 'campaign', in: 'query', schema: { type: 'string' } },
          { name: 'donor', in: 'query', schema: { type: 'string' } },
          { name: 'season', in: 'query', schema: { type: 'string' } },
          { name: 'cycle', in: 'query', schema: { type: 'string' } },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'] },
          },
          { name: 'donationType', in: 'query', schema: { type: 'string', enum: ['one-time', 'recurring', 'pledge'] } },
          { name: 'paymentMethod', in: 'query', schema: { type: 'string', enum: ['credit_card', 'debit_card', 'bank_transfer', 'cash', 'check', 'paypal', 'other'] } },
          { name: 'minAmount', in: 'query', schema: { type: 'number' } },
          { name: 'maxAmount', in: 'query', schema: { type: 'number' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'isAnonymous', in: 'query', schema: { type: 'boolean' } },
          { name: 'receiptSent', in: 'query', schema: { type: 'boolean' } },
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          { $ref: '#/components/parameters/sortParam' },
        ],
        responses: {
          200: {
            description: 'List of donations',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Donation' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          500: { description: 'Server error' },
        },
      },
      post: {
        tags: ['Donations'],
        summary: 'Create a donation',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DonationInput' } } },
        },
        responses: {
          201: { description: 'Donation created' },
          400: { description: 'Validation error or business rule violation' },
          404: { description: 'Campaign or Donor not found' },
          409: { description: 'Season/Cycle does not belong to campaign' },
          500: { description: 'Server error' },
        },
      },
    },

    '/donations/{id}': {
      get: {
        tags: ['Donations'],
        summary: 'Get a donation by ID',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'Donation details with analysis', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Donation' } } } } } },
          400: { description: 'Invalid ID format' },
          404: { description: 'Donation not found' },
          500: { description: 'Server error' },
        },
      },
      put: {
        tags: ['Donations'],
        summary: 'Update a donation',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DonationInput' } } },
        },
        responses: {
          200: { description: 'Donation updated' },
          400: { description: 'Validation error' },
          404: { description: 'Donation not found' },
          500: { description: 'Server error' },
        },
      },
      delete: {
        tags: ['Donations'],
        summary: 'Delete a donation',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'Donation deleted' },
          400: { description: 'Invalid ID format' },
          404: { description: 'Donation not found' },
          500: { description: 'Server error' },
        },
      },
    },

    '/donations/{id}/process': {
      patch: {
        tags: ['Donations'],
        summary: 'Process a donation',
        description: 'Mark a pending donation as completed and trigger total updates across campaign and donor.',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  transactionId: { type: 'string', example: 'txn_12345' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Donation processed successfully' },
          400: { description: 'Already processed, cancelled, or refunded' },
          404: { description: 'Donation not found' },
          500: { description: 'Server error' },
        },
      },
    },

    '/donations/{id}/receipt': {
      patch: {
        tags: ['Donations'],
        summary: 'Mark receipt as sent',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'Receipt marked as sent' },
          404: { description: 'Donation not found' },
          500: { description: 'Server error' },
        },
      },
    },

    '/donations/{id}/refund': {
      patch: {
        tags: ['Donations'],
        summary: 'Refund a donation',
        description: 'Only completed donations can be refunded.',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  reason: { type: 'string', example: 'Donor requested refund' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Donation refunded' },
          400: { description: 'Donation is not in completed status' },
          404: { description: 'Donation not found' },
          500: { description: 'Server error' },
        },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // DONORS
    // ═══════════════════════════════════════════════════════════════════════

    '/donors/segments': {
      get: {
        tags: ['Donors'],
        summary: 'Get donor segments (RFM analysis)',
        description: 'Classify active donors into segments: champions, loyalists, potentialLoyalists, recentDonors, promising, needsAttention, atRisk, hibernating, lost.',
        responses: {
          200: { description: 'Donor segments' },
          500: { description: 'Server error' },
        },
      },
    },

    '/donors/retention': {
      get: {
        tags: ['Donors'],
        summary: 'Get donor retention analytics',
        parameters: [
          { name: 'year', in: 'query', schema: { type: 'integer', example: 2024 }, description: 'Target year (defaults to current year)' },
        ],
        responses: {
          200: { description: 'Retention metrics: total donors, retained, lost, new, retention rate' },
          500: { description: 'Server error' },
        },
      },
    },

    '/donors/merge': {
      post: {
        tags: ['Donors'],
        summary: 'Merge duplicate donors',
        description: 'Transfer all donations from the duplicate donor to the primary donor and deactivate the duplicate.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['primaryDonorId', 'duplicateDonorId'],
                properties: {
                  primaryDonorId: { type: 'string', example: '507f1f77bcf86cd799439011' },
                  duplicateDonorId: { type: 'string', example: '507f1f77bcf86cd799439012' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Donors merged successfully' },
          400: { description: 'Missing IDs or same ID provided for both' },
          404: { description: 'One or both donors not found' },
          500: { description: 'Server error' },
        },
      },
    },

    '/donors': {
      get: {
        tags: ['Donors'],
        summary: 'Get all donors',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Full-text search on firstName, lastName, email' },
          { name: 'donorType', in: 'query', schema: { type: 'string', enum: ['individual', 'organization', 'foundation'] } },
          { name: 'isActive', in: 'query', schema: { type: 'string', enum: ['true', 'false', 'all'], default: 'true' } },
          { name: 'minDonated', in: 'query', schema: { type: 'number' } },
          { name: 'maxDonated', in: 'query', schema: { type: 'number' } },
          { name: 'minDonations', in: 'query', schema: { type: 'integer' } },
          { name: 'tags', in: 'query', schema: { type: 'string' }, description: 'Comma-separated tags to filter' },
          { name: 'city', in: 'query', schema: { type: 'string' } },
          { name: 'state', in: 'query', schema: { type: 'string' } },
          { name: 'country', in: 'query', schema: { type: 'string' } },
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          { $ref: '#/components/parameters/sortParam' },
        ],
        responses: {
          200: {
            description: 'List of donors',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Donor' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          500: { description: 'Server error' },
        },
      },
      post: {
        tags: ['Donors'],
        summary: 'Create a donor',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DonorInput' } } },
        },
        responses: {
          201: { description: 'Donor created' },
          400: { description: 'Validation error' },
          409: { description: 'Donor with this email already exists' },
          500: { description: 'Server error' },
        },
      },
    },

    '/donors/{id}': {
      get: {
        tags: ['Donors'],
        summary: 'Get a donor by ID',
        description: 'Returns donor details with engagement metrics, classification, and recent donations.',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'Donor details', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Donor' } } } } } },
          400: { description: 'Invalid ID format' },
          404: { description: 'Donor not found' },
          500: { description: 'Server error' },
        },
      },
      put: {
        tags: ['Donors'],
        summary: 'Update a donor',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DonorInput' } } },
        },
        responses: {
          200: { description: 'Donor updated' },
          400: { description: 'Validation error or protected field update attempt' },
          404: { description: 'Donor not found' },
          409: { description: 'Email already in use by another donor' },
          500: { description: 'Server error' },
        },
      },
      delete: {
        tags: ['Donors'],
        summary: 'Deactivate a donor (soft delete)',
        description: 'Sets isActive to false. Donor data and donation history are preserved.',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'Donor deactivated' },
          400: { description: 'Invalid ID or donor already deactivated' },
          404: { description: 'Donor not found' },
          500: { description: 'Server error' },
        },
      },
    },

    '/donors/{id}/history': {
      get: {
        tags: ['Donors'],
        summary: 'Get donation history for a donor',
        parameters: [
          { $ref: '#/components/parameters/idParam' },
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          { $ref: '#/components/parameters/sortParam' },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'campaign', in: 'query', schema: { type: 'string' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: { description: 'Donor history with full analytics' },
          404: { description: 'Donor not found' },
          500: { description: 'Server error' },
        },
      },
    },

    '/donors/{id}/communications': {
      get: {
        tags: ['Donors'],
        summary: 'Get donor communication info',
        description: 'Returns receipts sent count, pending thank-yous, and recommendations.',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'Communication details' },
          404: { description: 'Donor not found' },
          500: { description: 'Server error' },
        },
      },
    },

    '/donors/{id}/reactivate': {
      patch: {
        tags: ['Donors'],
        summary: 'Reactivate a deactivated donor',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'Donor reactivated' },
          400: { description: 'Donor is already active' },
          404: { description: 'Donor not found' },
          500: { description: 'Server error' },
        },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SEASONS
    // ═══════════════════════════════════════════════════════════════════════

    '/seasons/compare': {
      get: {
        tags: ['Seasons'],
        summary: 'Compare seasons',
        description: 'Compare 2–10 seasons by IDs, or all seasons within a campaign.',
        parameters: [
          { name: 'ids', in: 'query', schema: { type: 'string' }, description: 'Comma-separated season IDs (2–10)' },
          { name: 'campaign', in: 'query', schema: { type: 'string' }, description: 'Campaign ID to compare all its seasons' },
        ],
        responses: {
          200: { description: 'Season comparison with summary' },
          400: { description: 'Missing or invalid parameters' },
          404: { description: 'No seasons found' },
          500: { description: 'Server error' },
        },
      },
    },

    '/seasons': {
      get: {
        tags: ['Seasons'],
        summary: 'Get all seasons',
        parameters: [
          { name: 'campaign', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['upcoming', 'active', 'completed'] } },
          { name: 'active', in: 'query', schema: { type: 'boolean' }, description: 'Show only currently running seasons' },
          { name: 'minGoal', in: 'query', schema: { type: 'number' } },
          { name: 'maxGoal', in: 'query', schema: { type: 'number' } },
          { name: 'startDateFrom', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'startDateTo', in: 'query', schema: { type: 'string', format: 'date' } },
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          { $ref: '#/components/parameters/sortParam' },
        ],
        responses: {
          200: {
            description: 'List of seasons',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Season' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          500: { description: 'Server error' },
        },
      },
      post: {
        tags: ['Seasons'],
        summary: 'Create a season',
        description: 'Season dates must fall within the parent campaign dates.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SeasonInput' } } },
        },
        responses: {
          201: { description: 'Season created' },
          400: { description: 'Validation error or dates outside campaign range' },
          404: { description: 'Campaign not found' },
          500: { description: 'Server error' },
        },
      },
    },

    '/seasons/{id}': {
      get: {
        tags: ['Seasons'],
        summary: 'Get a season by ID',
        description: 'Returns season details with timeline analysis, progress, performance metrics, and recent activity.',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'Season details', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Season' } } } } } },
          400: { description: 'Invalid ID format' },
          404: { description: 'Season not found' },
          500: { description: 'Server error' },
        },
      },
      put: {
        tags: ['Seasons'],
        summary: 'Update a season',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SeasonInput' } } },
        },
        responses: {
          200: { description: 'Season updated' },
          400: { description: 'Validation error or dates outside campaign range' },
          404: { description: 'Season or campaign not found' },
          500: { description: 'Server error' },
        },
      },
      delete: {
        tags: ['Seasons'],
        summary: 'Delete a season',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'Season deleted (associated donations are preserved)' },
          400: { description: 'Invalid ID format' },
          404: { description: 'Season not found' },
          500: { description: 'Server error' },
        },
      },
    },

    '/seasons/{id}/stats': {
      get: {
        tags: ['Seasons'],
        summary: 'Get season statistics',
        description: 'Comprehensive analytics: progress, timeline, donation stats, donor analytics, payment breakdown, daily trend.',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'Season statistics' },
          400: { description: 'Invalid ID format' },
          404: { description: 'Season not found' },
          500: { description: 'Server error' },
        },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // PROJECTS
    // ═══════════════════════════════════════════════════════════════════════

    '/projects': {
      get: {
        tags: ['Projects'],
        summary: 'Get all projects',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Full-text search on title, description, category' },
          { name: 'category', in: 'query', schema: { type: 'string', enum: ['education', 'health', 'environment', 'humanitarian', 'community', 'religion', 'arts', 'technology', 'sports', 'other'] } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'active', 'completed', 'cancelled'] } },
          { name: 'createdBy', in: 'query', schema: { type: 'string' }, description: 'Filter by creator ID' },
          { name: 'minGoal', in: 'query', schema: { type: 'number' } },
          { name: 'maxGoal', in: 'query', schema: { type: 'number' } },
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          { $ref: '#/components/parameters/sortParam' },
        ],
        responses: {
          200: {
            description: 'List of projects',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Project' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          500: { description: 'Server error' },
        },
      },
      post: {
        tags: ['Projects'],
        summary: 'Create a new project',
        description: 'Creates a fundraising project with title, category, description, and goal.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectInput' } } },
        },
        responses: {
          201: {
            description: 'Project created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Project created successfully' },
                    data: { $ref: '#/components/schemas/Project' },
                  },
                },
              },
            },
          },
          400: { description: 'Missing required fields, invalid category, or invalid goal' },
          500: { description: 'Server error' },
        },
      },
    },

    '/projects/{id}': {
      get: {
        tags: ['Projects'],
        summary: 'Get a project by ID',
        description: 'Returns project details including progressPercent, amountRemaining, and isGoalReached.',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: {
            description: 'Project details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Project' },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid ID format' },
          404: { description: 'Project not found' },
          500: { description: 'Server error' },
        },
      },
      put: {
        tags: ['Projects'],
        summary: 'Update a project',
        description: 'Updates any editable field. Calculated fields (totalRaised, donationCount) cannot be set manually.',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectInput' } } },
        },
        responses: {
          200: { description: 'Project updated successfully' },
          400: { description: 'Invalid ID, invalid category, invalid goal, or protected field update attempt' },
          404: { description: 'Project not found' },
          500: { description: 'Server error' },
        },
      },
      delete: {
        tags: ['Projects'],
        summary: 'Delete a project',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'Project deleted successfully' },
          400: { description: 'Invalid ID format' },
          404: { description: 'Project not found' },
          500: { description: 'Server error' },
        },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // AGENTS
    // ═══════════════════════════════════════════════════════════════════════

    '/agents/login': {
      post: {
        tags: ['Agents'],
        summary: 'Agent login',
        description: 'Authenticate with email and password. Returns a JWT valid for 7 days.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } },
          },
          400: { description: 'Email or password missing' },
          401: { description: 'Invalid email or password' },
          403: { description: 'Account is deactivated' },
          500: { description: 'Server error' },
        },
      },
    },

    '/agents/register': {
      post: {
        tags: ['Agents'],
        summary: 'Register a new agent',
        description: 'Creates a new individual agent account. Password is hashed before storage. Duplicate email, CAC, and NIN are rejected.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentRegisterInput' } } },
        },
        responses: {
          201: {
            description: 'Agent registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Agent registered successfully' },
                    data: { $ref: '#/components/schemas/Agent' },
                  },
                },
              },
            },
          },
          400: { description: 'Missing fields, password mismatch, invalid NIN or phone format' },
          409: { description: 'Email, CAC, or NIN already registered' },
          500: { description: 'Server error' },
        },
      },
    },

    '/agents': {
      get: {
        tags: ['Agents'],
        summary: 'Get all agents',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by name, email, phone, or CAC' },
          { name: 'isActive', in: 'query', schema: { type: 'string', enum: ['true', 'false', 'all'] } },
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
        ],
        responses: {
          200: {
            description: 'List of agents',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Agent' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          500: { description: 'Server error' },
        },
      },
    },

    '/agents/{id}': {
      get: {
        tags: ['Agents'],
        summary: 'Get an agent by ID',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'Agent details', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Agent' } } } } } },
          400: { description: 'Invalid ID format' },
          404: { description: 'Agent not found' },
          500: { description: 'Server error' },
        },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // CORPORATE AGENTS
    // ═══════════════════════════════════════════════════════════════════════

    '/corporate-agents/login': {
      post: {
        tags: ['Corporate Agents'],
        summary: 'Corporate agent login',
        description: 'Authenticate with email and password. Returns a JWT valid for 7 days.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } },
          },
          400: { description: 'Email or password missing' },
          401: { description: 'Invalid email or password' },
          403: { description: 'Account is deactivated' },
          500: { description: 'Server error' },
        },
      },
    },

    '/corporate-agents/register': {
      post: {
        tags: ['Corporate Agents'],
        summary: 'Register a new corporate agent',
        description: 'Creates a new corporate agent account. Password is hashed before storage. Duplicate email, CAC, and NIN are rejected.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CorporateAgentRegisterInput' } } },
        },
        responses: {
          201: {
            description: 'Corporate agent registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Corporate agent registered successfully' },
                    data: { $ref: '#/components/schemas/CorporateAgent' },
                  },
                },
              },
            },
          },
          400: { description: 'Missing fields, password mismatch, invalid NIN or phone format' },
          409: { description: 'Email, CAC, or NIN already registered' },
          500: { description: 'Server error' },
        },
      },
    },

    '/corporate-agents': {
      get: {
        tags: ['Corporate Agents'],
        summary: 'Get all corporate agents',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by name, email, phone, or CAC' },
          { name: 'isActive', in: 'query', schema: { type: 'string', enum: ['true', 'false', 'all'] } },
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
        ],
        responses: {
          200: {
            description: 'List of corporate agents',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/CorporateAgent' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          500: { description: 'Server error' },
        },
      },
    },

    '/corporate-agents/{id}': {
      get: {
        tags: ['Corporate Agents'],
        summary: 'Get a corporate agent by ID',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'Corporate agent details', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/CorporateAgent' } } } } } },
          400: { description: 'Invalid ID format' },
          404: { description: 'Corporate agent not found' },
          500: { description: 'Server error' },
        },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // PROJECT OWNERS
    // ═══════════════════════════════════════════════════════════════════════

    '/project-owners/login': {
      post: {
        tags: ['Project Owners'],
        summary: 'Project owner login',
        description: 'Authenticate with email and password. Returns a JWT valid for 7 days.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } },
          },
          400: { description: 'Email or password missing' },
          401: { description: 'Invalid email or password' },
          403: { description: 'Account is deactivated' },
          500: { description: 'Server error' },
        },
      },
    },

    '/project-owners/register': {
      post: {
        tags: ['Project Owners'],
        summary: 'Register a new project owner',
        description: 'Creates a new project owner account. Password is hashed before storage. Duplicate email and NIN are rejected.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectOwnerRegisterInput' } } },
        },
        responses: {
          201: {
            description: 'Project owner registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Project owner registered successfully' },
                    data: { $ref: '#/components/schemas/ProjectOwner' },
                  },
                },
              },
            },
          },
          400: { description: 'Missing fields, password mismatch, invalid NIN or phone format' },
          409: { description: 'Email or NIN already registered' },
          500: { description: 'Server error' },
        },
      },
    },

    '/project-owners': {
      get: {
        tags: ['Project Owners'],
        summary: 'Get all project owners',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by name, email, phone, or organization' },
          { name: 'isActive', in: 'query', schema: { type: 'string', enum: ['true', 'false', 'all'] } },
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
        ],
        responses: {
          200: {
            description: 'List of project owners',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/ProjectOwner' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          500: { description: 'Server error' },
        },
      },
    },

    '/project-owners/{id}': {
      get: {
        tags: ['Project Owners'],
        summary: 'Get a project owner by ID',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'Project owner details', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/ProjectOwner' } } } } } },
          400: { description: 'Invalid ID format' },
          404: { description: 'Project owner not found' },
          500: { description: 'Server error' },
        },
      },
    },
  },
};

module.exports = swaggerDefinition;
