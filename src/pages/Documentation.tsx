
import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Code, Book, Shield, Zap, Copy, Check } from 'lucide-react';

const Documentation = () => {
  const [copiedEndpoint, setCopiedEndpoint] = useState('');

  const copyToClipboard = (text: string, endpoint: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(endpoint);
    setTimeout(() => setCopiedEndpoint(''), 2000);
  };

  const apiEndpoints = [
    {
      method: 'POST',
      endpoint: '/api/vehicle/stock',
      description: 'Add vehicles to processing queue',
      payload: {
        vehicles: [
          {
            vehicle_stock_id: 28492,
            make: 'Toyota',
            model: 'Corolla',
            variant: '1.8 G',
            body_type: 'Sedan',
            vehicle_hero_image: '',
            vehicle_type: 'inspection'
          }
        ]
      }
    },
    {
      method: 'GET',
      endpoint: '/api/vehicle/stock',
      description: 'List vehicles with pagination and filters',
      params: '?page=1&limit=10&search=Toyota&vehicle_type=inspection'
    },
    {
      method: 'GET',
      endpoint: '/api/vehicle/:id',
      description: 'Get detailed vehicle information',
      params: ''
    },
    {
      method: 'POST',
      endpoint: '/api/dropdown/master',
      description: 'Create dropdown configuration',
      payload: {
        dropdown_name: 'turbo',
        display_name: 'Turbo',
        values: [
          { option_value: 'Supercharger' },
          { option_value: 'Turbo' }
        ]
      }
    }
  ];

  const rolePermissions = [
    {
      role: 'master_admin',
      permissions: [
        'Manage all companies',
        'Create/edit subscription plans',
        'View platform analytics',
        'Configure SMTP settings',
        'Access all system logs'
      ]
    },
    {
      role: 'company_super_admin',
      permissions: [
        'Manage company users',
        'Configure dropdown masters',
        'Setup inspection/tradein configs',
        'Manage S3 and callback settings',
        'View company analytics',
        'Export company data'
      ]
    },
    {
      role: 'company_admin',
      permissions: [
        'View company dashboard',
        'Process vehicle inspections',
        'Handle tradein evaluations',
        'View assigned vehicles',
        'Update vehicle status'
      ]
    }
  ];

  return (
    <DashboardLayout title="Documentation">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Auto Erp Documentation</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comprehensive guide to using the Auto Erp platform APIs and features
          </p>
        </div>

        <Tabs defaultValue="api" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="api" className="flex items-center space-x-2">
              <Code className="h-4 w-4" />
              <span>API Reference</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Role Permissions</span>
            </TabsTrigger>
            <TabsTrigger value="integration" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Integration Guide</span>
            </TabsTrigger>
            <TabsTrigger value="examples" className="flex items-center space-x-2">
              <Book className="h-4 w-4" />
              <span>Examples</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>API Endpoints</CardTitle>
                  <CardDescription>
                    RESTful API endpoints for vehicle management and platform operations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {apiEndpoints.map((endpoint, index) => (
                      <Card key={index} className="border-l-4 border-l-primary">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant={endpoint.method === 'GET' ? 'secondary' : 'default'}>
                                {endpoint.method}
                              </Badge>
                              <code className="text-sm bg-muted px-2 py-1 rounded">
                                {endpoint.endpoint}
                              </code>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(endpoint.endpoint, endpoint.endpoint)}
                            >
                              {copiedEndpoint === endpoint.endpoint ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-3">
                            {endpoint.description}
                          </p>
                          
                          {endpoint.payload && (
                            <div>
                              <p className="text-sm font-medium mb-2">Request Body:</p>
                              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                                {JSON.stringify(endpoint.payload, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          {endpoint.params && (
                            <div>
                              <p className="text-sm font-medium mb-2">Query Parameters:</p>
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {endpoint.params}
                              </code>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Authentication</CardTitle>
                  <CardDescription>All API requests require JWT token authentication</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Header Format:</h4>
                      <code className="block bg-muted p-3 rounded text-sm">
                        Authorization: Bearer {'<your_jwt_token>'}
                      </code>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Login Endpoint:</h4>
                      <code className="block bg-muted p-3 rounded text-sm">
                        POST /api/auth/login<br />
                        Content-Type: application/json<br /><br />
                        {JSON.stringify({
                          email: 'user@example.com',
                          password: 'password123'
                        }, null, 2)}
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="roles">
            <div className="space-y-6">
              {rolePermissions.map((role, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="h-5 w-5" />
                      <span className="capitalize">{role.role.replace('_', ' ')}</span>
                    </CardTitle>
                    <CardDescription>
                      Permissions and capabilities for this role
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {role.permissions.map((permission, permIndex) => (
                        <div key={permIndex} className="flex items-center space-x-2">
                          <Check className="h-4 w-4 text-success" />
                          <span className="text-sm">{permission}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="integration">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>S3 Configuration</CardTitle>
                  <CardDescription>Setup cloud storage for vehicle images and documents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Configure your AWS S3 bucket in the company settings to enable automatic file uploads.
                    </p>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Required S3 Configuration:</h4>
                      <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "bucket": "your-bucket-name",
  "access_key": "AKIAIOSFODNN7EXAMPLE",
  "secret_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "region": "us-east-1",
  "url": "https://your-bucket.s3.amazonaws.com"
}`}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Webhook Callbacks</CardTitle>
                  <CardDescription>Receive real-time updates when inspections or trade-ins are completed</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Configure a callback URL to receive POST requests when vehicle processing is completed.
                    </p>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Webhook Payload Structure:</h4>
                      <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "event_type": "inspection_completed",
  "vehicle_stock_id": "28492",
  "company_id": "64f8a1234567890abcdef123",
  "completed_by": "inspector@company.com",
  "completed_at": "2024-01-15T10:30:00Z",
  "data": {
    "vehicle_info": {...},
    "inspection_results": {...},
    "images": [...],
    "score": 85
  }
}`}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Queue Processing</CardTitle>
                  <CardDescription>Understanding how vehicle data is processed through the system</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Vehicle data sent to /api/vehicle/stock is processed through an SQS queue system for reliability and scalability.
                    </p>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <h4 className="font-semibold">Processing States:</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">pending</Badge>
                            <span>Waiting in queue</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">processing</Badge>
                            <span>Being processed</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="default">processed</Badge>
                            <span>Successfully processed</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="destructive">failed</Badge>
                            <span>Processing failed</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-semibold">Features:</h4>
                        <ul className="text-sm space-y-1">
                          <li>• Bulk processing support</li>
                          <li>• Automatic retry on failure</li>
                          <li>• Duplicate vehicle handling</li>
                          <li>• Real-time status updates</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="examples">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sample Vehicle Data</CardTitle>
                  <CardDescription>Example payload for adding vehicles to the system</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
{`{
  "vehicle_stock_id": 28492,
  "make": "Toyota",
  "model": "Corolla",
  "variant": "1.8 G",
  "year": 2018,
  "registration_number": "TN09AB1234",
  "registration_state": "Tamil Nadu",
  "fuel_type": "Petrol",
  "transmission": "Automatic",
  "body_type": "Sedan",
  "color": "White",
  "owner_type": "First Owner",
  "kms_driven": 45000,
  "vin_number": "JTDBR32E920041758",
  "engine_number": "1ZZ1234567",
  "insurance_valid_till": "2025-03-31",
  "insurance_type": "Comprehensive",
  "rc_available": true,
  "service_history_available": true,
  "number_of_keys": 2,
  "hypothecation": false,
  "source": "dealer_portal",
  "vehicle_type": "inspection"
}`}
                  </pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dropdown Configuration</CardTitle>
                  <CardDescription>Example of creating a custom dropdown for dynamic forms</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
{`{
  "dropdown_name": "vehicle_condition",
  "display_name": "Vehicle Condition",
  "description": "Overall condition assessment",
  "allow_multiple_selection": false,
  "is_required": true,
  "values": [
    {
      "option_value": "Excellent",
      "display_order": 1,
      "is_default": false
    },
    {
      "option_value": "Good",
      "display_order": 2,
      "is_default": true
    },
    {
      "option_value": "Fair",
      "display_order": 3,
      "is_default": false
    },
    {
      "option_value": "Poor",
      "display_order": 4,
      "is_default": false
    }
  ]
}`}
                  </pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Error Response Format</CardTitle>
                  <CardDescription>Standard error response structure</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
{`{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "vehicle_stock_id",
      "message": "Vehicle ID is required"
    },
    {
      "field": "make",
      "message": "Vehicle make is required"
    }
  ],
  "error_code": "VALIDATION_ERROR",
  "timestamp": "2024-01-15T10:30:00Z"
}`}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Documentation;
