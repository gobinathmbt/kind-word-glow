
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';

const EnterpriseSection = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      title: 'Multi-tenancy',
      content: 'Secure isolation between companies with shared infrastructure.',
      image: 'https://images.unsplash.com/photo-1560472355-536de3962603?w=800&h=400&fit=crop'
    },
    {
      title: 'White Labeling',
      content: 'Complete branding customization for your company identity.',
      image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=400&fit=crop'
    },
    {
      title: 'SSO Integration',
      content: 'Single sign-on with Active Directory and SAML support.',
      image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=400&fit=crop'
    },
    {
      title: 'API Management',
      content: 'Enterprise-grade API gateway with rate limiting and monitoring.',
      image: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&h=400&fit=crop'
    },
    {
      title: 'Compliance Suite',
      content: 'Built-in compliance tools for automotive industry regulations.',
      image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=400&fit=crop'
    },
    {
      title: 'Advanced Security',
      content: 'End-to-end encryption and advanced threat protection.',
      image: 'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=800&h=400&fit=crop'
    },
    {
      title: 'Backup & Recovery',
      content: 'Automated backups and disaster recovery procedures.',
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop'
    },
    {
      title: 'Training & Support',
      content: 'Comprehensive training programs and dedicated support teams.',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop'
    },
    {
      title: 'Custom Development',
      content: 'Tailored solutions and custom feature development services.',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=400&fit=crop'
    },
    {
      title: 'Implementation',
      content: 'End-to-end implementation services with dedicated project managers.',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop'
    },
    {
      title: 'Load Balancing',
      content: 'Advanced load balancing for high availability and performance.',
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop'
    },
    {
      title: 'Microservices Architecture',
      content: 'Scalable microservices architecture for enterprise requirements.',
      image: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&h=400&fit=crop'
    },
    {
      title: 'Container Orchestration',
      content: 'Kubernetes-based container orchestration for cloud-native deployment.',
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop'
    },
    {
      title: 'DevOps Pipeline',
      content: 'Automated CI/CD pipelines for continuous integration and deployment.',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=400&fit=crop'
    },
    { 
      title: 'Monitoring & Alerting',
      content: 'Comprehensive monitoring with proactive alerting and incident management.',
      image: 'https://images.unsplash.com/photo-1508780709619-79562169bc64?w=800&h=400&fit=crop'
    },
    {
      title: 'Data Encryption',
      content: 'End-to-end data encryption at rest and in transit.',
      image: 'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=800&h=400&fit=crop'
    },
    {
      title: 'Audit Logging',
      content: 'Comprehensive audit logging and compliance reporting.',
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=400&fit=crop'
    },
    {
      title: 'Role-Based Access',
      content: 'Granular role-based access control with dynamic permissions.',
      image: 'https://images.unsplash.com/photo-1560472355-536de3962603?w=800&h=400&fit=crop'
    },
    {
      title: 'High Availability',
      content: '99.9% uptime SLA with redundant infrastructure and failover systems.',
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop'
    },
    {
      title: 'Global CDN',
      content: 'Global content delivery network for optimal performance worldwide.',
      image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=400&fit=crop'
    },
    {
      title: 'Enterprise Support',
      content: '24/7 enterprise support with dedicated account management.',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop'
    },
    {
      title: 'Custom SLAs',
      content: 'Customizable service level agreements to meet specific business requirements.',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop'
    }
  ];

  const nextSlide = () => {
    setActiveSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setActiveSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  return (
    <Card className="overflow-hidden automotive-shadow">
      <CardContent className="p-0">
        <div className="grid md:grid-cols-2 gap-0 min-h-[400px]">
          <div className="p-8 flex flex-col justify-center">
            <Badge variant="outline" className="mb-4 w-fit">
              <Users className="h-4 w-4 mr-2" />
              Enterprise Features
            </Badge>
            <h3 className="text-3xl font-bold mb-4">
              {slides[activeSlide].title}
            </h3>
            <p className="text-lg text-muted-foreground mb-6">
              {slides[activeSlide].content}
            </p>
            
            {/* Slide Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-2 overflow-x-auto max-w-xs">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveSlide(index)}
                    className={`w-2 h-2 rounded-full transition-colors flex-shrink-0 ${
                      index === activeSlide ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              <div className="flex space-x-2">
                <Button variant="ghost" size="icon" onClick={prevSlide}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={nextSlide}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <div 
            className="bg-cover bg-center min-h-[300px] md:min-h-full"
            style={{ 
              backgroundImage: `url(${slides[activeSlide].image})` 
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default EnterpriseSection;
