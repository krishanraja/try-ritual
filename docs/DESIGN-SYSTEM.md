# Design System Documentation

## Design Philosophy

**Core Principle:** Warm, intimate, and effortless. The design should feel like a gentle nudge toward connection, not a productivity app.

### Design Values
1. **Warmth over Clinical:** Soft gradients, rounded corners, friendly copy
2. **Clarity over Complexity:** One clear action at a time
3. **Delight over Efficiency:** Smooth animations, playful interactions
4. **Mobile-First Always:** Designed for thumbs, optimized for pockets

## Color System

### Core Colors (HSL) - Lavender/Blush Theme

```css
/* Primary - Soft Lavender */
--primary: 270 50% 70%;
--primary-foreground: 0 0% 100%;

/* Secondary - Blush Pink */
--secondary: 340 100% 92%;
--secondary-foreground: 340 50% 30%;

/* Accent - Light Lavender */
--accent: 270 45% 85%;
--accent-foreground: 270 30% 30%;

/* Background - Warm Cream */
--background: 40 50% 97%;
--foreground: 270 15% 25%;

/* Muted - Sage Green */
--muted: 120 30% 90%;
--muted-foreground: 120 15% 40%;

/* Card - Pure White */
--card: 0 0% 100%;
--card-foreground: 270 15% 25%;

/* Destructive - Error Red */
--destructive: 0 84% 60%;
--destructive-foreground: 0 0% 100%;

/* Border - Soft Lavender */
--border: 270 20% 88%;
--input: 270 20% 88%;
--ring: 270 50% 70%;
```

### Custom Ritual Colors

```css
/* Custom palette tokens */
--lavender: 270 50% 85%;
--lavender-light: 270 50% 95%;
--blush: 340 100% 92%;
--blush-light: 340 100% 96%;
--sage: 120 30% 85%;
--sage-light: 120 30% 92%;
```

### Gradient System

```css
/* Ritual gradient (primary CTAs, emphasis) */
.bg-gradient-ritual {
  background: linear-gradient(135deg, hsl(270 50% 85%), hsl(340 100% 92%));
}

/* Warm gradient (page backgrounds) */
.bg-gradient-warm {
  background: linear-gradient(135deg, hsl(340 100% 96%), hsl(40 60% 95%));
}

/* Calm gradient (secondary surfaces) */
.bg-gradient-calm {
  background: linear-gradient(180deg, hsl(270 50% 95%), hsl(120 30% 92%));
}
```

### Shadow System

```css
/* Soft shadow for cards */
--shadow-soft: 0 8px 32px -8px hsl(270 30% 70% / 0.2);

/* Card elevation shadow */
--shadow-card: 0 4px 24px -4px hsl(270 20% 60% / 0.15);
```

### Color Usage Guidelines

**Primary (Lavender):**
- Call-to-action buttons
- Active nav items
- Key information highlights
- Focus rings

**Secondary (Blush):**
- Secondary actions
- Backgrounds for emphasis cards
- Hover states

**Accent:**
- Attention-grabbing elements
- Celebration moments
- Important badges

**Muted (Sage):**
- Descriptive text
- Placeholders
- Disabled states

## Typography

### Font Family

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
             Roboto, 'Helvetica Neue', Arial, sans-serif;
```

**Rationale:** System fonts for performance and native feel.

### Type Scale

```css
/* Headings */
.text-4xl { font-size: 2.25rem; line-height: 2.5rem; }    /* 36px */
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; }  /* 30px */
.text-2xl { font-size: 1.5rem; line-height: 2rem; }       /* 24px */
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }    /* 20px */
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }   /* 18px */

