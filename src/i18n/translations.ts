import type { LanguageId } from './languages'

const EN = {
  headerGoodAfternoon: 'Good Afternoon',

  bankWithYourVoice: 'Bank with Your Voice',
  mobileNumber: 'Mobile Number',
  sendOtp: 'Send OTP',

  verifyOtp: 'Verify OTP',
  enterOtpInstruction: 'Enter the 4-digit code sent to your mobile',
  enterOtpLabel: 'Enter OTP',
  resendOtpIn: 'Resend OTP in {seconds}s',
  resendOtp: 'Resend OTP',
  continue: 'Continue',
  back: 'Back',

  termsPrefix: 'By continuing, you agree to our',
  termsLink: 'Terms & Conditions',

  selectLanguage: 'Select language',

  statusConnecting: 'Connecting…',
  statusReady: 'Ready',
  statusListening: 'Listening…',
  statusProcessing: 'Processing…',
  statusSpeaking: 'Speaking…',
  statusConnectionError: 'Connection error',
  statusDisconnected: 'Disconnected',

  stop: 'Stop',
  dismiss: 'Dismiss',
  tapToMute: 'Tap to mute',
  tapToUnmute: 'Tap to unmute',

  voiceSheetSayHeyFin: 'Say “Hey, Fin”',
  voiceSheetToStartConversation: 'to start conversation',

  availableBalance: 'Available Balance',
  savingsAccount: 'Savings Account',
  viewDetails: 'View Details',
} as const

export type TranslationKey = keyof typeof EN

