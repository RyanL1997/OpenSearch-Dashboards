/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { monaco } from '../monaco';
import { ID, PPL_TOKEN_SETS } from './constants';
import { PPLWorkerProxyService } from './worker_proxy_service';
import { getPPLLanguageAnalyzer, PPLValidationResult } from './ppl_language_analyzer';
import { getPPLDocumentationLink } from './ppl_documentation';
import { pplRangeFormatProvider } from './formatter';
import { resolvePPLValidationResult } from './validation_provider';

const PPL_LANGUAGE_ID = ID;
const OWNER = 'PPL_WORKER';
const LINT_OWNER = 'PPL_LINTER';

// PPL worker proxy service for worker-based syntax highlighting
const pplWorkerProxyService = new PPLWorkerProxyService();

// PPL analyzer for synchronous tokenization (lazy initialization)
let pplAnalyzer: ReturnType<typeof getPPLLanguageAnalyzer> | undefined;

/**
 * Map PPL Language Analyzer tokens to Monaco editor token classes
 * Based on ANTLR-generated token types from OpenSearchPPLLexer
 */
const mapPPLTokenToMonacoTokenType = (tokenType: string): string => {
  const type = tokenType.toUpperCase();

  // Use optimized Set lookups from constants
  for (const [monacoType, tokenSet] of Object.entries(PPL_TOKEN_SETS)) {
    if (tokenSet.has(type)) {
      return monacoType;
    }
  }

  // Default case
  return 'identifier';
};

/**
 * Create Monaco language configuration for PPL
 */
const createPPLLanguageConfiguration = (): monaco.languages.LanguageConfiguration => ({
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/'],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"', notIn: ['string'] },
    { open: "'", close: "'", notIn: ['string', 'comment'] },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
});

/**
 * Set up synchronous tokenization for PPL
 */
const setupPPLTokenization = () => {
  monaco.languages.setTokensProvider(PPL_LANGUAGE_ID, {
    getInitialState: () => {
      const state = {
        clone: () => state,
        equals: () => true,
      };
      return state;
    },
    tokenize: (line: string, state: any) => {
      // Use PPL Language Analyzer for accurate tokenization
      const tokens: monaco.languages.IToken[] = [];

      try {
        // Only process if line contains potential PPL content
        if (line.trim()) {
          // Lazy initialize the PPL analyzer only when needed
          if (!pplAnalyzer) {
            pplAnalyzer = getPPLLanguageAnalyzer();
          }

          const pplTokens = pplAnalyzer.tokenize(line);

          for (const pplToken of pplTokens) {
            const tokenType = mapPPLTokenToMonacoTokenType(pplToken.type);
            tokens.push({
              startIndex: pplToken.startIndex,
              scopes: tokenType,
            });
          }
        }
      } catch (error) {
        // If ANTLR fails, return empty tokens
      }

      return {
        tokens,
        endState: state,
      };
    },
  });
};

/**
 * Process syntax highlighting for PPL models
 */
