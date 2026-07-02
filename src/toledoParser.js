'use strict';

/**
 * Parser Toledo (formato decimal e P05 inteiro).
 * Porta 1:1 do metodo privado `parse()` em
 * fila-conferencia-backend/src/modules/balanca/drivers/toledo-serial.driver.ts
 * Mantenha os dois sincronizados se o formato de alguma balanca exigir ajuste.
 */
function parseLinha(raw) {
  if (!raw || !raw.trim()) return null;
  const s = raw.replace(/[\x00-\x1F\x7F]/g, ' ').trim();
  if (!s) return null;

  // Formato decimal:  +1.234 kg  /  +001.234
  const dec = s.match(/([+-]?\s*\d+[.,]\d+)\s*(kg|g|t)?/i);
  if (dec) {
    const n = parseFloat(dec[1].replace(',', '.').replace(/\s/g, ''));
    if (!isNaN(n)) return Math.abs(n);
  }

  // Formato inteiro P05:  +00350  (valor em gramas x 10)
  const int = s.match(/([+-]?\s*\d{5,6})\s*(ST)?/i);
  if (int) {
    const n = parseInt(int[1].replace(/\s/g, ''), 10);
    if (!isNaN(n)) return Math.abs(n) / 1000;
  }

  return null;
}

module.exports = { parseLinha };
