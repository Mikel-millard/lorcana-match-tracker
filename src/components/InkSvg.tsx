import React from 'react';

interface InkSvgProps {
  svgString: string;
  alt: string;
  className?: string;
}

const InkSvg: React.FC<InkSvgProps> = ({ svgString, alt, className }) => {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: svgString }}
      role="img"
      aria-label={alt}
    />
  );
};

export default InkSvg;
