/**
 * Blog Listing Page
 * 
 * SEO-optimized blog with article listings for organic traffic.
 * Accessible via /blog but not prominently linked in main navigation.
 * 
 * @created 2025-12-13
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, ChevronRight, BookOpen, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSEO, addStructuredData } from '@/hooks/useSEO';
import { BLOG_ARTICLES, BLOG_CATEGORIES, generateBlogListingSchema, type BlogArticle } from '@/data/blogData';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

export default function Blog() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // SEO
  useSEO({
    title: 'Relationship Blog – Date Ideas & Couple Rituals',
    description: 'Expert relationship advice, date ideas for every city, and tips for building meaningful weekly rituals with your partner. Strengthen your relationship with science-backed strategies.',
    keywords: 'relationship blog, date ideas, couple rituals, relationship advice, weekly date ideas, romantic activities',
  });

  // Add Blog structured data
  useEffect(() => {
    addStructuredData(generateBlogListingSchema());
  }, []);

  // Filter articles
  const filteredArticles = BLOG_ARTICLES.filter(article => {
    const matchesSearch = searchQuery === '' ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === null || article.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Sort by date (newest first)
  const sortedArticles = [...filteredArticles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  const featuredArticle = sortedArticles[0];
  const otherArticles = sortedArticles.slice(1);

  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-4 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Ritual Blog</h1>
            <p className="text-sm text-muted-foreground">Relationship tips & date ideas</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles..."
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
              All Articles
            </button>
            {Object.entries(BLOG_CATEGORIES).map(([key, { label }]) => (
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
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Articles */}
        {filteredArticles.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">No articles found matching your search.</p>
            <Button
              variant="link"
              onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
              className="mt-2"
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Featured Article */}
            {featuredArticle && !searchQuery && !selectedCategory && (
              <Link to={`/blog/${featuredArticle.slug}`}>
                <motion.article
                  whileHover={{ y: -4 }}
                  className="bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden border border-border/50 shadow-lg"
                >
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        BLOG_CATEGORIES[featuredArticle.category].color
                      )}>
                        {BLOG_CATEGORIES[featuredArticle.category].label}
                      </span>
                      <span className="text-xs text-muted-foreground">Featured</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                      {featuredArticle.title}
                    </h2>
                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {featuredArticle.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(parseISO(featuredArticle.publishedAt), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {featuredArticle.readingTime}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-primary text-sm font-medium">
                        Read more
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </motion.article>
              </Link>
            )}

            {/* Article Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {(searchQuery || selectedCategory ? sortedArticles : otherArticles).map((article) => (
                <Link key={article.slug} to={`/blog/${article.slug}`}>
                  <motion.article
                    whileHover={{ y: -2 }}
                    className="h-full bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-border/50 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        BLOG_CATEGORIES[article.category].color
                      )}>
                        {BLOG_CATEGORIES[article.category].label}
                      </span>
                    </div>
                    <h3 className="font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {article.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(parseISO(article.publishedAt), 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {article.readingTime}
                      </span>
                    </div>
                  </motion.article>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-12 p-6 bg-gradient-ritual rounded-2xl text-white text-center">
          <h2 className="text-xl font-bold mb-2">Build Your Own Rituals</h2>
          <p className="text-white/80 mb-4 text-sm">
            Get AI-powered ritual suggestions personalized for you and your partner.
          </p>
          <Button
            onClick={() => navigate('/')}
            variant="secondary"
            className="bg-white text-primary hover:bg-white/90"
          >
            Try Ritual Free
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 py-8 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>·</span>
          <Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
          <span>·</span>
          <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          <span>·</span>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
        </div>
        <p className="mt-4">© {new Date().getFullYear()} Mindmaker LLC. All rights reserved.</p>
      </footer>
    </div>
  );
}
