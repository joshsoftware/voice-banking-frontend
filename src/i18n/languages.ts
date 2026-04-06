export type LanguageId = 'en' | 'hi' | 'ta' | 'kn' | 'te' | 'ml' | 'bn' | 'mr' | 'gu'

export interface LanguageOption {
  id: LanguageId
  label: string // native label shown on the language picker
  subtitle: string // english label shown under native label
}

export const LANGUAGES: LanguageOption[] = [
  { id: 'en', label: 'English', subtitle: 'English' },
  { id: 'hi', label: 'हिन्दी', subtitle: 'Hindi' },
  { id: 'ta', label: 'தமிழ்', subtitle: 'Tamil' },
  { id: 'kn', label: 'ಕನ್ನಡ', subtitle: 'Kannada' },
  { id: 'te', label: 'తెలుగు', subtitle: 'Telugu' },
  { id: 'ml', label: 'മലയാളം', subtitle: 'Malayalam' },
  { id: 'bn', label: 'বাংলা', subtitle: 'Bengali' },
  { id: 'mr', label: 'मराठी', subtitle: 'Marathi' },
  { id: 'gu', label: 'ગુજરાતી', subtitle: 'Gujarati' },
]

export const DEFAULT_LANGUAGE: LanguageId = 'en'

export const LANGUAGE_IDS: ReadonlySet<LanguageId> = new Set(LANGUAGES.map((l) => l.id))

