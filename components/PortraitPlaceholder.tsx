type PortraitPlaceholderProps = {
  code: string;
};

export function PortraitPlaceholder({ code }: PortraitPlaceholderProps) {
  const letter = code.trim().charAt(0).toUpperCase();

  return (
    <div className="portraitPlaceholder bg-brand-dark text-brand-cream" role="img" aria-label={code}>
      {letter}
    </div>
  );
}
