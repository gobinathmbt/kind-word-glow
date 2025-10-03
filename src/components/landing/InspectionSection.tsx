
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Shield } from 'lucide-react';

const InspectionSection = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      title: 'Digital Inspection Forms',
      content: 'Customizable digital forms with photo capture and condition scoring.',
      image: 'https://images.unsplash.com/photo-1549317336-206569e8475c?w=800&h=400&fit=crop'
    },
    {
      title: 'Quality Assurance',
      content: 'Multi-level review process ensuring consistent inspection standards.',
      image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=400&fit=crop'
    },
    {
      title: 'Photo Documentation',
      content: 'High-resolution photo capture with automatic compression and cloud storage.',
      image: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=800&h=400&fit=crop'
    },
    {
      title: 'Damage Assessment',
      content: 'Advanced damage detection and cost estimation algorithms.',
      image: 'https://images.unsplash.com/photo-1625047509252-8ec7f8090e37?w=800&h=400&fit=crop'
    },
    {
      title: 'Inspector Tracking',
      content: 'Real-time location tracking and performance monitoring for field inspectors.',
      image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=400&fit=crop'
    },
    {
      title: 'Report Generation',
      content: 'Automated report generation with customizable templates and branding.',
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=400&fit=crop'
    },
    {
      title: 'Condition Scoring',
      content: 'Standardized scoring system for consistent vehicle condition assessment.',
      image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=400&fit=crop'
    },
    {
      title: 'Compliance Tracking',
      content: 'Regulatory compliance monitoring and audit trail maintenance.',
      image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=400&fit=crop'
    },
    {
      title: 'Time Optimization',
      content: 'Efficient scheduling and routing for maximum inspector productivity.',
      image: 'https://images.unsplash.com/photo-1508780709619-79562169bc64?w=800&h=400&fit=crop'
    },
    {
      title: 'Integration APIs',
      content: 'Seamless integration with existing dealer management systems.',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=400&fit=crop'
    },
    {
      title: 'AI-Powered Analysis',
      content: 'Machine learning algorithms for predictive maintenance and defect detection.',
      image: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&h=400&fit=crop'
    },
    {
      title: 'Mobile Optimization',
      content: 'Native mobile apps optimized for field inspections and offline functionality.',
      image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=400&fit=crop'
    },
    {
      title: 'Custom Checklists',
      content: 'Create custom inspection checklists for different vehicle types and requirements.',
      image: 'https://images.unsplash.com/photo-1549317336-206569e8475c?w=800&h=400&fit=crop'
    },
    {
      title: 'Historical Data',
      content: 'Access complete inspection history and track vehicle condition changes over time.',
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=400&fit=crop'
    },
    {
      title: 'Defect Classification',
      content: 'Automated defect classification and severity assessment using computer vision.',
      image: 'https://images.unsplash.com/photo-1625047509252-8ec7f8090e37?w=800&h=400&fit=crop'
    },
    {
      title: 'Inspector Certification',
      content: 'Built-in certification and training programs for inspector quality assurance.',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop'
    },
    {
      title: 'Video Documentation',
      content: 'HD video recording capabilities for comprehensive vehicle documentation.',
      image: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=800&h=400&fit=crop'
    },
    {
      title: 'Real-time Notifications',
      content: 'Instant notifications for inspection completion and status updates.',
      image: 'https://images.unsplash.com/photo-1508780709619-79562169bc64?w=800&h=400&fit=crop'
    },
    {
      title: 'Multi-language Support',
      content: 'Inspection forms and reports available in multiple languages for global operations.',
      image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=400&fit=crop'
    },
    {
      title: 'Inspection Analytics',
      content: 'Detailed analytics on inspection patterns, common defects, and inspector performance.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop'
    },
    {
      title: 'Batch Processing',
      content: 'Efficient batch processing of multiple vehicle inspections with bulk operations.',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop'
    },
    {
      title: 'Voice Commands',
      content: 'Voice-activated inspection recording for hands-free operation in the field.',
      image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=400&fit=crop'
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
              <Shield className="h-4 w-4 mr-2" />
              Inspection Management
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

export default InspectionSection;
