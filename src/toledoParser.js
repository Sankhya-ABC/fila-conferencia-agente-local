'use strict';

/**
 * Parser Toledo — cobre 3 formatos observados em campo:
 *  1. CSV continuo: "0,015.080,000.000,015.080" (status,bruto,tara,liquido;
 *     virgula = separador de campo, ponto = decimal). Usa o ultimo campo
 *     (peso liquido).
 *  2. Decimal simples: "+1.234 kg" / "+001,234" (virgula OU ponto como decimal).
 *  3. Inteiro P05: "+00350" (valor em gramas x10, dividido por 1000).
 */
function parseLinha(raw) {
  if (!raw || !raw.trim()) return null;
  const s = raw.replace(/[\x00-\x1F\x7F]/g, ' ').trim();
  if (!s) return null;

  // Formato CSV continuo (status,bruto,tara,liquido) — campos com ponto decimal.
  if (s.includes(',')) {
    const campos = s.split(',').map((c) => c.trim());
    const pesos = campos.filter((c) => /^\d+\.\d+$/.test(c)).map(Number);
    if (pesos.length > 0) {
      return Math.abs(pesos[pesos.length - 1]);
    }
  }

  // Formato decimal simples:  +1.234 kg  /  +001,234
  const dec = s.match(/([+-]?\s*\d+[.,]\d+)\s*(kg|g|t)?\s*$/i);
  if (dec) {
    const n = parseFloat(dec[1].replace(',', '.').replace(/\s/g, ''));
    if (!isNaN(n)) return Math.abs(n);
  }

  // Formato inteiro P05:  +00350  (valor em gramas x 10)
  const int = s.match(/^[+-]?\s*(\d{5,6})\s*(ST)?$/i);
  if (int) {
    const n = parseInt(int[1].replace(/\s/g, ''), 10);
    if (!isNaN(n)) return Math.abs(n) / 1000;
  }

  return null;
}

module.exports = { parseLinha };
