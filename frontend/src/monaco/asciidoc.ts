
import { languages } from 'monaco-editor';

export const languageID = 'asciidoc';

export const conf: languages.LanguageConfiguration = {
  comments: {
    lineComment: '//',
    blockComment: ['////', '////'],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
    ['<', '>'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '<', close: '>' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: '`', close: '`' },
    { open: '*', close: '*' },
    { open: '_', close: '_' },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '<', close: '>' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: '`', close: '`' },
    { open: '*', close: '*' },
    { open: '_', close: '_' },
  ]
};

export const languageDef: languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.adoc',

  // Control tokens
  keywords: [],

  // Define the tokenizer
  tokenizer: {
    root: [
      // Headers: = Title, == Section (must be at start of line)
      [/^=\s+.*$/, 'keyword.header.h1'],
      [/^==\s+.*$/, 'keyword.header.h2'],
      [/^===\s+.*$/, 'keyword.header.h3'],
      [/^={4,6}\s+.*$/, 'keyword.header.other'],

      // Lists: * item, . item, - item (must be at start of line)
      [/^\s*[\*\.\-]+\s+/, 'keyword.list'],

      // Attributes: :name: value
      [/^:\w[\w-]*:/, 'variable.attribute'],

      // Blocks (delimited)
      [/^----+\s*$/, { token: 'delimiter.block.code', next: '@codeBlock' }],
      [/^\.\.\.+\s*$/, { token: 'delimiter.block.literal', next: '@literalBlock' }],
      [/^____+\s*$/, { token: 'delimiter.block.quote', next: '@quoteBlock' }],
      [/^====+\s*$/, { token: 'delimiter.block.example', next: '@exampleBlock' }],

      // Comments
      [/^\/\/\/\/+\s*$/, { token: 'comment', next: '@commentBlock' }],
      [/^\/\/.*$/, 'comment'],

      // Formatting - using simple constrained matching
      // We use lookahead-like logic by matching the delimiters and content
      [/\*([^*]+)\*/, 'strong'],
      [/_([^_]+)_/, 'emphasis'],
      [/`([^`]+)`/, 'string.code'],
    ],

    // Block states
    codeBlock: [
      [/^----+\s*$/, { token: 'delimiter.block.code', next: '@pop' }],
      [/.*/, 'variable.source'],
    ],
    literalBlock: [
      [/^\.\.\.+\s*$/, { token: 'delimiter.block.literal', next: '@pop' }],
      [/.*/, 'string'],
    ],
    quoteBlock: [
      [/^____+\s*$/, { token: 'delimiter.block.quote', next: '@pop' }],
      [/.*/, 'string'],
    ],
    exampleBlock: [
      [/^====+\s*$/, { token: 'delimiter.block.example', next: '@pop' }],
      [/.*/, 'string'],
    ],
    commentBlock: [
      [/^\/\/\/\/+\s*$/, { token: 'comment', next: '@pop' }],
      [/.*/, 'comment'],
    ]
  }
};
