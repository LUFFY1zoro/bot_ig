let accountsCache = [];
let teamCache = [];
let lastMediaAnalysis = "";
let supabaseClient = null;
let lastAssistantText = "";
let speechQueue = [];
let isReading = false;
let authMode = "signin";
let currentLanguage = localStorage.getItem("socialPilotLanguage") || "en";

const translations = {
  en: {
    brandTagline: "Student + creator workspace",
    features: "Features",
    pricing: "Pricing",
    about: "About",
    login: "Login",
    landingEyebrow: "AI assistant for school and social growth",
    landingHeadline: "Create better posts, finish assignments faster, and manage content from one smart workspace.",
    landingCopy: "SocialPilot AI combines a student helper, media analyzer, content calendar, and social publishing workflow with Supabase login and admin-owned AI keys.",
    startFree: "Start Free",
    viewFeatures: "View Features",
    instagramPreview: "Instagram Preview",
    demoCaption: "New gaming keyboard setup is live.",
    aiSuggestion: "AI Suggestion",
    demoSuggestion: "Use a stronger first-line hook and ask viewers to rate the setup.",
    featuresHeadline: "Everything a class defense needs to feel like a real product.",
    aiGenerator: "AI Generator",
    aiGeneratorCopy: "Captions, hashtags, calls-to-action, image prompts, and templates.",
    studentAssistant: "Student Assistant",
    studentAssistantCopy: "Floating helper for assignments, planning, and productivity inside the app.",
    contentCalendar: "Content Calendar",
    contentCalendarCopy: "Schedule drafts and posts while keeping publishing safe by default.",
    pricingHeadline: "Startup-style plans",
    aboutHeadline: "Built around human review and official APIs.",
    aboutCopy: "The app does not fake social engagement. It uses real local activity and clearly marks external platform features that need official OAuth permissions.",
    authBrandTagline: "Student + social media assistant",
    signinTitle: "Sign in to SocialPilot AI",
    signupTitle: "Create your account",
    signinSubtitle: "Enter the email and password for your existing account.",
    signupSubtitle: "Add your profile details so the assistant can personalize your workspace.",
    signIn: "Sign In",
    createAccount: "Create Account",
    googleLogin: "Continue with Google",
    newUserProfile: "New user profile",
    chooseCategory: "Choose category",
    student: "Student",
    creator: "Social Media Creator",
    businessOwner: "Small Business Owner",
    schoolClub: "School Club / Team",
    marketingManager: "Marketing Manager",
    teacherTutor: "Teacher / Tutor",
    other: "Other",
    profileHelp: "These details are used to personalize the assistant after account creation.",
    workspaceTagline: "AI social media workspace",
    mvpPlatform: "MVP demo platform",
    appHeadline: "AI workspace for students, creators, and social media teams.",
    appCopy: "Generate content, analyze uploads, schedule posts, manage accounts, and get study help from a floating assistant.",
    aiReady: "AI ready",
    humanReview: "Human review first",
    dashboard: "Dashboard",
    generator: "Generator",
    drafts: "Drafts",
    calendar: "Calendar",
    assistant: "Assistant",
    labs: "Labs",
    accounts: "Accounts",
    profile: "Profile",
    team: "Team",
    tasks: "Tasks",
    defense: "Defense",
    settings: "Settings",
  },
  am: {
    brandTagline: "የተማሪ እና የፈጣሪ መስሪያ ቦታ",
    features: "ባህሪያት",
    pricing: "ዋጋ",
    about: "ስለ እኛ",
    login: "ግባ",
    landingEyebrow: "ለትምህርት እና ለማህበራዊ እድገት AI አጋዥ",
    landingHeadline: "የተሻሉ ፖስቶችን ፍጠር፣ ስራዎችን በፍጥነት ጨርስ፣ እና ይዘትህን ከአንድ ቦታ አስተዳድር።",
    landingCopy: "SocialPilot AI የተማሪ አጋዥ፣ የሚዲያ ትንታኔ፣ የይዘት ካሌንደር እና የማህበራዊ ሚዲያ ስራ ፍሰትን ያጣምራል።",
    startFree: "በነፃ ጀምር",
    viewFeatures: "ባህሪያትን ይመልከቱ",
    instagramPreview: "የInstagram ቅድመ እይታ",
    demoCaption: "አዲሱ የጌሚንግ ኪቦርድ ዝግጅት ተለቋል።",
    aiSuggestion: "የAI ምክር",
    demoSuggestion: "በመጀመሪያ መስመር ጠንካራ መሳቢያ ተጠቀም እና ተመልካቾችን እንዲመዝኑ ጠይቅ።",
    featuresHeadline: "ለክፍል መከላከያ እውነተኛ ምርት የሚመስሉ ባህሪያት።",
    aiGenerator: "AI ይዘት ፈጣሪ",
    aiGeneratorCopy: "ካፕሽን፣ ሃሽታግ፣ የተግባር ጥሪ፣ የምስል ሀሳብ እና ቴምፕሌቶች።",
    studentAssistant: "የተማሪ አጋዥ",
    studentAssistantCopy: "ለስራዎች፣ ለእቅድ እና ለምርታማነት የሚረዳ ተንሳፋፊ አጋዥ።",
    contentCalendar: "የይዘት ካሌንደር",
    contentCalendarCopy: "ረቂቆችን እና ፖስቶችን በደህንነት ያቅዱ።",
    pricingHeadline: "የጀማሪ ኩባንያ ዋጋ እቅዶች",
    aboutHeadline: "በሰው ግምገማ እና በኦፊሴላዊ API የተገነባ።",
    aboutCopy: "መተግበሪያው የውሸት ላይክ፣ ሪች ወይም ኮመንት አያሳይም። እውነተኛ የአካባቢ እንቅስቃሴን ብቻ ያሳያል።",
    authBrandTagline: "የተማሪ + ማህበራዊ ሚዲያ አጋዥ",
    signinTitle: "ወደ SocialPilot AI ይግቡ",
    signupTitle: "መለያ ይፍጠሩ",
    signinSubtitle: "የነበረዎትን ኢሜይል እና የይለፍ ቃል ያስገቡ።",
    signupSubtitle: "አጋዥዎ እንዲግል መረጃዎን ያስገቡ።",
    signIn: "ግባ",
    createAccount: "መለያ ፍጠር",
    googleLogin: "በGoogle ይቀጥሉ",
    newUserProfile: "የአዲስ ተጠቃሚ መገለጫ",
    chooseCategory: "ምድብ ይምረጡ",
    student: "ተማሪ",
    creator: "የማህበራዊ ሚዲያ ፈጣሪ",
    businessOwner: "የትንሽ ንግድ ባለቤት",
    schoolClub: "የትምህርት ቡድን",
    marketingManager: "የግብይት አስተዳዳሪ",
    teacherTutor: "መምህር / አስተማሪ",
    other: "ሌላ",
    profileHelp: "ይህ መረጃ አጋዥዎን ለእርስዎ ለማበጀት ይጠቅማል።",
    workspaceTagline: "AI የማህበራዊ ሚዲያ መስሪያ ቦታ",
    mvpPlatform: "MVP የማሳያ መድረክ",
    appHeadline: "ለተማሪዎች፣ ፈጣሪዎች እና ቡድኖች AI መስሪያ ቦታ።",
    appCopy: "ይዘት ፍጠር፣ ሚዲያ ተንትን፣ ፖስቶችን አቅድ፣ መለያዎችን አስተዳድር።",
    aiReady: "AI ዝግጁ",
    humanReview: "የሰው ግምገማ መጀመሪያ",
    dashboard: "ዳሽቦርድ",
    generator: "ፈጣሪ",
    drafts: "ረቂቆች",
    calendar: "ካሌንደር",
    assistant: "አጋዥ",
    labs: "ላብስ",
    accounts: "መለያዎች",
    profile: "መገለጫ",
    team: "ቡድን",
    tasks: "ተግባሮች",
    defense: "መከላከያ",
    settings: "ቅንብሮች",
  },
  ar: {
    brandTagline: "مساحة عمل للطلاب وصناع المحتوى",
    features: "المميزات",
    pricing: "الأسعار",
    about: "حول",
    login: "تسجيل الدخول",
    landingEyebrow: "مساعد ذكاء اصطناعي للدراسة ونمو الحسابات",
    landingHeadline: "أنشئ منشورات أفضل، وأنهِ واجباتك أسرع، وأدر محتواك من مساحة واحدة.",
    landingCopy: "يجمع SocialPilot AI بين مساعد للطلاب، وتحليل الوسائط، وتقويم المحتوى، وسير عمل النشر الاجتماعي مع تسجيل دخول Supabase ومفاتيح AI يديرها المسؤول.",
    startFree: "ابدأ مجاناً",
    viewFeatures: "عرض المميزات",
    instagramPreview: "معاينة Instagram",
    demoCaption: "تم نشر إعداد لوحة مفاتيح الألعاب الجديد.",
    aiSuggestion: "اقتراح AI",
    demoSuggestion: "استخدم بداية أقوى واطلب من المتابعين تقييم الإعداد.",
    featuresHeadline: "كل ما يجعل مشروعك يبدو كمنتج حقيقي في المناقشة.",
    aiGenerator: "مولد AI",
    aiGeneratorCopy: "تعليقات، هاشتاقات، دعوات لاتخاذ إجراء، أفكار صور وقوالب.",
    studentAssistant: "مساعد الطلاب",
    studentAssistantCopy: "مساعد عائم للواجبات والتخطيط والإنتاجية داخل التطبيق.",
    contentCalendar: "تقويم المحتوى",
    contentCalendarCopy: "جدولة المسودات والمنشورات مع مراجعة آمنة أولاً.",
    pricingHeadline: "خطط بأسلوب الشركات الناشئة",
    aboutHeadline: "مبني حول المراجعة البشرية وواجهات API الرسمية.",
    aboutCopy: "لا يزيف التطبيق التفاعل الاجتماعي. يعرض النشاط المحلي الحقيقي ويوضح أن الميزات الخارجية تحتاج أذونات OAuth رسمية.",
    authBrandTagline: "مساعد للطلاب ووسائل التواصل",
    signinTitle: "تسجيل الدخول إلى SocialPilot AI",
    signupTitle: "إنشاء حساب",
    signinSubtitle: "أدخل البريد الإلكتروني وكلمة المرور لحسابك الحالي.",
    signupSubtitle: "أضف بياناتك حتى يخصص المساعد تجربتك.",
    signIn: "تسجيل الدخول",
    createAccount: "إنشاء حساب",
    googleLogin: "المتابعة باستخدام Google",
    newUserProfile: "ملف مستخدم جديد",
    chooseCategory: "اختر الفئة",
    student: "طالب",
    creator: "صانع محتوى",
    businessOwner: "صاحب مشروع صغير",
    schoolClub: "نادي / فريق مدرسي",
    marketingManager: "مدير تسويق",
    teacherTutor: "معلم / مدرس خصوصي",
    other: "أخرى",
    profileHelp: "تُستخدم هذه التفاصيل لتخصيص المساعد بعد إنشاء الحساب.",
    workspaceTagline: "مساحة عمل AI لوسائل التواصل",
    mvpPlatform: "منصة عرض MVP",
    appHeadline: "مساحة عمل AI للطلاب وصناع المحتوى والفرق.",
    appCopy: "أنشئ محتوى، حلل الوسائط، جدول المنشورات، أدر الحسابات واحصل على مساعدة دراسية.",
    aiReady: "AI جاهز",
    humanReview: "المراجعة البشرية أولاً",
    dashboard: "لوحة التحكم",
    generator: "المولد",
    drafts: "المسودات",
    calendar: "التقويم",
    assistant: "المساعد",
    labs: "المختبر",
    accounts: "الحسابات",
    profile: "الملف الشخصي",
    team: "الفريق",
    tasks: "المهام",
    defense: "المناقشة",
    settings: "الإعدادات",
  },
};

