import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

const HeroSection = () => {
  return (
    <section className="py-20 px-6 gradient-hero text-white">
      <div className="container mx-auto text-center">
        <Badge variant="secondary" className="mb-6">
          Enterprise Vehicle Management Platform
        </Badge>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">
          Transform Your Vehicle
          <br />
          <span className="text-accent">Operations</span>
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-white/80 max-w-3xl mx-auto">
          Complete platform for vehicle inspections, trade-in appraisals, and fleet management 
          with enterprise-grade security and scalability.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register-company">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-4">
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="text-lg px-8 py-4 text-white border-white hover:bg-white hover:text-foreground">
            <Play className="mr-2 h-5 w-5" />
            Watch Demo
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;