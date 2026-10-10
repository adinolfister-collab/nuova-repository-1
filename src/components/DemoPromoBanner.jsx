import React from 'react';
import { Sparkles } from 'lucide-react';

// Banner promozionale bilingue IT/EN visibile in cima alla pagina demo.
// Il testo è volutamente statico (copy promozionale dedicato alla demo)
// per garantire la versione bilingue anche su lingue non IT/EN.
const IT_TEXT =
  'Esplora la demo di IBD Care e attiva la prova gratuita completa di 45 giorni: diario sintomi, alimentazione con foto scanner, terapie e assistente AI per chi vive con il morbo di Crohn e la colite ulcerosa. Nessuna carta di credito richiesta.';
const EN_TEXT =
  "Explore the IBD Care demo and activate your 45-day full free trial: symptom diary, meal photo scanner, therapy management and AI assistant for Crohn's and colitis. No credit card required.";

export default function DemoPromoBanner() {
  return (
    <div className="mb-6 rounded-2xl border border-terracotta/30 bg-gradient-to-br from-terracotta/[0.07] to-primary/[0.04] p-5 md:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-terracotta" />
        <span className="text-[11px] font-heading font-semibold uppercase tracking-[0.2em] text-terracotta">
          IBD Care · Demo
        </span>
      </div>
      <p className="text-sm md:text-base text-foreground/90 leading-relaxed select-text">
        {IT_TEXT}
      </p>
      <p className="mt-2.5 text-xs md:text-sm text-muted-foreground leading-relaxed select-text italic">
        {EN_TEXT}
      </p>
    </div>
  );
}