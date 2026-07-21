const fs = require('fs');
const path = require('path');

const cssDir = path.join(__dirname, 'src');

const replacements = [
  // Whites and light grays
  { regex: /#ffffff|#fff(?!a-fA-F0-9)/gi, replacement: 'var(--bg-card)' },
  { regex: /rgba\(255,\s*255,\s*255,\s*[0-9.]+\)/gi, replacement: 'var(--bg-card)' },
  { regex: /#f8fafc/gi, replacement: 'var(--bg-app)' },
  { regex: /#f1f5f9/gi, replacement: 'var(--bg-app)' },
  { regex: /#f3f4f6/gi, replacement: 'var(--hover-color)' },
  { regex: /#e2e8f0|#e5e7eb/gi, replacement: 'var(--border-color)' },
  { regex: /#cbd5e1/gi, replacement: 'var(--border-color)' },
  
  // Dark text colors
  { regex: /#0f172a|#111827|#1f2937|#0d1b2a/gi, replacement: 'var(--text-primary)' },
  { regex: /#334155|#4a5568|#475569|#6b7280/gi, replacement: 'var(--text-secondary)' },
  { regex: /#64748b|#8fa3b1|#94a3b8/gi, replacement: 'var(--text-muted)' },

  // Primary colors
  { regex: /#4f46e5|#6366f1|#4338ca/gi, replacement: 'var(--color-primary)' },
  { regex: /#3730a3/gi, replacement: 'var(--color-primary-hover)' },
  { regex: /#ede9fe|#eef2ff|#f5f3ff|#f8faff/gi, replacement: 'var(--color-primary-light)' },

  // Accent
  { regex: /#7c3aed|#8b5cf6/gi, replacement: 'var(--color-accent)' },
  { regex: /#0ea5e9/gi, replacement: 'var(--color-accent)' },

  // Success
  { regex: /#10b981|#059669|#22c55e/gi, replacement: 'var(--color-success)' },
  { regex: /#d1fae5|#dcfce3/gi, replacement: 'var(--color-success-light)' },
  { regex: /#064e3b/gi, replacement: 'var(--color-success-dark)' },

  // Danger
  { regex: /#ef4444|#e11d48|#dc2626|#b91c1c/gi, replacement: 'var(--color-danger)' },
  { regex: /#fee2e2|#fecaca|#ffe4e6/gi, replacement: 'var(--color-danger-light)' },
  
  // Warning
  { regex: /#f59e0b|#eab308|#d97706/gi, replacement: 'var(--color-warning)' },
  { regex: /#fef9c3|#fef3c7/gi, replacement: 'var(--color-warning-light)' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  replacements.forEach(({ regex, replacement }) => {
    content = content.replace(regex, replacement);
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.css') && file !== 'index.css') { // Skip index.css as we defined vars there
      processFile(fullPath);
    }
  }
}

walkDir(cssDir);
console.log("Done replacing colors.");
