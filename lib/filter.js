// Change this line: Use curly braces { Filter }
import { Filter } from 'bad-words';

const filter = new Filter();

export function hasProfanity(text) {
  if (!text) return false;
  return filter.isProfane(text);
}

export function maskProfanity(text) {
  if (!text) return text;
  return filter.clean(text);
}