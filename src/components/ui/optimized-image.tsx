import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean; // Para imagens acima da dobra
  quality?: number; // Qualidade da imagem (1-100)
  className?: string;
  sizes?: string; // Para responsive images
}

// Hook para detectar suporte a WebP
function useWebPSupport() {
  const [supportsWebP, setSupportsWebP] = useState<boolean | null>(null);

  useEffect(() => {
    const checkWebPSupport = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const dataURL = canvas.toDataURL('image/webp');
      setSupportsWebP(dataURL.startsWith('data:image/webp'));
    };

    checkWebPSupport();
  }, []);

  return supportsWebP;
}

// Hook para Intersection Observer (lazy loading)
function useIntersectionObserver(
  ref: React.RefObject<HTMLElement>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [ref, options]);

  return isIntersecting;
}

// Função para converter URL para WebP se possível
function getOptimizedSrc(src: string, supportsWebP: boolean, quality: number = 85): string {
  // Se for uma URL externa que já é otimizada, retorna como está
  if (src.startsWith('http') && !src.includes('localhost')) {
    return src;
  }

  // Se for base64 ou blob, retorna como está
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }

  // Para imagens locais, tenta usar WebP se suportado
  if (supportsWebP && !src.includes('.webp')) {
    const extension = src.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png'].includes(extension || '')) {
      return src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }
  }

  return src;
}

// Função para gerar srcSet responsivo
function generateSrcSet(src: string, supportsWebP: boolean): string {
  const optimizedSrc = getOptimizedSrc(src, supportsWebP);
  const baseSrc = optimizedSrc.replace(/\.(webp|jpg|jpeg|png)$/i, '');
  const extension = supportsWebP ? '.webp' : '.jpg';

  return [
    `${baseSrc}-sm${extension} 400w`,
    `${baseSrc}-md${extension} 800w`,
    `${baseSrc}-lg${extension} 1200w`,
    `${optimizedSrc} 1600w`
  ].join(', ');
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  quality = 85,
  className,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const supportsWebP = useWebPSupport();
  const isInView = useIntersectionObserver(containerRef);
  
  // Determinar se deve carregar a imagem
  const shouldLoad = priority || isInView;
  
  // Gerar URLs otimizadas
  const optimizedSrc = supportsWebP !== null ? getOptimizedSrc(src, supportsWebP, quality) : src;
  const fallbackSrc = src; // URL original como fallback
  
  // Placeholder enquanto carrega
  const placeholder = `data:image/svg+xml;base64,${btoa(`
    <svg width="${width || 400}" height="${height || 300}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="#9ca3af" font-family="Arial, sans-serif" font-size="14">
        Carregando...
      </text>
    </svg>
  `)}`;

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
  };

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      style={{ width, height }}
    >
      {/* Placeholder/Skeleton */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Imagem principal */}
      {shouldLoad && (
        <picture>
          {/* Source WebP para navegadores que suportam */}
          {supportsWebP && (
            <source 
              srcSet={generateSrcSet(src, true)}
              sizes={sizes}
              type="image/webp"
            />
          )}
          
          {/* Fallback para navegadores sem suporte a WebP */}
          <img
            ref={imgRef}
            src={hasError ? fallbackSrc : optimizedSrc}
            alt={alt}
            width={width}
            height={height}
            className={cn(
              "transition-opacity duration-300",
              isLoaded ? "opacity-100" : "opacity-0",
              "w-full h-full object-cover"
            )}
            loading={priority ? "eager" : "lazy"}
            onLoad={handleLoad}
            onError={handleError}
            sizes={sizes}
            {...props}
          />
        </picture>
      )}

      {/* Fallback para erro */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-500 text-sm">
          Erro ao carregar imagem
        </div>
      )}
    </div>
  );
}

// Componente específico para avatars
export function OptimizedAvatar({ 
  src, 
  alt, 
  size = 40,
  className,
  ...props 
}: OptimizedImageProps & { size?: number }) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("rounded-full", className)}
      priority={true} // Avatars são geralmente importantes
      {...props}
    />
  );
}

// Componente para hero images (prioridade alta)
export function OptimizedHeroImage({ 
  src, 
  alt, 
  className,
  ...props 
}: OptimizedImageProps) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      priority={true}
      quality={90}
      className={cn("w-full h-full object-cover", className)}
      sizes="100vw"
      {...props}
    />
  );
}

export default OptimizedImage;