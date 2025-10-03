import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  Shield,
  Users,
  BarChart3,
  Globe,
  CheckCircle,
  ArrowRight,
  Star,
  Award,
  Zap,
  Clock,
  Heart,
  Target,
  Building,
  Database,
  Search,
  Archive,
  Wrench,
  Settings,
  Megaphone,
  BookOpen,
  Video,
  FileText,
  MessageCircle,
  Download,
  Calendar,
  Play,
  Presentation,
  Menu,
  X,
  ArrowBigUp,
} from "lucide-react";
import { Link } from "react-router-dom";

// Import section components
import HeroSection from "@/components/landing/HeroSection";
import ComprehensiveSolution from "@/components/landing/ComprehensiveSolution";
import PlatformSection from "@/components/landing/PlatformSection";
import InspectionSection from "@/components/landing/InspectionSection";
import TradeinSection from "@/components/landing/TradeinSection";
import AnalyticsSection from "@/components/landing/AnalyticsSection";
import EnterpriseSection from "@/components/landing/EnterpriseSection";
import ModulesSection from "@/components/landing/ModulesSection";
import TechnologySection from "@/components/landing/TechnologySection";
import IntegrationsSection from "@/components/landing/IntegrationsSection";
import SolutionsSection from "@/components/landing/SolutionsSection";
import ResourcesSection from "@/components/landing/ResourcesSection";
import Lenis from "@studio-freight/lenis";