/* Body */
.text-base { font-size: 1rem; line-height: 1.5rem; }      /* 16px */
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }   /* 14px */
.text-xs { font-size: 0.75rem; line-height: 1rem; }       /* 12px */
```

### Font Weights

- **font-bold (700):** Page titles, section headers
- **font-semibold (600):** Subheadings, emphasis
- **font-medium (500):** Button text, labels
- **font-normal (400):** Body text

### Typography Patterns

**Page Title:**
```tsx
<h1 className="text-2xl font-bold">This Week</h1>
```

**Card Title:**
```tsx
<h2 className="text-xl font-bold mb-2">Ritual Title</h2>
```

**Body Text:**
```tsx
<p className="text-sm text-muted-foreground leading-relaxed">
  Description text
</p>
```

**Micro Copy:**
```tsx
<span className="text-xs text-muted-foreground">Helper text</span>
```

## Spacing System

### Base Unit: 4px (0.25rem)

```css
/* Spacing scale */
.space-1 { gap: 0.25rem; }   /* 4px */
.space-2 { gap: 0.5rem; }    /* 8px */
.space-3 { gap: 0.75rem; }   /* 12px */
.space-4 { gap: 1rem; }      /* 16px */
.space-6 { gap: 1.5rem; }    /* 24px */
.space-8 { gap: 2rem; }      /* 32px */
.space-12 { gap: 3rem; }     /* 48px */
```

### Spacing Patterns

**Component Padding:**
- Small components: `p-3` (12px)
- Medium components: `p-4` (16px)
- Large components: `p-6` (24px)

**Section Spacing:**
- Between sections: `space-y-6` (24px)
- Within sections: `space-y-3` (12px)

**Page Padding:**
- Horizontal: `px-4` (16px)
- Top: `pt-4` (16px)
- Bottom: `pb-4` + `pb-safe` for mobile

## Component Library

### Button Variants

```tsx
// Primary CTA
<Button className="w-full bg-gradient-ritual text-white h-12 rounded-xl">
  Start Input
</Button>

// Secondary action
<Button variant="outline" className="w-full h-12 rounded-xl">
  Cancel
</Button>

// Destructive action
<Button variant="destructive" className="h-12 rounded-xl">
  Delete
</Button>

// Ghost (minimal)
<Button variant="ghost" size="sm">
  Skip
</Button>
```

### Card Patterns

```tsx
// Default card
<Card className="p-6 bg-card/90 backdrop-blur-sm">
  <CardContent>...</CardContent>
</Card>

// Emphasis card
<Card className="p-6 bg-gradient-ritual text-white border-0">
  <CardContent>...</CardContent>
</Card>

// Interactive card
<Card className="p-6 cursor-pointer hover:shadow-lg transition-all active:scale-95">
  <CardContent>...</CardContent>
</Card>
```

### Input Fields

```tsx
<Input
  type="text"
  placeholder="Enter text..."
  className="h-12 rounded-xl border-2 border-border focus:border-primary"
/>
```

### Badges

```tsx
// Status badge
<Badge variant="default" className="bg-primary">Active</Badge>

// Secondary badge
<Badge variant="secondary">Pending</Badge>

// Outline badge
<Badge variant="outline">Draft</Badge>
```

## Animation System

### Transition Timing

```css
/* Standard easing */
transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);

/* Durations */
.transition-fast { transition-duration: 150ms; }
.transition { transition-duration: 200ms; }
.transition-slow { transition-duration: 300ms; }

/* Custom transitions */
--transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
--transition-bounce: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### Framer Motion Patterns

**Page Entry:**
```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.2 }}
>
  {content}
</motion.div>
```

**Slide Down:**
```tsx
<motion.div
  initial={{ y: -20, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
>
  {content}
</motion.div>
```

**Stagger Children:**
```tsx
<motion.div
  variants={{
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }}
>
  {children}
</motion.div>
```

## Iconography

### Icon Library: Lucide React

**Size Guidelines:**
- Default: `w-5 h-5` (20px)
- Small: `w-4 h-4` (16px)
- Large: `w-6 h-6` (24px)
- Hero: `w-8 h-8` or larger (32px+)

