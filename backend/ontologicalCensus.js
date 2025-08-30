
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const fetch = require('node-fetch');
const { GoogleGenAI } = require("@google/genai");

// --- START: Hardcoded Ontological Matrix ---
// This matrix is duplicated from App.tsx to provide the necessary semantic context for the AI analysis.
const relationshipMatrix = {
  'Self': {
    'Self': 'Identity', 'Thought': 'Subject Of', 'Logic': 'Applies', 'Unity': 'Seeks',
    'Existence': 'Affirms', 'Improvement': 'Undergoes', 'Mastery': 'Pursues',
    'Resonance': 'Experiences', 'Transcendence': 'Aspires To', 'Nothing/Everything': 'Is Realized by'
  },
  'Thought': {
    'Self': 'Informs', 'Thought': 'Recursion', 'Logic': 'Utilizes', 'Unity': 'Synthesizes',
    'Existence': 'Represents', 'Improvement': 'Drives', 'Mastery': 'Develops',
    'Resonance': 'Articulates', 'Transcendence': 'Enables', 'Nothing/Everything':'Transcends'
  },
  'Logic': {
    'Self': 'Structures', 'Thought': 'Governs', 'Logic': 'Foundation', 'Unity': 'Ensures',
    'Existence': 'Describes', 'Improvement': 'Validates', 'Mastery': 'Underpins',
    'Resonance': 'Contradicts', 'Transcendence': 'Grounds', 'Nothing/Everything':'Is the Foundation Of'
  },
  'Unity': {
    'Self': 'Integrates', 'Thought': 'Harmonizes', 'Logic': 'Requires', 'Unity': 'Essence',
    'Existence': 'Binds', 'Improvement': 'Fosters', 'Mastery': 'Culminates In',
    'Resonance': 'Amplifies', 'Transcendence': 'Achieves', 'Nothing/Everything':'Is the Ultimate Expression Of'
  },
  'Existence': {
    'Self': 'Manifests In', 'Thought': 'Is Pondered By', 'Logic': 'Obeys', 'Unity': 'Comprises',
    'Existence': 'Is', 'Improvement': 'Evolves Through', 'Mastery': 'Is Domain Of',
    'Resonance': 'Vibrates In', 'Transcendence': 'Is Surpassed By', 'Nothing/Everything':'Gives Rise To'
  },
  'Improvement': {
    'Self': 'Refines', 'Thought': 'Optimizes', 'Logic': 'Systematizes', 'Unity': 'Strengthens',
    'Existence': 'Enhances', 'Improvement': 'Process', 'Mastery': 'Leads To',
    'Resonance': 'Fine-tunes', 'Transcendence': 'Is Path To', 'Nothing/Everything':'Is the Cycle Of'
  },
  'Mastery': {
    'Self': 'Actualizes', 'Thought': 'Requires Deep', 'Logic': 'Applies Perfected', 'Unity': 'Embodies',
    'Existence': 'Commands', 'Improvement': 'Is Goal Of', 'Mastery': 'Pinnacle',
    'Resonance': 'Generates', 'Transcendence': 'Approaches', 'Nothing/Everything':'Is the Totality Of'
  },
  'Resonance': {
    'Self': 'Is Felt By', 'Thought': 'Is Evoked By', 'Logic': 'Eludes', 'Unity': 'Creates',
    'Existence': 'Echoes Through', 'Improvement': 'Aligns With', 'Mastery': 'Radiates From',
    'Resonance': 'Sympathy', 'Transcendence': 'Facilitates', 'Nothing/Everything':'Is the Ground Of'
  },
  'Transcendence': {
    'Self': 'Elevates', 'Thought': 'Goes Beyond', 'Logic': 'Is Not Bound By', 'Unity': 'Is A State Of',
    'Existence': 'Rises Above', 'Improvement': 'Is Aim Of', 'Mastery': 'Is Pinnacle Of',
    'Resonance': 'Induces', 'Transcendence': 'Action', 'Nothing/Everything':'Is the Nature Of'
  },
  'Nothing/Everything': {
    'Self': 'Merges With', 'Thought': 'Contemplates', 'Logic':'Is a Subset Of', 'Unity': 'Is an Aspect Of',
    'Existence': 'Emerges From', 'Improvement': 'Occurs Within', 'Mastery':'Seeks to Understand',
    'Resonance':'Harmonizes With', 'Transcendence': 'Aspires To', 'Nothing/Everything':'is'
  }
};
// --- END: Hardcoded Ontological Matrix ---


// 🧹 Stop words to ignore
const STOP_WORDS = new Set([
  'i', 'e', 'err', 'req', 'res', 'data', 'response', 'cb', 'next',
  'const', 'let', 'var', 'function', 'return', 'true', 'false'
]);

// 🚫 Default exclusion list
const EXCLUDED_SCRIPT_DOMAINS = [
  'googletagmanager.com',
  'google-analytics.com',
  'doubleclick.net',
  'adsbygoogle.js',
  'facebook.net',
  'cdn.jsdelivr.net/npm/gtag.js'
];

// 🪵 Logging utility
function logStep(step, data, options) {
  const timestamp = new Date().toISOString();
  const entry = { timestamp, step, data };
  if (options.verbose) console.log(`[${step}]`, data);
  if (options.logToFile) {
    const logPath = path.join('./logs', `census-run-${Date.now()}.json`);
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
  }
}