Object.assign(translations, {
  am: {
    brandTagline: "የተማሪ እና የፈጣሪ የስራ ቦታ",
    features: "ባህሪያት",
    pricing: "ዋጋ",
    about: "ስለ እኛ",
    login: "ግባ",
    landingEyebrow: "ለትምህርት እና ለማህበራዊ እድገት AI አጋዥ",
    landingHeadline: "የተሻሉ ፖስቶችን ፍጠር፣ ስራዎችን በፍጥነት ጨርስ፣ እና ይዘትህን ከአንድ ቦታ አስተዳድር።",
    landingCopy: "SocialPilot AI የተማሪ አጋዥ፣ የሚዲያ ትንታኔ፣ የይዘት ካሌንደር እና የማህበራዊ ሚዲያ ስራ ፍሰትን ያጣምራል።",
    startFree: "በነፃ ጀምር",
    viewFeatures: "ባህሪያትን ይመልከቱ",
    instagramPreview: "የInstagram ቅድመ እይታ",
    demoCaption: "አዲሱ የጌሚንግ ኪቦርድ ዝግጅት ተለቋል።",
    aiSuggestion: "የAI ምክር",
    demoSuggestion: "በመጀመሪያ መስመር ጠንካራ መሳቢያ ተጠቀም እና ተመልካቾች እንዲመዝኑ ጠይቅ።",
    featuresHeadline: "ለክፍል መከላከያ እውነተኛ ምርት የሚመስሉ ባህሪያት።",
    aiGenerator: "AI ይዘት ፈጣሪ",
    aiGeneratorCopy: "ካፕሽን፣ ሃሽታግ፣ የተግባር ጥሪ፣ የምስል ሀሳብ እና ቴምፕሌቶች።",
    studentAssistant: "የተማሪ አጋዥ",
    studentAssistantCopy: "ለስራዎች፣ ለእቅድ እና ለምርታማነት የሚረዳ ተንሳፋፊ አጋዥ።",
    contentCalendar: "የይዘት ካሌንደር",
    contentCalendarCopy: "ረቂቆችን እና ፖስቶችን በደህንነት ያቅዱ።",
    pricingHeadline: "የጀማሪ ኩባንያ ዋጋ እቅዶች",
    aboutHeadline: "በሰው ግምገማ እና በኦፊሴላዊ API የተገነባ።",
    aboutCopy: "መተግበሪያው የውሸት ላይክ፣ ሪች ወይም ኮመንት አያሳይም። እውነተኛ የአካባቢ እንቅስቃሴን ብቻ ያሳያል።",
    authBrandTagline: "የተማሪ + ማህበራዊ ሚዲያ አጋዥ",
    signinTitle: "ወደ SocialPilot AI ይግቡ",
    signupTitle: "መለያ ይፍጠሩ",
    signinSubtitle: "ያለዎትን ኢሜይል እና የይለፍ ቃል ያስገቡ።",
    signupSubtitle: "አጋዥዎ እንዲረዳዎ የመገለጫ መረጃዎን ያስገቡ።",
    signIn: "ግባ",
    createAccount: "መለያ ፍጠር",
    googleLogin: "በGoogle ይቀጥሉ",
    newUserProfile: "የአዲስ ተጠቃሚ መገለጫ",
    chooseCategory: "ምድብ ይምረጡ",
    student: "ተማሪ",
    creator: "የማህበራዊ ሚዲያ ፈጣሪ",
    businessOwner: "የትንሽ ንግድ ባለቤት",
    schoolClub: "የትምህርት ቤት ክለብ / ቡድን",
    marketingManager: "የግብይት አስተዳዳሪ",
    teacherTutor: "መምህር / አስተማሪ",
    other: "ሌላ",
    profileHelp: "ይህ መረጃ አጋዥዎን ለእርስዎ ለማበጀት ይጠቅማል።",
    workspaceTagline: "AI የማህበራዊ ሚዲያ የስራ ቦታ",
    mvpPlatform: "MVP የማሳያ መድረክ",
    appHeadline: "ለተማሪዎች፣ ፈጣሪዎች እና ቡድኖች AI የስራ ቦታ።",
    appCopy: "ይዘት ፍጠር፣ ሚዲያ ተንትን፣ ፖስቶችን አቅድ፣ መለያዎችን አስተዳድር።",
    aiReady: "AI ዝግጁ",
    humanReview: "የሰው ግምገማ መጀመሪያ",
    dashboard: "ዳሽቦርድ",
    generator: "ፈጣሪ",
    drafts: "ረቂቆች",
    calendar: "ካሌንደር",
    assistant: "አጋዥ",
    labs: "ላብስ",
    accounts: "መለያዎች",
    profile: "መገለጫ",
    team: "ቡድን",
    tasks: "ተግባሮች",
    defense: "መከላከያ",
    settings: "ቅንብሮች",
  },
  ar: {
    brandTagline: "مساحة عمل للطلاب وصناع المحتوى",
    features: "الميزات",
    pricing: "الأسعار",
    about: "حول",
    login: "تسجيل الدخول",
    landingEyebrow: "مساعد ذكاء اصطناعي للدراسة ونمو الحسابات",
    landingHeadline: "أنشئ منشورات أفضل، وأنهِ واجباتك أسرع، وأدر محتواك من مساحة ذكية واحدة.",
    landingCopy: "يجمع SocialPilot AI بين مساعد للطلاب، وتحليل الوسائط، وتقويم المحتوى، وسير عمل النشر الاجتماعي مع تسجيل دخول Supabase ومفاتيح AI يديرها المسؤول.",
    startFree: "ابدأ مجانا",
    viewFeatures: "عرض الميزات",
    instagramPreview: "معاينة Instagram",
    demoCaption: "تم نشر إعداد لوحة مفاتيح الألعاب الجديد.",
    aiSuggestion: "اقتراح AI",
    demoSuggestion: "استخدم بداية أقوى واطلب من المتابعين تقييم الإعداد.",
    featuresHeadline: "كل ما يجعل مشروعك يبدو كمنتج حقيقي في المناقشة.",
    aiGenerator: "مولد AI",
    aiGeneratorCopy: "تعليقات، هاشتاقات، دعوات لاتخاذ إجراء، أفكار صور وقوالب.",
    studentAssistant: "مساعد الطلاب",
    studentAssistantCopy: "مساعد عائم للواجبات والتخطيط والإنتاجية داخل التطبيق.",
    contentCalendar: "تقويم المحتوى",
    contentCalendarCopy: "جدولة المسودات والمنشورات مع مراجعة بشرية أولا.",
    pricingHeadline: "خطط بأسلوب الشركات الناشئة",
    aboutHeadline: "مبني حول المراجعة البشرية وواجهات API الرسمية.",
    aboutCopy: "لا يزيف التطبيق التفاعل الاجتماعي. يعرض النشاط المحلي الحقيقي ويوضح أن الميزات الخارجية تحتاج إلى أذونات OAuth رسمية.",
    authBrandTagline: "مساعد للطلاب ووسائل التواصل",
    signinTitle: "تسجيل الدخول إلى SocialPilot AI",
    signupTitle: "إنشاء حسابك",
    signinSubtitle: "أدخل البريد الإلكتروني وكلمة المرور لحسابك الحالي.",
    signupSubtitle: "أضف بياناتك حتى يخصص المساعد تجربتك.",
    signIn: "تسجيل الدخول",
    createAccount: "إنشاء حساب",
    googleLogin: "المتابعة باستخدام Google",
    newUserProfile: "ملف مستخدم جديد",
    chooseCategory: "اختر الفئة",
    student: "طالب",
    creator: "صانع محتوى",
    businessOwner: "صاحب مشروع صغير",
    schoolClub: "ناد أو فريق مدرسي",
    marketingManager: "مدير تسويق",
    teacherTutor: "معلم / مدرس خاص",
    other: "أخرى",
    profileHelp: "تستخدم هذه التفاصيل لتخصيص المساعد بعد إنشاء الحساب.",
    workspaceTagline: "مساحة عمل AI لوسائل التواصل",
    mvpPlatform: "منصة عرض MVP",
    appHeadline: "مساحة عمل AI للطلاب وصناع المحتوى والفرق.",
    appCopy: "أنشئ محتوى، حلل الوسائط، جدول المنشورات، أدر الحسابات واحصل على مساعدة دراسية.",
    aiReady: "AI جاهز",
    humanReview: "المراجعة البشرية أولا",
    dashboard: "لوحة التحكم",
    generator: "المولد",
    drafts: "المسودات",
    calendar: "التقويم",
    assistant: "المساعد",
    labs: "المختبر",
    accounts: "الحسابات",
    profile: "الملف الشخصي",
    team: "الفريق",
    tasks: "المهام",
    defense: "المناقشة",
    settings: "الإعدادات",
  },
});

