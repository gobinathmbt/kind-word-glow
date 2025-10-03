import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Building,
  Users,
  Shield,
  Database,
  Car,
  Search,
  Archive,
  Wrench,
  Settings,
  BarChart3,
  Globe,
  Truck,
  ClipboardList,
  UserCog,
  Package,
  Megaphone
} from 'lucide-react';

const ModulesSection = () => {
  const [activeModule, setActiveModule] = useState(0);

  const modules = [
    {
      icon: Building,
      title: 'Multi-Dealership Management',
      description: 'Manage multiple branches and dealership locations from a single platform',
      features: [
        'Centralized management console',
        'Branch-specific dashboards',
        'Inventory synchronization',
        'Cross-location reporting',
        'Branch performance analytics',
        'Territory management',
        'Multi-location user access',
        'Consolidated financial reporting'
      ],
      image: 'https://images.unsplash.com/photo-1560472355-536de3962603?w=800&h=400&fit=crop',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Users,
      title: 'User Management System',
      description: 'Comprehensive user and role management with flexible permissions',
      features: [
        'Role-based access control',
        'User hierarchy management',
        'Branch assignment',
        'Permission templates',
        'Activity monitoring',
        'Single sign-on integration',
        'User onboarding workflows',
        'Audit trail tracking'
      ],
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: Shield,
      title: 'Permission Management',
      description: 'Granular permission control for company admins and branch managers',
      features: [
        'Granular permission settings',
        'Module-based access control',
        'Dynamic permission updates',
        'Permission inheritance',
        'Security compliance',
        'Access request workflows',
        'Permission analytics',
        'Compliance reporting'
      ],
      image: 'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=800&h=400&fit=crop',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Database,
      title: 'Dropdown Master Module',
      description: 'Centralized meta-information collection for all vehicle data',
      features: [
        'Vehicle meta-data management',
        'Custom dropdown creation',
        'Hierarchical data structure',
        'Import/Export capabilities',
        'Data validation rules',
        'Version control',
        'Master data synchronization',
        'API integration support'
      ],
      image: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&h=400&fit=crop',
      color: 'from-yellow-500 to-orange-500'
    },
    {
      icon: Car,
      title: 'Vehicle Master Module',
      description: 'Complete vehicle information management with comprehensive integrations',
      features: [
        'Complete vehicle profiles',
        'Integration hub',
        'Document management',
        'History tracking',
        'Condition assessment',
        'Maintenance records',
        'Ownership history',
        'Market valuation tools'
      ],
      image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=400&fit=crop',
      color: 'from-red-500 to-pink-500'
    },
    {
      icon: Search,
      title: 'Inspection Module',
      description: 'Multi-stage vehicle inspection with configurable templates',
      features: [
        'Multi-stage inspections',
        'Configurable templates',
        'Real-time data capture',
        'Photo documentation',
        'Quality control workflows',
        'Inspector performance tracking',
        'Automated report generation',
        'Mobile inspection app'
      ],
      image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&h=400&fit=crop',
      color: 'from-indigo-500 to-blue-500'
    },
    {
      icon: Archive,
      title: 'Trade-in Module',
      description: 'Streamlined trade-in appraisal process similar to inspection workflows',
      features: [
        'Appraisal workflows',
        'Market value analysis',
        'Condition-based pricing',
        'Instant valuations',
        'Trade-in history',
        'Market comparison tools',
        'Automated pricing rules',
        'Customer communication'
      ],
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=400&fit=crop',
      color: 'from-teal-500 to-green-500'
    },
    {
      icon: Megaphone,
      title: 'Advertisement Integration',
      description: 'Multi-platform advertisement integration for vehicle listings',
      features: [
        'Multi-platform publishing',
        'Automated listing sync',
        'Performance tracking',
        'Lead management',
        'Pricing optimization',
        'Inventory distribution',
        'Campaign analytics',
        'Cross-platform reporting'
      ],
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop',
      color: 'from-orange-500 to-red-500'
    },
    {
      icon: Wrench,
      title: 'Workshop Module',
      description: 'Powerful supply chain management with end-to-end workflow tracking',
      features: [
        'Supply chain management',
        'Supplier integration',
        'Quote management',
        'Work order tracking',
        'Real-time communication',
        'Quality assurance',
        'Cost tracking',
        'Performance analytics'
      ],
      image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=400&fit=crop',
      color: 'from-amber-500 to-yellow-500'
    },
    {
      icon: Settings,
      title: 'Settings Module',
      description: 'Comprehensive company settings for cloud and webhook configurations',
      features: [
        'Cloud configuration',
        'Webhook management',
        'API settings',
        'Security preferences',
        'Notification settings',
        'Integration management',
        'Backup configuration',
        'System preferences'
      ],
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop',
      color: 'from-slate-500 to-gray-500'
    }
  ];

  return (
    <section id="modules" className="py-20 px-6 bg-gradient-to-br from-background to-primary/5">
      <div className="container mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <Badge variant="outline" className="mb-4 text-lg px-4 py-2">
            Complete Module Suite
          </Badge>
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Comprehensive Vehicle Management Modules
          </h2>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Everything you need to manage your vehicle operations from inspection to sale, 
            all integrated in one powerful platform
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Module List */}
          <div className="space-y-4">
            {modules.map((module, index) => {
              const Icon = module.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card 
                    className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                      activeModule === index ? 'border-primary shadow-lg scale-[1.02]' : ''
                    }`}
                    onClick={() => setActiveModule(index)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${module.color} p-3 flex items-center justify-center`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">{module.title}</h3>
                          <p className="text-sm text-muted-foreground">{module.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Active Module Details */}
          <motion.div
            key={activeModule}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="overflow-hidden h-full">
              <div 
                className="h-64 bg-cover bg-center"
                style={{ backgroundImage: `url(${modules[activeModule].image})` }}
              />
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${modules[activeModule].color} p-3 mr-4`}>
                    {React.createElement(modules[activeModule].icon, { className: "h-6 w-6 text-white" })}
                  </div>
                  <h3 className="text-2xl font-bold">{modules[activeModule].title}</h3>
                </div>
                <p className="text-muted-foreground mb-6">{modules[activeModule].description}</p>
                
                <h4 className="text-lg font-semibold mb-4">Key Features:</h4>
                <div className="grid grid-cols-1 gap-2">
                  {modules[activeModule].features.map((feature, idx) => (
                    <div key={idx} className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3 flex-shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Mobile App CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4">AutoErp.io Mobile App</h3>
              <p className="text-lg text-muted-foreground mb-6">
                Dedicated mobile applications for inspection and trade-in modules, 
                available on App Store and Play Store
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-black text-white hover:bg-gray-800">
                  <img src="/api/placeholder/24/24" alt="App Store" className="mr-2" />
                  Download on App Store
                </Button>
                <Button size="lg" className="bg-green-600 text-white hover:bg-green-700">
                  <img src="/api/placeholder/24/24" alt="Play Store" className="mr-2" />
                  Get it on Google Play
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default ModulesSection;