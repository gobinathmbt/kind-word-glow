import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Video,
  FileText,
  Users,
  MessageCircle,
  Download,
  ExternalLink,
  Calendar,
  Clock,
  Star,
  Play,
  Presentation
} from 'lucide-react';

const ResourcesSection = () => {
  const [activeCategory, setActiveCategory] = useState(0);

  const categories = [
    {
      title: 'Documentation',
      icon: BookOpen,
      description: 'Comprehensive guides and API documentation',
      color: 'from-blue-500 to-cyan-500',
      resources: [
        {
          title: 'Getting Started Guide',
          description: 'Complete onboarding guide for new users',
          type: 'Guide',
          duration: '15 min read',
          difficulty: 'Beginner',
          thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=300&h=200&fit=crop',
          url: '/docs/getting-started'
        },
        {
          title: 'API Reference',
          description: 'Complete API documentation with examples',
          type: 'Reference',
          duration: 'Interactive',
          difficulty: 'Advanced',
          thumbnail: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=300&h=200&fit=crop',
          url: '/docs/api'
        },
        {
          title: 'Integration Guides',
          description: 'Step-by-step integration tutorials',
          type: 'Tutorial',
          duration: '30 min read',
          difficulty: 'Intermediate',
          thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=300&h=200&fit=crop',
          url: '/docs/integrations'
        },
        {
          title: 'Best Practices',
          description: 'Industry best practices and recommendations',
          type: 'Guide',
          duration: '20 min read',
          difficulty: 'Intermediate',
          thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&h=200&fit=crop',
          url: '/docs/best-practices'
        }
      ]
    },
    {
      title: 'Video Tutorials',
      icon: Video,
      description: 'Learn with step-by-step video content',
      color: 'from-red-500 to-pink-500',
      resources: [
        {
          title: 'Platform Overview',
          description: 'Complete platform walkthrough in 10 minutes',
          type: 'Video',
          duration: '10:30',
          difficulty: 'Beginner',
          thumbnail: 'https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=300&h=200&fit=crop',
          url: '/videos/overview'
        },
        {
          title: 'Vehicle Inspection Setup',
          description: 'Configure your first inspection workflow',
          type: 'Tutorial',
          duration: '15:45',
          difficulty: 'Beginner',
          thumbnail: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&h=200&fit=crop',
          url: '/videos/inspection-setup'
        },
        {
          title: 'Advanced Analytics',
          description: 'Deep dive into analytics and reporting features',
          type: 'Tutorial',
          duration: '22:15',
          difficulty: 'Advanced',
          thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=300&h=200&fit=crop',
          url: '/videos/analytics'
        },
        {
          title: 'API Integration Workshop',
          description: 'Build your first API integration',
          type: 'Workshop',
          duration: '45:00',
          difficulty: 'Advanced',
          thumbnail: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=300&h=200&fit=crop',
          url: '/videos/api-workshop'
        }
      ]
    },
    {
      title: 'Webinars & Events',
      icon: Presentation,
      description: 'Live sessions and recorded webinars',
      color: 'from-green-500 to-emerald-500',
      resources: [
        {
          title: 'Monthly Product Update',
          description: 'Latest features and roadmap discussion',
          type: 'Live Webinar',
          duration: 'Next: Dec 15',
          difficulty: 'All Levels',
          thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=200&fit=crop',
          url: '/events/product-update'
        },
        {
          title: 'Industry Best Practices',
          description: 'Learn from automotive industry experts',
          type: 'Recorded',
          duration: '35:20',
          difficulty: 'Intermediate',
          thumbnail: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=300&h=200&fit=crop',
          url: '/events/best-practices'
        },
        {
          title: 'Customer Success Stories',
          description: 'Real-world implementations and results',
          type: 'Case Study',
          duration: '28:45',
          difficulty: 'All Levels',
          thumbnail: 'https://images.unsplash.com/photo-1560472355-536de3962603?w=300&h=200&fit=crop',
          url: '/events/success-stories'
        },
        {
          title: 'Technical Deep Dive',
          description: 'Advanced technical implementation session',
          type: 'Technical',
          duration: '60:00',
          difficulty: 'Advanced',
          thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop',
          url: '/events/technical-dive'
        }
      ]
    },
    {
      title: 'Downloads',
      icon: Download,
      description: 'Templates, guides, and tools',
      color: 'from-purple-500 to-pink-500',
      resources: [
        {
          title: 'Inspection Checklist Template',
          description: 'Customizable vehicle inspection checklist',
          type: 'Template',
          duration: 'PDF Download',
          difficulty: 'All Levels',
          thumbnail: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=300&h=200&fit=crop',
          url: '/downloads/inspection-template'
        },
        {
          title: 'ROI Calculator',
          description: 'Calculate your potential return on investment',
          type: 'Tool',
          duration: 'Excel File',
          difficulty: 'Intermediate',
          thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&h=200&fit=crop',
          url: '/downloads/roi-calculator'
        },
        {
          title: 'Implementation Checklist',
          description: 'Step-by-step implementation guide',
          type: 'Checklist',
          duration: 'PDF Download',
          difficulty: 'All Levels',
          thumbnail: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=300&h=200&fit=crop',
          url: '/downloads/implementation'
        },
        {
          title: 'Mobile App User Guide',
          description: 'Complete guide for mobile application',
          type: 'Guide',
          duration: 'PDF Download',
          difficulty: 'Beginner',
          thumbnail: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=300&h=200&fit=crop',
          url: '/downloads/mobile-guide'
        }
      ]
    },
    {
      title: 'Community',
      icon: Users,
      description: 'Connect with other users and experts',
      color: 'from-yellow-500 to-orange-500',
      resources: [
        {
          title: 'Community Forum',
          description: 'Ask questions and share knowledge',
          type: 'Forum',
          duration: '5,200+ Members',
          difficulty: 'All Levels',
          thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=200&fit=crop',
          url: '/community/forum'
        },
        {
          title: 'User Groups',
          description: 'Local and virtual user group meetings',
          type: 'Meetup',
          duration: 'Monthly',
          difficulty: 'All Levels',
          thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop',
          url: '/community/groups'
        },
        {
          title: 'Developer Discord',
          description: 'Real-time chat with developers',
          type: 'Chat',
          duration: '24/7 Active',
          difficulty: 'Technical',
          thumbnail: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=300&h=200&fit=crop',
          url: '/community/discord'
        },
        {
          title: 'Success Network',
          description: 'Connect with successful customers',
          type: 'Network',
          duration: 'Invitation Only',
          difficulty: 'Enterprise',
          thumbnail: 'https://images.unsplash.com/photo-1560472355-536de3962603?w=300&h=200&fit=crop',
          url: '/community/success'
        }
      ]
    },
    {
      title: 'Support',
      icon: MessageCircle,
      description: 'Get help when you need it',
      color: 'from-indigo-500 to-blue-500',
      resources: [
        {
          title: 'Help Center',
          description: 'Searchable knowledge base with FAQs',
          type: 'Knowledge Base',
          duration: '500+ Articles',
          difficulty: 'All Levels',
          thumbnail: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=300&h=200&fit=crop',
          url: '/support/help'
        },
        {
          title: 'Live Chat Support',
          description: 'Instant help from our support team',
          type: 'Live Chat',
          duration: '24/7 Available',
          difficulty: 'All Levels',
          thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=300&h=200&fit=crop',
          url: '/support/chat'
        },
        {
          title: 'Ticket System',
          description: 'Submit and track support requests',
          type: 'Ticketing',
          duration: '< 2hr Response',
          difficulty: 'All Levels',
          thumbnail: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=300&h=200&fit=crop',
          url: '/support/tickets'
        },
        {
          title: 'Phone Support',
          description: 'Direct phone support for enterprise',
          type: 'Phone',
          duration: 'Business Hours',
          difficulty: 'Enterprise',
          thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=200&fit=crop',
          url: '/support/phone'
        }
      ]
    }
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-500';
      case 'Intermediate': return 'bg-yellow-500';
      case 'Advanced': return 'bg-red-500';
      case 'Technical': return 'bg-purple-500';
      case 'Enterprise': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Video': case 'Tutorial': case 'Workshop': return Video;
      case 'Live Webinar': case 'Technical': return Presentation;
      case 'Template': case 'Tool': case 'Checklist': case 'Guide': return Download;
      case 'Forum': case 'Meetup': case 'Chat': case 'Network': return Users;
      case 'Knowledge Base': case 'Live Chat': case 'Ticketing': case 'Phone': return MessageCircle;
      default: return FileText;
    }
  };

  return (
    <section id="resources" className="py-20 px-6 bg-gradient-to-br from-background to-primary/5">
      <div className="container mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <Badge variant="outline" className="mb-4 text-lg px-4 py-2">
            Learning Resources
          </Badge>
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Everything You Need to Succeed
          </h2>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Comprehensive learning resources, documentation, and community support 
            to help you get the most out of our platform
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

        {/* Active Category Header */}
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${categories[activeCategory].color} p-4 mx-auto mb-4`}>
            {React.createElement(categories[activeCategory].icon, { className: "h-8 w-8 text-white" })}
          </div>
          <h3 className="text-3xl font-bold mb-4">{categories[activeCategory].title}</h3>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {categories[activeCategory].description}
          </p>
        </motion.div>

        {/* Resources Grid */}
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {categories[activeCategory].resources.map((resource, index) => {
            const TypeIcon = getTypeIcon(resource.type);
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="group hover:shadow-xl transition-all duration-300 h-full overflow-hidden">
                  <div 
                    className="h-40 bg-cover bg-center group-hover:scale-105 transition-transform duration-300 relative"
                    style={{ backgroundImage: `url(${resource.thumbnail})` }}
                  >
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {resource.type.includes('Video') || resource.type.includes('Webinar') ? (
                        <Play className="h-12 w-12 text-white" />
                      ) : (
                        <ExternalLink className="h-8 w-8 text-white" />
                      )}
                    </div>
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-white/90 text-black">
                        <TypeIcon className="h-3 w-3 mr-1" />
                        {resource.type}
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3">
                      <div className={`w-3 h-3 rounded-full ${getDifficultyColor(resource.difficulty)}`} />
                    </div>
                  </div>
                  
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2 line-clamp-2">{resource.title}</h4>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{resource.description}</p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {resource.duration}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-white text-xs ${getDifficultyColor(resource.difficulty)}`}>
                        {resource.difficulty}
                      </div>
                    </div>

                    <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-white transition-colors">
                      {resource.type.includes('Download') ? 'Download' : 'View'}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default ResourcesSection;