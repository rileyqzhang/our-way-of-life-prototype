import Image from "next/image";

type ArchiveImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
};

export function ArchiveImage({ src, alt, width, height, className, priority = false }: ArchiveImageProps) {
  const optimized = src.startsWith("/") || src.startsWith("https://cdn.sanity.io/");
  if (!optimized) {
    return <img alt={alt} className={className} height={height} src={src} width={width} />;
  }

  return (
    <Image
      alt={alt}
      className={className}
      height={height}
      priority={priority}
      src={src}
      width={width}
    />
  );
}
