
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Globe } from 'lucide-react';

const PlatformSection = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      title: 'Enterprise Vehicle Management',
      content: 'Comprehensive platform for vehicle trade-in and inspection management across multiple companies.',
      image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=400&fit=crop'
    },
    {
      title: 'Multi-Role Access Control',
      content: 'Sophisticated role-based permissions for master admins, company admins, and super admins.',
      image: 'https://images.unsplash.com/photo-1560472355-536de3962603?w=800&h=400&fit=crop'
    },
    {
      title: 'Scalable Architecture',
      content: 'Built to handle thousands of vehicles and users with enterprise-grade performance.',
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop'
    },
    {
      title: 'Real-time Analytics',
      content: 'Live dashboards and reporting for complete visibility into your operations.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop'
    },
    {
      title: 'API Integration',
      content: 'Seamless integration with existing systems through robust APIs and webhooks.',
      image: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&h=400&fit=crop'
    },
    {
      title: 'Mobile Ready',
      content: 'Native mobile applications for field inspections and real-time updates.',
      image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=400&fit=crop'
    },
    {
      title: 'Cloud Infrastructure',
      content: 'Secure, scalable cloud hosting with 99.9% uptime guarantee.',
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop'
    },
    {
      title: 'Data Security',
      content: 'Enterprise-grade security with encryption and compliance standards.',
      image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=400&fit=crop'
    },
    {
      title: 'Workflow Automation',
      content: 'Automated processes for inspection scheduling and notification management.',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop'
    },
    {
      title: 'Global Support',
      content: '24/7 customer support and dedicated account management for enterprise clients.',
      image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=400&fit=crop'
    },
    {
      title: 'Multi-Tenant Architecture',
      content: 'Isolated environments for each company while sharing infrastructure resources.',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=400&fit=crop'
    },
    {
      title: 'Advanced Reporting',
      content: 'Comprehensive reports with customizable templates and automated delivery.',
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=400&fit=crop'
    },
    {
      title: 'Integration Hub',
      content: 'Connect with popular CRM, ERP, and automotive software systems.',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop'
    },
    {
      title: 'Performance Monitoring',
      content: 'Real-time performance metrics and system health monitoring.',
      image: 'https://images.unsplash.com/photo-1508780709619-79562169bc64?w=800&h=400&fit=crop'
    },
    {
      title: 'Backup & Recovery',
      content: 'Automated backups and disaster recovery with point-in-time restoration.',
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop'
    },
    {
      title: 'Compliance Management',
      content: 'Built-in compliance tools for automotive industry regulations and standards.',
      image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=400&fit=crop'
    },
    {
      title: 'Cost Optimization',
      content: 'Intelligent resource allocation and cost optimization algorithms.',
      image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=400&fit=crop'
    },
    {
      title: 'User Training',
      content: 'Comprehensive training programs and certification for all user levels.',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop'
    },
    {
      title: 'Quality Assurance',
      content: 'Multi-level quality checks and validation processes for data integrity.',
      image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=400&fit=crop'
    },
    {
      title: 'Custom Workflows',
      content: 'Design custom business workflows that match your operational requirements.',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop'
    },
    {
      title: 'Audit Trail',
      content: 'Complete audit trails for all transactions and data modifications.',
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=400&fit=crop'
    },
    {
      title: 'White Label Solutions',
      content: 'Fully customizable branding and white-label deployment options.',
      image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=400&fit=crop'
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
              <Globe className="h-4 w-4 mr-2" />
              Platform Overview
            </Badge>
            <h3 className="text-3xl font-bold mb-4">
              {slides[activeSlide].title}
            </h3>
            <p className="text-lg text-muted-foreground mb-6">
              {slides[activeSlide].content}
            </p>
            
            {/* Slide Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveSlide(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
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

export default PlatformSection;