function t(key) {
  return translations[currentLanguage]?.[key] || translations.en[key] || key;
}

function setLanguage(language) {
  currentLanguage = language;
  localStorage.setItem("socialPilotLanguage", language);
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  const landing = document.getElementById("languageSelectLanding");
  const app = document.getElementById("languageSelectApp");
  if (landing) landing.value = language;
  if (app) app.value = language;
  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;
    if (t(key)) element.textContent = t(key);
  });
  setAuthMode(authMode);
  const googleText = document.querySelector(".google-button span:last-child");
  if (googleText) googleText.textContent = t("googleLogin");
}

function openLogin(mode = "signin") {
  setAuthMode(mode);
  document.getElementById("loginOverlay").classList.remove("hidden");
}

function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === "signup";
  document.getElementById("signupProfileFields").classList.toggle("hidden", !isSignup);
  document.getElementById("authTitle").textContent = isSignup ? t("signupTitle") : t("signinTitle");
  document.getElementById("authSubtitle").textContent = isSignup ? t("signupSubtitle") : t("signinSubtitle");
  document.getElementById("authSubmitButton").textContent = isSignup ? t("createAccount") : t("signIn");
  document.getElementById("signinTab").textContent = t("signIn");
  document.getElementById("signupTab").textContent = t("createAccount");
  document.getElementById("signinTab").classList.toggle("secondary", isSignup);
  document.getElementById("signupTab").classList.toggle("secondary", !isSignup);
  document.getElementById("loginMessage").textContent = "";
}

