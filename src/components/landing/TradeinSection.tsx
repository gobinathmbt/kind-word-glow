
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Car } from 'lucide-react';

const TradeinSection = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      title: 'Market Valuation',
      content: 'Real-time market data integration for accurate vehicle pricing.',
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=400&fit=crop'
    },
    {
      title: 'Instant Quotes',
      content: 'Generate competitive trade-in offers in seconds based on market data.',
      image: 'https://images.unsplash.com/photo-1549399478-8861d2a3ba95?w=800&h=400&fit=crop'
    },
    {
      title: 'Condition Factors',
      content: 'Advanced algorithms considering condition, mileage, and market demand.',
      image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&h=400&fit=crop'
    },
    {
      title: 'Historical Analytics',
      content: 'Track pricing trends and market performance over time.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop'
    },
    {
      title: 'Negotiation Tools',
      content: 'Built-in tools for transparent and efficient price negotiations.',
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=400&fit=crop'
    },
    {
      title: 'Document Management',
      content: 'Secure storage and processing of vehicle documentation.',
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=400&fit=crop'
    },
    {
      title: 'Customer Portal',
      content: 'Self-service portal for customers to track their trade-in process.',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=400&fit=crop'
    },
    {
      title: 'Auction Integration',
      content: 'Direct integration with major automotive auction platforms.',
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop'
    },
    {
      title: 'Finance Options',
      content: 'Integrated financing options and payment processing.',
      image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=400&fit=crop'
    },
    {
      title: 'ROI Tracking',
      content: 'Comprehensive analytics on trade-in program profitability.',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop'
    },
    {
      title: 'Predictive Pricing',
      content: 'AI-powered predictive pricing models for future market conditions.',
      image: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&h=400&fit=crop'
    },
    {
      title: 'Multi-Channel Selling',
      content: 'Sell through multiple channels including online marketplaces and auctions.',
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop'
    },
    {
      title: 'Inventory Management',
      content: 'Smart inventory management with automated rebalancing and optimization.',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop'
    },
    {
      title: 'Customer Communication',
      content: 'Automated customer communication throughout the trade-in process.',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=400&fit=crop'
    },
    {
      title: 'Market Intelligence',
      content: 'Real-time market intelligence and competitive analysis tools.',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop'
    },
    {
      title: 'Risk Assessment',
      content: 'Automated risk assessment and fraud detection for trade-in transactions.',
      image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=400&fit=crop'
    },
    {
      title: 'Digital Contracts',
      content: 'Electronic contract generation and digital signature capabilities.',
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=400&fit=crop'
    },
    {
      title: 'Payment Processing',
      content: 'Secure payment processing with multiple payment method support.',
      image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=400&fit=crop'
    },
    {
      title: 'Title Management',
      content: 'Automated title transfer and DMV integration for streamlined processing.',
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=400&fit=crop'
    },
    {
      title: 'Performance Analytics',
      content: 'Detailed performance analytics for trade-in program optimization.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop'
    },
    {
      title: 'Customer Satisfaction',
      content: 'Built-in customer feedback and satisfaction tracking systems.',
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=400&fit=crop'
    },
    {
      title: 'Trade-in Alerts',
      content: 'Smart alerts for trade-in opportunities and market changes.',
      image: 'https://images.unsplash.com/photo-1508780709619-79562169bc64?w=800&h=400&fit=crop'
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
              <Car className="h-4 w-4 mr-2" />
              Trade-in Appraisal
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

export default TradeinSection;
