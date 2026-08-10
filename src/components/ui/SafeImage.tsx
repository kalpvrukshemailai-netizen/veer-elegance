import { useState } from 'react';
import { fallbackImage } from '../../data/products';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
}

export function SafeImage({ src, alt, fallback = fallbackImage, className, ...props }: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  return (
    <img
      {...props}
      src={hasError ? fallback : (src || fallback)}
      alt={alt}
      className={className}
      onError={() => {
        if (!hasError) {
          setHasError(true);
        }
      }}
    />
  );
}
