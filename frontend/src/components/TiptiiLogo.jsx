/**
 * Tiptii Logo components — SVG inline, scalabili e themable.
 *
 * - <TiptiiMark />   icona (orme bimbo), per favicon / badge / avatar
 * - <TiptiiLogo />   icona + wordmark affiancati
 *
 * Palette:
 *   salvia #2F7D6D (brand)
 *   albicocca #F2A65A (accent)
 *   bianco #FFFFFF
 */

export function TiptiiMark({ size = 32, className = "", variant = "onLight" }) {
  // variant: onLight (icona orange+salvia su sfondo chiaro) | onBrand (bianca su salvia)
  const toeColor = variant === "onBrand" ? "#FFFFFF" : "#F2A65A";
  const trailColor = variant === "onBrand" ? "rgba(255,255,255,0.55)" : "#2F7D6D";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Tiptii"
    >
      {/* Orma più grande: tallone + 4 ditini */}
      <g transform="translate(10 7)">
        <ellipse cx="12" cy="21" rx="10" ry="12" fill={toeColor} />
        <circle cx="4"  cy="7"  r="2.4" fill={toeColor} />
        <circle cx="9"  cy="4"  r="2.6" fill={toeColor} />
        <circle cx="14" cy="4"  r="2.6" fill={toeColor} />
        <circle cx="19" cy="7"  r="2.4" fill={toeColor} />
      </g>
      {/* Secondo passo (piccolo trail), suggerisce movimento “passo dopo passo” */}
      <g transform="translate(32 24)" opacity="0.75">
        <ellipse cx="5" cy="8" rx="4" ry="5" fill={trailColor} />
        <circle cx="1.5" cy="2.5" r="1"  fill={trailColor} />
        <circle cx="4"   cy="1"   r="1.1" fill={trailColor} />
        <circle cx="6.5" cy="1"   r="1.1" fill={trailColor} />
        <circle cx="9"   cy="2.5" r="1"  fill={trailColor} />
      </g>
    </svg>
  );
}

export function TiptiiLogo({
  size = 36,
  wordColor = "#2B2F33",   // Ardesia calda per default (su sfondo chiaro)
  className = "",
  variant = "onLight",
}) {
  const h = typeof size === "number" ? size : 36;
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label="Tiptii">
      <TiptiiMark size={h} variant={variant} />
      <span
        className="font-display font-bold leading-none"
        style={{ fontSize: `${h * 0.72}px`, color: wordColor, letterSpacing: "-0.02em" }}
      >
        tiptii
      </span>
    </span>
  );
}

/**
 * Avatar circolare in salvia con orme bianche — per uso su sfondi chiari dove
 * vogliamo un badge brand coerente (es. header, splash, email).
 */
export function TiptiiBadge({ size = 40, className = "" }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-2xl ${className}`}
      style={{ width: size, height: size, background: "#2F7D6D" }}
    >
      <TiptiiMark size={Math.round(size * 0.72)} variant="onBrand" />
    </span>
  );
}