function showApp() {
  document.getElementById("landingPage").classList.add("hidden");
  document.getElementById("appShell").classList.remove("requires-auth");
  document.getElementById("loginOverlay").classList.add("hidden");
  updateProfileMenu();
}

function showLanding() {
  document.getElementById("landingPage").classList.remove("hidden");
  document.getElementById("appShell").classList.add("requires-auth");
}

function getSupabaseClient() {
  const config = window.supabaseConfig || {};
  if (!config.url || !config.anonKey || !window.supabase) return null;
  if (!supabaseClient) {
    supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  }
  return supabaseClient;
}

async function loginUser(event) {
  event.preventDefault();
  if (authMode === "signup") {
    await signupUser();
    return;
  }
  const profile = readSignupProfile();
  const name = profile.name || "Demo User";
  const email = document.getElementById("loginEmail").value.trim() || "demo@example.com";
  const password = document.getElementById("loginPassword").value;
  const client = getSupabaseClient();
  if (!client) {
    document.getElementById("loginMessage").textContent = "Supabase is not configured. Ask the admin to set it up.";
    return;
  }
  if (!email || !password) {
    document.getElementById("loginMessage").textContent = "Email and password are required.";
    return;
  }
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    document.getElementById("loginMessage").textContent = error.message;
    return;
  }
  localStorage.setItem("socialPilotUser", JSON.stringify(userFromSupabase(data.user, { name, email })));
  showApp();
  applyAdminVisibility();
}

async function signupUser() {
  const profile = readSignupProfile();
  const name = profile.name || "Student";
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  if (!email || !password) {
    document.getElementById("loginMessage").textContent = "Email and password are required.";
    return;
  }
  const missing = [];
  if (!profile.first_name) missing.push("first name");
  if (!profile.last_name) missing.push("last name");
  if (!profile.phone_number) missing.push("phone number");
  if (!profile.country) missing.push("country");
  if (!profile.category) missing.push("category");
  if (missing.length) {
    document.getElementById("loginMessage").textContent = `For new accounts, add: ${missing.join(", ")}.`;
    return;
  }
  const client = getSupabaseClient();
  if (!client) {
    document.getElementById("loginMessage").textContent = "Supabase is not configured. Ask the admin to set it up.";
    return;
  }
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: profile },
  });
  if (error) {
    const message = error.message || "";
    document.getElementById("loginMessage").textContent = message.toLowerCase().includes("already")
      ? "An account with this email already exists. Please sign in instead."
      : message;
    return;
  }
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    document.getElementById("loginMessage").textContent = "An account with this email already exists. Please sign in instead.";
    setAuthMode("signin");
    return;
  }
  document.getElementById("loginMessage").textContent = "Account created. Check email confirmation if Supabase requires it, then sign in.";
  setAuthMode("signin");
}

function userFromSupabase(user, fallback = {}) {
  const meta = user?.user_metadata || {};
  return {
    name: meta.name || meta.full_name || fallback.name || "User",
    email: user?.email || fallback.email || "",
    avatar_url: meta.avatar_url || meta.picture || "",
    first_name: meta.first_name || "",
    middle_name: meta.middle_name || "",
    last_name: meta.last_name || "",
    phone_number: meta.phone_number || "",
    country: meta.country || "",
    category: meta.category || "",
    career_field: meta.career_field || "",
    school_or_company: meta.school_or_company || "",
    main_goal: meta.main_goal || "",
    provider: "supabase",
  };
}

function readSignupProfile() {
  const firstName = document.getElementById("firstName").value.trim();
  const middleName = document.getElementById("middleName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const name = [firstName, middleName, lastName].filter(Boolean).join(" ");
  return {
    name,
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    phone_number: document.getElementById("phoneNumber").value.trim(),
    country: document.getElementById("country").value.trim(),
    category: document.getElementById("userCategory").value,
    career_field: document.getElementById("careerField").value.trim(),
    school_or_company: document.getElementById("schoolOrCompany").value.trim(),
    main_goal: document.getElementById("mainGoal").value.trim(),
  };
}

async function continueWithGoogle() {
  const client = getSupabaseClient();
  if (!client) {
    document.getElementById("loginMessage").textContent =
      "Add SUPABASE_URL and SUPABASE_ANON_KEY first, then enable Google provider in Supabase Auth.";
    return;
  }
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) {
    document.getElementById("loginMessage").textContent = error.message;
  }
}

async function logoutUser() {
  const client = getSupabaseClient();
  if (client) await client.auth.signOut();
  localStorage.removeItem("socialPilotUser");
  closeProfileMenu();
  showLanding();
  document.getElementById("loginOverlay").classList.add("hidden");
}

async function checkLogin() {
  const client = getSupabaseClient();
  if (!client) {
    localStorage.removeItem("socialPilotUser");
    showLanding();
    applyAdminVisibility();
    return;
  }
  const { data } = await client.auth.getUser();
  if (data.user) {
    localStorage.setItem("socialPilotUser", JSON.stringify(userFromSupabase(data.user)));
  } else {
    localStorage.removeItem("socialPilotUser");
  }
  const saved = localStorage.getItem("socialPilotUser");
  if (saved) {
    showApp();
  } else {
    showLanding();
  }
  applyAdminVisibility();
}

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("socialPilotUser") || "{}");
  } catch {
    return {};
  }
}

function isCurrentUserAdmin() {
  const user = currentUser();
  return (user.email || "").toLowerCase() === (window.adminEmail || "").toLowerCase();
}