// ❌ Error handler with flair
function logError(step, error, options) {
  console.error(`[${step}] ❌ This DOOR is locked, we must find another way...`);
  console.error(error);
  if (options.logToFile) {
    const entry = {
      timestamp: new Date().toISOString(),
      step,
      error: error.message
    };
    const logPath = path.join('./logs', `census-run-${Date.now()}.json`);
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
  }
}

// 🧠 Semantic feature extractor
function extractFeatures(ast) {
  const topLevelFunctions = [];
  const topLevelVariables = [];
  const relations = [];

  for (const node of ast.body) {
    if (node.type === 'FunctionDeclaration' && node.id?.name) {
      topLevelFunctions.push(node.id.name);
    }

    if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations) {
        if (decl.id?.name && !STOP_WORDS.has(decl.id.name)) {
          topLevelVariables.push(decl.id.name);
        }
      }
    }

    if (node.type === 'ExpressionStatement') {
      const expr = node.expression;
      if (expr?.type === 'CallExpression') {
        const callee = expr.callee;
        const args = expr.arguments;

        if (callee.name === 'fetch' && args[0]?.type === 'Literal') {
          relations.push({ type: 'fetch', method: 'GET', url: args[0].value });
        }

        if (callee?.object?.name === 'axios' && callee?.property?.name && args[0]?.type === 'Literal') {
          relations.push({ type: 'axios', method: callee.property.name.toUpperCase(), url: args[0].value });
        }
      }
    }
  }

  return { topLevelFunctions, topLevelVariables, relations };
}

// 🧩 Prompt builder
function buildGeminiPrompt(features, matrix) {
  return `
You are analyzing the following JavaScript features extracted from a web app:

${features.map(f => `
From ${f.url}:
- Top-Level Functions: ${f.topLevelFunctions.join(', ') || 'None'}
- Top-Level Variables: ${f.topLevelVariables.join(', ') || 'None'}
- External Calls:
${f.relations.map(r => `  - ${r.type}: ${r.method} ${r.url}`).join('\n') || '  - None'}
`).join('\n')}

Use the following relationship matrix to infer semantic meaning and generate a JSON-LD description of the app's capabilities:

${JSON.stringify(matrix, null, 2)}

Respond only with JSON-LD.
  `.trim();
}

// 🧠 Gemini call with real API
async function callGemini(prompt) {
  try {
    // NOTE: Using process.env.API_KEY as per project guidelines.
    if (!process.env.API_KEY) {
      throw new Error("Gemini API key (API_KEY) is not set in environment variables.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });
    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to get a valid response from the Gemini API.");
  }
}

// 🧠 Main analysis function
async function performAnalysis(targetUrl, options = {}) {
  const {
    verbose = false,
    dryRun = false,
    logToFile = false,
    excludeDomains = EXCLUDED_SCRIPT_DOMAINS
  } = options;

  try {
    logStep('Start', { targetUrl }, options);

    const htmlRes = await fetch(targetUrl);
    if (!htmlRes.ok) {
        throw new Error(`Failed to fetch URL: ${htmlRes.status} ${htmlRes.statusText}`);
    }
    const html = await htmlRes.text();
    logStep('FetchedHTML', { length: html.length }, options);

    const scriptUrls = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)]
      .map(match => {
          let url = match[1];
          // Handle protocol-relative URLs
          if (url.startsWith('//')) {
              url = new URL(targetUrl).protocol + url;
          } 
          // Handle relative URLs
          else if (!url.startsWith('http')) {
              url = new URL(url, targetUrl).href;
          }
          return url;
      })
      .filter(src => !excludeDomains.some(domain => src.includes(domain)));
    logStep('FilteredScripts', { scriptUrls }, options);

    const extractedFeatures = [];
    const skippedScripts = [];

    for (const url of scriptUrls) {
      try {
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`HTTP error ${res.status}`);
        }
        const code = await res.text();
        const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script' });

        const features = extractFeatures(ast);
        extractedFeatures.push({ url, ...features });
      } catch (err) {
        skippedScripts.push({ url, error: err.message });
        logError('ScriptParseFail', { url, error: err.message }, options);
      }
    }

    logStep('ExtractedFeatures', { count: extractedFeatures.length }, options);

    if (extractedFeatures.length === 0) {
        return {
            dryRun: false,
            result: { warning: "No analyzable external scripts found on the page.", extractedFeatures, skippedScripts },
            extractedFeatures,
            skippedScripts
        };
    }

    // Use the hardcoded matrix directly.
    const prompt = buildGeminiPrompt(extractedFeatures, relationshipMatrix);
    logStep('BuiltPrompt', { promptPreview: prompt.slice(0, 300) }, options);

    if (dryRun) {
      return {
        dryRun: true,
        prompt,
        extractedFeatures,
        skippedScripts,
        relationshipMatrix
      };
    }

    const geminiResponse = await callGemini(prompt);
    logStep('GeminiResponse', { response: geminiResponse }, options);

    return {
      dryRun: false,
      result: geminiResponse,
      extractedFeatures,
      skippedScripts
    };
  } catch (err) {
    logError('FatalError', err, options);
    return { error: err.message };
  }
}

module.exports = { performAnalysis };