const Landing = () => {
  const [activeSection, setActiveSection] = useState("home");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const sectionRefs = {
    home: useRef(null),
    platform: useRef(null),
    inspection: useRef(null),
    tradein: useRef(null),
    analytics: useRef(null),
    enterprise: useRef(null),
    modules: useRef(null),
    technology: useRef(null),
    integrations: useRef(null),
    solutions: useRef(null),
    resources: useRef(null),
  };

  // Initialize Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Handle section visibility for active menu
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;

      // Find which section is currently in view
      Object.entries(sectionRefs).forEach(([key, ref]) => {
        if (ref.current) {
          const section = ref.current as HTMLElement;
          const sectionTop = section.offsetTop;
          const sectionBottom = sectionTop + section.offsetHeight;

          if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
            setActiveSection(key);
          }
        }
      });
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      lenis.destroy();
    };
  }, []);

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    const section = sectionRefs[sectionId as keyof typeof sectionRefs].current;
    if (section) {
      window.scrollTo({
        top: (section as HTMLElement).offsetTop - 80,
        behavior: "smooth",
      });
      setIsMobileMenuOpen(false);
    }
  };

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
    setActiveSection("home");
    setIsMobileMenuOpen(false);
  };

  const testimonials = [
    {
      name: "John Smith",
      role: "Fleet Manager",
      company: "AutoCorp Solutions",
      content:
        "Auto Erp has revolutionized our inspection process. We've reduced processing time by 75% and increased accuracy significantly.",
      rating: 5,
      image:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face",
    },
    {
      name: "Sarah Johnson",
      role: "Operations Director",
      company: "Premium Motors",
      content:
        "The analytics dashboard gives us insights we never had before. Our ROI has improved by 40% since implementation.",
      rating: 5,
      image:
        "https://images.unsplash.com/photo-1494790108755-2616b332c371?w=80&h=80&fit=crop&crop=face",
    },
    {
      name: "Michael Chen",
      role: "CEO",
      company: "DriveMax Enterprise",
      content:
        "Outstanding platform with exceptional support. The team went above and beyond to customize it for our needs.",
      rating: 5,
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
    },
    {
      name: "Lisa Rodriguez",
      role: "Quality Manager",
      company: "Reliable Auto Group",
      content:
        "Quality control has never been easier. The automated workflows save us hours every day.",
      rating: 5,
      image:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
    },
  ];

  const stats = [
    { number: "10,000+", label: "Vehicles Inspected Daily", icon: Car },
    { number: "500+", label: "Enterprise Clients", icon: Users },
    { number: "99.9%", label: "Uptime Guarantee", icon: Shield },
    { number: "75%", label: "Time Reduction", icon: Clock },
    { number: "$2M+", label: "Cost Savings Generated", icon: Target },
    { number: "24/7", label: "Support Available", icon: Heart },
  ];

  const features = [
    {
      icon: Shield,
      title: "Advanced Security",
      description:
        "Enterprise-grade security with end-to-end encryption and compliance standards.",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description:
        "Optimized performance with sub-second response times and real-time updates.",
      gradient: "from-yellow-500 to-orange-500",
    },
    {
      icon: Award,
      title: "Industry Leading",
      description:
        "Recognized by automotive industry experts and trusted by Fortune 500 companies.",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: Globe,
      title: "Global Scale",
      description:
        "Multi-region deployment with support for international operations and compliance.",
      gradient: "from-green-500 to-emerald-500",
    },
  ];

  const industries = [
    {
      name: "Automotive Dealers",
      description:
        "Streamline your dealership operations with comprehensive vehicle management.",
      image:
        "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=300&fit=crop",
      features: [
        "Inventory Management",
        "Trade-in Processing",
        "Customer Relations",
      ],
    },
    {
      name: "Fleet Management",
      description:
        "Optimize your fleet operations with real-time tracking and maintenance scheduling.",
      image:
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",
      features: ["Fleet Tracking", "Maintenance Alerts", "Cost Analysis"],
    },
    {
      name: "Insurance Companies",
      description:
        "Accelerate claims processing with digital inspection and damage assessment.",
      image:
        "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=300&fit=crop",
      features: ["Claims Processing", "Damage Assessment", "Risk Analysis"],
    },
    {
      name: "Rental Companies",
      description:
        "Manage your rental fleet with automated check-in/check-out processes.",
      image:
        "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop",
      features: ["Fleet Status", "Damage Tracking", "Revenue Analytics"],
    },
  ];

  const plans = [
    {
      name: "Basic",
      price: "$99",
      period: "/month",
      users: "15 Users",
      features: [
        "Vehicle inspection management",
        "Basic reporting",
        "Email support",
        "Mobile app access",
        "Standard integrations",
        "5GB storage",
        "Basic analytics",
      ],
      popular: false,
    },
    {
      name: "Intermediate",
      price: "$199",
      period: "/month",
      users: "30 Users",
      features: [
        "Everything in Basic",
        "Advanced analytics",
        "Priority support",
        "Custom workflows",
        "API access",
        "Multi-location support",
        "50GB storage",
        "Advanced reporting",
        "Custom integrations",
      ],
      popular: true,
    },
    {
      name: "Pro",
      price: "$399",
      period: "/month",
      users: "50 Users",
      features: [
        "Everything in Intermediate",
        "Custom UI requirements",
        "Dedicated account manager",
        "Advanced integrations",
        "White-label options",
        "Custom training",
        "Unlimited storage",
        "Enterprise security",
        "SLA guarantee",
      ],
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b bg-card/95 backdrop-blur-md fixed top-0 left-0 right-0 z-50 animate-fade-in">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={scrollToTop}
          >
            <Car className="h-7 w-7 sm:h-8 sm:w-8 text-primary animate-pulse" />
            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Auto Erp
            </span>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="h-9 w-9"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Desktop Navigation Menu */}
          <nav className="hidden lg:flex items-center space-x-1">
            {Object.entries({
              home: "Home",
              platform: "Platform",
              inspection: "Inspection",
              tradein: "Trade-in",
              analytics: "Analytics",
              enterprise: "Enterprise",
              modules: "Modules",
              technology: "Technology",
              integrations: "Integrations",
              solutions: "Solutions",
              resources: "Resources",
            }).map(([key, label]) => (
              <button
                key={key}
                onClick={() => scrollToSection(key)}
                className={`relative text-sm font-medium transition-all duration-200 px-3 py-2 rounded-full ${
                  activeSection === key
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-primary hover:bg-muted"
                }`}
              >
                {label}
                {activeSection === key && (
                  <span className="absolute inset-0 rounded-full border border-primary/30" />
                )}
              </button>
            ))}
          </nav>

          <div className="hidden lg:flex items-center space-x-3">
            <Link to="/login">
              <Button variant="ghost" className="hover-scale">
                Login
              </Button>
            </Link>
            <Link to="/register-company">
              <Button className="hover-scale">Get Started</Button>
            </Link>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t bg-card/95 backdrop-blur-md">
            <div className="container mx-auto px-4 py-3">
              <nav className="grid grid-cols-2 gap-2">
                {Object.entries({
                  home: "Home",
                  platform: "Platform",
                  inspection: "Inspection",
                  tradein: "Trade-in",
                  analytics: "Analytics",
                  enterprise: "Enterprise",
                  modules: "Modules",
                  technology: "Technology",
                  integrations: "Integrations",
                  solutions: "Solutions",
                  resources: "Resources",
                }).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => scrollToSection(key)}
                    className={`text-left text-sm font-medium transition-all duration-200 px-3 py-2 rounded-lg ${
                      activeSection === key
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-primary hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </nav>
              <div className="flex space-x-3 mt-4 pt-4 border-t">
                <Link to="/login" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Login
                  </Button>
                </Link>
                <Link to="/register-company" className="flex-1">
                  <Button className="w-full">Get Started</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <div ref={sectionRefs.home} className="pt-10">
        <HeroSection />
      </div>

      {/* Stats Section */}
      <section className="py-12 px-4 sm:px-6 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={index}
                  className="text-center hover-scale transition-all duration-500"
                >
                  <CardContent className="p-3 sm:p-4">
                    <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto mb-2" />
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-primary">
                      {stat.number}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {stat.label}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="container mx-auto">
          <div className="text-center mb-10 sm:mb-12 animate-fade-in">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Why Choose Auto Erp?
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              Built for the modern automotive industry with cutting-edge
              technology and innovative features
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="group hover-scale transition-all duration-300 hover:shadow-xl"
                >
                  <CardContent className="p-5 sm:p-6">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br ${feature.gradient} p-2 sm:p-3 mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Carousel */}
      <ComprehensiveSolution />

      {/* Platform Section */}
      <section
        ref={sectionRefs.platform}
        className="py-16 sm:py-20 px-4 sm:px-6"
      >
        <div className="container mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <Badge
              variant="outline"
              className="mb-4 text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-2"
            >
              Platform Overview
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Enterprise Vehicle Management Platform
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              Comprehensive platform designed to handle all aspects of vehicle
              management across multiple companies and locations
            </p>
          </div>
          <PlatformSection />
        </div>
      </section>

      {/* Inspection Section */}
      <section
        ref={sectionRefs.inspection}
        className="py-16 sm:py-20 px-4 sm:px-6 bg-muted/30"
      >
        <div className="container mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <Badge
              variant="outline"
              className="mb-4 text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-2"
            >
              Inspection Management
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Digital Vehicle Inspections
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              Multi-stage inspection process with configurable templates and
              quality assurance
            </p>
          </div>
          <InspectionSection />
        </div>
      </section>

      {/* Trade-in Section */}
      <section
        ref={sectionRefs.tradein}
        className="py-16 sm:py-20 px-4 sm:px-6"
      >
        <div className="container mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <Badge
              variant="outline"
              className="mb-4 text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-2"
            >
              Trade-in Appraisal
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Smart Vehicle Valuation
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              AI-powered appraisal system with market data integration and
              instant pricing
            </p>
          </div>
          <TradeinSection />
        </div>
      </section>

      {/* Analytics Section */}
      <section
        ref={sectionRefs.analytics}
        className="py-16 sm:py-20 px-4 sm:px-6 bg-muted/30"
      >
        <div className="container mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <Badge
              variant="outline"
              className="mb-4 text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-2"
            >
              Analytics & Reporting
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Data-Driven Insights
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              Advanced analytics dashboard with predictive insights and custom
              reporting tools
            </p>
          </div>
          <AnalyticsSection />
        </div>
      </section>

      {/* Enterprise Section */}
      <section
        ref={sectionRefs.enterprise}
        className="py-16 sm:py-20 px-4 sm:px-6"
      >
        <div className="container mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <Badge
              variant="outline"
              className="mb-4 text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-2"
            >
              Enterprise Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Scale with Confidence
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              Enterprise-grade features with advanced security, compliance, and
              scalability
            </p>
          </div>
          <EnterpriseSection />
        </div>
      </section>

      {/* Modules Section */}
      <section
        ref={sectionRefs.modules}
        className="py-16 sm:py-20 px-4 sm:px-6 bg-muted/30"
      >
        <div className="container mx-auto">
          <ModulesSection />
        </div>
      </section>

      {/* Technology Section */}
      <section
        ref={sectionRefs.technology}
        className="py-16 sm:py-20 px-4 sm:px-6"
      >
        <div className="container mx-auto">
          <TechnologySection />
        </div>
      </section>

      {/* Integrations Section */}
      <section
        ref={sectionRefs.integrations}
        className="py-16 sm:py-20 px-4 sm:px-6 bg-muted/30"
      >
        <div className="container mx-auto">
          <IntegrationsSection />
        </div>
      </section>

      {/* Solutions Section */}
      <section
        ref={sectionRefs.solutions}
        className="py-16 sm:py-20 px-4 sm:px-6"
      >
        <div className="container mx-auto">
          <SolutionsSection />
        </div>
      </section>

      {/* Resources Section */}
      <section
        ref={sectionRefs.resources}
        className="py-16 sm:py-20 px-4 sm:px-6 bg-muted/30"
      >
        <div className="container mx-auto">
          <ResourcesSection />
        </div>
      </section>

      {/* Industries Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="container mx-auto">
          <div className="text-center mb-10 sm:mb-12 animate-fade-in">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Trusted Across Industries
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              From automotive dealers to fleet management companies, Auto Erp
              adapts to your industry needs
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {industries.map((industry, index) => (
              <Card
                key={index}
                className="group hover-scale transition-all duration-300 hover:shadow-xl overflow-hidden"
              >
                <div
                  className="h-40 sm:h-48 bg-cover bg-center group-hover:scale-105 transition-transform duration-300"
                  style={{ backgroundImage: `url(${industry.image})` }}
                />
                <CardContent className="p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">
                    {industry.name}
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4">
                    {industry.description}
                  </p>
                  <ul className="space-y-1">
                    {industry.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-center text-xs sm:text-sm"
                      >
                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-primary mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="container mx-auto">
          <div className="text-center mb-10 sm:mb-12 animate-fade-in">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              What Our Clients Say
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground">
              Hear from industry leaders who trust Auto Erp
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {testimonials.map((testimonial, index) => (
              <Card
                key={index}
                className="hover-scale transition-all duration-300"
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full mr-3 sm:mr-4"
                    />
                    <div>
                      <h4 className="font-semibold text-sm sm:text-base">
                        {testimonial.name}
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {testimonial.role}
                      </p>
                      <p className="text-xs text-primary">
                        {testimonial.company}
                      </p>
                    </div>
                    <div className="ml-auto flex space-x-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star
                          key={i}
                          className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 fill-current"
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm sm:text-base text-muted-foreground italic">
                    "{testimonial.content}"
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="container mx-auto">
          <div className="text-center mb-10 sm:mb-12 animate-fade-in">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Choose Your Plan
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Flexible pricing options to match your business needs with
              transparent, no-hidden-fees pricing
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative hover-scale transition-all duration-300 ${
                  plan.popular ? "border-primary shadow-lg md:scale-105" : ""
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 animate-pulse text-xs">
                    Most Popular
                  </Badge>
                )}
                <CardContent className="p-4 sm:p-6 text-center">
                  <h3 className="text-xl sm:text-2xl font-bold mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-3xl sm:text-4xl font-bold">
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <Badge variant="secondary" className="mb-4 sm:mb-6 text-xs">
                    {plan.users}
                  </Badge>
                  <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-left">
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success mr-2 flex-shrink-0" />
                        <span className="text-xs sm:text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/register-company">
                    <Button
                      className="w-full hover-scale text-sm sm:text-base"
                      variant={plan.popular ? "default" : "outline"}
                      size={plan.popular ? "default" : "sm"}
                    >
                      Get Started
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70" />
        <div className="container mx-auto text-center text-white relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 animate-fade-in">
            Ready to Transform Your Business?
          </h2>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8 text-white/80 max-w-2xl mx-auto animate-fade-in">
            Join thousands of automotive professionals who trust Auto Erp for
            their operations. Start your free trial today and experience the
            difference.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-fade-in">
            <Link to="/register-company">
              <Button
                size="lg"
                variant="secondary"
                className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 hover-scale"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button
                size="lg"
                variant="outline"
                className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 text-white border-white hover:bg-white hover:text-foreground hover-scale"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-10 sm:py-12 px-4 sm:px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Car className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                <span className="text-lg sm:text-xl font-bold">Auto Erp</span>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                Enterprise vehicle management platform for the modern automotive
                industry. Trusted by Fortune 500 companies worldwide.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  SOC 2 Certified
                </Badge>
                <Badge variant="outline" className="text-xs">
                  ISO 27001
                </Badge>
                <Badge variant="outline" className="text-xs">
                  GDPR Compliant
                </Badge>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">
                Product
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="hover:text-primary cursor-pointer transition-colors">
                  Inspections
                </li>
                <li className="hover:text-primary cursor-pointer transition-colors">
                  Trade-ins
                </li>
                <li className="hover:text-primary cursor-pointer transition-colors">
                  Analytics
                </li>
                <li className="hover:text-primary cursor-pointer transition-colors">
                  API
                </li>
                <li className="hover:text-primary cursor-pointer transition-colors">
                  Mobile Apps
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">
                Company
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="hover:text-primary cursor-pointer transition-colors">
                  About
                </li>
                <li className="hover:text-primary cursor-pointer transition-colors">
                  Careers
                </li>
                <li className="hover:text-primary cursor-pointer transition-colors">
                  Contact
                </li>
                <li className="hover:text-primary cursor-pointer transition-colors">
                  Support
                </li>
                <li className="hover:text-primary cursor-pointer transition-colors">
                  Partners
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">
                Resources
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="hover:text-primary cursor-pointer transition-colors">
                  Documentation
                </li>
                <li className="hover:text-primary cursor-pointer transition-colors">
                  Help Center
                </li>
                <li className="hover:text-primary cursor-pointer transition-colors">
                  Blog
                </li>
                <li className="hover:text-primary cursor-pointer transition-colors">
                  Webinars
                </li>
                <li className="hover:text-primary cursor-pointer transition-colors">
                  Case Studies
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
            <p>&copy; 2024 Auto Erp. All rights reserved.</p>
            <div className="flex flex-wrap gap-3 sm:gap-4 mt-4 md:mt-0">
              <span className="hover:text-primary cursor-pointer transition-colors">
                Privacy Policy
              </span>
              <span className="hover:text-primary cursor-pointer transition-colors">
                Terms of Service
              </span>
              <span className="hover:text-primary cursor-pointer transition-colors">
                Security
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-primary text-white shadow-lg hover:scale-110 transition-transform duration-200"
        aria-label="Scroll to top"
      >
        <ArrowBigUp className="h-5 w-5 rotate-270" />
      </button>
    </div>
  );
};

export default Landing;