function applyAdminVisibility() {
  const isAdmin = isCurrentUserAdmin();
  const settingsButton = document.querySelector('[data-view="settings"]');
  if (settingsButton) settingsButton.style.display = isAdmin ? "" : "none";
  const profileSettings = document.getElementById("profileSettingsButton");
  if (profileSettings) profileSettings.style.display = isAdmin ? "" : "none";
  if (!isAdmin && document.getElementById("settings").classList.contains("active")) {
    showView("dashboard");
  }
  updateProfileMenu();
  fillProfileForm();
}

function fillProfileForm() {
  const user = currentUser();
  const map = {
    profileFirstName: user.first_name || "",
    profileMiddleName: user.middle_name || "",
    profileLastName: user.last_name || "",
    profilePhoneNumber: user.phone_number || "",
    profileCountry: user.country || "",
    profileCategory: user.category || "",
    profileCareerField: user.career_field || "",
    profileSchoolOrCompany: user.school_or_company || "",
    profileMainGoal: user.main_goal || "",
  };
  for (const [id, value] of Object.entries(map)) {
    const input = document.getElementById(id);
    if (input) input.value = value;
  }
}

function readProfileForm() {
  const firstName = document.getElementById("profileFirstName").value.trim();
  const middleName = document.getElementById("profileMiddleName").value.trim();
  const lastName = document.getElementById("profileLastName").value.trim();
  return {
    name: [firstName, middleName, lastName].filter(Boolean).join(" "),
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    phone_number: document.getElementById("profilePhoneNumber").value.trim(),
    country: document.getElementById("profileCountry").value.trim(),
    category: document.getElementById("profileCategory").value,
    career_field: document.getElementById("profileCareerField").value.trim(),
    school_or_company: document.getElementById("profileSchoolOrCompany").value.trim(),
    main_goal: document.getElementById("profileMainGoal").value.trim(),
  };
}

async function saveProfile() {
  const client = getSupabaseClient();
  if (!client) {
    document.getElementById("profileOutput").textContent = "Supabase is not configured.";
    return;
  }
  const profile = readProfileForm();
  const { data, error } = await client.auth.updateUser({ data: profile });
  if (error) {
    document.getElementById("profileOutput").textContent = error.message;
    return;
  }
  const existing = currentUser();
  localStorage.setItem("socialPilotUser", JSON.stringify({ ...existing, ...profile, name: profile.name || existing.name }));
  updateProfileMenu();
  document.getElementById("profileOutput").textContent = "Profile updated.";
}

function updateProfileMenu() {
  const user = currentUser();
  const name = user.name || user.email || "User";
  const email = user.email || "not signed in";
  const avatar = document.getElementById("profileAvatar");
  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");
  if (avatar) {
    if (user.avatar_url) {
      avatar.style.backgroundImage = `url("${user.avatar_url}")`;
      avatar.textContent = "";
    } else {
      avatar.style.backgroundImage = "";
      avatar.textContent = (name || "U").slice(0, 1).toUpperCase();
    }
  }
  if (profileName) profileName.textContent = name;
  if (profileEmail) {
    const details = [email, user.category, user.country].filter(Boolean).join(" • ");
    profileEmail.textContent = details || "not signed in";
  }
}

function toggleProfileMenu() {
  const menu = document.getElementById("profileDropdown");
  menu.classList.toggle("hidden");
  if (!menu.classList.contains("hidden")) {
    positionProfileMenu();
  }
}

function closeProfileMenu() {
  const menu = document.getElementById("profileDropdown");
  if (menu) menu.classList.add("hidden");
}

function positionProfileMenu() {
  const button = document.getElementById("profileButton");
  const menu = document.getElementById("profileDropdown");
  if (!button || !menu) return;
  const rect = button.getBoundingClientRect();
  const menuWidth = 260;
  const left = Math.max(12, Math.min(window.innerWidth - menuWidth - 12, rect.right - menuWidth));
  menu.style.left = `${left}px`;
  menu.style.top = `${rect.bottom + 12}px`;
}

window.addEventListener("resize", () => {
  const menu = document.getElementById("profileDropdown");
  if (menu && !menu.classList.contains("hidden")) positionProfileMenu();
});

async function api(path, data) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }
  return payload;
}

function text(id, value) {
  document.getElementById(id).textContent =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function clearAndAppend(container, children) {
  container.innerHTML = "";
  for (const child of children) container.appendChild(child);
}

function card(title, body, extraClass = "") {
  const node = document.createElement("article");
  node.className = `mini-card ${extraClass}`.trim();
  const heading = document.createElement("h4");
  heading.textContent = title;
  const paragraph = document.createElement("p");
  paragraph.textContent = body;
  node.append(heading, paragraph);
  return node;
}

function showView(name) {
  if (name === "settings" && !isCurrentUserAdmin()) {
    alert("Settings are only available to the admin.");
    name = "dashboard";
  }
  document.querySelectorAll(".view").forEach(section => {
    section.classList.toggle("active", section.id === name);
  });
  document.querySelectorAll(".nav-button").forEach(button => {
    button.classList.toggle("active", button.dataset.view === name);
  });
}

async function sendChat() {
  const input = document.getElementById("chatInput");
  const prompt = input.value.trim();
  if (!prompt) return;
  addChatMessage("You", prompt);
  input.value = "";
  addChatMessage("AI", "Thinking...");
  try {
    const data = await api("/api/ask", { prompt });
    replaceLastChatMessage("AI", data.answer);
  } catch (error) {
    replaceLastChatMessage("AI", error.message);
  }
}

function addChatMessage(sender, message) {
  const box = document.getElementById("chatMessages");
  const row = document.createElement("div");
  row.className = sender === "You" ? "chat-message user" : "chat-message";
  row.innerHTML = `<strong>${sender}</strong><p>${message}</p>`;
  box.appendChild(row);
  box.scrollTop = box.scrollHeight;
}

function replaceLastChatMessage(sender, message) {
  const box = document.getElementById("chatMessages");
  const last = box.lastElementChild;
  if (!last) {
    addChatMessage(sender, message);
    return;
  }
  last.innerHTML = `<strong>${sender}</strong><p>${message}</p>`;
  if (sender === "AI") lastAssistantText = message;
  box.scrollTop = box.scrollHeight;
}

function toggleFloatingAssistant() {
  document.getElementById("floatingAssistant").classList.toggle("hidden");
}

function setVoiceStatus(message) {
  const status = document.getElementById("voiceStatus");
  if (status) status.textContent = message;
}

function useQuickPrompt(prompt) {
  document.getElementById("floatingInput").value = prompt;
  document.getElementById("floatingInput").focus();
}

async function sendFloatingChat() {
  const input = document.getElementById("floatingInput");
  const prompt = input.value.trim();
  if (!prompt) return;
  addFloatingMessage("You", prompt);
  input.value = "";
  addFloatingMessage("AI", "Thinking...");
  setVoiceStatus("Thinking...");
  try {
    const data = await api("/api/ask", {
      prompt: `Help as a student and creator assistant. Be practical, ethical, and clear. User question: ${prompt}`,
    });
    replaceLastFloatingMessage("AI", data.answer);
    setVoiceStatus("Answer ready");
  } catch (error) {
    replaceLastFloatingMessage("AI", error.message);
    setVoiceStatus("Error");
  }
}

function addFloatingMessage(sender, message) {
  const box = document.getElementById("floatingMessages");
  const row = document.createElement("div");
  row.className = sender === "You" ? "chat-message user" : "chat-message";
  row.innerHTML = `<strong>${sender}</strong><p>${message}</p>`;
  box.appendChild(row);
  box.scrollTop = box.scrollHeight;
}

function replaceLastFloatingMessage(sender, message) {
  const box = document.getElementById("floatingMessages");
  const last = box.lastElementChild;
  if (!last) {
    addFloatingMessage(sender, message);
    return;
  }
  last.innerHTML = `<strong>${sender}</strong><p>${message}</p>`;
  if (sender === "AI") lastAssistantText = message;
  box.scrollTop = box.scrollHeight;
}

function speakLastAssistant() {
  if (!lastAssistantText) {
    setVoiceStatus("No answer to read yet");
    return;
  }
  if (!("speechSynthesis" in window)) {
    setVoiceStatus("Text-to-speech is not supported");
    return;
  }
  stopSpeaking();
  speechQueue = splitSpeechText(lastAssistantText);
  isReading = true;
  setVoiceStatus("Reading answer...");
  readNextSpeechChunk();
}

function splitSpeechText(text) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const sentences = cleaned.match(/[^.!?]+[.!?]*/g) || [cleaned];
  const chunks = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + sentence).length > 180 && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += ` ${sentence}`;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function readNextSpeechChunk() {
  if (!isReading || speechQueue.length === 0) {
    isReading = false;
    setVoiceStatus("Ready to help");
    return;
  }
  const chunk = speechQueue.shift();
  const utterance = new SpeechSynthesisUtterance(chunk);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.onend = () => {
    window.setTimeout(readNextSpeechChunk, 120);
  };
  utterance.onerror = () => {
    isReading = false;
    setVoiceStatus("Reading stopped");
  };
  speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  speechQueue = [];
  isReading = false;
  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
  }
  setVoiceStatus("Ready to help");
}

