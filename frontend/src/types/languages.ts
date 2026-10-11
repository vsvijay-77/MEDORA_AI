export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

export const ALL_LANGUAGES: LanguageOption[] = [
  { code: 'en-IN', name: 'English', nativeName: 'English' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'od-IN', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'as-IN', name: 'Assamese', nativeName: 'অসমীয়া' },
  { code: 'ur-IN', name: 'Urdu', nativeName: 'اردو' },
  { code: 'sa-IN', name: 'Sanskrit', nativeName: 'संस्कृतम्' },
  { code: 'ne-IN', name: 'Nepali', nativeName: 'नेपाली' },
  { code: 'kok-IN', name: 'Konkani', nativeName: 'कोंकणी' },
  { code: 'mai-IN', name: 'Maithili', nativeName: 'मैथिली' },
  { code: 'brx-IN', name: 'Bodo', nativeName: 'बड़ो' },
  { code: 'doi-IN', name: 'Dogri', nativeName: 'डोगरी' },
  { code: 'ks-IN', name: 'Kashmiri', nativeName: 'کٲشُر' },
  { code: 'sd-IN', name: 'Sindhi', nativeName: 'سنڌي' },
  { code: 'sat-IN', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ' },
  { code: 'mni-IN', name: 'Manipuri', nativeName: 'ꯃꯤꯇꯩꯂꯣꯟ' },
];

export const getSpeechLanguageCode = (langNameOrCode?: string): string => {
  if (!langNameOrCode) return 'en-IN';
  const query = langNameOrCode.toLowerCase().trim();
  const match = ALL_LANGUAGES.find(
    (l) => l.name.toLowerCase() === query || l.code.toLowerCase() === query
  );
  if (match) {
    if (match.code === 'od-IN') return 'or-IN';
    return match.code;
  }
  return 'en-IN';
};

export const getLanguageOption = (langNameOrCode?: string): LanguageOption => {
  if (!langNameOrCode) return ALL_LANGUAGES[0];
  const query = langNameOrCode.toLowerCase().trim();
  const match = ALL_LANGUAGES.find(
    (l) => l.name.toLowerCase() === query || l.code.toLowerCase() === query
  );
  return match || ALL_LANGUAGES[0];
};

export const SAMPLE_VOICE_QUERIES: Record<string, string> = {
  English: 'Explain my doctor prescription, doses, and daily timetable',
  Hindi: 'मेरे डॉक्टर के पर्चे, खुराक और दैनिक समय-सारणी के बारे में बताएं',
  Tamil: 'எனது மருத்துவர் பரிந்துரைத்த மருந்து, அளவு மற்றும் நேர அட்டவணையை விளக்குக',
  Telugu: 'నా డాక్టర్ ప్రిస్క్రిప్షన్, మోతాదులు మరియు రోజువారీ సమయ పట్టికను వివరించండి',
  Kannada: 'ನನ್ನ ವೈದ್ಯರ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್, ಪ್ರಮಾಣ ಮತ್ತು ದೈನಂದಿನ ಸಮಯ ಕೋಷ್ಟಕವನ್ನು ವಿವರಿಸಿ',
  Malayalam: 'എന്റെ ഡോക്ടറുടെ കുറിപ്പടിയും മരുന്നിന്റെ അളവും സമയക്രമവും വിശദീകരിക്കുക',
  Marathi: 'माझ्या डॉक्टरांचे प्रिस्क्रिप्शन, डोस आणि दैनंदिन वेळापत्रक समजावून सांगा',
  Bengali: 'আমার ডাক্তারের প্রেসক্রিপশন, ওষুধের ডোজ এবং দৈনিক রুটিন ব্যাখ্যা করুন',
  Gujarati: 'મારા ડૉક્ટરનું પ્રિસ્ક્રિપ્શન, ડોઝ અને દૈનિક સમયપત્રક સમજાવો',
  Punjabi: 'ਮੇਰੇ ਡਾਕਟਰ ਦੀ ਪਰਚੀ, ਖੁਰਾਕਾਂ ਅਤੇ ਰੋਜ਼ਾਨਾ ਸਮਾਂ-ਸਾਰਣੀ ਬਾਰੇ ਦੱਸੋ',
  Odia: 'ମୋର ଡାକ୍ତରୀ ପ୍ରେସକ୍ରିପସନ୍, ଔଷଧର ମାତ୍ରା ଏବଂ ସମୟ ସାରଣୀ ବୁଝାନ୍ତୁ',
};
