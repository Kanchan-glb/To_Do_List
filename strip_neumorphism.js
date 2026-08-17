const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src', 'components');

const gpaPath = path.join(srcDir, 'GlassProductivityAnalytics.jsx');
const gtacPath = path.join(srcDir, 'GlassTaskActivityCenter.jsx');

function stripNeumorphism(content) {
  // Replace all #edf2f8 with transparent or glass color
  content = content.replace(/#edf2f8/gi, 'rgba(255, 255, 255, 0.1)');
  
  // Replace inline box-shadows that have 'inset'
  content = content.replace(/boxShadow:\s*['"](.*?)inset(.*?)['"]/gi, "boxShadow: 'none'");
  
  // Replace CSS box-shadows in <style> that have 'inset'
  content = content.replace(/box-shadow:\s*([^;]*?)inset([^;]*?);/gi, "box-shadow: none;");

  // Also replace any generic neumorphic shadows without inset that might be inline
  content = content.replace(/boxShadow:\s*['"][^'"]*#ffffff[^'"]*#b8c6d9['"]/gi, "boxShadow: 'none'");
  content = content.replace(/box-shadow:\s*[^;]*#ffffff[^;]*#b8c6d9;/gi, "box-shadow: none;");
  
  // Replace #1e293b text colors inline
  content = content.replace(/color:\s*['"]#1e293b['"]/gi, "color: '#fff'");
  content = content.replace(/color:\s*#1e293b;/gi, "color: #fff;");
  
  // Replace any background: 'linear-gradient(...)' inline that might be solid white
  content = content.replace(/background:\s*['"]linear-gradient[^'"]*#ffffff[^'"]*['"]/gi, "background: 'rgba(255,255,255,0.1)'");
  content = content.replace(/background:\s*linear-gradient[^;]*#ffffff[^;]*;/gi, "background: rgba(255,255,255,0.1);");

  // Force all remaining cards to have the generic glass-card class just in case
  // But since we use .force-glass and glassOverrides, we might not need to.
  // We'll also just aggressively add `!important` into the <style> tags if needed, but since it's an inline string replacement, it'll work.
  return content;
}

if (fs.existsSync(gpaPath)) {
  let paContent = fs.readFileSync(gpaPath, 'utf8');
  paContent = stripNeumorphism(paContent);
  fs.writeFileSync(gpaPath, paContent);
}

if (fs.existsSync(gtacPath)) {
  let tacContent = fs.readFileSync(gtacPath, 'utf8');
  tacContent = stripNeumorphism(tacContent);
  fs.writeFileSync(gtacPath, tacContent);
}

console.log("Stripped all inline/hardcoded neumorphism from Glass components.");
