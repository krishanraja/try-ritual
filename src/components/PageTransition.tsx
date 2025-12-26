/**
 * PageTransition Component
 * 
 * Orchestrated page transitions with staggered reveals and smooth animations.
 * Uses spring physics for natural, delightful motion.
 * 
 * @updated 2025-12-26 - Enhanced with stagger animations and spring physics
 */

import { motion, type Transition, type Easing } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  /** Transition variant */
  variant?: 'fade' | 'slide' | 'scale' | 'slideUp';
}

// Spring configuration for natural motion
const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

const smoothTransition: Transition = {
  type: 'tween',
  ease: [0.16, 1, 0.3, 1], // ease-out-expo
  duration: 0.4,
};

// Page transition variants
const pageVariants = {
  fade: {
    initial: { opacity: 0 },
    enter: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slide: {
    initial: { opacity: 0, x: 20 },
    enter: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  slideUp: {
    initial: { opacity: 0, y: 16 },
    enter: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.96 },
    enter: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
  },
};

// Easing curves (typed for Framer Motion)
const easeOutExpo: Easing = [0.16, 1, 0.3, 1];

// Loading bar animation
const loadingBarVariants = {
  initial: { scaleX: 0, opacity: 1 },
  animate: {
    scaleX: 1,
    opacity: 0,
    transition: {
      scaleX: { duration: 0.4, ease: easeOutExpo },
      opacity: { duration: 0.2, delay: 0.35 },
    },
  },
};

/**
 * Main page transition wrapper
 */
export const PageTransition = ({ children, variant = 'slideUp' }: PageTransitionProps) => {
  const variants = pageVariants[variant];
  
  return (
    <>
      {/* Subtle loading bar at top */}
      <motion.div
        initial="initial"
        animate="animate"
        variants={loadingBarVariants}
        className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-ritual origin-left z-[100]"
      />
      
      {/* Page content with animation */}
      <motion.div
        initial="initial"
        animate="enter"
        exit="exit"
        variants={variants}
        transition={smoothTransition}
        className="h-full w-full"
      >
        {children}
      </motion.div>
    </>
  );
};

/**
 * Stagger Container - wraps children that should animate in sequence
 */
interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  /** Delay between each child animation in seconds */
  staggerDelay?: number;
  /** Initial delay before first animation */
  initialDelay?: number;
}

/**
 * StaggerContainer works through Framer Motion's built-in variant propagation.
 * When a parent has staggerChildren in its transition and children have matching
 * variant names ("hidden"/"visible"), Framer Motion automatically coordinates
 * the staggered animations - no React context needed.
 */
export const StaggerContainer = ({ 
  children, 
  className,
  staggerDelay = 0.05,
  initialDelay = 0,
}: StaggerContainerProps) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className={className}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: initialDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * Stagger Item - individual items within a StaggerContainer
 */
interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  /** Animation variant */
  variant?: 'fadeUp' | 'fadeIn' | 'scaleIn' | 'slideIn';
}

const itemVariants = {
  fadeUp: {
    hidden: { opacity: 0, y: 12 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: springTransition,
    },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.3 },
    },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: springTransition,
    },
  },
  slideIn: {
    hidden: { opacity: 0, x: -12 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: springTransition,
    },
  },
};

export const StaggerItem = ({ 
  children, 
  className,
  variant = 'fadeUp',
}: StaggerItemProps) => {
  return (
    <motion.div
      variants={itemVariants[variant]}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * FadeIn - simple fade animation for individual elements
 */
interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

export const FadeIn = ({ 
  children, 
  className,
  delay = 0,
  duration = 0.4,
  direction = 'up',
}: FadeInProps) => {
  const directionOffset = {
    up: { y: 12 },
    down: { y: -12 },
    left: { x: 12 },
    right: { x: -12 },
    none: {},
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, ...directionOffset[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * ScaleIn - scale animation for emphasis
 */
interface ScaleInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export const ScaleIn = ({ 
  children, 
  className,
  delay = 0,
}: ScaleInProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        ...springTransition,
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * SlideIn - slide animation from edge
 */
interface SlideInProps {
  children: ReactNode;
  className?: string;
  from?: 'left' | 'right' | 'top' | 'bottom';
  delay?: number;
}

export const SlideIn = ({ 
  children, 
  className,
  from = 'bottom',
  delay = 0,
}: SlideInProps) => {
  const offset = {
    left: { x: -24 },
    right: { x: 24 },
    top: { y: -24 },
    bottom: { y: 24 },
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, ...offset[from] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        ...springTransition,
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};