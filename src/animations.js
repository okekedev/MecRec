/**
 * Animation utility for creating consistent animations throughout the app
 */
import { Animated, Easing, Platform } from 'react-native';

// Standard durations for consistency
const Durations = {
  short: 150,
  medium: 300,
  long: 500,
};

// Standard easing functions
const Easings = {
  standard: Easing.bezier(0.4, 0.0, 0.2, 1), // Material Design standard easing
  accelerate: Easing.bezier(0.4, 0.0, 1.0, 1.0), // For elements exiting the screen
  decelerate: Easing.bezier(0.0, 0.0, 0.2, 1.0), // For elements entering the screen
  sharp: Easing.bezier(0.4, 0.0, 0.6, 1.0), // For elements that need quick response
  bounce: Easing.bezier(0.175, 0.885, 0.32, 1.275), // Bouncy effects
};

// Helper function to create animation config with platform-specific useNativeDriver
const getAnimationConfig = (config) => ({
  ...config,
  useNativeDriver: Platform.OS !== 'web', // Only use native driver on native platforms
});

/**
 * Creates an opacity animation
 * @param {Animated.Value} value - Animated value to animate
 * @param {number} toValue - Target value (0 to 1)
 * @param {number} duration - Animation duration in ms
 * @param {function} easing - Easing function to use
 * @returns {Animated.CompositeAnimation} Animation object
 */
export const fadeAnimation = (
  value,
  toValue = 1,
  duration = Durations.medium,
  easing = Easings.standard
) => {
  return Animated.timing(value, getAnimationConfig({
    toValue,
    duration,
    easing,
  }));
};

/**
 * Creates a translation animation
 * @param {Animated.Value} value - Animated value to animate
 * @param {number} toValue - Target value
 * @param {number} duration - Animation duration in ms
 * @param {function} easing - Easing function to use
 * @returns {Animated.CompositeAnimation} Animation object
 */
export const translateAnimation = (
  value,
  toValue = 0,
  duration = Durations.medium,
  easing = Easings.standard
) => {
  return Animated.timing(value, getAnimationConfig({
    toValue,
    duration,
    easing,
  }));
};

/**
 * Creates a scale animation
 * @param {Animated.Value} value - Animated value to animate
 * @param {number} toValue - Target value
 * @param {number} duration - Animation duration in ms
 * @param {function} easing - Easing function to use
 * @returns {Animated.CompositeAnimation} Animation object
 */
export const scaleAnimation = (
  value,
  toValue = 1,
  duration = Durations.medium,
  easing = Easings.standard
) => {
  return Animated.timing(value, getAnimationConfig({
    toValue,
    duration,
    easing,
  }));
};

/**
 * Creates a fade-in animation
 * @param {Animated.Value} opacity - Opacity animated value
 * @param {number} duration - Animation duration in ms
 * @returns {Animated.CompositeAnimation} Animation object
 */
export const fadeIn = (opacity, duration = Durations.medium) => {
  return fadeAnimation(opacity, 1, duration, Easings.decelerate);
};

/**
 * Creates a fade-out animation
 * @param {Animated.Value} opacity - Opacity animated value
 * @param {number} duration - Animation duration in ms
 * @returns {Animated.CompositeAnimation} Animation object
 */
export const fadeOut = (opacity, duration = Durations.medium) => {
  return fadeAnimation(opacity, 0, duration, Easings.accelerate);
};

/**
 * Creates a slide-in-up animation
 * @param {Animated.Value} translateY - TranslateY animated value
 * @param {number} fromValue - Starting position (usually off-screen)
 * @param {number} duration - Animation duration in ms
 * @returns {Animated.CompositeAnimation} Animation object
 */
export const slideInUp = (translateY, fromValue = 100, duration = Durations.medium) => {
  translateY.setValue(fromValue);
  return translateAnimation(translateY, 0, duration, Easings.decelerate);
};

/**
 * Creates a slide-out-down animation
 * @param {Animated.Value} translateY - TranslateY animated value
 * @param {number} toValue - Target position (usually off-screen)
 * @param {number} duration - Animation duration in ms
 * @returns {Animated.CompositeAnimation} Animation object
 */
export const slideOutDown = (translateY, toValue = 100, duration = Durations.medium) => {
  return translateAnimation(translateY, toValue, duration, Easings.accelerate);
};

/**
 * Creates a slide-in-right animation
 * @param {Animated.Value} translateX - TranslateX animated value
 * @param {number} fromValue - Starting position (usually off-screen)
 * @param {number} duration - Animation duration in ms
 * @returns {Animated.CompositeAnimation} Animation object
 */
export const slideInRight = (translateX, fromValue = 100, duration = Durations.medium) => {
  translateX.setValue(fromValue);
  return translateAnimation(translateX, 0, duration, Easings.decelerate);
};

/**
 * Creates a slide-out-left animation
 * @param {Animated.Value} translateX - TranslateX animated value
 * @param {number} toValue - Target position (usually off-screen)
 * @param {number} duration - Animation duration in ms
 * @returns {Animated.CompositeAnimation} Animation object
 */
