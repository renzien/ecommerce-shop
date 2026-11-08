import readline from 'node:readline';

export function question(label) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(label, answer => { rl.close(); resolve(answer.trim()); }));
}

export function passwordQuestion(label) {
  if (!process.stdin.isTTY) return new Promise(resolve => {
    let text = ''; process.stdin.setEncoding('utf8');
    const finish = () => { process.stdin.removeListener('data', collect); process.stdin.pause(); resolve(text.split(/\r?\n/)[0].replace(/\r$/, '')); };
    const collect = chunk => { text += chunk; if (/[\r\n]/.test(text)) finish(); };
    process.stdin.on('data', collect); process.stdin.once('end', finish); process.stdin.resume();
  });
  return new Promise(resolve => {
    let value = ''; process.stdout.write(label); readline.emitKeypressEvents(process.stdin); process.stdin.setRawMode(true); process.stdin.resume();
    const handler = (text, key = {}) => {
      if (key.ctrl && key.name === 'c') { process.stdout.write('\n'); process.exit(130); }
      if (key.name === 'return' || key.name === 'enter') {
        process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.removeListener('keypress', handler); process.stdout.write('\n'); resolve(value); return;
      }
      if (key.name === 'backspace') { if (value.length) { value = value.slice(0,-1); process.stdout.write('\b \b'); } return; }
      if (text && !key.ctrl && !key.meta && !/[\x00-\x1f\x7f]/.test(text)) { value += text; process.stdout.write('*'.repeat(text.length)); }
    };
    process.stdin.on('keypress', handler);
  });
}