function startVoiceInput(targetId) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Voice input is not supported in this browser.");
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  setVoiceStatus("Listening...");
  recognition.onresult = event => {
    document.getElementById(targetId).value = event.results[0][0].transcript;
    setVoiceStatus("Voice captured");
  };
  recognition.onerror = () => setVoiceStatus("Voice input failed");
  recognition.onend = () => {
    if (document.getElementById("voiceStatus")?.textContent === "Listening...") {
      setVoiceStatus("Ready to help");
    }
  };
  recognition.start();
}

function showConnectHelp(platform) {
  const guides = {
    Instagram: [
      "Requires Meta developer app.",
      "Requires Instagram Business or Creator account connected to a Facebook Page.",
      "Needs access token, Instagram user ID, and content publishing permission.",
    ],
    "X/Twitter": [
      "Requires X developer project/app.",
      "Needs API key, API secret, access token, and access token secret with write permission.",
      "Each user must authorize their own account for real multi-user posting.",
    ],
    TikTok: [
      "Requires TikTok developer app and Login Kit/Content Posting API approval.",
      "Connector is not implemented in this starter yet.",
    ],
    LinkedIn: [
      "Requires LinkedIn developer app and user OAuth permission.",
      "Connector is not implemented in this starter yet.",
    ],
    YouTube: [
      "Requires Google Cloud OAuth client and YouTube Data API scopes.",
      "Connector is not implemented in this starter yet.",
    ],
  };
  text("connectOutput", `${platform} connection requirements:\n\n${(guides[platform] || []).join("\n")}`);
}

document.addEventListener("change", event => {
  if (event.target.id !== "mediaFile") return;
  previewMedia(event.target.files[0]);
});

function previewMedia(file) {
  const preview = document.getElementById("mediaPreview");
  preview.innerHTML = "";
  if (!file) return;
  const url = URL.createObjectURL(file);
  if (file.type.startsWith("image/")) {
    const image = document.createElement("img");
    image.src = url;
    image.alt = "Uploaded preview";
    preview.appendChild(image);
  } else if (file.type.startsWith("video/")) {
    const video = document.createElement("video");
    video.src = url;
    video.controls = true;
    preview.appendChild(video);
  } else {
    preview.textContent = file.name;
  }
}

