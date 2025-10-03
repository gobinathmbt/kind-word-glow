import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Plug,
  Database,
  CreditCard,
  Mail,
  MessageSquare,
  FileText,
  Cloud,
  Smartphone,
  Globe,
  Users,
  BarChart3,
  Settings
} from 'lucide-react';

const IntegrationsSection = () => {
  const [activeCategory, setActiveCategory] = useState(0);

  const categories = [
    {
      title: 'Payment Gateways',
      icon: CreditCard,
      description: 'Secure payment processing with multiple gateway options',
      integrations: [
        {
          name: 'Stripe',
          description: 'Global payment processing with advanced fraud protection',
          features: ['Global coverage', 'Fraud detection', 'Subscription billing', 'Mobile payments'],
          logo: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100&h=100&fit=crop',
          status: 'Active'
        },
        {
          name: 'PayPal',
          description: 'Trusted payment solution with buyer protection',
          features: ['Buyer protection', 'Express checkout', 'Multi-currency', 'Mobile SDK'],
          logo: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=100&h=100&fit=crop',
          status: 'Active'
        },
        {
          name: 'Razorpay',
          description: 'Indian payment gateway with UPI and wallet support',
          features: ['UPI support', 'Wallet integration', 'EMI options', 'Local methods'],
          logo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=100&h=100&fit=crop',
          status: 'Active'
        },
        {
          name: 'Square',
          description: 'Point-of-sale and online payment processing',
          features: ['POS integration', 'Card readers', 'Inventory sync', 'Analytics'],
          logo: 'https://images.unsplash.com/photo-1560472355-536de3962603?w=100&h=100&fit=crop',
          status: 'Coming Soon'
        }
      ]
    },
    {
      title: 'Communication',
      icon: MessageSquare,
      description: 'Multi-channel communication and messaging platforms',
      integrations: [
        {
          name: 'Twilio',
          description: 'SMS, voice, and video communication APIs',
          features: ['SMS notifications', 'Voice calls', 'Video chat', 'Programmable messaging'],
          logo: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=100&h=100&fit=crop',
          status: 'Active'
        },
        {
          name: 'SendGrid',
          description: 'Email delivery and marketing automation',
          features: ['Transactional emails', 'Marketing campaigns', 'Analytics', 'Template engine'],
          logo: 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=100&h=100&fit=crop',
          status: 'Active'
        },
        {
          name: 'Slack',
          description: 'Team collaboration and workflow automation',
          features: ['Team messaging', 'File sharing', 'Workflow automation', 'App integration'],
          logo: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=100&h=100&fit=crop',
          status: 'Active'
        },
        {
          name: 'Microsoft Teams',
          description: 'Enterprise communication and collaboration',
          features: ['Video conferencing', 'Document collaboration', 'Integration suite', 'Security'],
          logo: 'https://images.unsplash.com/photo-1633419461186-7d40a38105ec?w=100&h=100&fit=crop',
          status: 'Beta'
        }
      ]
    },
    {
      title: 'Cloud Storage',
      icon: Cloud,
      description: 'Secure cloud storage and file management solutions',
      integrations: [
        {
          name: 'Amazon S3',
          description: 'Scalable object storage with global accessibility',
          features: ['Unlimited storage', 'Global CDN', 'Security features', 'API access'],
          logo: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=100&h=100&fit=crop',
          status: 'Active'
        },
        {
          name: 'Google Cloud Storage',
          description: 'Enterprise-grade storage with ML integration',
          features: ['Machine learning', 'Global network', 'Auto-scaling', 'Data analytics'],
          logo: 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=100&h=100&fit=crop',
          status: 'Active'
        },
        {
          name: 'Microsoft Azure',
          description: 'Enterprise cloud platform with hybrid support',
          features: ['Hybrid cloud', 'Enterprise security', 'AI services', 'DevOps tools'],
          logo: 'https://images.unsplash.com/photo-1633419461186-7d40a38105ec?w=100&h=100&fit=crop',
          status: 'Active'
        },
        {
          name: 'Dropbox Business',
          description: 'Business file storage and collaboration',
          features: ['File sync', 'Team folders', 'Version history', 'Admin controls'],
          logo: 'https://images.unsplash.com/photo-1621839673705-6617adf9e890?w=100&h=100&fit=crop',
          status: 'Coming Soon'
        }
      ]
    },
    {
      title: 'Analytics & BI',
      icon: BarChart3,
      description: 'Business intelligence and advanced analytics platforms',
      integrations: [
        {
          name: 'Google Analytics',
          description: 'Web analytics and user behavior tracking',
          features: ['User tracking', 'Conversion analytics', 'Custom reports', 'Real-time data'],
          logo: 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=100&h=100&fit=crop',
          status: 'Active'
        },
        {
          name: 'Power BI',
          description: 'Microsoft business intelligence platform',
          features: ['Interactive dashboards', 'Data modeling', 'AI insights', 'Mobile access'],
          logo: 'https://images.unsplash.com/photo-1633419461186-7d40a38105ec?w=100&h=100&fit=crop',
          status: 'Active'
        },
        {
          name: 'Tableau',
          description: 'Data visualization and business intelligence',
          features: ['Data visualization', 'Self-service analytics', 'Enterprise security', 'Collaboration'],
          logo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=100&h=100&fit=crop',
          status: 'Beta'
        },
        {
          name: 'Mixpanel',
          description: 'Product analytics and user behavior insights',
          features: ['Event tracking', 'Funnel analysis', 'Cohort analysis', 'A/B testing'],
          logo: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=100&h=100&fit=crop',
          status: 'Coming Soon'
        }
      ]
    },
    {
      title: 'CRM & ERP',
      icon: Users,
      description: 'Customer relationship and enterprise resource planning',
      integrations: [
        {
          name: 'Salesforce',
          description: 'World\'s leading CRM platform',
          features: ['Lead management', 'Sales automation', 'Customer service', 'Marketing cloud'],
          logo: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=100&h=100&fit=crop',
          status: 'Active'
        },
        {
          name: 'HubSpot',
          description: 'Inbound marketing and sales platform',
          features: ['Marketing automation', 'Sales pipeline', 'Customer service', 'Content management'],
          logo: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=100&h=100&fit=crop',
          status: 'Active'
        },
        {
          name: 'SAP',
          description: 'Enterprise resource planning solution',
          features: ['Financial management', 'Supply chain', 'HR management', 'Analytics'],
          logo: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=100&h=100&fit=crop',
          status: 'Beta'
        },
        {
          name: 'Oracle',
          description: 'Comprehensive business applications',
          features: ['Database management', 'Cloud applications', 'Enterprise planning', 'Security'],
          logo: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=100&h=400&fit=crop',
          status: 'Coming Soon'
        }
      ]
    },
    {
      title: 'Automotive APIs',
      icon: Settings,
      description: 'Specialized automotive industry integrations',
      integrations: [
        {
          name: 'VIN Decoder API',
          description: 'Vehicle identification and specification lookup',
          features: ['VIN validation', 'Vehicle specs', 'Market values', 'History reports'],
          logo: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=100&h=100&fit=crop',
          status: 'Active'
        },
        {
          name: 'Kelly Blue Book',
          description: 'Vehicle valuation and pricing information',
          features: ['Market values', 'Trade-in prices', 'Pricing trends', 'Condition factors'],
          logo: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=100&h=100&fit=crop',
          status: 'Active'
        },
        {
          name: 'Carfax',
          description: 'Vehicle history and damage reports',
          features: ['History reports', 'Accident records', 'Service history', 'Ownership records'],
          logo: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&h=100&fit=crop',
          status: 'Active'
        },
        {
          name: 'AutoCheck',
          description: 'Vehicle history and score reporting',
          features: ['Vehicle scores', 'Auction data', 'Title information', 'Damage reports'],
          logo: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=100&h=100&fit=crop',
          status: 'Beta'
        }
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-500';
      case 'Beta': return 'bg-yellow-500';
      case 'Coming Soon': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <section id="integrations" className="py-20 px-6">
      <div className="container mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <Badge variant="outline" className="mb-4 text-lg px-4 py-2">
            <Plug className="h-4 w-4 mr-2" />
            Integrations & APIs
          </Badge>
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Connect Everything You Use
          </h2>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Seamlessly integrate with 200+ popular business tools and services. 
            Our extensive API ecosystem ensures smooth data flow across your entire tech stack.
          </p>
        </motion.div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center mb-12 gap-4">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onClick={() => setActiveCategory(index)}
                className={`flex items-center px-6 py-3 rounded-full transition-all duration-300 ${
                  activeCategory === index 
                    ? 'bg-primary text-white shadow-lg' 
                    : 'bg-background border hover:border-primary'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {category.title}
              </motion.button>
            );
          })}
        </div>

        {/* Active Category Description */}
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h3 className="text-3xl font-bold mb-4">{categories[activeCategory].title}</h3>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {categories[activeCategory].description}
          </p>
        </motion.div>

        {/* Integrations Grid */}
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
        >
          {categories[activeCategory].integrations.map((integration, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="group hover:shadow-xl transition-all duration-300 h-full">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div 
                      className="w-12 h-12 rounded-lg mr-4 bg-cover bg-center"
                      style={{ backgroundImage: `url(${integration.logo})` }}
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold">{integration.name}</h4>
                      <div className="flex items-center mt-1">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(integration.status)} mr-2`} />
                        <span className="text-xs text-muted-foreground">{integration.status}</span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4">{integration.description}</p>
                  
                  <div className="space-y-2">
                    {integration.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center text-xs">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2 flex-shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-4 group-hover:bg-primary group-hover:text-white transition-colors"
                    disabled={integration.status === 'Coming Soon'}
                  >
                    {integration.status === 'Coming Soon' ? 'Coming Soon' : 'Learn More'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* API Documentation CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4">Need a Custom Integration?</h3>
              <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
                Our robust API and developer-friendly documentation make it easy to build 
                custom integrations for your specific business needs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg">
                  View API Documentation
                </Button>
                <Button size="lg" variant="outline">
                  Request Custom Integration
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default IntegrationsSection;