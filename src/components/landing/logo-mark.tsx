// Static brand mark. Server-renderable, no animation, no client JS — the
// animated/glitch variant that used to live here was pure decoration and
// forced the whole nav to be a client component.
export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      className="logo-mark"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="192" height="192" rx="44" stroke="currentColor" strokeOpacity="0.28" strokeWidth="8" />
      <path
        d="M56 148V52h20l52 62V52h20v96h-20L76 86v62Z"
        fill="currentColor"
      />
    </svg>
  );
}
