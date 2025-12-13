/**
 * FAQ Page
 * 
 * SEO-optimized FAQ page with structured data for Google rich snippets.
 * Accessible from Profile settings - non-intrusive but discoverable.
 * 
 * @created 2025-12-13
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronDown, Search, HelpCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSEO, addStructuredData } from '@/hooks/useSEO';
import { FAQ_DATA, FAQ_CATEGORIES, generateFAQSchema, type FAQItem } from '@/data/faqData';
import { cn } from '@/lib/utils';

export default function FAQ() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // SEO with FAQ-specific meta
  useSEO({
    title: 'Frequently Asked Questions',
    description: 'Get answers to common questions about Ritual - the AI-powered couples app for building weekly rituals, date ideas, and relationship habits. Learn about features, privacy, and pricing.',
    keywords: 'ritual faq, couples app questions, relationship app help, date ideas faq, weekly rituals help',
  });

  // Add FAQ structured data for rich snippets
  useEffect(() => {
    addStructuredData(generateFAQSchema(FAQ_DATA));
  }, []);

  // Filter FAQs based on search and category
  const filteredFAQs = FAQ_DATA.filter(faq => {
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === null || faq.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Group FAQs by category for display
  const groupedFAQs = filteredFAQs.reduce((acc, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = [];
    }
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, FAQItem[]>);

  return (
    <div className="h-full bg-gradient-warm flex flex-col">
      {/* Header */}
      <header className="flex-none px-4 py-4 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Help & FAQ</h1>
            <p className="text-sm text-muted-foreground">Find answers to common questions</p>
          </div>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="flex-none px-4 py-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions..."
            className="pl-9 bg-white/80"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              selectedCategory === null
                ? "bg-primary text-primary-foreground"
                : "bg-white/60 text-muted-foreground hover:bg-white/80"
            )}
          >
            All
          </button>
          {Object.entries(FAQ_CATEGORIES).map(([key, { label, icon }]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                selectedCategory === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/60 text-muted-foreground hover:bg-white/80"
              )}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ List */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {filteredFAQs.length === 0 ? (
          <div className="text-center py-12">
            <HelpCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">No questions found matching your search.</p>
            <Button
              variant="link"
              onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
              className="mt-2"
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedFAQs).map(([category, faqs]) => (
              <div key={category}>
                {/* Category Header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{FAQ_CATEGORIES[category as keyof typeof FAQ_CATEGORIES].icon}</span>
                  <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    {FAQ_CATEGORIES[category as keyof typeof FAQ_CATEGORIES].label}
                  </h2>
                </div>

                {/* Questions */}
                <div className="space-y-2">
                  {faqs.map((faq) => (
                    <motion.div
                      key={faq.id}
                      className="bg-white/80 backdrop-blur-sm rounded-xl overflow-hidden border border-border/50"
                      initial={false}
                    >
                      <button
                        onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                        className="w-full px-4 py-3 flex items-start justify-between text-left"
                      >
                        <span className="font-medium text-sm pr-4">{faq.question}</span>
                        <motion.div
                          animate={{ rotate: expandedId === faq.id ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="shrink-0 mt-0.5"
                        >
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </motion.div>
                      </button>
                      
                      <AnimatePresence initial={false}>
                        {expandedId === faq.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                              {faq.answer}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contact CTA */}
        <div className="mt-8 p-4 bg-primary/5 rounded-xl border border-primary/20 text-center">
          <p className="text-sm font-medium mb-2">Still have questions?</p>
          <p className="text-xs text-muted-foreground mb-3">
            We're here to help you build stronger relationships.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/contact')}
            className="gap-2"
          >
            Contact Us
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
