// asciidocDef.ts
import { languages } from 'monaco-editor';

export const languageID = 'asciidoc';

export const conf: languages.LanguageConfiguration = {
  comments: {
    lineComment: '//',
    blockComment: ['////', '////'],
  },
  brackets: [
    ['{', '}'], ['[', ']'], ['(', ')'], ['<', '>'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' }, { open: '[', close: ']' },
    { open: '(', close: ')' }, { open: '<', close: '>' },
    { open: '"', close: '"' }, { open: "'", close: "'" },
    { open: '`', close: '`' }, { open: '*', close: '*' },
    { open: '_', close: '_' },
  ],
  surroundingPairs: [
    { open: '{', close: '}' }, { open: '[', close: ']' },
    { open: '(', close: ')' }, { open: '<', close: '>' },
    { open: '"', close: '"' }, { open: "'", close: "'" },
    { open: '`', close: '`' }, { open: '*', close: '*' },
    { open: '_', close: '_' },
  ]
};

export const languageDef: languages.IMonarchLanguage = {
  defaultToken: 'text', // Default everything to plain text
  tokenPostfix: '.adoc',

  tokenizer: {
    root: [
      // --- Headers ---
      // Match the equals signs separately from the title text
      [/^(=+)(\s+)(.*)$/, ['delimiter.header', '', 'keyword.header']],

      // --- Lists ---
      // Dim the bullet points (*, ., -)
      [/^\s*[\*\.\-]+\s+/, 'delimiter.list'],

      // --- Attributes ---
      // :name: value -> Dim the colons and name, highlight value slightly
      [/^(:)([\w-]+)(:)/, ['delimiter.attribute', 'variable.attribute', 'delimiter.attribute']],

      // --- Blocks (Fences) ---
      // Dim the ---- lines
      [/^----+\s*$/, { token: 'delimiter.block', next: '@codeBlock' }],
      [/^\.\.\.+\s*$/, { token: 'delimiter.block', next: '@literalBlock' }],
      [/^____+\s*$/, { token: 'delimiter.block', next: '@quoteBlock' }],
      [/^====+\s*$/, { token: 'delimiter.block', next: '@exampleBlock' }],

      // --- Comments ---
      [/^\/\/\/\/+\s*$/, { token: 'comment', next: '@commentBlock' }],
      [/^\/\/.*$/, 'comment'],

      // --- Inline Formatting ---
      // This is the magic part: Match delimiter, content, delimiter separately
      // Bold *bold*
      [/(\*)(\S[^*]*\S)(\*)/, ['delimiter.bold', 'strong', 'delimiter.bold']],
      // Italic _italics_
      [/(_)(\S[^_]*\S)(_)/, ['delimiter.italic', 'emphasis', 'delimiter.italic']],
      // Monospace `code`
      [/(`)([^`]+)(`)/, ['delimiter.code', 'string', 'delimiter.code']],

      // Passthrough for other text
      [/[^=*_`:\/\[\]]+/, 'text'],
    ],

    // --- Block States ---
    // In blocks, we generally want the content to be brighter, fences dim
    codeBlock: [
      [/^----+\s*$/, { token: 'delimiter.block', next: '@pop' }],
      [/.*/, 'variable.source'],
    ],
    literalBlock: [
      [/^\.\.\.+\s*$/, { token: 'delimiter.block', next: '@pop' }],
      [/.*/, 'text.literal'],
    ],
    quoteBlock: [
      [/^____+\s*$/, { token: 'delimiter.block', next: '@pop' }],
      [/.*/, 'text.quote'],
    ],
    exampleBlock: [
      [/^====+\s*$/, { token: 'delimiter.block', next: '@pop' }],
      [/.*/, 'text.example'],
    ],
    commentBlock: [
      [/^\/\/\/\/+\s*$/, { token: 'comment', next: '@pop' }],
      [/.*/, 'comment'],
    ]
  }
};