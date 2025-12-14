/**
 * Blog Article Page
 * 
 * Individual article page with proper SEO, schema markup, and related articles.
 * 
 * @created 2025-12-13
 */

import { useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, Share2, ChevronRight, BookOpen, Twitter, Linkedin, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSEO, addStructuredData } from '@/hooks/useSEO';
import { 
  getArticleBySlug, 
  getRelatedArticles, 
  generateArticleSchema, 
  BLOG_CATEGORIES,
  type BlogArticle 
} from '@/data/blogData';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

// Simple markdown-like content renderer
function ContentRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let listType: 'ol' | 'ul' | null = null;
  
  const flushList = () => {
    if (currentList.length > 0 && listType) {
      const ListTag = listType;
      elements.push(
        <ListTag key={elements.length} className={cn(
          "my-4 pl-6",
          listType === 'ol' ? "list-decimal" : "list-disc"
        )}>
          {currentList.map((item, i) => (
            <li key={i} className="mb-1">{item}</li>
          ))}
        </ListTag>
      );
      currentList = [];
      listType = null;
    }
  };

  lines.forEach((line, i) => {
    // Headers
    if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={i} className="text-3xl font-bold mt-8 mb-4">{line.slice(2)}</h1>
      );
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={i} className="text-2xl font-bold mt-8 mb-3">{line.slice(3)}</h2>
      );
    } else if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={i} className="text-xl font-semibold mt-6 mb-2">{line.slice(4)}</h3>
      );
    }
    // Horizontal rule
    else if (line === '---') {
      flushList();
      elements.push(<hr key={i} className="my-8 border-border" />);
    }
    // Ordered list
    else if (/^\d+\.\s/.test(line)) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      currentList.push(line.replace(/^\d+\.\s/, ''));
    }
    // Unordered list
    else if (line.startsWith('- ')) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      currentList.push(line.slice(2));
    }
    // Bold text handling and paragraphs
    else if (line.trim()) {
      flushList();
      // Handle **bold** and links
      const processed = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline hover:no-underline">$1</a>');
      
      elements.push(
        <p 
          key={i} 
          className="my-4 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: processed }}
        />
      );
    }
  });
  
  flushList();
  
  return <>{elements}</>;
}

export default function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const article = useMemo(() => slug ? getArticleBySlug(slug) : undefined, [slug]);
  const relatedArticles = useMemo(() => article ? getRelatedArticles(article) : [], [article]);

  // SEO
  useSEO({
    title: article?.title || 'Article Not Found',
    description: article?.description || 'The article you\'re looking for could not be found.',
    keywords: article?.keywords.join(', ') || '',
    type: 'article',
    author: article?.author,
    publishedTime: article?.publishedAt,
    modifiedTime: article?.updatedAt,
    url: article ? `https://ritual.lovable.app/blog/${article.slug}` : undefined,
  });

  // Add Article structured data
  useEffect(() => {
    if (article) {
      addStructuredData(generateArticleSchema(article));
    }
  }, [article]);

  // Share handlers
  const shareUrl = article ? `https://ritual.lovable.app/blog/${article.slug}` : '';
  const shareText = article ? `${article.title} - Ritual Blog` : '';

  const handleShare = async () => {
    if (navigator.share && article) {
      try {
        await navigator.share({
          title: article.title,
          text: article.description,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    }
  };

  if (!article) {
    return (
      <div className="min-h-screen bg-gradient-warm flex flex-col items-center justify-center px-4">
        <BookOpen className="w-16 h-16 text-muted-foreground/50 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Article Not Found</h1>
        <p className="text-muted-foreground mb-6">The article you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/blog')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Blog
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-4 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/blog')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Blog
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Article Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium",
              BLOG_CATEGORIES[article.category].color
            )}>
              {BLOG_CATEGORIES[article.category].label}
            </span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
            {article.title}
          </h1>
          
          <p className="text-lg text-muted-foreground mb-4">
            {article.description}
          </p>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(parseISO(article.publishedAt), 'MMMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {article.readingTime} read
            </span>
          </div>
        </motion.header>

        {/* Article Content */}
        <motion.article
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="prose prose-lg max-w-none bg-white/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-border/50"
        >
          <ContentRenderer content={article.content} />
        </motion.article>

        {/* Tags */}
        <div className="mt-8 flex flex-wrap gap-2">
          {article.tags.map(tag => (
            <span
              key={tag}
              className="px-3 py-1 bg-white/60 rounded-full text-xs text-muted-foreground"
            >
              #{tag.replace(/\s+/g, '-')}
            </span>
          ))}
        </div>

        {/* Social Share */}
        <div className="mt-8 p-4 bg-white/60 rounded-xl">
          <p className="text-sm font-medium mb-3">Share this article</p>
          <div className="flex gap-2">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-[#1DA1F2] text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <Twitter className="w-5 h-5" />
            </a>
            <a
              href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(article.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-[#0A66C2] text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <Linkedin className="w-5 h-5" />
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-[#1877F2] text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <Facebook className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold mb-4">Related Articles</h2>
            <div className="grid gap-4">
              {relatedArticles.map(related => (
                <Link key={related.slug} to={`/blog/${related.slug}`}>
                  <motion.article
                    whileHover={{ x: 4 }}
                    className="flex items-center gap-4 p-4 bg-white/80 rounded-xl border border-border/50 hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        "inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-1",
                        BLOG_CATEGORIES[related.category].color
                      )}>
                        {BLOG_CATEGORIES[related.category].label}
                      </span>
                      <h3 className="font-semibold truncate">{related.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">{related.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </motion.article>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-12 p-6 bg-gradient-ritual rounded-2xl text-white text-center">
          <h2 className="text-xl font-bold mb-2">Ready to Build Your Own Rituals?</h2>
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
      <footer className="max-w-3xl mx-auto px-4 py-8 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>·</span>
          <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
          <span>·</span>
          <Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
          <span>·</span>
          <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
        </div>
        <p className="mt-4">© {new Date().getFullYear()} Mindmaker LLC. All rights reserved.</p>
      </footer>
    </div>
  );
}
