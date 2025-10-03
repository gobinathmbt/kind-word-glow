
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, Shield, Users, BarChart3, Globe, ArrowRight, CheckCircle, Zap, Target, Award } from 'lucide-react';

const ComprehensiveSolution = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Intersection observer for animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById('comprehensive-solution');
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      id: 'platform',
      title: 'Platform Overview',
      icon: Globe,
      subtitle: 'Complete Ecosystem',
      description: 'Unified platform that brings together all your vehicle management needs in one place.',
      gradient: 'from-blue-500 via-blue-600 to-purple-600',
      benefits: [
        'Centralized vehicle database',
        'Real-time synchronization',
        'Multi-location support',
        'Cloud-based infrastructure'
      ],
      stats: { number: '99.9%', label: 'Uptime' },
      image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&h=400&fit=crop'
    },
    {
      id: 'inspection',
      title: 'Inspection Management',
      icon: Shield,
      subtitle: 'Quality Assurance',
      description: 'Comprehensive inspection workflows with digital checklists and automated reporting.',
      gradient: 'from-green-500 via-emerald-600 to-teal-600',
      benefits: [
        'Digital inspection forms',
        'Photo documentation',
        'Automated reports',
        'Quality scoring'
      ],
      stats: { number: '10K+', label: 'Daily Inspections' },
      image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&h=400&fit=crop'
    },
    {
      id: 'tradein',
      title: 'Trade-in Appraisal',
      icon: Car,
      subtitle: 'Smart Valuations',
      description: 'AI-powered vehicle appraisal system with market data integration and instant pricing.',
      gradient: 'from-orange-500 via-red-600 to-pink-600',
      benefits: [
        'AI-powered valuations',
        'Market data integration',
        'Instant pricing',
        'Condition assessment'
      ],
      stats: { number: '$2M+', label: 'Saved Annually' },
      image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&h=400&fit=crop'
    },
    {
      id: 'analytics',
      title: 'Analytics & Reporting',
      icon: BarChart3,
      subtitle: 'Data Intelligence',
      description: 'Advanced analytics dashboard with predictive insights and custom reporting tools.',
      gradient: 'from-purple-500 via-violet-600 to-indigo-600',
      benefits: [
        'Real-time dashboards',
        'Predictive analytics',
        'Custom reports',
        'Performance metrics'
      ],
      stats: { number: '40%', label: 'ROI Increase' },
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop'
    },
    {
      id: 'enterprise',
      title: 'Enterprise Features',
      icon: Users,
      subtitle: 'Scale & Security',
      description: 'Enterprise-grade features with advanced security, compliance, and scalability.',
      gradient: 'from-gray-600 via-gray-700 to-gray-800',
      benefits: [
        'Role-based access',
        'Enterprise security',
        'API integrations',
        'Compliance tools'
      ],
      stats: { number: '500+', label: 'Enterprise Clients' },
      image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&h=400&fit=crop'
    }
  ];

  const currentFeature = features[activeFeature];
  const FeatureIcon = currentFeature.icon;

  return (
    <div id="comprehensive-solution" className="py-20 px-6 bg-gradient-to-br from-muted/30 to-muted/60 relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="container mx-auto relative z-10">
        <div className={`text-center mb-12 transition-all duration-1000 ${isVisible ? 'animate-fade-in' : 'opacity-0'}`}>
          <Badge variant="secondary" className="mb-4 animate-pulse">
            <Zap className="h-4 w-4 mr-1" />
            Comprehensive Solution
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Everything You Need
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Discover our platform's powerful features designed for the modern automotive industry
          </p>
        </div>

        {/* Feature Navigation Dots */}
        <div className="flex justify-center mb-8 space-x-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <button
                key={feature.id}
                onClick={() => setActiveFeature(index)}
                className={`group relative p-3 rounded-full transition-all duration-300 hover-scale ${
                  activeFeature === index
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'bg-card hover:bg-primary/10'
                }`}
              >
                <Icon className="h-5 w-5" />
                <div className={`absolute -top-12 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap ${
                  activeFeature === index ? 'opacity-100' : ''
                }`}>
                  {feature.title}
                </div>
              </button>
            );
          })}
        </div>

        {/* Main Feature Display */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content Side */}
          <div className={`space-y-6 transition-all duration-700 ${isVisible ? 'animate-fade-in' : 'opacity-0'}`} key={activeFeature}>
            <div className="space-y-4">
              <div className={`inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r ${currentFeature.gradient} text-white`}>
                <FeatureIcon className="h-5 w-5 mr-2" />
                <span className="font-semibold">{currentFeature.subtitle}</span>
              </div>

              <h3 className="text-3xl font-bold">{currentFeature.title}</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {currentFeature.description}
              </p>
            </div>

            {/* Benefits Grid */}
            <div className="grid grid-cols-2 gap-3">
              {currentFeature.benefits.map((benefit, index) => (
                <div 
                  key={benefit}
                  className="flex items-center space-x-2 animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                  <span className="text-sm">{benefit}</span>
                </div>
              ))}
            </div>

            {/* Stats */}
            <Card className="inline-block hover-scale">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${currentFeature.gradient} p-3 animate-pulse`}>
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{currentFeature.stats.number}</div>
                    <div className="text-sm text-muted-foreground">{currentFeature.stats.label}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button size="lg" className="group hover-scale">
              Learn More
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* Visual Side */}
          <div className="relative">
            <div className="relative group">
              {/* Main Image */}
              <div className="relative overflow-hidden rounded-2xl shadow-2xl">
                <img
                  src={currentFeature.image}
                  alt={currentFeature.title}
                  className="w-full h-96 object-cover transition-transform duration-700 group-hover:scale-105"
                  key={currentFeature.id}
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${currentFeature.gradient} opacity-20`} />
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 animate-float">
                <Card className="p-3 shadow-lg">
                  <Award className="h-6 w-6 text-primary" />
                </Card>
              </div>

              <div className="absolute -bottom-4 -left-4 animate-float" style={{ animationDelay: '1s' }}>
                <Card className="p-4 shadow-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
                    <span className="text-sm font-medium">Active</span>
                  </div>
                </Card>
              </div>
            </div>

            {/* Background Pattern */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 to-accent/5 rounded-3xl transform rotate-3 scale-105" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-12 flex justify-center">
          <div className="w-64 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${currentFeature.gradient} transition-all duration-4000`}
              style={{ width: `${((activeFeature + 1) / features.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <style>{`
        .bg-grid-pattern {
          background-image: radial-gradient(circle, rgba(var(--primary), 0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default ComprehensiveSolution;
