import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";
import { TiptiiBadge } from "@/components/TiptiiLogo";
import { SITE, COMPANY, fullAddress } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 bg-white/60" data-testid="site-footer">
      <div className="max-w-6xl mx-auto px-5 py-10 grid gap-8 md:grid-cols-3 text-sm text-stone-500">
        <div>
          <Link to="/" className="flex items-center gap-2">
            <TiptiiBadge size={28} />
            <span className="font-display font-bold text-stone-800">tiptii</span>
          </Link>
          <p className="mt-3 leading-relaxed">{SITE.tagline}. Un passo dopo l'altro, cresciamo insieme.</p>
        </div>
        <div>
          <p className="font-display font-bold text-stone-800 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-brand" /> {COMPANY.legalName}
          </p>
          <address className="mt-3 not-italic leading-relaxed" data-testid="footer-company">
            {fullAddress()}<br />
            P.IVA {COMPANY.vat}{COMPANY.rea && <> · REA {COMPANY.rea}</>}<br />
            {COMPANY.pec && <>PEC <a href={`mailto:${COMPANY.pec}`} className="hover:text-brand-hover">{COMPANY.pec}</a><br /></>}
            {COMPANY.phone && <>Tel. <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`} className="hover:text-brand-hover">{COMPANY.phone}</a><br /></>}
            <a href={`mailto:${COMPANY.email}`} className="hover:text-brand-hover">{COMPANY.email}</a>
            {" · "}
            <a href={COMPANY.website} target="_blank" rel="noreferrer" className="hover:text-brand-hover">{COMPANY.website.replace(/^https?:\/\/(www\.)?/, "")}</a>
          </address>
        </div>
        <div>
          <p className="font-display font-bold text-stone-800">Link utili</p>
          <ul className="mt-3 space-y-1.5">
            <li><Link to="/privacy" className="hover:text-brand-hover" data-testid="footer-privacy-link">Privacy policy</Link></li>
            <li><Link to="/privacy#cookie" className="hover:text-brand-hover" data-testid="footer-cookie-link">Cookie</Link></li>
            <li><Link to="/login" className="hover:text-brand-hover" data-testid="footer-login-link">Accedi</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-200">
        <p className="max-w-6xl mx-auto px-5 py-4 text-xs text-stone-400">
          © {new Date().getFullYear()} {COMPANY.legalName}{COMPANY.shareCapital && ` — Capitale sociale ${COMPANY.shareCapital}`} — Tutti i diritti riservati. Realizzata con cura in Italia.
        </p>
      </div>
    </footer>
  );
}