const processSyntaxHighlighting = async (model: monaco.editor.IModel) => {
  // Only process if the model is still set to PPL language
  if (model.getLanguageId() !== PPL_LANGUAGE_ID) {
    // Clear any existing PPL markers if language changed
    monaco.editor.setModelMarkers(model, OWNER, []);
    return;
  }

  try {
    const content = model.getValue();

    // Ensure worker is set up before validation - always call setup as it has internal check
    pplWorkerProxyService.setup();

    const validationResult = (await resolvePPLValidationResult(
      model,
      content,
      async (query) => (await pplWorkerProxyService.validate(query)) as PPLValidationResult
    )) as PPLValidationResult;

    if (validationResult.errors.length > 0) {
      // Convert errors to Monaco markers
      const markers: monaco.editor.IMarkerData[] = validationResult.errors.map((error) => {
        // Map SyntaxError properties to Monaco marker properties
        const startLineNumber = error.line || 1;
        const endLineNumber = error.endLine || error.line || startLineNumber;
        const startColumn = (error.column || 0) + 1; // Monaco is 1-based, ANTLR is 0-based
        const endColumn = (error.endColumn || error.column + 1 || startColumn) + 1;

        const safeStartLine = Math.max(1, startLineNumber);
        const safeEndLine = Math.max(safeStartLine, endLineNumber);
        const safeStartColumn = Math.max(1, startColumn);
        const safeEndColumn = Math.max(safeStartColumn, endColumn);

        const docLink = getPPLDocumentationLink(error.message);
        return {
          severity: monaco.MarkerSeverity.Error,
          message: error.message,
          startLineNumber: safeStartLine,
          startColumn: safeStartColumn,
          endLineNumber: safeEndLine,
          endColumn: safeEndColumn,
          // Add error code for better categorization
          code: {
            value: 'View Documentation',
            target: monaco.Uri.parse(docLink.url),
          },
        };
      });

      monaco.editor.setModelMarkers(model, OWNER, markers);
    } else {
      // Clear markers if no errors
      monaco.editor.setModelMarkers(model, OWNER, []);
    }
  } catch (error) {
    // Silent error handling - continue without worker-based highlighting
  }
};

export const revalidatePPLModel = async (model: monaco.editor.IModel) => {
  await processSyntaxHighlighting(model);
};

// --- PPL Lint integration ---

let lintTimer: ReturnType<typeof setTimeout> | undefined;
let lintAbortController: AbortController | undefined;

/**
 * Calls the backend _lint endpoint and renders warning markers.
 * Debounced to avoid flooding the server on every keystroke.
 */
const processLintHighlighting = (model: monaco.editor.IModel) => {
  if (lintTimer) clearTimeout(lintTimer);

  lintTimer = setTimeout(async () => {
    if (model.getLanguageId() !== PPL_LANGUAGE_ID) {
      monaco.editor.setModelMarkers(model, LINT_OWNER, []);
      return;
    }

    const content = model.getValue();
    if (!content.trim()) {
      monaco.editor.setModelMarkers(model, LINT_OWNER, []);
      return;
    }

    // Cancel any in-flight request
    if (lintAbortController) lintAbortController.abort();
    lintAbortController = new AbortController();

    try {
      const response = await fetch('/api/enhancements/ppl/lint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'osd-xsrf': 'true' },
        body: JSON.stringify({ query: content }),
        signal: lintAbortController.signal,
      });

      if (!response.ok) {
        monaco.editor.setModelMarkers(model, LINT_OWNER, []);
        return;
      }

      const data = await response.json();
      const diagnostics: Array<{
        severity: string;
        message: string;
        command: string;
        suggestion?: string;
      }> = data.diagnostics || [];

      if (diagnostics.length === 0) {
        monaco.editor.setModelMarkers(model, LINT_OWNER, []);
        return;
      }

      const markers: monaco.editor.IMarkerData[] = diagnostics.map((d) => {
        // Try to find the command keyword position in the query text for precise underline
        const cmdRegex = new RegExp(`\\|\\s*(${d.command})\\b`, 'i');
        const match = content.match(cmdRegex);
        let startCol = 1;
        let endCol = content.length + 1;
        if (match && match.index !== undefined) {
          // Underline the command keyword itself
          const cmdStart = match.index + match[0].indexOf(match[1]);
          startCol = cmdStart + 1; // Monaco is 1-based
          endCol = startCol + match[1].length;
        }

        const message = d.suggestion ? `${d.message}\n\n💡 ${d.suggestion}` : d.message;

        const PPL_DOCS_BASE =
          'https://opensearch.org/docs/latest/search-plugins/sql/ppl/functions/';
        const CMD_DOC_URLS: Record<string, string> = {
          head: 'https://opensearch.org/docs/latest/search-plugins/sql/ppl/cmd/head/',
          stats: 'https://opensearch.org/docs/latest/search-plugins/sql/ppl/cmd/stats/',
          sort: 'https://opensearch.org/docs/latest/search-plugins/sql/ppl/cmd/sort/',
          where: 'https://opensearch.org/docs/latest/search-plugins/sql/ppl/cmd/where/',
          dedup: 'https://opensearch.org/docs/latest/search-plugins/sql/ppl/cmd/dedup/',
          eval: 'https://opensearch.org/docs/latest/search-plugins/sql/ppl/cmd/eval/',
          fields: 'https://opensearch.org/docs/latest/search-plugins/sql/ppl/cmd/fields/',
        };
        const docUrl = CMD_DOC_URLS[d.command.toLowerCase()] || `${PPL_DOCS_BASE}`;

        return {
          severity: monaco.MarkerSeverity.Warning,
          message,
          startLineNumber: 1,
          startColumn: startCol,
          endLineNumber: 1,
          endColumn: endCol,
          code: {
            value: 'View Documentation',
            target: monaco.Uri.parse(docUrl),
          },
        };
      });

      monaco.editor.setModelMarkers(model, LINT_OWNER, markers);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        // Silently clear on error — lint is advisory
        monaco.editor.setModelMarkers(model, LINT_OWNER, []);
      }
    }
  }, 500); // 500ms debounce
};

