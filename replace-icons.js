const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./app').concat(walk('./src'));
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let orig = c;
  c = c.replace(/color="var\(--primary\)"/g, 'className="text-primary"');
  c = c.replace(/color="var\(--destructive\)"/g, 'className="text-destructive"');
  c = c.replace(/color="var\(--primary-foreground\)"/g, 'className="text-primary-foreground"');
  c = c.replace(/color="var\(--secondary-foreground\)"/g, 'className="text-secondary-foreground dark:text-slate-200"');
  c = c.replace(/color="var\(--muted-foreground\)"/g, 'className="text-muted-foreground"');
  
  if (c !== orig) {
    fs.writeFileSync(f, c);
    console.log('Updated ' + f);
  }
});
