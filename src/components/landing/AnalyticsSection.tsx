
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';

const AnalyticsSection = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      title: 'Executive Dashboards',
      content: 'High-level KPIs and metrics for strategic decision making.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop'
    },
    {
      title: 'Performance Metrics',
      content: 'Detailed performance tracking for inspectors and appraisers.',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop'
    },
    {
      title: 'Revenue Analytics',
      content: 'Comprehensive revenue analysis and forecasting tools.',
      image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=400&fit=crop'
    },
    {
      title: 'Custom Reports',
      content: 'Build custom reports with drag-and-drop interface.',
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=400&fit=crop'
    },
    {
      title: 'Predictive Analytics',
      content: 'AI-powered insights for market trends and demand forecasting.',
      image: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&h=400&fit=crop'
    },
    {
      title: 'Operational Insights',
      content: 'Deep dive into operational efficiency and process optimization.',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop'
    },
    {
      title: 'Market Intelligence',
      content: 'Competitive analysis and market positioning insights.',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=400&fit=crop'
    },
    {
      title: 'Risk Assessment',
      content: 'Automated risk scoring and fraud detection systems.',
      image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=400&fit=crop'
    },
    {
      title: 'Export & API',
      content: 'Flexible data export options and API access for custom integrations.',
      image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&h=400&fit=crop'
    },
    {
      title: 'Real-time Updates',
      content: 'Live data feeds and instant notification systems.',
      image: 'https://images.unsplash.com/photo-1508780709619-79562169bc64?w=800&h=400&fit=crop'
    },
    {
      title: 'Data Visualization',
      content: 'Interactive charts and graphs with drill-down capabilities.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop'
    },
    {
      title: 'Business Intelligence',
      content: 'Advanced BI tools for data mining and pattern recognition.',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop'
    },
    {
      title: 'Trend Analysis',
      content: 'Historical trend analysis and seasonal pattern identification.',
      image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=400&fit=crop'
    },
    {
      title: 'Cost Analysis',
      content: 'Detailed cost breakdown and profitability analysis by category.',
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=400&fit=crop'
    },
    {
      title: 'Customer Analytics',
      content: 'Customer behavior analysis and segmentation insights.',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop'
    },
    {
      title: 'Inventory Analytics',
      content: 'Inventory turnover analysis and optimization recommendations.',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=400&fit=crop'
    },
    {
      title: 'Quality Metrics',
      content: 'Quality control metrics and inspection accuracy tracking.',
      image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=400&fit=crop'
    },
    {
      title: 'Benchmark Analysis',
      content: 'Industry benchmarking and competitive performance comparison.',
      image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&h=400&fit=crop'
    },
    {
      title: 'Anomaly Detection',
      content: 'Automated anomaly detection and alert systems for unusual patterns.',
      image: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&h=400&fit=crop'
    },
    {
      title: 'ROI Calculation',
      content: 'Automated ROI calculations for different business initiatives.',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop'
    },
    {
      title: 'Compliance Reports',
      content: 'Automated compliance reporting for regulatory requirements.',
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=400&fit=crop'
    },
    {
      title: 'Mobile Analytics',
      content: 'Mobile-optimized analytics dashboards for on-the-go insights.',
      image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=400&fit=crop'
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
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics & Reporting
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

export default AnalyticsSection;