export const slideOutLeft = (translateX, toValue = -100, duration = Durations.medium) => {
  return translateAnimation(translateX, toValue, duration, Easings.accelerate);
};

/**
 * Creates a zoom-in animation
 * @param {Animated.Value} scale - Scale animated value
 * @param {number} fromValue - Starting scale
 * @param {number} duration - Animation duration in ms
 * @returns {Animated.CompositeAnimation} Animation object
 */
export const zoomIn = (scale, fromValue = 0.8, duration = Durations.medium) => {
  scale.setValue(fromValue);
  return scaleAnimation(scale, 1, duration, Easings.decelerate);
};

/**
 * Creates a zoom-out animation
 * @param {Animated.Value} scale - Scale animated value
 * @param {number} toValue - Target scale
 * @param {number} duration - Animation duration in ms
 * @returns {Animated.CompositeAnimation} Animation object
 */
export const zoomOut = (scale, toValue = 0.8, duration = Durations.medium) => {
  return scaleAnimation(scale, toValue, duration, Easings.accelerate);
};

/**
 * Creates a bounce animation
 * @param {Animated.Value} value - Animated value
 * @param {number} toValue - Target value
 * @param {number} friction - Bounce friction (higher means less bouncy)
 * @returns {Animated.CompositeAnimation} Animation object
 */
export const bounce = (value, toValue = 1, friction = 3) => {
  return Animated.spring(value, getAnimationConfig({
    toValue,
    friction,
    tension: 40,
  }));
};

/**
 * Creates a pulse animation (slight scale up and down)
 * @param {Animated.Value} scale - Scale animated value
 * @param {number} duration - Total animation duration in ms
 * @returns {Animated.CompositeAnimation} Animation object
 */
export const pulse = (scale, duration = Durations.long) => {
  scale.setValue(1);
  return Animated.sequence([
    Animated.timing(scale, getAnimationConfig({
      toValue: 1.05,
      duration: duration / 2,
      easing: Easings.decelerate,
    })),
    Animated.timing(scale, getAnimationConfig({
      toValue: 1,
      duration: duration / 2,
      easing: Easings.decelerate,
    })),
  ]);
};

/**
 * Creates a shake animation
 * @param {Animated.Value} translateX - TranslateX animated value
 * @param {number} intensity - Shake intensity (distance)
 * @param {number} duration - Total animation duration in ms
 * @returns {Animated.CompositeAnimation} Animation object
 */
export const shake = (translateX, intensity = 10, duration = Durations.medium) => {
  translateX.setValue(0);
  return Animated.sequence([
    Animated.timing(translateX, getAnimationConfig({
      toValue: intensity,
      duration: duration / 5,
    })),
    Animated.timing(translateX, getAnimationConfig({
      toValue: -intensity,
      duration: duration / 5,
    })),
    Animated.timing(translateX, getAnimationConfig({
      toValue: intensity / 2,
      duration: duration / 5,
    })),
    Animated.timing(translateX, getAnimationConfig({
      toValue: -intensity / 2,
      duration: duration / 5,
    })),
    Animated.timing(translateX, getAnimationConfig({
      toValue: 0,
      duration: duration / 5,
    })),
  ]);
};

/**
 * Creates a stagger animation (animate multiple items with a delay between them)
 * @param {Array} animations - Array of animations to run in sequence
 * @param {number} staggerDelay - Delay between animations in ms
 * @returns {Animated.CompositeAnimation} Staggered animation object
 */
export const stagger = (animations, staggerDelay = 50) => {
  return Animated.stagger(staggerDelay, animations);
};

/**
 * Hook to create a fade-in animation on mount
 * @param {number} duration - Animation duration in ms
 * @returns {Object} Object containing opacity value and animation styles
 */
export const useFadeIn = (duration = Durations.medium) => {
  const opacity = new Animated.Value(0);
  
  React.useEffect(() => {
    fadeIn(opacity, duration).start();
  }, []);
  
  return {
    opacity,
    style: { opacity },
  };
};

/**
 * Creates a simple button press animation
 * @param {Animated.Value} scale - Scale animated value
 * @returns {Object} Object with onPressIn and onPressOut functions
 */
export const buttonPressAnimation = (scale) => {
  return {
    onPressIn: () => {
      Animated.timing(scale, getAnimationConfig({
        toValue: 0.95,
        duration: Durations.short,
        easing: Easings.standard,
      })).start();
    },
    onPressOut: () => {
      Animated.timing(scale, getAnimationConfig({
        toValue: 1,
        duration: Durations.short,
        easing: Easings.standard,
      })).start();
    },
  };
};

// Export all animation utilities
export default {
  Durations,
  Easings,
  fadeAnimation,
  translateAnimation,
  scaleAnimation,
  fadeIn,
  fadeOut,
  slideInUp,
  slideOutDown,
  slideInRight,
  slideOutLeft,
  zoomIn,
  zoomOut,
  bounce,
  pulse,
  shake,
  stagger,
  useFadeIn,
  buttonPressAnimation,
};