/**
 * Set up PPL document range formatting provider
 */
const setupPPLFormatter = () => {
  monaco.languages.registerDocumentRangeFormattingEditProvider(
    PPL_LANGUAGE_ID,
    pplRangeFormatProvider
  );
};

/**
 * Set up syntax highlighting using PPL worker
 */
const setupPPLSyntaxHighlighting = () => {
  const disposables: monaco.IDisposable[] = [];

  const handleModel = (model: monaco.editor.IModel) => {
    // Set up content change listener
    disposables.push(
      model.onDidChangeContent(async () => {
        if (model.getLanguageId() === PPL_LANGUAGE_ID) {
          await processSyntaxHighlighting(model);
          processLintHighlighting(model);
        }
      })
    );

    // Set up language change listener
    disposables.push(
      model.onDidChangeLanguage(async () => {
        if (model.getLanguageId() === PPL_LANGUAGE_ID) {
          await processSyntaxHighlighting(model);
          processLintHighlighting(model);
        } else {
          monaco.editor.setModelMarkers(model, OWNER, []);
          monaco.editor.setModelMarkers(model, LINT_OWNER, []);
        }
      })
    );

    // Process immediately if already PPL
    if (model.getLanguageId() === PPL_LANGUAGE_ID) {
      processSyntaxHighlighting(model);
      processLintHighlighting(model);
    }
  };

  // Listen for new models
  disposables.push(monaco.editor.onDidCreateModel(handleModel));

  // Listen for model disposal to clear markers
  disposables.push(
    monaco.editor.onWillDisposeModel((model) => {
      monaco.editor.setModelMarkers(model, OWNER, []);
      monaco.editor.setModelMarkers(model, LINT_OWNER, []);
    })
  );

  // Handle existing models
  monaco.editor.getModels().forEach(handleModel);

  // Return cleanup function
  return () => {
    disposables.forEach((d) => d.dispose());
    pplWorkerProxyService.stop();
  };
};

/**
 * Register PPL language support with Monaco Editor
 */
export const registerPPLLanguage = () => {
  // Register the PPL language
  monaco.languages.register({
    id: PPL_LANGUAGE_ID,
    extensions: ['.ppl'],
    aliases: ['PPL', 'ppl', 'Piped Processing Language'],
    mimetypes: ['application/ppl', 'text/ppl'],
  });

  // Set language configuration
  monaco.languages.setLanguageConfiguration(PPL_LANGUAGE_ID, createPPLLanguageConfiguration());

  // Set up synchronous tokenization
  setupPPLTokenization();

  // Set up PPL formatter
  setupPPLFormatter();

  // Set up syntax highlighting with worker
  const disposeSyntaxHighlighting = setupPPLSyntaxHighlighting();

  return {
    dispose: () => {
      disposeSyntaxHighlighting();
    },
  };
};

// Auto-register PPL language support
registerPPLLanguage();
