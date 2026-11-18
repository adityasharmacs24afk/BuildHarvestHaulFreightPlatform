export const APP_NAME = 'HarvestHaul';

export const STORAGE_KEY = 'harvesthaul_platform_v1';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export const ROLE_HOME_PATHS = {
  farmer: '/farmer/book',
  transporter: '/transporter/offers',
  business: '/business/corridors',
  fpo: '/fpo/members',
  kiosk: '/kiosk/desk',
  ops: '/ops/map',
} as const;
