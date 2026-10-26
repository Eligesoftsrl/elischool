import { useEffect } from "react";
import { SITE } from "@/config/site";

function upsert(selector, create) {
  let el = document.head.querySelector(selector);
  if (!el) { el = create(); document.head.appendChild(el); }
  return el;
}

// Per-page title, description and canonical (index.html only holds the home defaults).
export function usePageMeta({ title, description, path }) {
  useEffect(() => {
    const url = `${SITE.url}${path}`;
    document.title = title;
    upsert('meta[name="description"]', () => Object.assign(document.createElement("meta"), { name: "description" })).content = description;
    upsert('link[rel="canonical"]', () => Object.assign(document.createElement("link"), { rel: "canonical" })).href = url;
    upsert('meta[property="og:url"]', () => { const m = document.createElement("meta"); m.setAttribute("property", "og:url"); return m; }).content = url;
    upsert('meta[property="og:title"]', () => { const m = document.createElement("meta"); m.setAttribute("property", "og:title"); return m; }).content = title;
  }, [title, description, path]);
}
