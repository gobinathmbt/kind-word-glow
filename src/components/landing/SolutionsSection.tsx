import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Building2,
  Truck,
  Shield,
  Car,
  Users,
  TrendingUp,
  Zap,
  Globe,
  Award,
  Target,
  Clock,
  Heart
} from 'lucide-react';

const SolutionsSection = () => {
  const [activeSolution, setActiveSolution] = useState(0);

  const solutions = [
    {
      icon: Building2,
      title: 'Automotive Dealerships',
      description: 'Complete dealership management solution for new and used car dealers',
      features: [
        'Inventory management system',
        'Customer relationship management',
        'Sales process automation',
        'Service scheduling',
        'Financial reporting',
        'Multi-location support',
        'Integration with DMS systems',
        'Mobile sales tools'
      ],
      image: 'https://images.unsplash.com/photo-1560472355-536de3962603?w=800&h=400&fit=crop',
      stats: { users: '2,500+', satisfaction: '98%', timeReduction: '60%' }
    },
    {
      icon: Truck,
      title: 'Fleet Management',
      description: 'Comprehensive fleet operations and maintenance management platform',
      features: [
        'Real-time vehicle tracking',
        'Maintenance scheduling',
        'Driver management',
        'Fuel monitoring',
        'Route optimization',
        'Compliance management',
        'Cost analysis',
        'Performance analytics'
      ],
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop',
      stats: { users: '1,800+', satisfaction: '97%', timeReduction: '70%' }
    },
    {
      icon: Shield,
      title: 'Insurance Companies',
      description: 'Digital transformation for automotive insurance and claims processing',
      features: [
        'Digital claims processing',
        'Automated damage assessment',
        'Risk evaluation tools',
        'Policy management',
        'Customer portal',
        'Fraud detection',
        'Settlement automation',
        'Regulatory compliance'
      ],
      image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=400&fit=crop',
      stats: { users: '3,200+', satisfaction: '95%', timeReduction: '80%' }
    },
    {
      icon: Car,
      title: 'Rental Companies',
      description: 'Modern rental fleet management with automated processes',
      features: [
        'Automated check-in/out',
        'Dynamic pricing',
        'Fleet utilization tracking',
        'Damage documentation',
        'Customer self-service',
        'Revenue optimization',
        'Multi-location operations',
        'Integration APIs'
      ],
      image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=400&fit=crop',
      stats: { users: '1,500+', satisfaction: '96%', timeReduction: '65%' }
    },
    {
      icon: Users,
      title: 'Auction Houses',
      description: 'Digital auction platform with comprehensive vehicle evaluation',
      features: [
        'Digital auction platform',
        'Vehicle condition reports',
        'Bidding management',
        'Seller onboarding',
        'Payment processing',
        'Logistics coordination',
        'Market analytics',
        'Quality assurance'
      ],
      image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&h=400&fit=crop',
      stats: { users: '900+', satisfaction: '94%', timeReduction: '75%' }
    },
    {
      icon: TrendingUp,
      title: 'Financial Services',
      description: 'Automotive financing and lending platform with risk assessment',
      features: [
        'Credit evaluation',
        'Risk assessment',
        'Automated underwriting',
        'Portfolio management',
        'Collections management',
        'Regulatory reporting',
        'Customer onboarding',
        'Integration with banks'
      ],
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=400&fit=crop',
      stats: { users: '1,200+', satisfaction: '93%', timeReduction: '85%' }
    }
  ];

  const benefits = [
    {
      icon: Zap,
      title: 'Lightning Fast Implementation',
      description: 'Get up and running in weeks, not months',
      metric: '2-4 weeks',
      color: 'from-yellow-500 to-orange-500'
    },
    {
      icon: Globe,
      title: 'Global Scalability',
      description: 'Supports operations in 25+ countries',
      metric: '25+ countries',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Award,
      title: 'Industry Recognition',
      description: 'Award-winning platform trusted by leaders',
      metric: '15+ awards',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Target,
      title: 'ROI Guarantee',
      description: 'Proven return on investment within 6 months',
      metric: '300% ROI',
      color: 'from-green-500 to-emerald-500'
    }
  ];

  return (
    <section id="solutions" className="py-20 px-6">
      <div className="container mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <Badge variant="outline" className="mb-4 text-lg px-4 py-2">
            Industry Solutions
          </Badge>
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Tailored Solutions for Every Industry
          </h2>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            From automotive dealers to insurance companies, our platform adapts to your 
            specific industry needs with proven results
          </p>
        </motion.div>

        {/* Solutions Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-16">
          {solutions.map((solution, index) => {
            const Icon = solution.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card 
                  className={`cursor-pointer transition-all duration-300 hover:shadow-xl group h-full ${
                    activeSolution === index ? 'border-primary shadow-lg' : ''
                  }`}
                  onClick={() => setActiveSolution(index)}
                >
                  <div 
                    className="h-48 bg-cover bg-center group-hover:scale-105 transition-transform duration-300"
                    style={{ backgroundImage: `url(${solution.image})` }}
                  />
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-primary/80 p-3 mr-4 group-hover:scale-110 transition-transform">
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold">{solution.title}</h3>
                    </div>
                    <p className="text-muted-foreground mb-6">{solution.description}</p>
                    
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary">{solution.stats.users}</div>
                        <div className="text-xs text-muted-foreground">Users</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary">{solution.stats.satisfaction}</div>
                        <div className="text-xs text-muted-foreground">Satisfaction</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary">{solution.stats.timeReduction}</div>
                        <div className="text-xs text-muted-foreground">Time Saved</div>
                      </div>
                    </div>

                    <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-white transition-colors">
                      Learn More
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Active Solution Details */}
        <motion.div
          key={activeSolution}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-8">
              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-3xl font-bold mb-4">{solutions[activeSolution].title}</h3>
                  <p className="text-lg text-muted-foreground mb-6">{solutions[activeSolution].description}</p>
                  
                  <h4 className="text-xl font-semibold mb-4">Key Capabilities:</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {solutions[activeSolution].features.map((feature, idx) => (
                      <div key={idx} className="flex items-center">
                        <div className="w-2 h-2 bg-primary rounded-full mr-3 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-background rounded-lg border">
                      <div className="text-2xl font-bold text-primary">{solutions[activeSolution].stats.users}</div>
                      <div className="text-sm text-muted-foreground">Active Users</div>
                    </div>
                    <div className="text-center p-4 bg-background rounded-lg border">
                      <div className="text-2xl font-bold text-primary">{solutions[activeSolution].stats.satisfaction}</div>
                      <div className="text-sm text-muted-foreground">Satisfaction</div>
                    </div>
                    <div className="text-center p-4 bg-background rounded-lg border">
                      <div className="text-2xl font-bold text-primary">{solutions[activeSolution].stats.timeReduction}</div>
                      <div className="text-sm text-muted-foreground">Time Reduction</div>
                    </div>
                  </div>

                  <Button size="lg" className="w-full">
                    Request Custom Demo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Benefits Section */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="text-center group hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${benefit.color} p-4 mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                    <p className="text-muted-foreground mb-4">{benefit.description}</p>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {benefit.metric}
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SolutionsSection;