import { en } from './en';
import { am } from './am';
import { om } from './om';
import { Language, LanguageOption, Translations } from './types';

export * from './types';
export { en, am, om };

export const languages: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'am', label: 'Amharic', nativeLabel: 'አማርኛ' },
  { code: 'om', label: 'Afaan Oromo', nativeLabel: 'Afaan Oromoo' },
];

export const translations: Record<Language, Translations> = {
  en,
  am,
  om,
};

// Helper for Category localization
export const categoryTranslations: Record<string, Record<Language, string>> = {
  'electrical-repair': {
    en: 'Electrical Repair',
    am: 'የኤሌክትሪክ ጥገና',
    om: 'Suphaa Elektirikii',
  },
  'plumbing': {
    en: 'Plumbing',
    am: 'የቧንቧ ስራ እና ጥገና',
    om: 'Hojii Ujummoo Bishaanii',
  },
  'ceramic-tile-installation': {
    en: 'Ceramic & Tile Installation',
    am: 'የሴራሚክ እና ታይልስ ንጣፍ',
    om: 'Dhaabbii Siiraamikii & Taayilii',
  },
  'satellite-dish-installation': {
    en: 'Satellite Dish Installation & Repair',
    am: 'የሳተላይት ዲሽ ተከላ እና ጥገና',
    om: 'Dhaabbii & Suphaa Diishii',
  },
  'carpentry': {
    en: 'Carpentry',
    am: 'የአናጺነት ስራ',
    om: 'Hojii Mukaa (Qorannoo)',
  },
  'painting': {
    en: 'Painting',
    am: 'የቀለም ቅብ ስራ',
    om: 'Hojii Halluu Dibuu',
  },
  'masonry-construction': {
    en: 'Masonry & Construction',
    am: 'የግንበኝነት እና ህንፃ ስራ',
    om: 'Hojii Ijaarsaa & Dhadhabbii',
  },
  'appliance-repair': {
    en: 'Appliance Repair',
    am: 'የቤት ውስጥ እቃዎች ጥገና',
    om: 'Suphaa Meeshaalee Manaa',
  },
};

export const getLocalizedCategoryName = (slugOrName: string, lang: Language): string => {
  const slug = slugOrName.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-');
  if (categoryTranslations[slug] && categoryTranslations[slug][lang]) {
    return categoryTranslations[slug][lang];
  }
  // Try matching directly
  for (const key of Object.keys(categoryTranslations)) {
    if (key === slug || categoryTranslations[key].en.toLowerCase() === slugOrName.toLowerCase()) {
      return categoryTranslations[key][lang];
    }
  }
  return slugOrName;
};