const dict: Record<LanguageId, Partial<Record<TranslationKey, string>>> = {
  en: {
    ...EN,
  },
  hi: {
    headerGoodAfternoon: 'शुभ अपराह्न',
    bankWithYourVoice: 'अपने शब्दों से बैंक करें',
    mobileNumber: 'मोबाइल नंबर',
    sendOtp: 'OTP भेजें',

    verifyOtp: 'OTP सत्यापित करें',
    enterOtpInstruction: 'अपने मोबाइल पर भेजा गया 4 अंकों का कोड दर्ज करें',
    enterOtpLabel: 'OTP दर्ज करें',
    resendOtpIn: '{seconds} सेकंड में OTP फिर से भेजें',
    resendOtp: 'OTP पुनः भेजें',
    continue: 'आगे बढ़ें',
    back: 'वापस',

    termsPrefix: 'जारी रखते हुए, आप हमारे',
    termsLink: 'नियम और शर्तें',

    selectLanguage: 'भाषा चुनें',

    statusConnecting: 'कनेक्ट हो रहा है…',
    statusReady: 'तैयार',
    statusListening: 'सुन रहा है…',
    statusProcessing: 'प्रोसेस हो रहा है…',
    statusSpeaking: 'बोल रहा है…',
    statusConnectionError: 'कनेक्शन त्रुटि',
    statusDisconnected: 'डिस्कनेक्टेड',

    stop: 'रोकें',
    dismiss: 'हटाएं',
    tapToMute: 'म्यूट करने के लिए टैप करें',
    tapToUnmute: 'अनम्यूट करने के लिए टैप करें',

    voiceSheetSayHeyFin: '“Hey, Fin” कहें',
    voiceSheetToStartConversation: 'बातचीत शुरू करने के लिए',

    availableBalance: 'उपलब्ध शेष',
    savingsAccount: 'बचत खाता',
    viewDetails: 'विवरण देखें',
  },
  ta: {
    headerGoodAfternoon: 'மதிய வணக்கம்',
    bankWithYourVoice: 'உங்கள் குரலால் வங்கி',
    mobileNumber: 'மொபைல் எண்',
    sendOtp: 'OTP அனுப்பு',

    verifyOtp: 'OTP சரிபார்க்கவும்',
    enterOtpInstruction: 'உங்கள் மொபைலுக்கு அனுப்பப்பட்ட 4 இலக்க குறியீட்டை உள்ளிடுங்கள்',
    enterOtpLabel: 'OTP உள்ளிடவும்',
    resendOtpIn: '{seconds} விநாடிகளில் OTP மீண்டும் அனுப்பவும்',
    resendOtp: 'OTP மீண்டும் அனுப்பவும்',
    continue: 'தொடரவும்',
    back: 'பின்',

    termsPrefix: 'தொடர்வதன் மூலம், நீங்கள் எங்கள்',
    termsLink: 'விதிமுறைகள் மற்றும் நிபந்தனைகளுக்கு ஒப்புக்கொள்கிறீர்கள்',

    selectLanguage: 'மொழியை தேர்வு செய்யவும்',

    statusConnecting: 'இணைக்கிறது…',
    statusReady: 'தயார்',
    statusListening: 'கேட்கிறது…',
    statusProcessing: 'செயலாக்கப்படுகிறது…',
    statusSpeaking: 'பேசுகிறது…',
    statusConnectionError: 'இணைப்பு பிழை',
    statusDisconnected: 'துண்டிக்கப்பட்டது',

    stop: 'நிறுத்து',
    dismiss: 'நீக்கு',
    tapToMute: 'மியூட் செய்ய தட்டவும்',
    tapToUnmute: 'அன்மியூட் செய்ய தட்டவும்',

    voiceSheetSayHeyFin: '“Hey, Fin” சொல்லுங்கள்',
    voiceSheetToStartConversation: 'உரையாடலை தொடங்க',

    availableBalance: 'கிடைக்கும் இருப்பு',
    savingsAccount: 'சேமிப்பு கணக்கு',
    viewDetails: 'விவரங்கள் பார்க்க',
  },
  kn: {
    headerGoodAfternoon: 'ಶುಭ ಮಧ್ಯಾಹ್ನ',
    bankWithYourVoice: 'ನಿಮ್ಮ ಧ್ವನಿಯಿಂದ ಬ್ಯಾಂಕ್',
    mobileNumber: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
    sendOtp: 'OTP ಕಳುಹಿಸಿ',

    verifyOtp: 'OTP ಪರಿಶೀಲಿಸಿ',
    enterOtpInstruction: 'ನಿಮ್ಮ ಮೊಬೈಲ್‌ಗೆ ಕಳುಹಿಸಿದ 4 ಅಂಕಿಗಳ ಕೋಡ್ ನಮೂದಿಸಿ',
    enterOtpLabel: 'OTP ನಮೂದಿಸಿ',
    resendOtpIn: '{seconds} ಸೆಕೆಂಡ್‌ಗಳಲ್ಲಿ OTP ಮತ್ತೆ ಕಳುಹಿಸಿ',
    resendOtp: 'OTP ಮತ್ತೆ ಕಳುಹಿಸಿ',
    continue: 'ಮುಂದುವರಿಸಿ',
    back: 'ಹಿಂದೆ',

    termsPrefix: 'ಮುಂದುವರಿಸುವ ಮೂಲಕ, ನೀವು ನಮ್ಮ',
    termsLink: 'ನಿಯಮಗಳು ಮತ್ತು ಷರತ್ತುಗಳಿಗೆ ಒಪ್ಪುತ್ತೀರಿ',

    selectLanguage: 'ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ',

    statusConnecting: 'ಕನೆಕ್ಟ್ ಆಗುತ್ತಿದೆ…',
    statusReady: 'ಸಿದ್ಧ',
    statusListening: 'ಕೆಲಸ ಕೇಳುತ್ತಿದೆ…',
    statusProcessing: 'ಪ್ರಕ್ರಿಯೆ ನಡೆಯುತ್ತಿದೆ…',
    statusSpeaking: 'ಮಾತನಾಡುತ್ತಿದೆ…',
    statusConnectionError: 'ಕನೆಕ್ಷನ್ ದೋಷ',
    statusDisconnected: 'ಡಿಸ್ಕನೆಕ್ಟ್',

    stop: 'ನಿಲ್ಲಿಸಿ',
    dismiss: 'ತಳ್ಳಿ ಹಾಕಿ',
    tapToMute: 'ಮ್ಯೂಟ್ ಮಾಡಲು ಟ್ಯಾಪ್ ಮಾಡಿ',
    tapToUnmute: 'ಅನ್‌ಮ್ಯೂಟ್ ಮಾಡಲು ಟ್ಯಾಪ್ ಮಾಡಿ',

    voiceSheetSayHeyFin: '“Hey, Fin” ಹೇಳಿ',
    voiceSheetToStartConversation: 'ಸಂಭಾಷಣೆಯನ್ನು ಆರಂಭಿಸಲು',

    availableBalance: 'ಲಭ್ಯ ಬ್ಯಾಲೆನ್ಸ್',
    savingsAccount: 'ಉಳಿತಾಯ ಖಾತೆ',
    viewDetails: 'ವಿವರಗಳು ನೋಡಿ',
  },
  te: {
    headerGoodAfternoon: 'శుభ మధ్యాహ్నం',
    bankWithYourVoice: 'మీ మాటలతో బ్యాంక్',
    mobileNumber: 'మొబైల్ నంబర్',
    sendOtp: 'OTP పంపండి',

    verifyOtp: 'OTP ధృవీకరించండి',
    enterOtpInstruction: 'మీ మొబైల్‌కు పంపిన 4-అంకెల కోడ్‌ను నమోదు చేయండి',
    enterOtpLabel: 'OTP నమోదు చేయండి',
    resendOtpIn: '{seconds} సెకండ్లలో OTP మళ్లీ పంపండి',
    resendOtp: 'OTP మళ్లీ పంపండి',
    continue: 'కొనసాగించండి',
    back: 'వెనక్కి',

    termsPrefix: 'కొనసాగించడం ద్వారా, మీరు మా',
    termsLink: 'నిబంధనలు & షరతులకు అంగీకరిస్తారు',

    selectLanguage: 'భాషను ఎంచుకోండి',

    statusConnecting: 'కనెక్ట్ అవుతోంది…',
    statusReady: 'రెడీ',
    statusListening: 'వింటోంది…',
    statusProcessing: 'ప్రాసెసింగ్…',
    statusSpeaking: 'మాట్లాడుతోంది…',
    statusConnectionError: 'కనెక్షన్ లోపం',
    statusDisconnected: 'డిస్కనెక్ట్ అయింది',

    stop: 'ఆపండి',
    dismiss: 'మూసివేయండి',
    tapToMute: 'మ్యూట్ చేయడానికి ట్యాప్ చేయండి',
    tapToUnmute: 'అన్‌మ్యూట్ చేయడానికి ట్యాప్ చేయండి',

    voiceSheetSayHeyFin: '“Hey, Fin” అని చెప్పండి',
    voiceSheetToStartConversation: 'సంభాషణ ప్రారంభించడానికి',

    availableBalance: 'అందుబాటులో ఉన్న బ్యాలెన్స్',
    savingsAccount: 'సేవింగ్స్ ఖాతా',
    viewDetails: 'వివరాలు చూడండి',
  },
  ml: {
    headerGoodAfternoon: 'ശുഭമധ്യാഹ്നം',
    bankWithYourVoice: 'നിങ്ങളുടെ ശബ്ദത്തോടെ ബാങ്ക്',
    mobileNumber: 'മൊബൈൽ നമ്പർ',
    sendOtp: 'OTP അയക്കുക',

    verifyOtp: 'OTP സ്ഥിരീകരിക്കുക',
    enterOtpInstruction: 'നിങ്ങളുടെ മൊബൈലിലേക്ക് അയച്ച 4 അക്ക കോഡ് നൽകുക',
    enterOtpLabel: 'OTP നൽകുക',
    resendOtpIn: '{seconds} സെക്കൻഡിൽ OTP വീണ്ടും അയയ്ക്കുക',
    resendOtp: 'OTP വീണ്ടും അയയ്ക്കുക',
    continue: 'തുടരുക',
    back: 'പിന്നിലേക്ക്',

    termsPrefix: 'തുടരുന്നതിലൂടെ, നിങ്ങൾ ഞങ്ങളുടെ',
    termsLink: 'നിയമങ്ങളും നിബന്ധനകളും അംഗീകരിക്കുന്നു',

    selectLanguage: 'ഭാഷ തിരഞ്ഞെടുക്കുക',

    statusConnecting: 'കണക്റ്റ് ചെയ്യുന്നു…',
    statusReady: 'റെഡി',
    statusListening: 'ശ്രവിക്കുന്നു…',
    statusProcessing: 'പ്രോസസ്സിംഗ്…',
    statusSpeaking: 'സംസാരിക്കുന്നു…',
    statusConnectionError: 'കണക്ഷൻ പിശക്',
    statusDisconnected: 'ഡിസ്കണക്റ്റായി',

    stop: 'നിർത്തുക',
    dismiss: 'ഒഴിവാക്കുക',
    tapToMute: 'മ്യൂട്ട് ചെയ്യാൻ ടാപ്പ് ചെയ്യുക',
    tapToUnmute: 'അൺമ്യൂട്ട് ചെയ്യാൻ ടാപ്പ് ചെയ്യുക',

    voiceSheetSayHeyFin: '“Hey, Fin” പറയുക',
    voiceSheetToStartConversation: 'സംഭാഷണം ആരംഭിക്കാൻ',

    availableBalance: 'ലഭ്യമായ ബാലൻസ്',
    savingsAccount: 'സേവിംഗ്‌സ് അക്കൗണ്ട്',
    viewDetails: 'വിശദാംശങ്ങൾ കാണുക',
  },
  bn: {
    headerGoodAfternoon: 'শুভ অপরাহ্ন',
    bankWithYourVoice: 'আপনার কণ্ঠে ব্যাংক',
    mobileNumber: 'মোবাইল নম্বর',
    sendOtp: 'OTP পাঠান',

    verifyOtp: 'OTP যাচাই করুন',
    enterOtpInstruction: 'আপনার মোবাইলে পাঠানো ৪-সংখ্যার কোড লিখুন',
    enterOtpLabel: 'OTP লিখুন',
    resendOtpIn: '{seconds} সেকেন্ডে OTP আবার পাঠান',
    resendOtp: 'OTP আবার পাঠান',
    continue: 'চালিয়ে যান',
    back: 'পেছনে',

    termsPrefix: 'চালিয়ে গেলে, আপনি আমাদের',
    termsLink: 'নিয়ম ও শর্তাবলীতে সম্মত হন',

    selectLanguage: 'ভাষা নির্বাচন করুন',

    statusConnecting: 'সংযোগ হচ্ছে…',
    statusReady: 'প্রস্তুত',
    statusListening: 'শুনছে…',
    statusProcessing: 'প্রসেস হচ্ছে…',
    statusSpeaking: 'কথা বলছে…',
    statusConnectionError: 'সংযোগ ত্রুটি',
    statusDisconnected: 'ডিস্কানেক্ট হয়েছে',

    stop: 'থামুন',
    dismiss: 'বাতিল করুন',
    tapToMute: 'মিউট করতে ট্যাপ করুন',
    tapToUnmute: 'আনমিউট করতে ট্যাপ করুন',

    voiceSheetSayHeyFin: '“Hey, Fin” বলুন',
    voiceSheetToStartConversation: 'কথোপকথন শুরু করতে',

    availableBalance: 'উপলব্ধ ব্যালেন্স',
    savingsAccount: 'সেভিংস অ্যাকাউন্ট',
    viewDetails: 'বিস্তারিত দেখুন',
  },
  mr: {
    headerGoodAfternoon: 'शुभ दुपार',
    bankWithYourVoice: 'तुमच्या आवाजातून बँक',
    mobileNumber: 'मोबাইল नंबर',
    sendOtp: 'OTP पाठवा',

    verifyOtp: 'OTP सत्यापित करा',
    enterOtpInstruction: 'तुमच्या मोबाइलवर पाठवलेला 4-अंकी कोड प्रविष्ट करा',
    enterOtpLabel: 'OTP प्रविष्ट करा',
    resendOtpIn: '{seconds} सेकंदात OTP पुन्हा पाठवा',
    resendOtp: 'OTP पुन्हा पाठवा',
    continue: 'पुढे जा',
    back: 'मागे',

    termsPrefix: 'सुरू ठेवल्यावर, तुम्ही आमच्या',
    termsLink: 'नियम व अटींना सहमती देता',

    selectLanguage: 'भाषा निवडा',

    statusConnecting: 'कनेक्ट होत आहे…',
    statusReady: 'तयार',
    statusListening: 'ऐकत आहे…',
    statusProcessing: 'प्रोसेस होत आहे…',
    statusSpeaking: 'बोलत आहे…',
    statusConnectionError: 'कनेक्शन त्रुटी',
    statusDisconnected: 'डिस्कनेक्ट झाले',

    stop: 'थांबवा',
    dismiss: 'रद्द करा',
    tapToMute: 'म्यूट करण्यासाठी टॅप करा',
    tapToUnmute: 'अनम्यूट करण्यासाठी टॅप करा',

    voiceSheetSayHeyFin: '“Hey, Fin” म्हणा',
    voiceSheetToStartConversation: 'संवाद सुरू करण्यासाठी',

    availableBalance: 'उपलब्ध शिल्लक',
    savingsAccount: 'बचत खाते',
    viewDetails: 'तपशील पहा',
  },
  gu: {
    headerGoodAfternoon: 'શુભ બપોર',
    bankWithYourVoice: 'તમારા અવાજથી બેંક',
    mobileNumber: 'મોબાઇલ નંબર',
    sendOtp: 'OTP મોકલો',

    verifyOtp: 'OTP ચકાસો',
    enterOtpInstruction: 'તમારા મોબાઇલ પર મોકલેલ 4-અંકનો કોડ દાખલ કરો',
    enterOtpLabel: 'OTP દાખલ કરો',
    resendOtpIn: '{seconds} સેકન્ડમાં OTP ફરી મોકલો',
    resendOtp: 'OTP ફરી મોકલો',
    continue: 'આગળ વધો',
    back: 'પાછળ',

    termsPrefix: 'ચાલુ રાખવાથી, તમે અમારી',
    termsLink: 'નિયમો અને શરતોને મંજૂરી આપો છો',

    selectLanguage: 'ભાષા પસંદ કરો',

    statusConnecting: 'કનેક્ટ થઈ રહ્યું છે…',
    statusReady: 'તૈયાર',
    statusListening: 'સાંભળી રહ્યું છે…',
    statusProcessing: 'પ્રોસેસ થઈ રહ્યું છે…',
    statusSpeaking: 'બોલી રહ્યું છે…',
    statusConnectionError: 'કનેક્શન ભૂલ',
    statusDisconnected: 'ડિસ્કનેક્ટ થયું',

    stop: 'બંધ કરો',
    dismiss: 'હટાવો',
    tapToMute: 'મ્યૂટ કરવા માટે ટેપ કરો',
    tapToUnmute: 'અનમ્યૂટ કરવા માટે ટેપ કરો',

    voiceSheetSayHeyFin: '“Hey, Fin” કહો',
    voiceSheetToStartConversation: 'વાતચીત શરૂ કરવા માટે',

    availableBalance: 'ઉપલબ્ધ બેલેન્સ',
    savingsAccount: 'સેવિંગ્સ એકાઉન્ટ',
    viewDetails: 'વિગતો જુઓ',
  },
}

export const TRANSLATIONS = dict

export type InterpolationValues = Record<string, string | number>

export function interpolate(template: string, values?: InterpolationValues) {
  if (!values) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = values[key]
    return v === undefined ? `{${key}}` : String(v)
  })
}

export function getEnglishTranslation<K extends TranslationKey>(key: K): (typeof EN)[K] {
  return EN[key]
}