**Common Icons:**
- Heart: Primary ritual icon
- Calendar: Date selection
- Clock: Time selection
- Sparkles: AI/magic moments
- Check: Completion
- X: Close/dismiss
- Share2: Sharing actions
- User: Profile

### Icon + Text Pattern

```tsx
<div className="flex items-center gap-2">
  <Heart className="w-5 h-5 text-primary" />
  <span className="text-sm font-medium">This Week's Ritual</span>
</div>
```

## Layout Patterns

### Mobile-First Container

```tsx
<StrictMobileViewport>
  <div className="h-full bg-gradient-warm flex flex-col">
    {/* Content */}
  </div>
</StrictMobileViewport>
```

### Centered Content

```tsx
<div className="h-full flex flex-col justify-center items-center px-4">
  <div className="max-w-sm mx-auto w-full space-y-6">
    {/* Centered content */}
  </div>
</div>
```

### Flex Layout

```tsx
<div className="flex flex-col h-full">
  <header className="flex-none">Header</header>
  <main className="flex-1 overflow-auto">Content</main>
  <footer className="flex-none">Footer</footer>
</div>
```

## Responsive Breakpoints

```css
/* Mobile first (default) */
/* Styles apply to all sizes unless overridden */

/* sm: 640px */
@media (min-width: 640px) { ... }

/* md: 768px */
@media (min-width: 768px) { ... }

/* lg: 1024px */
@media (min-width: 1024px) { ... }
```

**Note:** App is primarily mobile. Desktop views are stretch goals.

## Dark Mode

Dark mode is implemented with the following adjustments:

```css
.dark {
  --background: 270 20% 12%;
  --foreground: 270 10% 95%;
  --card: 270 20% 15%;
  --primary: 270 50% 65%;
  --secondary: 340 50% 30%;
  --muted: 120 15% 25%;
  --accent: 270 40% 25%;
  --border: 270 20% 22%;
}
```

## Accessibility

### Focus States
All interactive elements have visible focus rings using `focus:ring-2 focus:ring-ring`.

### Touch Targets
Minimum 44x44px for all clickable elements.

### Color Contrast
All text meets WCAG AA standards (4.5:1 for normal text, 3:1 for large text).

### Motion Preferences
Respect `prefers-reduced-motion` media query (TODO: implement).

## Brand Assets

### Logo
- File: `/public/ritual-logo-full.png`
- Usage: Header, Splash screen, Landing page
- Component: `<RitualLogo />`

### Icon
- File: `/public/ritual-icon.png` (pink hexagon with blue arrows)
- Usage: Favicon, Loading states, Empty states
- Component: `<RitualSpinner />` for animated loading

### Favicon
- File: `/public/ritual-icon.png` (primary)
- Formats: PNG (512x512, 192x192), ICO (fallback)
- Manifest: `/public/manifest.json` for PWA

### Loading States
- **Always use** `<RitualSpinner />` for loading indicators
- **Never use** generic Loader2, Sparkles, or CSS spinners
- Available sizes: xs, sm, md, lg, xl
- Optional text display with `showText` and `text` props

```tsx
// Standard loading
<RitualSpinner size="lg" showText text="Loading memories..." />

// Inline loading (buttons, badges)
<RitualSpinnerInline />
```

## Design Tokens in Code

All design tokens are defined in:
- `src/index.css` - CSS custom properties
- `tailwind.config.ts` - Tailwind theme extension

**Critical Rule:** Never hardcode colors. Always use semantic tokens.

```tsx
// ❌ DON'T
<div className="text-[#FF6B6B]">

// ✅ DO
<div className="text-primary">
```

## Future Design Improvements

1. Add subtle textures to backgrounds
2. Implement glassmorphism effects
3. Add micro-interactions (button ripples, etc.)
4. Create illustration library
5. Design empty states with illustrations
6. Add skeleton loading animations
7. Create confetti/celebration animations for milestones
