import Fuse from 'fuse.js';
import type { MedicationCategory, MedicationDBEntry, MedicationEntry } from '@/types';

const DB: MedicationDBEntry[] = [
  // Oral antihistamines
  { brand: 'Claritin', generic: 'loratadine', category: 'oral_antihistamine', dose_form: 'tablet' },
  { brand: 'Zyrtec', generic: 'cetirizine', category: 'oral_antihistamine', dose_form: 'tablet' },
  { brand: 'Allegra', generic: 'fexofenadine', category: 'oral_antihistamine', dose_form: 'tablet' },
  { brand: 'Benadryl', generic: 'diphenhydramine', category: 'oral_antihistamine', dose_form: 'tablet' },
  { brand: 'Xyzal', generic: 'levocetirizine', category: 'oral_antihistamine', dose_form: 'tablet' },
  // Nasal corticosteroids
  { brand: 'Flonase', generic: 'fluticasone', category: 'nasal_corticosteroid', dose_form: 'nasal spray' },
  { brand: 'Rhinocort', generic: 'budesonide', category: 'nasal_corticosteroid', dose_form: 'nasal spray' },
  { brand: 'Nasacort', generic: 'triamcinolone', category: 'nasal_corticosteroid', dose_form: 'nasal spray' },
  { brand: 'Nasonex', generic: 'mometasone', category: 'nasal_corticosteroid', dose_form: 'nasal spray' },
  // Decongestants
  { brand: 'Sudafed', generic: 'pseudoephedrine', category: 'decongestant', dose_form: 'tablet' },
  { brand: 'Sudafed PE', generic: 'phenylephrine', category: 'decongestant', dose_form: 'tablet' },
  // Nasal antihistamines
  { brand: 'Astelin', generic: 'azelastine', category: 'nasal_antihistamine', dose_form: 'nasal spray' },
  { brand: 'Patanase', generic: 'olopatadine', category: 'nasal_antihistamine', dose_form: 'nasal spray' },
  // Eye drops
  { brand: 'Pataday', generic: 'olopatadine', category: 'eye_drop', dose_form: 'eye drops' },
  { brand: 'Zaditor', generic: 'ketotifen', category: 'eye_drop', dose_form: 'eye drops' },
  { brand: 'Alaway', generic: 'ketotifen', category: 'eye_drop', dose_form: 'eye drops' },
  { brand: 'Optivar', generic: 'azelastine', category: 'eye_drop', dose_form: 'eye drops' },
  // Leukotriene modifiers
  { brand: 'Singulair', generic: 'montelukast', category: 'leukotriene_modifier', dose_form: 'tablet' },
  // Combination products
  { brand: 'Claritin-D', generic: 'loratadine/pseudoephedrine', category: 'combination', dose_form: 'tablet' },
  { brand: 'Zyrtec-D', generic: 'cetirizine/pseudoephedrine', category: 'combination', dose_form: 'tablet' },
  // Immunotherapy
  { brand: 'Allergy shots', generic: 'subcutaneous immunotherapy', category: 'immunotherapy', dose_form: 'injection' },
  { brand: 'SLIT drops', generic: 'sublingual immunotherapy', category: 'immunotherapy', dose_form: 'sublingual drops' },
  // Nasal saline
  { brand: 'NeilMed', generic: 'sodium chloride nasal rinse', category: 'nasal_saline', dose_form: 'nasal rinse' },
  { brand: 'Simply Saline', generic: 'sodium chloride', category: 'nasal_saline', dose_form: 'nasal spray' },
];

const fuse = new Fuse(DB, {
  keys: ['brand', 'generic'],
  threshold: 0.4,
  includeScore: true,
});

export function searchMedications(query: string): MedicationEntry[] {
  if (!query.trim()) return [];
  const results = fuse.search(query);
  return results.slice(0, 6).map(r => ({
    raw_input: query,
    matched_name: r.item.brand,
    generic: r.item.generic,
    category: r.item.category as MedicationCategory,
    dose_form: r.item.dose_form,
    confidence: r.score !== undefined ? 1 - r.score : 0.9,
  }));
}

export function getMedicationDB(): MedicationDBEntry[] {
  return DB;
}

export function categoryLabel(cat: MedicationCategory | null): string {
  const labels: Record<MedicationCategory, string> = {
    oral_antihistamine: 'Antihistamine',
    nasal_corticosteroid: 'Nasal Steroid',
    nasal_antihistamine: 'Nasal Antihistamine',
    decongestant: 'Decongestant',
    eye_drop: 'Eye Drops',
    leukotriene_modifier: 'Leukotriene Modifier',
    combination: 'Combination',
    immunotherapy: 'Immunotherapy',
    nasal_saline: 'Nasal Saline',
    other: 'Other',
  };
  return cat ? labels[cat] : 'Unknown';
}
