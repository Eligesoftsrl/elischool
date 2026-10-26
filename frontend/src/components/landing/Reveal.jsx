import { motion } from "framer-motion";

export function Reveal({ children, delay = 0, className, as = "div" }) {
  const M = motion[as];
  return (
    <M className={className}
      initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </M>
  );
}

export function SectionHeading({ eyebrow, title, sub, center }) {
  return (
    <Reveal className={center ? "max-w-3xl mx-auto text-center" : "max-w-3xl"}>
      <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-brand">
        <span className="h-1.5 w-6 rounded-full bg-[#F2A65A]" /> {eyebrow}
      </span>
      <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-stone-800 tracking-tight leading-[1.1]">{title}</h2>
      {sub && <p className="mt-4 text-stone-600 text-base md:text-lg leading-relaxed">{sub}</p>}
    </Reveal>
  );
}
