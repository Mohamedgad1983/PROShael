/**
 * LazyImage - Mobile-optimized lazy loading image component
 * Features: Progressive loading, WebP support, placeholder, error handling
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMobile } from '../../hooks/useMobile';
import performanceMonitor from '../../utils/performanceMonitor';

const LazyImage = ({
  src,
  alt = '',
  width,
  height,
  className = '',
  placeholder,
  fallback,
  quality = 75,
  sizes,
  srcSet,
  priority = false,
  onLoad,
  onError,
  blur = true,
  fade = true,
  threshold = 0.1,
  rootMargin = '50px',
  aspectRatio,
  objectFit = 'cover',
  loading: loadingProp = 'lazy',
  preload = false,
  webp = true,
  avif = false,
  ...props
}) => {
  const { device, viewport } = useMobile();
  const imageRef = useRef(null);
  const [imageState, setImageState] = useState({
    loaded: false,
    loading: false,
    error: false,
    inView: false
  });

  // Generate optimized image sources
  const generateSources = useCallback((baseSrc) => {
    if (!baseSrc) return { src: '', webpSrc: '', avifSrc: '' };

    const sources = { src: baseSrc };

    // Add WebP support
    if (webp && baseSrc.includes('.')) {
      sources.webpSrc = baseSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }

    // Add AVIF support
    if (avif && baseSrc.includes('.')) {
      sources.avifSrc = baseSrc.replace(/\.(jpg|jpeg|png)$/i, '.avif');
    }

    return sources;
  }, [webp, avif]);

  const sources = generateSources(src);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || loadingProp === 'eager') {
      setImageState(prev => ({ ...prev, inView: true }));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageState(prev => ({ ...prev, inView: true }));
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold,
        rootMargin
      }
    );

    if (imageRef.current) {
      observer.observe(imageRef.current);
    }

    return () => observer.disconnect();
  }, [priority, threshold, rootMargin, loadingProp]);

  // Start loading when in view
  useEffect(() => {
    if (imageState.inView && !imageState.loading && !imageState.loaded) {
      loadImage();
    }
  }, [imageState.inView]);

  // Load image with performance monitoring
  const loadImage = useCallback(async () => {
    if (!src || imageState.loading) return;

    setImageState(prev => ({ ...prev, loading: true, error: false }));

    const monitor = performanceMonitor.startComponentMonitor('LazyImage-load');

    try {
      const img = new Image();

      // Set up image properties
      img.loading = loadingProp;
      if (sizes) img.sizes = sizes;
      if (srcSet) img.srcset = srcSet;

      // Promise-based image loading
      const loadPromise = new Promise((resolve, reject) => {
        img.onload = () => {
          const duration = monitor.end();

          // Track image loading performance
          performanceMonitor.trackEvent('image-loaded', {
            src: src,
            duration: duration,
            width: img.naturalWidth,
            height: img.naturalHeight,
            size: img.src.length
          });

          setImageState(prev => ({
            ...prev,
            loaded: true,
            loading: false,
            error: false
          }));

          if (onLoad) onLoad(img);
          resolve(img);
        };

        img.onerror = (error) => {
          monitor.end();

          performanceMonitor.trackEvent('image-error', {
            src: src,
            error: error.message || 'Image failed to load'
          });

          setImageState(prev => ({
            ...prev,
            loaded: false,
            loading: false,
            error: true
          }));

          if (onError) onError(error);
          reject(error);
        };
      });

      // Set source (try WebP first, then fallback)
      if (sources.webpSrc && supportsWebP()) {
        img.src = sources.webpSrc;
      } else if (sources.avifSrc && supportsAVIF()) {
        img.src = sources.avifSrc;
      } else {
        img.src = sources.src;
      }

      await loadPromise;
    } catch (error) {
      console.warn('Image loading failed:', error);
    }
  }, [src, imageState.loading, sources, sizes, srcSet, loadingProp, onLoad, onError]);

  // Check WebP support
  const supportsWebP = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }, []);

  // Check AVIF support
  const supportsAVIF = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
  }, []);

  // Preload image if requested
  useEffect(() => {
    if (preload && src) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      if (srcSet) link.imageSrcset = srcSet;
      if (sizes) link.imageSizes = sizes;
      document.head.appendChild(link);

      return () => {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      };
    }
  }, [preload, src, srcSet, sizes]);

  // Generate responsive sizes if not provided
  const responsiveSizes = sizes || (
    device.isMobile ? '100vw' :
    viewport.width > 1024 ? '50vw' :
    '75vw'
  );

  // Container styles
  const containerStyles = {
    position: 'relative',
    overflow: 'hidden',
    width: width || '100%',
    height: height || 'auto',
    aspectRatio: aspectRatio || (width && height ? `${width}/${height}` : undefined),
    ...props.style
  };

  // Image styles
  const imageStyles = {
    width: '100%',
    height: '100%',
    objectFit: objectFit,
    transition: fade ? 'opacity 0.3s ease-in-out' : 'none',
    opacity: imageState.loaded ? 1 : 0,
    filter: blur && !imageState.loaded ? 'blur(5px)' : 'none',
    transform: 'translateZ(0)', // GPU acceleration
    backfaceVisibility: 'hidden'
  };

  // Placeholder component
  const PlaceholderComponent = () => {
    if (placeholder) {
      return typeof placeholder === 'string' ? (
        <img
          src={placeholder}
          alt=""
          style={{
            ...imageStyles,
            opacity: imageState.loaded ? 0 : 1,
            filter: 'blur(2px)',
            transform: 'scale(1.1)' // Prevent edge artifacts
          }}
        />
      ) : (
        placeholder
      );
    }

    return (
      <div
        className="lazy-image-placeholder"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: imageState.loaded ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out'
        }}
      >
        {imageState.loading ? (
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        ) : (
          <svg
            className="w-8 h-8 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
    );
  };

  // Error fallback component
  const ErrorComponent = () => {
    if (fallback) {
      return typeof fallback === 'string' ? (
        <img src={fallback} alt={alt} style={imageStyles} />
      ) : (
        fallback
      );
    }

    return (
      <div
        className="lazy-image-error"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af'
        }}
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    );
  };

  return (
    <div
      ref={imageRef}
      className={`lazy-image-container ${className}`}
      style={containerStyles}
      {...props}
    >
      {/* Placeholder or loading state */}
      {!imageState.error && <PlaceholderComponent />}

      {/* Error state */}
      {imageState.error && <ErrorComponent />}

      {/* Actual image */}
      {imageState.inView && !imageState.error && (
        <picture>
          {/* AVIF source */}
          {sources.avifSrc && (
            <source srcSet={sources.avifSrc} type="image/avif" />
          )}

          {/* WebP source */}
          {sources.webpSrc && (
            <source srcSet={sources.webpSrc} type="image/webp" />
          )}

          {/* Fallback image */}
          <img
            src={sources.src}
            alt={alt}
            srcSet={srcSet}
            sizes={responsiveSizes}
            loading={loadingProp}
            style={imageStyles}
            onLoad={(e) => {
              setImageState(prev => ({ ...prev, loaded: true, loading: false }));
              if (onLoad) onLoad(e);
            }}
            onError={(e) => {
              setImageState(prev => ({ ...prev, error: true, loading: false }));
              if (onError) onError(e);
            }}
          />
        </picture>
      )}
    </div>
  );
};

// Hook for progressive image loading
export const useProgressiveImage = (src, placeholder) => {
  const [imageState, setImageState] = useState({
    src: placeholder,
    loading: true,
    loaded: false
  });

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.src = src;

    img.onload = () => {
      setImageState({
        src: src,
        loading: false,
        loaded: true
      });
    };

    img.onerror = () => {
      setImageState({
        src: placeholder,
        loading: false,
        loaded: false
      });
    };
  }, [src, placeholder]);

  return imageState;
};

export default LazyImage;