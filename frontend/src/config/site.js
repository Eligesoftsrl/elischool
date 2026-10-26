// Dati del sito e dell'azienda, usati da home, footer e privacy policy.
// Modifica SOLO questo file per aggiornare le informazioni ovunque.
// I campi lasciati vuoti ("") non vengono mostrati sul sito.

export const SITE = {
  productName: "Tiptii",
  url: "https://www.tiptii.com",
  tagline: "La piattaforma per nido e scuola dell'infanzia",
  supportEmail: "info@eligesoft.com",
};

export const COMPANY = {
  name: "Eligesoft",
  legalName: "Eligesoft S.r.l.",
  website: "https://www.eligesoft.com",
  email: "info@eligesoft.com",
  pec: "eligesoft@oec.eligesoft.com",
  phone: "",
  address: "Via San Pietro, 16",
  cap: "84014",
  city: "Nocera Inferiore",
  province: "SA",
  vat: "04532690650",
  rea: "SA-374658",
  shareCapital: "",
  // Lascia vuoto se non avete nominato un DPO (Responsabile Protezione Dati)
  dpoEmail: "",
};

export const PRIVACY_LAST_UPDATE = "26 ottobre 2026";

export const fullAddress = () =>
  `${COMPANY.address}, ${COMPANY.cap} ${COMPANY.city} (${COMPANY.province})`;
