
// @desc    Get API documentation
// @route   GET /api/docs
// @access  Private
const getApiDocs = async (req, res) => {
  try {
    const documentation = {
      title: 'Auto Erp API Documentation',
      version: '1.0.0',
      description: 'Comprehensive API documentation for the Auto Erp platform',
      base_url: process.env.API_BASE_URL || 'http://localhost:5000/api',
      
      authentication: {
        type: 'Bearer Token',
        description: 'Include JWT token in Authorization header',
        example: 'Authorization: Bearer <your-jwt-token>'
      },
      
      roles: {
        master_admin: 'Full system access - manages companies and plans',
        company_super_admin: 'Company-wide access - manages users and configurations',
        company_admin: 'Limited access - performs inspections and trade-ins'
      },
      
      endpoints: {
        auth: {
          login: 'POST /auth/login',
          register_company: 'POST /auth/register-company',
          me: 'GET /auth/me'
        },
        master_admin: {
          dashboard: 'GET /master/dashboard',
          companies: 'GET /master/companies',
          plans: 'GET /master/plans',
          settings: 'PUT /master/smtp-settings'
        },
        company: {
          dashboard: 'GET /company/dashboard',
          users: 'GET /company/users',
          settings: 'PUT /company/settings/s3'
        },
        vehicles: {
          stock: 'GET /vehicle/stock',
          detail: 'GET /vehicle/detail/:vehicleId',
          import: 'POST /vehicle/bulk-import'
        },
        inspections: {
          list: 'GET /inspection',
          start: 'POST /inspection/start/:vehicleId',
          complete: 'POST /inspection/:id/complete'
        },
        tradeins: {
          list: 'GET /tradein',
          start: 'POST /tradein/start/:vehicleId',
          complete: 'POST /tradein/:id/complete'
        }
      },
      
      webhooks: {
        description: 'Callback URLs for external integrations',
        inspection_complete: {
          method: 'POST',
          payload: {
            vehicle_stock_id: 'string',
            inspection_data: 'object',
            status: 'completed',
            timestamp: 'ISO string'
          }
        },
        tradein_complete: {
          method: 'POST',
          payload: {
            vehicle_stock_id: 'string',
            appraisal_data: 'object',
            offer_value: 'number',
            status: 'offer_made',
            timestamp: 'ISO string'
          }
        }
      },
      
      data_formats: {
        vehicle_payload: {
          vehicle_stock_id: 'number/string',
          make: 'string',
          model: 'string',
          variant: 'string',
          year: 'number',
          registration_number: 'string',
          fuel_type: 'string',
          transmission: 'string',
          kms_driven: 'number',
          vehicle_type: 'inspection|tradein'
        },
        
        dropdown_payload: {
          dropdown_name: 'string (internal name)',
          display_name: 'string (user-facing)',
          description: 'string',
          allow_multiple_selection: 'boolean',
          values: [{
            option_value: 'string',
            display_order: 'number',
            is_default: 'boolean'
          }]
        }
      },
      
      error_codes: {
        400: 'Bad Request - Invalid input data',
        401: 'Unauthorized - Invalid or missing token',
        403: 'Forbidden - Insufficient permissions',
        404: 'Not Found - Resource not found',
        429: 'Too Many Requests - Rate limit exceeded',
        500: 'Internal Server Error - Server error'
      }
    };

    res.status(200).json({
      success: true,
      data: documentation
    });

  } catch (error) {
    console.error('Get API docs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving API documentation'
    });
  }
};

// @desc    Get OpenAPI specification
// @route   GET /api/docs/spec
// @access  Private
const getApiSpec = async (req, res) => {
  try {
    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Auto Erp API',
        version: '1.0.0',
        description: 'Vehicle Trade-in and Inspection Platform API'
      },
      servers: [
        {
          url: process.env.API_BASE_URL || 'http://localhost:5000/api',
          description: 'Development server'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      },
      security: [
        {
          bearerAuth: []
        }
      ],
      paths: {
        '/auth/login': {
          post: {
            summary: 'User login',
            tags: ['Authentication'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      email: { type: 'string' },
                      password: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
        // Add more paths as needed
      }
    };

    res.status(200).json(openApiSpec);

  } catch (error) {
    console.error('Get API spec error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving API specification'
    });
  }
};

module.exports = {
  getApiDocs,
  getApiSpec
};
