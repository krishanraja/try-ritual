import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

const DEFAULT_SEO = {
  title: 'Ritual – Re-love Your Partner',
  description: 'Build meaningful weekly rituals with your partner. Both contribute ideas, AI synthesizes your perfect week. Track completions, build streaks, and strengthen your relationship.',
  keywords: 'relationship rituals, couple activities, weekly rituals, relationship building, shared moments, couple goals, date ideas, relationship app',
  image: 'https://tryritual.co/ritual-icon.png',
  url: typeof window !== 'undefined' ? window.location.href : '',
  type: 'website' as const,
};

export const useSEO = ({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
}: SEOProps = {}) => {
  useEffect(() => {
    // Set document title
    const fullTitle = title 
      ? `${title} | Ritual`
      : DEFAULT_SEO.title;
    document.title = fullTitle;

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, property?: boolean) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let element = document.querySelector(selector);
      
      if (!element) {
        element = document.createElement('meta');
        if (property) {
          element.setAttribute('property', name);
        } else {
          element.setAttribute('name', name);
        }
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', content);
    };

    // Basic meta tags
    updateMetaTag('description', description || DEFAULT_SEO.description);
    updateMetaTag('keywords', keywords || DEFAULT_SEO.keywords);
    if (author) updateMetaTag('author', author);

    // Open Graph tags
    updateMetaTag('og:title', fullTitle, true);
    updateMetaTag('og:description', description || DEFAULT_SEO.description, true);
    updateMetaTag('og:image', image || DEFAULT_SEO.image, true);
    updateMetaTag('og:url', url || DEFAULT_SEO.url, true);
    updateMetaTag('og:type', type, true);
    updateMetaTag('og:site_name', 'Ritual', true);
    if (publishedTime) updateMetaTag('og:published_time', publishedTime, true);
    if (modifiedTime) updateMetaTag('og:modified_time', modifiedTime, true);

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', fullTitle);
    updateMetaTag('twitter:description', description || DEFAULT_SEO.description);
    updateMetaTag('twitter:image', image || DEFAULT_SEO.image);

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url || DEFAULT_SEO.url;

  }, [title, description, keywords, image, url, type, author, publishedTime, modifiedTime]);
};

// Structured Data helper
export const addStructuredData = (data: Record<string, any>) => {
  const existingScript = document.getElementById('structured-data');
  if (existingScript) {
    existingScript.remove();
  }

  const script = document.createElement('script');
  script.id = 'structured-data';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
};

// Location-specific structured data
export const getLocationStructuredData = (city: string, rituals?: any[]) => {
  const cityCoordinates: Record<string, { lat: number; lng: number }> = {
    'London': { lat: 51.5074, lng: -0.1278 },
    'Sydney': { lat: -33.8688, lng: 151.2093 },
    'Melbourne': { lat: -37.8136, lng: 144.9631 },
    'New York': { lat: 40.7128, lng: -74.0060 },
  };

  const coords = cityCoordinates[city] || cityCoordinates['New York'];

  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Ritual',
    description: `Build meaningful weekly rituals in ${city}. AI-powered relationship building through shared experiences.`,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'AI-powered ritual suggestions',
      'Location-based activities',
      'Partner synchronization',
      'Streak tracking',
      'Calendar integration',
    ],
    geo: {
      '@type': 'GeoCoordinates',
      latitude: coords.lat,
      longitude: coords.lng,
    },
    areaServed: {
      '@type': 'City',
      name: city,
    },
  };
};
