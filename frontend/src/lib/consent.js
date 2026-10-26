const KEY = "tiptii_cookie_consent";
const VERSION = "2026-10-26";
const FONTS_URL = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Manrope:wght@300;400;500;600;700&family=Inter:wght@600&display=swap";

export function getConsent() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    return v && v.version === VERSION ? v.choice : null;
  } catch {
    return null;
  }
}

export function setConsent(choice) {
  localStorage.setItem(KEY, JSON.stringify({ choice, version: VERSION, date: new Date().toISOString() }));
  if (choice === "accepted") loadExternalFonts();
}

export function resetConsent() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("tiptii:cookie-preferences"));
}

// Google Fonts transfer the visitor IP to Google: load them only after consent.
export function loadExternalFonts() {
  if (document.getElementById("tiptii-fonts")) return;
  const link = Object.assign(document.createElement("link"), { id: "tiptii-fonts", rel: "stylesheet", href: FONTS_URL });
  document.head.appendChild(link);
}
