import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json());

// Initialize server-side Gemini SDK client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Gemini Chat Endpoint for text and code generation
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { messages, mode, systemPrompt, context } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Array di messaggi obbligatorio' });
    }

    // Map conversation into Gemini SDK format
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: String(m.content || '') }],
    }));

    let systemInstruction = systemPrompt;
    if (!systemInstruction) {
      if (mode === 'cary') {
        systemInstruction =
          'Sei Cary, l\'assistente clinico ed empatico dell\'applicazione IBD Care per persone affette da Malattia di Crohn o Colite Ulcerosa. ' +
          'Rispondi in modo professionale, caldo, empatico e scientificamente fondato. ' +
          'Aiuta a comprendere i sintomi, identificare possibili correlazioni con i cibi, preparare le visite gastroenterologiche e suggerire strategie di benessere e nutrizione IBD-friendly. ' +
          'Ricorda sempre che i tuoi consigli non sostituiscono una diagnosi o prescrizione medica.';
      } else if (mode === 'code') {
        systemInstruction =
          'Sei un ingegnere del software senior esperto di sviluppo web, architettura, TypeScript, React, Tailwind CSS e algoritmi. ' +
          'Rispondi in italiano con spiegazioni tecniche chiare e concise, fornendo codice pulito, modulare, commentato e pronto all\'uso in blocchi markdown formattati con il linguaggio specificato.';
      } else if (mode === 'text') {
        systemInstruction =
          'Sei un copywriter e redattore professionista. ' +
          'Aiuti l\'utente a scrivere testi accattivanti, articoli, report medici, documentazione, email o riepiloghi. ' +
          'Rispondi in italiano con un tono fluido, empatico, accurato e ben strutturato in paragrafi ed elenchi puntati.';
      } else {
        systemInstruction =
          'Sei Gemini, un assistente AI avanzato integrato nell\'applicazione. ' +
          'Aiuti gli utenti sia nella generazione di codice e logica di programmazione, sia nella redazione di testi e chiarimenti. Rispondi in italiano in modo chiaro, utile e cortese.';
      }
    }

    if (context) {
      systemInstruction += `\n\n[CONTESTO CLINICO ATTUALE DEL PAZIENTE]\n${context}`;
    }

    // Use gemini-3.1-flash-lite for ultra-fast, highly-available responses, with gemini-3.8-flash compatibility
    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents,
        config: {
          systemInstruction,
          temperature: mode === 'code' ? 0.2 : 0.7,
        },
      });
    } catch (err: any) {
      console.warn('Fallback to gemini-3.8-flash:', err?.message || err);
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          temperature: mode === 'code' ? 0.2 : 0.7,
        },
      });
    }

    const reply = response.text || '';
    return res.json({ reply });
  } catch (error: any) {
    console.error('Error calling Gemini API:', error);
    return res.status(500).json({
      error: error?.message || 'Impossibile elaborare la richiesta con le API di Gemini',
    });
  }
});

// Photo scanner endpoint for meals: analyzes plate photos with Gemini Multimodal Vision
app.post('/api/gemini/scan-meal', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Immagine richiesta in formato Base64' });
    }

    const cleanBase64 = String(imageBase64).replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const prompt = `Sei un nutrizionista clinico esperto in malattie infiammatorie croniche intestinali (IBD: Morbo di Crohn e Colite Ulcerosa).
Analizza questa fotografia di un pasto o piatto culinario.
1. Identifica il piatto e tutti gli ingredienti/alimenti visibili.
2. Stima realisticamente le grammature delle porzioni e i valori nutrizionali totali (calorie kcal, proteine g, carboidrati g, grassi g).
3. Determina il tipo di pasto più probabile tra: "colazione", "pranzo", "cena", "spuntino".
4. Determina il metodo di cottura principale tra: "al_vapore", "bollito", "al_forno", "piastrato", "fritto", "crudo".
5. Fornisci una valutazione specifica per pazienti IBD (Crohn/Colite):
   - Livello di rischio infiammatorio/digestivo: "basso", "moderato" oppure "alto".
   - Eventuali allerte/ingredienti trigger (es. frittura pesante, spezie piccanti, lattosio, legumi con buccia dura, alcol, semi indigeribili).
   - Un consiglio nutrizionale personalizzato e rassicurante.

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido formattato secondo questo schema:
{
  "meal_name": "Nome descrittivo del pasto (es. Filetto di spigola al forno con patate)",
  "meal_type": "pranzo",
  "cooking_method": "al_forno",
  "foods_summary": "Spigola (160g), Patate al forno (180g), Olio extravergine (10g)",
  "total_kcal": 380,
  "total_protein": 34,
  "total_carbs": 32,
  "total_fat": 9,
  "items": [
    {
      "name": "Spigola",
      "qty": 160,
      "unit": "g",
      "kcal": 150,
      "proteine": 29,
      "carboidrati": 0
    },
    {
      "name": "Patate al forno",
      "qty": 180,
      "unit": "g",
      "kcal": 140,
      "proteine": 3,
      "carboidrati": 30
    },
    {
      "name": "Olio extravergine",
      "qty": 10,
      "unit": "g",
      "kcal": 90,
      "proteine": 0,
      "carboidrati": 0
    }
  ],
  "ibd_evaluation": {
    "is_safe": true,
    "risk_level": "basso",
    "trigger_warnings": [],
    "tip": "Ottima scelta: proteine magre altamente digeribili e carboidrati amidacei semplici a basso residuo, ideali per la mucosa intestinale."
  }
}`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: cleanBase64,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: 'application/json',
        },
      });
    } catch (err: any) {
      console.warn('Fallback to gemini-3.8-flash for vision analysis:', err?.message || err);
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: cleanBase64,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: 'application/json',
        },
      });
    }

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error analyzing meal photo:', error);
    return res.status(500).json({
      error: error?.message || 'Impossibile analizzare la foto del pasto con Gemini',
    });
  }
});

// In development, attach Vite dev server middleware
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  // In production, serve the built dist directory
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Server avviato su http://0.0.0.0:${port}`);
});
