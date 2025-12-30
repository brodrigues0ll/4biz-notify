const fs = require('fs');
const path = require('path');

// Criar um ícone PNG simples usando Canvas (via data URI)
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const svgContent = fs.readFileSync(path.join(__dirname, 'public', 'icon.svg'), 'utf8');

console.log('SVG criado com sucesso!');
console.log('');
console.log('Para gerar os ícones PNG, você pode usar uma das seguintes opções:');
console.log('');
console.log('1. Usar um conversor online:');
console.log('   - Acesse: https://realfavicongenerator.net/');
console.log('   - Faça upload do arquivo public/icon.svg');
console.log('   - Baixe os ícones gerados');
console.log('');
console.log('2. Usar ImageMagick (se instalado):');
console.log('   cd public');
sizes.forEach(size => {
  console.log(`   convert icon.svg -resize ${size}x${size} icon-${size}.png`);
});
console.log('');
console.log('3. Usar um editor gráfico (GIMP, Photoshop, etc):');
console.log('   - Abra o public/icon.svg');
console.log('   - Exporte como PNG nos tamanhos: ' + sizes.join(', '));
console.log('');
console.log('Por enquanto, vou criar links simbólicos do favicon para os ícones necessários.');

// Criar um ícone básico de fallback
const createBasicIcon = (size) => {
  const canvas = `
  <svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" rx="128" fill="#2563eb"/>
    <text x="256" y="340" font-family="Arial" font-size="280" fill="white" text-anchor="middle" font-weight="bold">4B</text>
  </svg>
  `;
  return canvas;
};

sizes.forEach(size => {
  const iconPath = path.join(__dirname, 'public', `icon-${size}.png`);
  const svgIcon = createBasicIcon(size);
  const svgPath = path.join(__dirname, 'public', `icon-${size}.svg`);

  // Salvar SVG temporário para cada tamanho
  fs.writeFileSync(svgPath, svgIcon);
  console.log(`✓ Criado icon-${size}.svg (temporário)`);
});

console.log('');
console.log('✅ Ícones SVG temporários criados!');
console.log('⚠️  Para produção, converta os SVGs em PNGs usando uma das opções acima.');
