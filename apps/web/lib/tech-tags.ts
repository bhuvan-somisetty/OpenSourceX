/**
 * Cleans technology and topic tags from program data (GSoC, LFX, Outreachy and the rest), where the
 * same thing is spelled many ways: "Go", "golang", "GoLang"; "C/C++"; "javascipt". Discover uses it
 * for its filter, its matching and its cards, so every spelling finds the same organizations.
 */

/** lowercase spelling -> canonical tag(s); one tag can stand for two ("c/c++" is C and C++) */
const ALIASES: Record<string, string[]> = {
  golang: ["Go"],
  go: ["Go"],
  js: ["JavaScript"],
  javascipt: ["JavaScript"],
  javasript: ["JavaScript"],
  ecmascript: ["JavaScript"],
  ts: ["TypeScript"],
  py: ["Python"],
  python3: ["Python"],
  cpp: ["C++"],
  "c/c++": ["C", "C++"],
  "c++/c": ["C", "C++"],
  "c, c++": ["C", "C++"],
  csharp: ["C#"],
  "c sharp": ["C#"],
  bash: ["Shell"],
  "shell script": ["Shell"],
  shellscript: ["Shell"],
  sh: ["Shell"],
  asm: ["Assembly"],
  "assembly language": ["Assembly"],
  html5: ["HTML"],
  css3: ["CSS"],
  "node.js": ["Node.js"],
  nodejs: ["Node.js"],
  node: ["Node.js"],
  react: ["React"],
  reactjs: ["React"],
  "react.js": ["React"],
  vue: ["Vue.js"],
  vuejs: ["Vue.js"],
  "vue.js": ["Vue.js"],
  angularjs: ["Angular"],
  qt5: ["Qt"],
  qt6: ["Qt"],
  postgres: ["PostgreSQL"],
  postgresql: ["PostgreSQL"],
  mongo: ["MongoDB"],
  k8s: ["Kubernetes"],
  ai: ["AI"],
  "artificial intelligence": ["AI"],
  "ai/ml": ["AI", "Machine learning"],
  ml: ["Machine learning"],
  "machine learning": ["Machine learning"],
  "deep learning": ["Deep learning"],
  nlp: ["Natural language processing"],
  llms: ["LLM"],
  "large language models": ["LLM"],
  "programming language": ["Programming languages"],
  "programming languages": ["Programming languages"],
  compiler: ["Compilers"],
  compilers: ["Compilers"],
  "operating system": ["Operating systems"],
  "operating systems": ["Operating systems"],
  os: ["Operating systems"],
  database: ["Databases"],
  databases: ["Databases"],
  library: ["Libraries"],
  libraries: ["Libraries"],
  "development tools": ["Developer tools"],
  "developer tools": ["Developer tools"],
  "dev tools": ["Developer tools"],
  ci: ["CI/CD"],
  "ci/cd": ["CI/CD"],
  "continuous integration": ["CI/CD"],
  web: ["Web"],
  "web development": ["Web"],
  "data analysis": ["Data analysis"],
  "data analytics": ["Data analysis"],
  analytics: ["Data analysis"],
  network: ["Networking"],
  networking: ["Networking"],
  "linux kernel": ["Linux kernel"],
  kernel: ["Linux kernel"],
  oop: ["Object-oriented programming"],
  "object oriented programming": ["Object-oriented programming"],
  "rest api": ["REST API"],
  rest: ["REST API"],
  "data visualization": ["Visualization"],
  visualization: ["Visualization"],
  "scientific visualization": ["Visualization"],
  "distributed ledger technology": ["DLT"],
  dlt: ["DLT"],
  "cloud native": ["Cloud native"],
  "cloud-native": ["Cloud native"],
  documentation: ["Documentation"],
  "technical writing": ["Documentation"],
};

/** tags that carry no meaning on their own */
const DROP = new Set(["other", "others", "misc", "miscellaneous", "n/a", "none", "general"]);

/** programming languages, spelled properly; every other tag is a topic */
const LANGUAGE_NAMES = [
  "Python",
  "JavaScript",
  "TypeScript",
  "C",
  "C++",
  "C#",
  "Java",
  "Go",
  "Rust",
  "Kotlin",
  "Swift",
  "Objective-C",
  "PHP",
  "Ruby",
  "Scala",
  "Haskell",
  "Julia",
  "R",
  "Dart",
  "Elixir",
  "Erlang",
  "Clojure",
  "OCaml",
  "F#",
  "Lua",
  "Perl",
  "Shell",
  "PowerShell",
  "Assembly",
  "Solidity",
  "Fortran",
  "MATLAB",
  "SQL",
  "HTML",
  "CSS",
  "Zig",
  "Nim",
  "Groovy",
  "Elm",
  "Crystal",
  "Vala",
  "Tcl",
  "Lisp",
  "Scheme",
  "Racket",
  "Prolog",
  "COBOL",
  "Pascal",
  "CoffeeScript",
  "Verilog",
  "SystemVerilog",
  "VHDL",
  "Chisel",
  "Cython",
  "Move",
  "Cairo",
];
const LANGUAGES = new Set(LANGUAGE_NAMES.map((l) => l.toLowerCase()));

/** proper spelling for languages and well-known tools ("pytorch" -> "PyTorch") */
const PROPER = new Map(
  [
    ...LANGUAGE_NAMES,
    ...[
      "Kubernetes",
      "Docker",
      "Linux",
      "Git",
      "GraphQL",
      "WebAssembly",
      "Django",
      "Flutter",
      "Android",
      "PyTorch",
      "TensorFlow",
      "NumPy",
      "LLVM",
      "QEMU",
      "RISC-V",
    ],
  ].map((l) => [l.toLowerCase(), l]),
);

/** The clean tag(s) for one raw tag: [] when it should be dropped. */
export function canonicalTags(raw: string): string[] {
  const t = raw.trim().replace(/\s+/g, " ");
  const key = t.toLowerCase();
  if (!key || key.length > 40 || DROP.has(key)) return [];
  if (ALIASES[key]) return ALIASES[key]!;
  return [PROPER.get(key) ?? t];
}

/** Clean, de-duplicated tags (case-insensitive), keeping the first spelling of each. */
export function cleanTags(raw: readonly string[]): string[] {
  const seen = new Map<string, string>();
  for (const r of raw)
    for (const t of canonicalTags(r)) if (!seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), t);
  return [...seen.values()];
}

export function isLanguage(tag: string): boolean {
  return LANGUAGES.has(tag.toLowerCase().trim());
}
