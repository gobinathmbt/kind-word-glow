import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Cloud,
  Smartphone,
  Database,
  Shield,
  Zap,
  Globe,
  Code,
  Server,
  Lock,
  Cpu,
  Monitor,
  Wifi
} from 'lucide-react';

const TechnologySection = () => {
  const [activeCategory, setActiveCategory] = useState(0);

  const categories = [
    {
      title: 'Cloud Infrastructure',
      icon: Cloud,
      description: 'Scalable, secure, and reliable cloud-native architecture',
      technologies: [
        {
          name: 'Amazon Web Services',
          description: 'Enterprise-grade cloud infrastructure with global reach',
          features: ['99.99% Uptime SLA', 'Auto-scaling', 'Global CDN', 'Disaster Recovery'],
          image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop'
        },
        {
          name: 'Kubernetes Orchestration',
          description: 'Container orchestration for seamless deployment and scaling',
          features: ['Auto-scaling pods', 'Load balancing', 'Rolling updates', 'Service mesh'],
          image: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&h=400&fit=crop'
        },
        {
          name: 'Microservices Architecture',
          description: 'Modular, scalable microservices for optimal performance',
          features: ['Independent scaling', 'Fault isolation', 'Technology diversity', 'Rapid deployment'],
          image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=400&fit=crop'
        }
      ]
    },
    {
      title: 'Mobile Technology',
      icon: Smartphone,
      description: 'Native mobile applications with offline capabilities',
      technologies: [
        {
          name: 'React Native Framework',
          description: 'Cross-platform mobile development for iOS and Android',
          features: ['Native performance', 'Code sharing', 'Hot reloading', 'Platform APIs'],
          image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=400&fit=crop'
        },
        {
          name: 'Offline-First Design',
          description: 'Works seamlessly even without internet connectivity',
          features: ['Local data storage', 'Background sync', 'Conflict resolution', 'Progressive loading'],
          image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&h=400&fit=crop'
        },
        {
          name: 'Progressive Web App',
          description: 'Web application with native app-like experience',
          features: ['Push notifications', 'App store distribution', 'Offline functionality', 'Fast loading'],
          image: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=400&fit=crop'
        }
      ]
    },
    {
      title: 'Data & Analytics',
      icon: Database,
      description: 'Advanced data processing and real-time analytics',
      technologies: [
        {
          name: 'Real-time Data Pipeline',
          description: 'Stream processing for instant insights and notifications',
          features: ['Event streaming', 'Real-time analytics', 'Data transformation', 'Alert systems'],
          image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop'
        },
        {
          name: 'Machine Learning',
          description: 'AI-powered insights and predictive analytics',
          features: ['Predictive modeling', 'Anomaly detection', 'Pattern recognition', 'Automated insights'],
          image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop'
        },
        {
          name: 'Data Warehouse',
          description: 'Scalable data storage and business intelligence',
          features: ['Columnar storage', 'Query optimization', 'Data modeling', 'BI integration'],
          image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop'
        }
      ]
    },
    {
      title: 'Security & Compliance',
      icon: Shield,
      description: 'Enterprise-grade security with compliance standards',
      technologies: [
        {
          name: 'Zero Trust Architecture',
          description: 'Never trust, always verify security model',
          features: ['Identity verification', 'Least privilege', 'Continuous monitoring', 'Threat detection'],
          image: 'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=800&h=400&fit=crop'
        },
        {
          name: 'End-to-End Encryption',
          description: 'Data protection at rest and in transit',
          features: ['AES-256 encryption', 'Key management', 'Certificate handling', 'Secure protocols'],
          image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=400&fit=crop'
        },
        {
          name: 'Compliance Framework',
          description: 'Built-in compliance with industry standards',
          features: ['GDPR compliance', 'SOC 2 certified', 'ISO 27001', 'Audit trails'],
          image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=400&fit=crop'
        }
      ]
    }
  ];

  const techStack = [
    { name: 'React', category: 'Frontend', icon: Code },
    { name: 'Node.js', category: 'Backend', icon: Server },
    { name: 'MongoDB', category: 'Database', icon: Database },
    { name: 'Redis', category: 'Cache', icon: Zap },
    { name: 'Docker', category: 'Container', icon: Monitor },
    { name: 'GraphQL', category: 'API', icon: Wifi },
  ];

  return (
    <section id="technology" className="py-20 px-6 bg-gradient-to-br from-primary/5 to-background">
      <div className="container mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <Badge variant="outline" className="mb-4 text-lg px-4 py-2">
            Technology Stack
          </Badge>
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Built on Modern Technology
          </h2>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Cutting-edge technology stack ensuring scalability, security, and performance 
            for enterprise-grade applications
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

        {/* Active Category Content */}
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <Card className="mb-8">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 p-4 mx-auto mb-4">
                {React.createElement(categories[activeCategory].icon, { className: "h-8 w-8 text-white" })}
              </div>
              <h3 className="text-2xl font-bold mb-2">{categories[activeCategory].title}</h3>
              <p className="text-lg text-muted-foreground">{categories[activeCategory].description}</p>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-3 gap-6">
            {categories[activeCategory].technologies.map((tech, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="group hover:shadow-xl transition-all duration-300 h-full">
                  <div 
                    className="h-48 bg-cover bg-center group-hover:scale-105 transition-transform duration-300"
                    style={{ backgroundImage: `url(${tech.image})` }}
                  />
                  <CardContent className="p-6">
                    <h4 className="text-xl font-bold mb-2">{tech.name}</h4>
                    <p className="text-muted-foreground mb-4">{tech.description}</p>
                    
                    <div className="space-y-2">
                      {tech.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center text-sm">
                          <div className="w-2 h-2 bg-primary rounded-full mr-3 flex-shrink-0" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Tech Stack Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h3 className="text-3xl font-bold text-center mb-8">Our Technology Stack</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {techStack.map((tech, index) => {
              const Icon = tech.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="text-center group hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-primary/80 p-3 mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <h4 className="font-semibold">{tech.name}</h4>
                      <p className="text-xs text-muted-foreground">{tech.category}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TechnologySection;