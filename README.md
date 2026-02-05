# Agent Workflow UI - Počet podlaží

Moderné webové rozhranie pre agentic workflow analýzy počtu podlaží z dokumentov.

## Funkcie

- 💬 **Chat rozhranie** - Jednoduché zadávanie vstupov cez chat
- 📊 **Interaktívna tabuľka výsledkov** - Prehľad s názvom, hodnotou a úrovňou dôvery
- 📈 **Vizualizácia dôvery** - Farebný indikátor zhody medzi dokumentmi
- 📄 **Detaily z dokumentov** - Rozbaliteľná sekcia s výstupmi z jednotlivých agentov
- ⚡ **Real-time progress** - Sledovanie priebehu workflow

## Inštalácia

```bash
npm install
```

## Spustenie

```bash
npm run dev
```

Aplikácia bude dostupná na [http://localhost:3000](http://localhost:3000)

## Štruktúra projektu

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── workflow/
│   │   │       └── route.ts    # API endpoint pre workflow
│   │   ├── globals.css         # Globálne štýly
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Hlavná stránka
│   ├── components/
│   │   ├── ChatInput.tsx       # Vstupné pole pre chat
│   │   ├── ChatMessage.tsx     # Komponenta pre správy
│   │   ├── WorkflowProgress.tsx # Indikátor priebehu
│   │   └── WorkflowResult.tsx  # Tabuľka výsledkov
│   └── lib/
│       └── workflow.ts         # Logika workflow (z agent_pocet_podlazi.ts)
├── agent_pocet_podlazi.ts      # Pôvodný agent súbor
├── package.json
├── tailwind.config.ts
└── next.config.js
```

## Workflow

1. Používateľ zadá vstupný text
2. Workflow spustí 3 extrakčných agentov na rôzne dokumenty
3. Orchestrátor porovná výsledky
4. Klasifikátor určí kategóriu (zhoda/problém)
5. Výsledok sa zobrazí v interaktívnej tabuľke s:
   - **Názov**: Analyzovaný parameter (Počet podlaží)
   - **Hodnota**: Výsledok z orchestrátora
   - **Dôvera**: Percentuálna zhoda medzi dokumentmi

## Technológie

- [Next.js 14](https://nextjs.org/)
- [React 18](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide React](https://lucide.dev/)
- [@openai/agents](https://github.com/openai/openai-agents-js)

## Konfigurácia

Skopírujte `.env.example` do `.env.local` a nastavte potrebné premenné:

```
OPENAI_API_KEY=your_api_key_here
```
