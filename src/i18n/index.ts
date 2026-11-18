import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      nav: {
        bookLoad: 'Book a load',
        joinTransporter: 'Join as a transporter',
        talkSakhi: 'Talk to a Freight Sakhi',
        controlTower: 'Control Tower',
        signIn: 'Sign in',
        switchAccount: 'Switch account',
        reduceMotion: 'Reduce motion',
        notifications: 'Notifications',
      },
      hero: {
        eyebrow: 'Kolar & Bengaluru Rural Freight Network',
        title: 'Every rural trip pooled, priced fairly, and filled on the way home.',
        subtitle:
          'Pool part-loads with nearby growers, attach pre-booked return cargo for tempos and tractors, see every rupee explained, and recover automatically if a vehicle cancels.',
        ctaFarmer: 'Book a load',
        ctaDriver: 'Join as a transporter',
        ctaSakhi: 'Talk to a Freight Sakhi',
      },
      common: {
        quintal: 'qtl',
        save: 'Save',
        cancel: 'Cancel',
        confirm: 'Confirm',
        downloadPdf: 'Download PDF',
        exportCsv: 'Export CSV',
        listenAloud: 'Listen aloud',
        verified: 'Verified',
      },
      roles: {
        farmer: 'Farmer',
        transporter: 'Transporter',
        business: 'Business Shipper',
        fpo: 'FPO Coordinator',
        kiosk: 'Freight Sakhi Kiosk',
        ops: 'Operations Control Tower',
      },
    },
  },
  hi: {
    translation: {
      nav: {
        bookLoad: 'लोड बुक करें',
        joinTransporter: 'ट्रांसपोर्टर बनें',
        talkSakhi: 'फ्रेट सखी से जुड़ें',
        controlTower: 'कंट्रोल टावर',
        signIn: 'लॉग इन',
        switchAccount: 'खाता बदलें',
        reduceMotion: 'एनिमेशन कम करें',
        notifications: 'सूचनाएं',
      },
      hero: {
        eyebrow: 'कोलार एवं बेंगलुरु ग्रामीण मालवाहक नेटवर्क',
        title: 'हर ग्रामीण गाड़ी साझा, पारदर्शी किराया और भरी हुई वापसी यात्रा।',
        subtitle:
          'पड़ोसी किसानों के साथ आंशिक लोड जोड़ें, वापसी यात्रा में खाद और क्रेट भरें, हर रुपये का हिसाब देखें और गाड़ी रद्द होने पर स्वतः नई गाड़ी पाएं।',
        ctaFarmer: 'लोड बुक करें',
        ctaDriver: 'ट्रांसपोर्टर बनें',
        ctaSakhi: 'फ्रेट सखी से जुड़ें',
      },
      common: {
        quintal: 'क्विंटल',
        save: 'सहेजें',
        cancel: 'रद्द करें',
        confirm: 'पुष्टि करें',
        downloadPdf: 'पीडीएफ डाउनलोड करें',
        exportCsv: 'सीएसवी निर्यात करें',
        listenAloud: 'बोलकर सुनें',
        verified: 'सत्यापित',
      },
      roles: {
        farmer: 'किसान',
        transporter: 'ट्रांसपोर्टर',
        business: 'व्यापारिक शिपर',
        fpo: 'एफपीओ समन्वयक',
        kiosk: 'फ्रेट सखी केंद्र',
        ops: 'संचालन कंट्रोल टावर',
      },
    },
  },
  kn: {
    translation: {
      nav: {
        bookLoad: 'ಲೋಡ್ ಬುಕ್ ಮಾಡಿ',
        joinTransporter: 'ವಾಹನ ಮಾಲೀಕರಾಗಿ ಸೇರಿ',
        talkSakhi: 'ಫ್ರೈಟ್ ಸಖಿಯೊಂದಿಗೆ ಮಾತನಾಡಿ',
        controlTower: 'ಕಂಟ್ರೋಲ್ ಟವರ್',
        signIn: 'ಲಾಗಿನ್ ಮಾಡಿ',
        switchAccount: 'ಖಾತೆ ಬದಲಿಸಿ',
        reduceMotion: 'ಚಲನೆ ಕಡಿಮೆ ಮಾಡಿ',
        notifications: 'ಅಧಿಸೂಚನೆಗಳು',
      },
      hero: {
        eyebrow: 'ಕೋಲಾರ ಮತ್ತು ಬೆಂಗಳೂರು ಗ್ರಾಮೀಣ ಸರಕು ಜಾಲ',
        title: 'ಪ್ರತಿ ಗ್ರಾಮೀಣ ಟ್ರಿಪ್ ಒಗ್ಗೂಡಿಸಿ, ನ್ಯಾಯಯುತ ದರ ಮತ್ತು ತುಂಬಿದ ಮರುಪ್ರಯಾಣ.',
        subtitle:
          'ನೆರೆಹೊರೆಯ ರೈತರೊಂದಿಗೆ ಲೋಡ್ ಸೇರಿಸಿ, ಹಿಂತಿರುಗುವ ದಾರಿಯಲ್ಲಿ ಗೊಬ್ಬರ ಮತ್ತು ಕ್ರೇಟ್ ತುಂಬಿಸಿ, ಪ್ರತಿ ರೂಪಾಯಿಯ ಲೆಕ್ಕ ನೋಡಿ ಮತ್ತು ವಾಹನ ರದ್ದಾದರೆ ತಕ್ಷಣ ಬದಲಿ ವಾಹನ ಪಡೆಯಿರಿ.',
        ctaFarmer: 'ಲೋಡ್ ಬುಕ್ ಮಾಡಿ',
        ctaDriver: 'ವಾಹನ ಮಾಲೀಕರಾಗಿ ಸೇರಿ',
        ctaSakhi: 'ಫ್ರೈಟ್ ಸಖಿ ಕೇಂದ್ರ',
      },
      common: {
        quintal: 'ಕ್ವಿಂಟಲ್',
        save: 'ಉಳಿಸಿ',
        cancel: 'ರದ್ದುಮಾಡಿ',
        confirm: 'ದೃಢೀಕರಿಸಿ',
        downloadPdf: 'ಪಿಡಿಎಫ್ ಡೌನ್‌ಲೋಡ್',
        exportCsv: 'ಸಿಎಸ್‌ವಿ ರಫ್ತು',
        listenAloud: 'ಧ್ವನಿಯಲ್ಲಿ ಕೇಳಿ',
        verified: 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
      },
      roles: {
        farmer: 'ರೈತರು',
        transporter: 'ಟ್ರಾನ್ಸ್‌ಪೋರ್ಟರ್',
        business: 'ವ್ಯಾಪಾರಿ ಶಿಪ್ಪರ್',
        fpo: 'ಎಫ್‌ಪಿಒ ಸಂಯೋಜಕರು',
        kiosk: 'ಫ್ರೈಟ್ ಸಖಿ ಕಿಯೋಸ್ಕ್',
        ops: 'ಆಪರೇಷನ್ಸ್ ಕಂಟ್ರೋಲ್ ಟವರ್',
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
