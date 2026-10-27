const fs = require('fs');
const path = require('path');

const key = process.env.OPENAI_API_KEY;
const configPath = path.join(__dirname, '..', 'js', 'config.js');

let content = fs.readFileSync(configPath, 'utf8');

if (key) {
  content = content.replace(/__OPENAI_API_KEY__/g, key);
  console.log('OPENAI_API_KEY injetada em js/config.js');
} else {
  console.warn('OPENAI_API_KEY não encontrada nas variáveis de ambiente. js/config.js permanece com placeholder.');
}

fs.writeFileSync(configPath, content);