async function analyzeMedia() {
  const fileInput = document.getElementById("mediaFile");
  const file = fileInput.files[0];
  if (!file) {
    text("mediaOutput", "Choose an image or video first.");
    return;
  }
  text("mediaOutput", "Uploading and analyzing...");
  const form = new FormData();
  form.append("media", file);
  form.append("platform", document.getElementById("mediaPlatform").value);
  form.append("goal", document.getElementById("mediaGoal").value);
  try {
    const response = await fetch("/api/media/analyze", { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Upload failed");
    lastMediaAnalysis = data.analysis;
    text("mediaOutput", data.analysis);
  } catch (error) {
    text("mediaOutput", error.message);
  }
}

function copyMediaCaptionToPost() {
  if (!lastMediaAnalysis) return;
  document.getElementById("postText").value = lastMediaAnalysis;
  showView("generator");
}

async function generateContentPack() {
  const output = document.getElementById("contentPack");
  output.textContent = "Generating...";
  try {
    const data = await api("/api/content-pack", {
      topic: document.getElementById("contentTopic").value,
      platform: document.getElementById("contentPlatform").value,
      tone: document.getElementById("contentTone").value,
    });
    renderContentPack(data.pack);
  } catch (error) {
    output.textContent = error.message;
  }
}

function renderContentPack(pack) {
  document.getElementById("postText").value = pack.caption || "";
  const output = document.getElementById("contentPack");
  const hashtags = Array.isArray(pack.hashtags) ? pack.hashtags.join(" ") : String(pack.hashtags || "");
  const imageIdeas = Array.isArray(pack.image_ideas) ? pack.image_ideas : [];
  output.innerHTML = "";
  output.append(
    card("Caption", pack.caption || "No caption generated."),
    card("Hashtags", hashtags || "No hashtags generated."),
    card("Call to action", pack.cta || "No CTA generated."),
    card("Platform tip", pack.platform_tip || "No platform tip generated.")
  );
  const imageCard = document.createElement("article");
  imageCard.className = "mini-card";
  imageCard.innerHTML = "<h4>Image Concepts</h4>";
  const list = document.createElement("ul");
  for (const idea of imageIdeas) {
    const item = document.createElement("li");
    item.textContent = idea;
    list.appendChild(item);
  }
  imageCard.appendChild(list);
  output.appendChild(imageCard);
}

async function publishPost() {
  text("postOutput", "Sending...");
  const user = getCurrentUser();
  try {
    const data = await api("/api/post", {
      platform: document.getElementById("postPlatform").value,
      text: document.getElementById("postText").value,
      image_url: document.getElementById("imageUrl").value,
      dry_run: document.getElementById("dryRun").checked,
      user_email: user.email || "",
    });
    text("postOutput", data);
    loadAnalytics();
  } catch (error) {
    text("postOutput", error.message);
  }
}

async function saveCurrentDraft() {
  const content = document.getElementById("postText").value || document.getElementById("previewText")?.value || "";
  if (!content.trim()) {
    text("postOutput", "Write or generate content first, then save it as a draft.");
    return;
  }
  try {
    const data = await api("/api/drafts", {
      title: document.getElementById("draftTitle")?.value || "Untitled Draft",
      platform: document.getElementById("draftSavePlatform")?.value || document.getElementById("postPlatform").value,
      content,
    });
    text("postOutput", `Draft saved: ${data.draft.title}`);
    loadDrafts();
    loadActivity();
  } catch (error) {
    text("postOutput", error.message);
  }
}

async function addSchedule() {
  text("scheduleOutput", "Saving...");
  try {
    await api("/api/schedule", {
      kind: document.getElementById("scheduleKind").value,
      when: document.getElementById("scheduleWhen").value,
      text: document.getElementById("scheduleText").value,
      platform: document.getElementById("schedulePlatform").value,
    });
    document.getElementById("scheduleText").value = "";
    text("scheduleOutput", "Scheduled.");
    loadSchedule();
    loadAnalytics();
  } catch (error) {
    text("scheduleOutput", error.message);
  }
}

async function runSchedule() {
  text("scheduleOutput", "Checking due items...");
  try {
    const data = await api("/api/schedule/run", {});
    text("scheduleOutput", data.message);
    loadSchedule();
  } catch (error) {
    text("scheduleOutput", error.message);
  }
}

async function loadSchedule() {
  const response = await fetch("/api/schedule");
  const items = await response.json();
  renderTimeline("scheduleList", items.map(item => ({
    title: `${item.kind}${item.platform ? ` on ${item.platform}` : ""}`,
    meta: item.when,
    body: item.text,
    done: item.done,
  })));
  renderCalendar(items);
}

function renderCalendar(items) {
  const grid = document.getElementById("calendarGrid");
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const scheduledDays = new Map();
  for (const item of items) {
    const day = Number((item.when || "").slice(8, 10));
    if (!Number.isNaN(day)) {
      scheduledDays.set(day, (scheduledDays.get(day) || 0) + 1);
    }
  }
  grid.innerHTML = "";
  for (let i = 0; i < first.getDay(); i += 1) {
    grid.appendChild(document.createElement("div"));
  }
  for (let day = 1; day <= days; day += 1) {
    const cell = document.createElement("div");
    cell.className = scheduledDays.has(day) ? "calendar-day active" : "calendar-day";
    cell.textContent = day;
    if (scheduledDays.has(day)) {
      const badge = document.createElement("span");
      badge.textContent = scheduledDays.get(day);
      cell.appendChild(badge);
    }
    grid.appendChild(cell);
  }
}

async function loadAnalytics() {
  const response = await fetch("/api/analytics");
  const data = await response.json();
  renderKpis(data.kpis);
  renderPublishHistory(data.history || []);
  renderPlatformStats(data.accounts || [], data.summary || {});
}

async function loadNotifications() {
  const response = await fetch("/api/notifications");
  const rows = await response.json();
  renderTimeline("notificationList", rows.map(row => ({
    title: row.title,
    meta: row.read ? "Read" : "New",
    body: row.body,
    done: row.read,
  })));
}

async function loadActivity() {
  const response = await fetch("/api/activity");
  const rows = await response.json();
  renderTimeline("activityList", rows.slice(-8).reverse().map(row => ({
    title: row.title,
    meta: row.created_at,
    body: row.body,
    done: false,
  })));
}

async function loadDrafts() {
  const response = await fetch("/api/drafts");
  const rows = await response.json();
  renderTimeline("draftList", rows.slice().reverse().map(row => ({
    title: `${row.title} (${row.platform})`,
    meta: row.created_at,
    body: row.content,
    done: false,
  })));
}

async function loadTemplates() {
  const response = await fetch("/api/templates");
  const templates = await response.json();
  const nodes = templates.map(template => {
    const node = card(template.name, template.prompt);
    const button = document.createElement("button");
    button.className = "secondary";
    button.textContent = "Use Template";
    button.onclick = () => {
      document.getElementById("contentTopic").value = template.prompt;
      showView("generator");
    };
    node.appendChild(button);
    return node;
  });
  clearAndAppend(document.getElementById("templateList"), nodes);
}

async function loadBrandKit() {
  const response = await fetch("/api/brand-kit");
  const kit = await response.json();
  document.getElementById("brandCompany").value = kit.company || "";
  document.getElementById("brandVoice").value = kit.voice || "";
  document.getElementById("brandColors").value = kit.colors || "";
  document.getElementById("brandLogo").value = kit.logo || "";
}

async function saveBrandKit() {
  try {
    const data = await api("/api/brand-kit", {
      company: document.getElementById("brandCompany").value,
      voice: document.getElementById("brandVoice").value,
      colors: document.getElementById("brandColors").value,
      logo: document.getElementById("brandLogo").value,
    });
    text("brandKitOutput", data.brand_kit);
    loadActivity();
  } catch (error) {
    text("brandKitOutput", error.message);
  }
}

function renderMobilePreview() {
  const value = document.getElementById("previewText").value || document.getElementById("postText").value;
  document.getElementById("phoneCaption").textContent = value || "Caption preview appears here.";
}

async function analyzeCompetitor() {
  text("competitorOutput", "Analyzing...");
  try {
    const data = await api("/api/competitor", {
      handle: document.getElementById("competitorHandle").value,
    });
    text("competitorOutput", data.analysis);
  } catch (error) {
    text("competitorOutput", error.message);
  }
}

async function generateImagePrompt() {
  text("imagePromptOutput", "Generating...");
  try {
    const data = await api("/api/image-prompt", {
      idea: document.getElementById("imageIdea").value,
      platform: document.getElementById("imagePlatform").value,
    });
    text("imagePromptOutput", data.prompt);
  } catch (error) {
    text("imagePromptOutput", error.message);
  }
}

function renderKpis(kpis) {
  const labels = {
    scheduled_posts: "Scheduled posts",
    publish_attempts: "Publish attempts",
    successful_posts: "Successful posts",
    open_tasks: "Open tasks",
  };
  const nodes = Object.entries(kpis).map(([key, value]) => card(labels[key] || key, String(value), "kpi-card"));
  clearAndAppend(document.getElementById("kpiGrid"), nodes);
}

function renderPlatformStats(accounts, summary) {
  const list = document.getElementById("analyticsStatus");
  list.innerHTML = "";
  for (const account of accounts) {
    const row = document.createElement("div");
    row.className = "stat-row";
    row.innerHTML = `<strong>${account.platform}</strong><span>${account.handle}</span><span>${account.status}</span>`;
    list.appendChild(row);
  }
  text("analyticsNote", summary.engagement_note);
}

function renderPublishHistory(rows) {
  renderTimeline("publishHistory", rows.map(row => ({
    title: `${row.platform} - ${row.posted ? "posted" : row.dry_run ? "dry run" : "not posted"}`,
    meta: row.created_at || "",
    body: row.message || row.text || "",
    done: row.posted,
  })));
}

async function generateStrategy() {
  const output = document.getElementById("strategyOutput");
  output.textContent = "Building plan...";
  try {
    const data = await api("/api/strategy", {
      brand: document.getElementById("brandInput").value,
      goal: document.getElementById("goalInput").value,
    });
    const plan = data.strategy;
    output.innerHTML = "";
    output.append(
      card("Goal", plan.goal || "No goal provided."),
      card("Recommendation", plan.recommendation || "No recommendation generated."),
      card("Content pillars", Array.isArray(plan.content_pillars) ? plan.content_pillars.join(", ") : String(plan.content_pillars || ""))
    );
    const weekly = document.createElement("article");
    weekly.className = "mini-card";
    weekly.innerHTML = "<h4>Weekly Plan</h4>";
    const list = document.createElement("ul");
    for (const step of plan.weekly_plan || []) {
      const item = document.createElement("li");
      item.textContent = step;
      list.appendChild(item);
    }
    weekly.appendChild(list);
    output.appendChild(weekly);
  } catch (error) {
    output.textContent = error.message;
  }
}

async function suggestReply() {
  text("replyOutput", "Writing reply...");
  try {
    const data = await api("/api/reply", {
      comment: document.getElementById("commentInput").value,
    });
    text("replyOutput", data.reply);
  } catch (error) {
    text("replyOutput", error.message);
  }
}

async function loadAccounts() {
  const user = getCurrentUser();
  const query = user.email ? `?email=${encodeURIComponent(user.email)}` : "";
  const response = await fetch(`/api/accounts${query}`);
  accountsCache = await response.json();
  const cards = accountsCache.map(account => card(account.platform, `${account.handle} - ${account.status}`, "account-card"));
  clearAndAppend(document.getElementById("accountList"), cards);
  loadUserInstagramAccount();
}

async function loadUserInstagramAccount() {
  const output = document.getElementById("instagramAccountOutput");
  if (!output) return;
  const user = getCurrentUser();
  if (!user.email) {
    output.textContent = "Login first to connect your own Instagram account.";
    return;
  }
  const response = await fetch(`/api/social-account?email=${encodeURIComponent(user.email)}`);
  const data = await response.json();
  document.getElementById("instagramHandle").value = data.handle || "";
  document.getElementById("instagramUserId").value = data.instagram_user_id || "";
  document.getElementById("instagramAccessToken").value = "";
  output.textContent = data.has_token
    ? `Saved for ${user.email}. Token: ${data.token_preview}. Updated: ${data.updated_at || "unknown"}`
    : "No Instagram token saved for this user yet.";
}

async function saveInstagramAccount() {
  const output = document.getElementById("instagramAccountOutput");
  const user = getCurrentUser();
  if (!user.email) {
    output.textContent = "Login first before saving an Instagram account.";
    return;
  }
  output.textContent = "Saving Instagram account...";
  try {
    const data = await api("/api/social-account", {
      email: user.email,
      platform: "instagram",
      handle: document.getElementById("instagramHandle").value,
      instagram_user_id: document.getElementById("instagramUserId").value,
      instagram_access_token: document.getElementById("instagramAccessToken").value,
    });
    document.getElementById("instagramAccessToken").value = "";
    output.textContent = `${data.message}\nHandle: ${data.account.handle || "not set"}\nUser ID: ${data.account.instagram_user_id || "not set"}\nToken: ${data.account.token_preview || "not set"}`;
    loadAccounts();
    loadAnalytics();
    loadActivity();
  } catch (error) {
    output.textContent = error.message;
  }
}

async function loadTeam() {
  const response = await fetch("/api/team");
  teamCache = await response.json();
  const cards = teamCache.map(member => card(member.name, member.role, "team-card"));
  clearAndAppend(document.getElementById("teamList"), cards);
}

async function addTeamMember() {
  teamCache.push({
    name: document.getElementById("memberName").value || "Team member",
    role: document.getElementById("memberRole").value || "Contributor",
  });
  await api("/api/team", { team: teamCache });
  document.getElementById("memberName").value = "";
  document.getElementById("memberRole").value = "";
  loadTeam();
  loadAnalytics();
}

async function loadTasks() {
  const response = await fetch("/api/tasks");
  const tasks = await response.json();
  renderTimeline("taskList", tasks.map(task => ({
    title: `Task #${task.id}`,
    meta: task.done ? "Done" : "Open",
    body: task.text,
    done: task.done,
    id: task.id,
  })), true);
}

function renderTimeline(id, rows, withButtons = false) {
  const list = document.getElementById(id);
  list.innerHTML = "";
  for (const row of rows) {
    const node = document.createElement("div");
    node.className = row.done ? "timeline-row done" : "timeline-row";
    const content = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = row.title;
    const meta = document.createElement("span");
    meta.textContent = row.meta;
    const body = document.createElement("p");
    body.textContent = row.body;
    content.append(title, meta, body);
    node.appendChild(content);
    if (withButtons && !row.done) {
      const button = document.createElement("button");
      button.className = "secondary";
      button.textContent = "Finish";
      button.onclick = async () => {
        await api(`/api/tasks/${row.id}/done`, {});
        loadTasks();
      };
      node.appendChild(button);
    }
    list.appendChild(node);
  }
}

async function addTask() {
  const input = document.getElementById("taskText");
  if (!input.value.trim()) return;
  await api("/api/tasks", { text: input.value });
  input.value = "";
  loadTasks();
}

async function saveSettings() {
  text("settingsOutput", "Saving...");
  const payload = {};
  const fields = {
    ADMIN_EMAIL: "adminEmail",
    SUPABASE_URL: "supabaseUrl",
    SUPABASE_ANON_KEY: "supabaseAnonKey",
    AI_PROVIDER: "aiProvider",
    GEMINI_API_KEY: "geminiKey",
    GEMINI_MODEL: "geminiModel",
    OPENAI_API_KEY: "openaiKey",
    OPENAI_MODEL: "openaiModel",
    INSTAGRAM_ACCESS_TOKEN: "igToken",
    INSTAGRAM_USER_ID: "igUserId",
  };
  for (const [key, id] of Object.entries(fields)) {
    const value = document.getElementById(id).value.trim();
    if (value) payload[key] = value;
  }
  try {
    const data = await api("/api/settings", payload);
    text("settingsOutput", data.message);
  } catch (error) {
    text("settingsOutput", error.message);
  }
}

function refreshAll() {
  loadAnalytics();
  loadSchedule();
  loadAccounts();
  loadUserInstagramAccount();
  loadTeam();
  loadTasks();
  loadNotifications();
  loadActivity();
  loadDrafts();
  loadTemplates();
  loadBrandKit();
}

document.getElementById("aiProvider").value = window.initialProvider || "gemini";
document.getElementById("openaiModel").value = window.initialOpenAIModel || "gpt-4.1-mini";
setLanguage(currentLanguage);
checkLogin();
refreshAll();
