type LogoProps = {
  href?: string;
  className?: string;
};

export function Logo({ href, className = "" }: LogoProps) {
  const content = (
    <>
      <span className="brand-mark" aria-hidden="true">GG</span>
      <span className="brand-wordmark">
        Lo<span className="brand-gg">GG</span>y
      </span>
    </>
  );

  if (!href) return <span className={`brand ${className}`.trim()}>{content}</span>;

  return (
    <a
      className={`brand ${className}`.trim()}
      href={href}
      aria-label="LoGGy home"
    >
      {content}
    </a>
  );
}
