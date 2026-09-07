// EkPost Multi-Language & Master Application State Logic
let currentLang = localStorage.getItem('ekpost_lang') || 'en';
let currentUser = null;
let authToken = localStorage.getItem('ekpost_auth_token') || null;
let connectedAccounts = [];
let selectedAccountIds = new Set();
let allPosts = [];
let isSignupMode = false;
let currentViewMode = 'list'; // 'list' | 'calendar'

// i18n Translation Dictionary (English default + Marathi)
const translations = {
  en: {
    tagline: 'One Post, Everywhere',
    nav_home: 'Home',
    nav_dashboard: 'Dashboard',
    nav_new_post: '+ New Post',
    nav_posts: 'Posts & Calendar',
    nav_settings: 'Settings',
    btn_login_signup: 'Get Started / Login',
    hero_pill: '✨ The Ultimate Social Media Management Tool for Creators & Businesses',
    hero_title_1: 'One Post,',
    hero_title_2: 'Everywhere.',
    hero_subtitle: 'Write your content in one unified composer and publish or schedule simultaneously across LinkedIn, Instagram, Facebook, and X (Twitter) in just one click.',
    btn_start_trial: 'Start Free Trial',
    btn_view_demo: 'View Live Demo',
    platforms_label: 'Supported on all major social networks:',
    features_title: '🚀 Why Creators & Teams Choose EkPost',
    features_subtitle: 'All-in-one publishing suite designed for maximum reach and time-saving',
    f1_title: 'Unified 1-Click Publishing',
    f1_desc: 'No more tab hopping. Publish your text, images, and videos across all your brand channels with a single click.',
    f2_title: 'Smart Scheduling Queue',
    f2_desc: 'Plan weeks or months of content in advance. Automated background queues publish at the optimal time.',
    f3_title: 'AI Caption & Hashtag Assistant',
    f3_desc: 'Generate tailored post variations and high-engagement hashtags customized for each network instantly.',
    f4_title: 'Team Collaboration',
    f4_desc: 'Invite team members and clients with granular role-based permissions (Admin, Editor, Viewer).',
    db_welcome: 'Welcome back,',
    db_overview_sub: 'Real-time status of your connected social accounts and scheduled posts',
    btn_create_new_post: '+ Create New Post',
    db_connected_summary: 'Connected Accounts Summary',
    btn_connect_account: '+ Connect Account',
    stat_total_published: 'Total Posts Published',
    stat_upcoming_scheduled: 'Upcoming Scheduled Posts',
    stat_estimated_reach: 'Estimated Reach & Views',
    stat_active_channels: 'Active Social Channels',
    db_upcoming_posts: 'Upcoming Scheduled Posts (Next 7 Days)',
    db_recent_activity: 'Recent Posts Activity',
    empty_no_upcoming: 'No upcoming scheduled posts.',
    empty_no_posts: 'No posts published yet.',
    composer_select_accounts: 'Select Target Accounts',
    composer_title: 'Post Composer',
    btn_ai_assistant: 'AI Assistant',
    composer_placeholder: 'Write your thought, announcement, or update here... It will publish across all selected networks! 🚀',
    label_chars: 'characters',
    label_ai_tone: 'AI Quick Tone:',
    label_media_attachment: 'Media Attachment (Image / Video):',
    btn_upload_file: 'Upload',
    label_quick_samples: 'Quick Samples:',
    btn_clear_media: 'Clear',
    label_schedule_toggle: 'Schedule for later (Queue post)',
    label_select_datetime: 'Select Schedule Date & Time:',
    btn_publish_now: 'Publish Now (To All Accounts)',
    btn_scheduling: 'Scheduling...',
    btn_publishing: 'Publishing to all networks...',
    preview_title: 'Live Social Previews',
    history_title: '📅 Posts History & Scheduling Calendar',
    history_subtitle: 'Manage, filter, and track all your published and queued social content',
    btn_list_view: 'Table/List View',
    btn_calendar_view: 'Calendar View',
    filter_status: 'Status Filter:',
    filter_platform: 'Platform Filter:',
    settings_title: '⚙️ Settings & Account Management',
    settings_subtitle: 'Profile, connected social accounts, team permissions, and subscription plans',
    settings_profile: 'Profile Settings',
    label_name: 'Full Name:',
    label_email: 'Email Address:',
    label_password: 'Password:',
    btn_save_profile: 'Save Profile Changes',
    settings_social_accounts: 'Connected Social Accounts',
    btn_connect_new: '+ Connect New',
    settings_team: 'Team Members & Roles',
    settings_billing: 'Current Subscription Plan',
    plan_pro_desc: 'Unlimited scheduling, 10 Social Accounts & AI Assistant active.',
    btn_manage_billing: 'Manage Billing & Upgrade',
    ob_welcome_title: 'Welcome to EkPost!',
    ob_welcome_sub: "Let's connect your first social accounts to publish everywhere seamlessly.",
    ob_step_1: 'Connect LinkedIn, Meta (FB/IG), or X.',
    ob_step_2: 'Compose your post or generate captions with AI.',
    ob_step_3: 'Publish everywhere in one click!',
    btn_start_connecting: 'Connect Accounts Now',
    tab_login: 'Sign In',
    tab_signup: 'Create Account',
    label_full_name: 'Full Name',
    btn_auth_submit: 'Sign In to Dashboard 🚀',
    connect_modal_title: 'Connect Social Media Account',
    connect_option_1: 'Option 1: Direct One-Click OAuth Login',
    divider_or: 'OR (Enter Live Developer Tokens)',
    label_select_platform: 'Select Platform:',
    label_acc_display_name: 'Account Display Name:',
    label_access_token: 'Access Token / Bearer Token:',
    btn_save_account: 'Securely Save & Connect Account',
    ai_modal_title: 'EkPost AI Assistant',
    ai_topic_label: 'Enter Topic or Thought:',
    ai_tone_label: 'Select Tone:',
    btn_generate_ai: 'Generate Multi-Platform Captions',
    ai_variations_title: 'Generated Variations:',
    btn_use_caption: 'Use (Insert to Composer)'
  },
  mr: {
    tagline: 'एक पोस्ट, सर्व ठिकाणी',
    nav_home: 'मुख्यपृष्ठ',
    nav_dashboard: 'डॅशबोर्ड',
    nav_new_post: '+ नवीन पोस्ट',
    nav_posts: 'पोस्ट्स आणि कॅलेंडर',
    nav_settings: 'सेटिंग्ज',
    btn_login_signup: 'सुरुवात करा / लॉगिन',
    hero_pill: '✨ क्रिएटर्स आणि बिझनेससाठी सर्वोत्कृष्ट सोशल मीडिया मॅनेजमेंट टूल',
    hero_title_1: 'एक पोस्ट,',
    hero_title_2: 'सर्व ठिकाणी.',
    hero_subtitle: 'तुमचा विचार एकाच ठिकाणी लिहा आणि तो एका क्लिकमध्ये किंवा ऑटोमॅटिकली शेड्यूल करून LinkedIn, Instagram, Facebook, आणि X (Twitter) वर पब्लिश करा.',
    btn_start_trial: 'मोफत चाचणी सुरू करा',
    btn_view_demo: 'लाइव्ह डेमो पहा',
    platforms_label: 'पब्लिश करा सर्व लोकप्रिय सोशल नेटवर्क्सवर:',
    features_title: '🚀 EkPost का निवडावे?',
    features_subtitle: 'कमीत कमी वेळेत जास्तीत जास्त रीच मिळवण्यासाठी ऑल-इन-वन प्लॅटफॉर्म',
    f1_title: 'Unified 1-Click Publishing',
    f1_desc: 'वेगवेगळ्या ॲप्समध्ये जाण्याची गरज नाही. एकाच डॅशबोर्डवरून सर्व प्रोफाईल्सवर पब्लिश करा.',
    f2_title: 'Smart Scheduling Queue',
    f2_desc: 'आठवडा किंवा महिन्याभराचा कंटेंट ठरवून ठेवा. योग्य वेळेवर स्वयंचलितरीत्या पब्लिश होईल.',
    f3_title: 'AI Caption & Hashtag Assistant',
    f3_desc: 'प्रत्येक सोशल नेटवर्कसाठी आकर्षक कॅप्शन्स आणि हाय-एंगेजमेंट हॅशटॅग्स मिळवा.',
    f4_title: 'Team Collaboration',
    f4_desc: 'तुमच्या टीम मेंबर्सना जोडा आणि स्वतंत्र परवानग्या ठरवा (Admin, Editor, Viewer).',
    db_welcome: 'आपले स्वागत आहे,',
    db_overview_sub: 'तुमच्या सर्व सोशल मीडिया खात्यांची सद्यस्थिती आणि शेड्यूल्ड पोस्ट्स',
    btn_create_new_post: '+ नवीन पोस्ट तयार करा',
    db_connected_summary: 'जोडलेली सोशल खाती (Summary)',
    btn_connect_account: '+ खाते जोडा',
    stat_total_published: 'एकूण पब्लिश झालेल्या पोस्ट्स',
    stat_upcoming_scheduled: 'आगामी शेड्यूल्ड पोस्ट्स',
    stat_estimated_reach: 'अंदाजित रीच आणि व्ह्यूज',
    stat_active_channels: 'सक्रिय सोशल चॅनेल्स',
    db_upcoming_posts: 'आगामी शेड्यूल्ड पोस्ट्स (पुढील ७ दिवस)',
    db_recent_activity: 'अलीकडील पोस्ट्स ॲक्टिव्हिटी',
    empty_no_upcoming: 'कोणतीही आगामी पोस्ट शेड्यूल्ड नाही.',
    empty_no_posts: 'अद्याप कोणतीही पोस्ट पब्लिश केलेली नाही.',
    composer_select_accounts: 'पब्लिश करायची खाती निवडा',
    composer_title: 'Post Composer',
    btn_ai_assistant: 'AI Assistant',
    composer_placeholder: 'तुमचा विचार, घोषणा किंवा अपडेट येथे लिहा... एकाच क्लिकमध्ये सर्व खात्यांवर जाईल! 🚀',
    label_chars: 'अक्षरे',
    label_ai_tone: 'AI टोन निवडा:',
    label_media_attachment: 'मीडिया अटॅचमेंट (इमेज / व्हिडिओ):',
    btn_upload_file: 'अपलोड',
    label_quick_samples: 'सॅम्पल इमेजेस:',
    btn_clear_media: 'काढा',
    label_schedule_toggle: 'नंतर पाठवण्यासाठी Schedule करा',
    label_select_datetime: 'शेड्यूल तारीख आणि वेळ निवडा:',
    btn_publish_now: 'Publish Now (सर्व खात्यांवर पाठवा)',
    btn_scheduling: 'शेड्यूल करत आहोत...',
    btn_publishing: 'सर्व खात्यांवर पाठवत आहोत...',
    preview_title: 'Live Social Previews (थेट व्ह्यू)',
    history_title: '📅 Posts History & Scheduling Calendar',
    history_subtitle: 'सर्व पब्लिश झालेल्या आणि आगामी शेड्यूल्ड पोस्ट्सचे व्यवस्थापन करा',
    btn_list_view: 'लिस्ट व्ह्यू',
    btn_calendar_view: 'कॅलेंडर व्ह्यू',
    filter_status: 'स्टेटस:',
    filter_platform: 'प्लॅटफॉर्म:',
    settings_title: '⚙️ Settings & Account Management',
    settings_subtitle: 'प्रोफाइल, सोशल खाती, टीम आणि सबस्क्रिप्शन प्लॅन',
    settings_profile: 'प्रोफाइल सेटिंग्ज',
    label_name: 'पूर्ण नाव:',
    label_email: 'ईमेल पत्ता:',
    label_password: 'पासवर्ड:',
    btn_save_profile: 'बदल सेव्ह करा',
    settings_social_accounts: 'जोडलेली सोशल खाती',
    btn_connect_new: '+ नवीन जोडा',
    settings_team: 'टीम मेंबर्स आणि रोल्स',
    settings_billing: 'चालू सबस्क्रिप्शन प्लॅन',
    plan_pro_desc: 'Unlimited scheduling, १० सोशल खाती आणि AI Assistant सक्रिय.',
    btn_manage_billing: 'बिलिंग आणि अपग्रेड',
    ob_welcome_title: 'EkPost मध्ये आपले स्वागत आहे!',
    ob_welcome_sub: 'चला तुमचे सोशल मीडिया हँडल्स कनेक्ट करून पहिली पोस्ट पब्लिश करूया.',
    ob_step_1: 'LinkedIn, Meta (FB/IG) किंवा X चे खाते जोडा.',
    ob_step_2: 'AI Assistant कडून किंवा स्वतः पोस्ट लिहा.',
    ob_step_3: 'एकाच वेळी सर्व ठिकाणी पब्लिश करा!',
    btn_start_connecting: 'खाती जोडा (Connect Now)',
    tab_login: 'लॉगिन करा',
    tab_signup: 'साइन अप करा',
    label_full_name: 'पूर्ण नाव',
    btn_auth_submit: 'डॅशबोर्डवर लॉगिन करा 🚀',
    connect_modal_title: 'सोशल मीडिया खाते जोडा',
    connect_option_1: 'पर्याय १: Direct One-Click OAuth Login',
    divider_or: 'किंवा (Live Developer Tokens टाका)',
    label_select_platform: 'प्लॅटफॉर्म निवडा:',
    label_acc_display_name: 'खात्याचे नाव:',
    label_access_token: 'Access Token / Bearer Token:',
    btn_save_account: 'सुरक्षित सेव्ह करा व खाते जोडा',
    ai_modal_title: 'EkPost AI Assistant',
    ai_topic_label: 'विषय किंवा विचार लिहा:',
    ai_tone_label: 'Tone निवडा:',
    btn_generate_ai: 'Captions तयार करा',
    ai_variations_title: 'तयार झालेले पर्याय:',
    btn_use_caption: 'वापरा (Insert)'
  }
};

// Apply Language
function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('ekpost_lang', lang);
  const dict = translations[lang] || translations.en;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });

  const postContent = document.getElementById('postContent');
  if (postContent && dict.composer_placeholder) {
    postContent.placeholder = dict.composer_placeholder;
  }

  const langSelect = document.getElementById('languageSelect');
  if (langSelect) langSelect.value = lang;
}

// DOM Elements
const languageSelect = document.getElementById('languageSelect');
const brandLogoBtn = document.getElementById('brandLogoBtn');
const navTabs = document.querySelectorAll('.nav-tab');
const mNavTabs = document.querySelectorAll('.m-nav-tab');
const viewSections = document.querySelectorAll('.view-section');
const userProfileArea = document.getElementById('userProfileArea');
const refreshBtn = document.getElementById('refreshBtn');

// Dashboard Elements
const dbUserName = document.getElementById('dbUserName');
const btnGoToComposer = document.getElementById('btnGoToComposer');
const dbAccountsSummary = document.getElementById('dbAccountsSummary');
const dbConnectAccountBtn = document.getElementById('dbConnectAccountBtn');
const dbStatTotalPublished = document.getElementById('dbStatTotalPublished');
const dbStatUpcoming = document.getElementById('dbStatUpcoming');
const dbStatReach = document.getElementById('dbStatReach');
const dbStatActiveChannels = document.getElementById('dbStatActiveChannels');
const dbUpcomingList = document.getElementById('dbUpcomingList');
const dbRecentList = document.getElementById('dbRecentList');

// Landing Page CTAs
const landingGetStartedBtn = document.getElementById('landingGetStartedBtn');
const landingExploreDashboardBtn = document.getElementById('landingExploreDashboardBtn');

// Composer Elements
const accountsListEl = document.getElementById('accountsList');
const selectedCountEl = document.getElementById('selectedCount');
const postContentInput = document.getElementById('postContent');
const mediaUrlInput = document.getElementById('mediaUrl');
const mediaFileInput = document.getElementById('mediaFileInput');
const charCountEl = document.getElementById('charCount');
const publishBtn = document.getElementById('publishBtn');
const publishBtnText = document.getElementById('publishBtnText');
const scheduleToggle = document.getElementById('scheduleToggle');
const scheduleTimePicker = document.getElementById('scheduleTimePicker');
const scheduleDateTimeInput = document.getElementById('scheduleDateTime');

// Previews
const tabBtns = document.querySelectorAll('.tab-btn');
const mockupFrames = document.querySelectorAll('.mockup-frame');
const liPreviewText = document.getElementById('liPreviewText');
const igPreviewText = document.getElementById('igPreviewText');
const fbPreviewText = document.getElementById('fbPreviewText');
const twPreviewText = document.getElementById('twPreviewText');
const liImagePreview = document.getElementById('liImagePreview');
const igImagePreview = document.getElementById('igImagePreview');
const fbImagePreview = document.getElementById('fbImagePreview');
const twImagePreview = document.getElementById('twImagePreview');

// History & Calendar Elements
const btnViewListMode = document.getElementById('btnViewListMode');
const btnViewCalendarMode = document.getElementById('btnViewCalendarMode');
const postsListContainer = document.getElementById('postsListContainer');
const postsCalendarContainer = document.getElementById('postsCalendarContainer');
const postsHistoryList = document.getElementById('postsHistoryList');
const calendarDaysGrid = document.getElementById('calendarDaysGrid');
const filterStatusSelect = document.getElementById('filterStatusSelect');
const filterPlatformSelect = document.getElementById('filterPlatformSelect');

// Settings Elements
const settingProfileName = document.getElementById('settingProfileName');
const settingProfileEmail = document.getElementById('settingProfileEmail');
const profileSettingsForm = document.getElementById('profileSettingsForm');
const settingsAccountsList = document.getElementById('settingsAccountsList');

// Auth Modal & OTP Step Elements
const authModal = document.getElementById('authModal');
const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
const authModalHeaderTitle = document.getElementById('authModalHeaderTitle');
const authModalHeaderSub = document.getElementById('authModalHeaderSub');

// Step Panels
const authStepEmail = document.getElementById('authStepEmail');
const authStepOtp = document.getElementById('authStepOtp');
const authStepName = document.getElementById('authStepName');
const authStepPassword = document.getElementById('authStepPassword');

// Step 1: Email Form
const loginTabBtn = document.getElementById('loginTabBtn');
const passwordTabBtn = document.getElementById('passwordTabBtn');
const otpEmailForm = document.getElementById('otpEmailForm');
const otpEmailInput = document.getElementById('otpEmailInput');
const btnSendOtp = document.getElementById('btnSendOtp');
const btnSendOtpText = document.getElementById('btnSendOtpText');

// Step 2: OTP Verification Form
const btnBackToEmail = document.getElementById('btnBackToEmail');
const otpRecipientEmail = document.getElementById('otpRecipientEmail');
const otpVerifyForm = document.getElementById('otpVerifyForm');
const otpBoxInputs = document.querySelectorAll('.otp-box-input');
const otpDevHint = document.getElementById('otpDevHint');
const otpDevCode = document.getElementById('otpDevCode');
const btnResendOtp = document.getElementById('btnResendOtp');
const resendTimerEl = document.getElementById('resendTimer');
const btnVerifyOtpSubmit = document.getElementById('btnVerifyOtpSubmit');
const btnVerifyOtpText = document.getElementById('btnVerifyOtpText');

// Step 3: Name Completion Form
const otpNameForm = document.getElementById('otpNameForm');
const otpFullNameInput = document.getElementById('otpFullNameInput');
const btnCompleteSignup = document.getElementById('btnCompleteSignup');

// Step 4: Legacy Password Form
const btnBackToOtpMode = document.getElementById('btnBackToOtpMode');
const legacyPasswordForm = document.getElementById('legacyPasswordForm');
const legacyAuthEmail = document.getElementById('legacyAuthEmail');
const legacyAuthPassword = document.getElementById('legacyAuthPassword');
const btnLegacyPasswordSubmit = document.getElementById('btnLegacyPasswordSubmit');

// OTP Flow State
let pendingAuthEmail = '';
let resendTimerInterval = null;
let resendCountdown = 30;

// Modals
const onboardingModal = document.getElementById('onboardingModal');
const btnStartOnboardingConnect = document.getElementById('btnStartOnboardingConnect');
const connectAccountModal = document.getElementById('connectAccountModal');
const openConnectModalBtn = document.getElementById('openConnectModalBtn');
const closeConnectModalBtn = document.getElementById('closeConnectModalBtn');
const aiModal = document.getElementById('aiModal');
const openAiModalBtn = document.getElementById('openAiModalBtn');
const closeAiModalBtn = document.getElementById('closeAiModalBtn');
const aiPromptInput = document.getElementById('aiPromptInput');
const aiToneSelect = document.getElementById('aiToneSelect');
const generateAiBtn = document.getElementById('generateAiBtn');
const aiResultsArea = document.getElementById('aiResultsArea');
const aiLiResult = document.getElementById('aiLiResult');
const aiTwResult = document.getElementById('aiTwResult');
const aiIgResult = document.getElementById('aiIgResult');

// API Helper with JWT
async function fetchWithAuth(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return fetch(url, { ...options, headers });
}

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  lucide.createIcons();
  applyLanguage(currentLang);
  setupEventListeners();

  // Check for OAuth callback results in URL
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('connected') === 'linkedin') {
    showToast('🎉 LinkedIn connected successfully! Ready to publish.', 'success');
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (urlParams.get('connected') === 'twitter') {
    showToast('🎉 X (Twitter) connected successfully! Ready to publish.', 'success');
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (urlParams.get('connected') === 'meta') {
    showToast('🎉 Facebook & Instagram (Meta) connected successfully! Ready to publish.', 'success');
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (urlParams.get('connected') === 'instagram') {
    showToast('🎉 Instagram connected successfully. Ready to publish.', 'success');
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (urlParams.get('error')) {
    showToast(`⚠️ ${decodeURIComponent(urlParams.get('error'))}`, 'error');
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  await checkCurrentUser();
  await loadAccounts();
  await loadPosts();
  await loadAnalytics();
  setDefaultScheduleTime();

  if (currentUser) {
    navigateToView('dashboard-view');
  }
});

function setupEventListeners() {
  // Language Switcher
  languageSelect.addEventListener('change', (e) => {
    applyLanguage(e.target.value);
  });

  // Brand Logo Click -> Go to Landing or Dashboard
  brandLogoBtn.addEventListener('click', () => {
    navigateToView(currentUser ? 'dashboard-view' : 'landing-view');
  });

  // Desktop Navigation Tabs
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetView = tab.getAttribute('data-view');
      navigateToView(targetView);
    });
  });

  // Mobile Bottom Navigation Tabs
  mNavTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetView = tab.getAttribute('data-view');
      navigateToView(targetView);
    });
  });

  // Landing CTAs
  landingGetStartedBtn.addEventListener('click', installEkPost);

  landingExploreDashboardBtn.addEventListener('click', () => navigateToView('dashboard-view'));

  // Dashboard CTA to Composer
  btnGoToComposer.addEventListener('click', () => navigateToView('composer-view'));
  dbConnectAccountBtn.addEventListener('click', () => connectAccountModal.classList.remove('hidden'));

  // Post Text & Char Sync
  postContentInput.addEventListener('input', (e) => {
    const text = e.target.value;
    charCountEl.textContent = text.length;
    updatePreviews(text, mediaUrlInput.value);
  });

  // Quick Tones
  document.querySelectorAll('.tone-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tone = btn.getAttribute('data-tone');
      const currentText = postContentInput.value.trim() || 'EkPost Announcement';
      await generateAndInsertAI(currentText, tone);
    });
  });

  // Media URL & File Upload Input
  mediaUrlInput.addEventListener('input', (e) => {
    updatePreviews(postContentInput.value, e.target.value);
  });

  mediaFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show immediate local preview while uploading
    const reader = new FileReader();
    reader.onload = async function(evt) {
      const base64Data = evt.target.result;
      updatePreviews(postContentInput.value, base64Data);
      
      const uploadToastMsg = currentLang === 'mr' ? 'फोटो Cloudinary वर अपलोड होत आहे... ⏳' : 'Uploading media to Cloudinary... ⏳';
      showToast(uploadToastMsg, 'info');

      try {
        const res = await fetchWithAuth('/api/upload', {
          method: 'POST',
          body: JSON.stringify({ image: base64Data })
        });
        const data = await res.json();

        if (data.success && data.url) {
          mediaUrlInput.value = data.url;
          updatePreviews(postContentInput.value, data.url);
          const successMsg = currentLang === 'mr' ? 'फोटो यशस्वीरीत्या अपलोड झाला! 📸' : 'Media uploaded to Cloudinary! 📸 Ready to publish.';
          showToast(successMsg, 'success');
        } else {
          showToast(`Cloud upload error: ${data.error || 'Failed to upload'}`, 'error');
        }
      } catch (uploadErr) {
        showToast(`Upload failed: ${uploadErr.message}`, 'error');
      }
    };
    reader.readAsDataURL(file);
  });

  // Quick Sample Chips
  document.querySelectorAll('.sample-chip[data-url]').forEach(btn => {
    btn.addEventListener('click', () => {
      mediaUrlInput.value = btn.getAttribute('data-url');
      updatePreviews(postContentInput.value, mediaUrlInput.value);
    });
  });

  document.getElementById('clearImage').addEventListener('click', () => {
    mediaUrlInput.value = '';
    updatePreviews(postContentInput.value, '');
  });

  // Schedule Toggle
  scheduleToggle.addEventListener('change', (e) => {
    const dict = translations[currentLang] || translations.en;
    if (e.target.checked) {
      scheduleTimePicker.classList.remove('hidden');
      publishBtnText.textContent = dict.label_schedule_toggle;
    } else {
      scheduleTimePicker.classList.add('hidden');
      publishBtnText.textContent = dict.btn_publish_now;
    }
  });

  // Platform Preview Tabs
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPlatform = btn.getAttribute('data-platform');
      tabBtns.forEach(b => b.classList.remove('active'));
      mockupFrames.forEach(f => f.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`preview-${targetPlatform}`).classList.add('active');
    });
  });

  // Publish / Schedule Click
  publishBtn.addEventListener('click', handlePublishOrSchedule);

  // View Mode: List vs Calendar
  btnViewListMode.addEventListener('click', () => {
    currentViewMode = 'list';
    btnViewListMode.classList.add('active');
    btnViewCalendarMode.classList.remove('active');
    postsListContainer.classList.remove('hidden');
    postsCalendarContainer.classList.add('hidden');
  });

  btnViewCalendarMode.addEventListener('click', () => {
    currentViewMode = 'calendar';
    btnViewCalendarMode.classList.add('active');
    btnViewListMode.classList.remove('active');
    postsListContainer.classList.add('hidden');
    postsCalendarContainer.classList.remove('hidden');
    renderCalendar();
  });

  // Filters
  filterStatusSelect.addEventListener('change', () => loadPosts());
  filterPlatformSelect.addEventListener('change', () => loadPosts());

  // Profile Settings Form
  profileSettingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = settingProfileName.value.trim();
    const email = settingProfileEmail.value.trim();
    try {
      const res = await fetchWithAuth('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, email })
      });
      const data = await res.json();
      if (data.success) {
        currentUser = data.user;
        renderUserProfile(currentUser);
        showToast('Profile updated successfully!', 'success');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  });

  // Refresh Button
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.classList.add('rotating');
      await loadAccounts();
      await loadPosts();
      await loadAnalytics();
      setTimeout(() => refreshBtn.classList.remove('rotating'), 600);
    });
  }

  // ================= AUTH MODAL & OTP INTERACTION =================
  if (loginTabBtn) loginTabBtn.addEventListener('click', () => showAuthStep('email'));
  if (passwordTabBtn) passwordTabBtn.addEventListener('click', () => showAuthStep('password'));
  if (btnBackToEmail) btnBackToEmail.addEventListener('click', () => showAuthStep('email'));
  if (btnBackToOtpMode) btnBackToOtpMode.addEventListener('click', () => showAuthStep('email'));

  if (closeAuthModalBtn) {
    closeAuthModalBtn.addEventListener('click', () => {
      if (authModal) authModal.classList.add('hidden');
      clearInterval(resendTimerInterval);
    });
  }

  // Step 1: Send OTP Submit
  if (otpEmailForm) otpEmailForm.addEventListener('submit', handleSendOtp);

  // Step 2: OTP Digit Box Listeners & Form Submissions
  setupOtpInputListeners();
  if (otpVerifyForm) otpVerifyForm.addEventListener('submit', handleVerifyOtp);
  if (btnResendOtp) btnResendOtp.addEventListener('click', handleResendOtp);

  // Step 3: Complete Signup with Full Name
  if (otpNameForm) otpNameForm.addEventListener('submit', handleCompleteSignup);

  // Step 4: Legacy Password Login Submit
  if (legacyPasswordForm) legacyPasswordForm.addEventListener('submit', handleLegacyPasswordLogin);

  // Connect Real Account Listeners
  openConnectModalBtn.addEventListener('click', () => {
    if (!currentUser) {
      showToast('Please sign in to connect social media accounts.', 'error');
      openAuthModal();
      return;
    }
    connectAccountModal.classList.remove('hidden');
  });
  closeConnectModalBtn.addEventListener('click', () => connectAccountModal.classList.add('hidden'));

  // Onboarding Start button
  btnStartOnboardingConnect.addEventListener('click', () => {
    onboardingModal.classList.add('hidden');
    connectAccountModal.classList.remove('hidden');
  });

  // AI Modal Listeners
  openAiModalBtn.addEventListener('click', () => {
    aiModal.classList.remove('hidden');
    aiPromptInput.value = postContentInput.value.trim();
    aiPromptInput.focus();
  });
  closeAiModalBtn.addEventListener('click', () => aiModal.classList.add('hidden'));
  generateAiBtn.addEventListener('click', handleAiGeneration);

  // AI Insert buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-insert-ai')) {
      const targetId = e.target.getAttribute('data-target');
      const text = document.getElementById(targetId).textContent;
      postContentInput.value = text;
      charCountEl.textContent = text.length;
      updatePreviews(text, mediaUrlInput.value);
      aiModal.classList.add('hidden');
      showToast('AI Caption loaded into composer! ✨', 'success');
    }
  });
}

function showAuthStep(stepName) {
  [authStepEmail, authStepOtp, authStepName, authStepPassword].forEach(panel => {
    if (panel) panel.classList.add('hidden');
  });

  if (stepName === 'email') {
    if (authStepEmail) authStepEmail.classList.remove('hidden');
    if (loginTabBtn) loginTabBtn.classList.add('active');
    if (passwordTabBtn) passwordTabBtn.classList.remove('active');
    if (authModalHeaderTitle) {
      authModalHeaderTitle.textContent = currentLang === 'mr' ? 'EkPost मध्ये आपले स्वागत आहे 👋' : 'Welcome to EkPost 👋';
    }
    if (authModalHeaderSub) {
      authModalHeaderSub.textContent = currentLang === 'mr' ? 'पासवर्डशिवाय सुरक्षित Email OTP द्वारे लॉगिन किंवा नोंदणी करा.' : 'Sign in or register with secure, passwordless Email OTP.';
    }
    setTimeout(() => { if (otpEmailInput) otpEmailInput.focus(); }, 120);
  } else if (stepName === 'otp') {
    if (authStepOtp) authStepOtp.classList.remove('hidden');
    if (authModalHeaderTitle) {
      authModalHeaderTitle.textContent = currentLang === 'mr' ? 'व्हेरिफिकेशन कोड टाका 🔐' : 'Security Verification 🔐';
    }
    if (authModalHeaderSub) {
      authModalHeaderSub.textContent = currentLang === 'mr' ? 'तुमच्या इनबॉक्समध्ये ६ अंकी कोड पाठवला आहे.' : 'Enter the 6-digit code sent to your email inbox.';
    }
    resetOtpBoxes();
    setTimeout(() => {
      const firstInput = document.querySelector('.otp-box-input[data-idx="0"]');
      if (firstInput) firstInput.focus();
    }, 120);
  } else if (stepName === 'name') {
    if (authStepName) authStepName.classList.remove('hidden');
    if (authModalHeaderTitle) {
      authModalHeaderTitle.textContent = currentLang === 'mr' ? 'ईमेल व्हेरिफाय झाले 🎉' : 'Email Verified! 🎉';
    }
    if (authModalHeaderSub) {
      authModalHeaderSub.textContent = currentLang === 'mr' ? 'तुमचे प्रोफाइल पूर्ण करण्यासाठी आपले नाव टाका.' : 'Please enter your full name to complete your profile.';
    }
    setTimeout(() => { if (otpFullNameInput) otpFullNameInput.focus(); }, 120);
  } else if (stepName === 'password') {
    if (authStepPassword) authStepPassword.classList.remove('hidden');
    if (passwordTabBtn) passwordTabBtn.classList.add('active');
    if (loginTabBtn) loginTabBtn.classList.remove('active');
    if (authModalHeaderTitle) {
      authModalHeaderTitle.textContent = currentLang === 'mr' ? 'पासवर्डद्वारे लॉगिन 🔑' : 'Sign in with Password 🔑';
    }
    if (authModalHeaderSub) {
      authModalHeaderSub.textContent = currentLang === 'mr' ? 'तुमचा ईमेल/युझरनेम आणि पासवर्ड टाका.' : 'Enter your email or username and account password.';
    }
    setTimeout(() => { if (legacyAuthEmail) legacyAuthEmail.focus(); }, 120);
  }

  if (window.lucide) lucide.createIcons();
}

function switchToLoginMode() {
  showAuthStep('email');
  if (authModal) authModal.classList.remove('hidden');
}

function switchToSignupMode() {
  showAuthStep('email');
  if (authModal) authModal.classList.remove('hidden');
}

function resetOtpBoxes() {
  document.querySelectorAll('.otp-box-input').forEach(input => {
    input.value = '';
    input.classList.remove('has-value');
  });
}

function getOtpInputValue() {
  let val = '';
  document.querySelectorAll('.otp-box-input').forEach(input => {
    val += (input.value || '').trim();
  });
  return val;
}

function setupOtpInputListeners() {
  const inputs = Array.from(document.querySelectorAll('.otp-box-input'));
  if (!inputs.length) return;

  inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/[^0-9]/g, '');
      e.target.value = val ? val.slice(-1) : '';

      if (e.target.value) {
        e.target.classList.add('has-value');
        if (index < inputs.length - 1) {
          inputs[index + 1].focus();
        }
      } else {
        e.target.classList.remove('has-value');
      }

      // If all 6 digits entered, auto submit verification
      const fullCode = getOtpInputValue();
      if (fullCode.length === 6) {
        handleVerifyOtp();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        if (!e.target.value && index > 0) {
          inputs[index - 1].focus();
          inputs[index - 1].value = '';
          inputs[index - 1].classList.remove('has-value');
        } else {
          e.target.value = '';
          e.target.classList.remove('has-value');
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        inputs[index - 1].focus();
      } else if (e.key === 'ArrowRight' && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text');
      const digits = (pasteData || '').replace(/[^0-9]/g, '').slice(0, 6);
      if (!digits) return;

      digits.split('').forEach((d, i) => {
        if (inputs[i]) {
          inputs[i].value = d;
          inputs[i].classList.add('has-value');
        }
      });

      const nextFocusIdx = Math.min(digits.length, inputs.length - 1);
      inputs[nextFocusIdx].focus();

      if (digits.length === 6) {
        handleVerifyOtp();
      }
    });
  });
}

function startResendTimer() {
  clearInterval(resendTimerInterval);
  resendCountdown = 30;
  if (btnResendOtp) {
    btnResendOtp.disabled = true;
    btnResendOtp.innerHTML = `${currentLang === 'mr' ? 'पुन्हा कोड पाठवा' : 'Resend code in'} <span id="resendTimer">${resendCountdown}</span>s`;
  }

  resendTimerInterval = setInterval(() => {
    resendCountdown--;
    const timerSpan = document.getElementById('resendTimer');
    if (timerSpan) timerSpan.textContent = resendCountdown;

    if (resendCountdown <= 0) {
      clearInterval(resendTimerInterval);
      if (btnResendOtp) {
        btnResendOtp.disabled = false;
        btnResendOtp.innerHTML = currentLang === 'mr' ? 'पुन्हा कोड पाठवा ↻' : 'Resend code ↻';
      }
    }
  }, 1000);
}

// Quick Social Auth Simulation
window.quickSocialAuth = function(provider) {
  showToast(`Authenticating with ${provider}...`, 'success');
  setTimeout(() => {
    authToken = `mock_${provider.toLowerCase()}_token_${Date.now()}`;
    currentUser = {
      id: `user_${Date.now()}`,
      name: `${provider} Creator`,
      email: `creator@${provider.toLowerCase()}.com`
    };
    localStorage.setItem('ekpost_auth_token', authToken);
    renderUserProfile(currentUser);
    authModal.classList.add('hidden');
    showToast(`Successfully signed in with ${provider}! 🚀`, 'success');
    navigateToView('dashboard-view');
    loadAccounts();
    loadPosts();
  }, 900);
};

function navigateToView(viewId) {
  navTabs.forEach(t => {
    if (t.getAttribute('data-view') === viewId) t.classList.add('active');
    else t.classList.remove('active');
  });

  mNavTabs.forEach(t => {
    if (t.getAttribute('data-view') === viewId) t.classList.add('active');
    else t.classList.remove('active');
  });

  viewSections.forEach(v => {
    if (v.id === viewId) {
      v.classList.remove('hidden');
      v.classList.add('active');
    } else {
      v.classList.remove('active');
      v.classList.add('hidden');
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (viewId === 'dashboard-view') {
    loadAccounts();
    loadPosts();
    loadAnalytics();
  } else if (viewId === 'history-view') {
    loadPosts();
    if (currentViewMode === 'calendar') renderCalendar();
  }
}

// Profile & Auth Handlers
async function checkCurrentUser() {
  if (!authToken) {
    renderUserProfile(null);
    return;
  }

  try {
    const res = await fetchWithAuth('/auth/me');
    const data = await res.json();
    if (data.success && data.user) {
      currentUser = data.user;
      renderUserProfile(currentUser);
    } else {
      logoutUser();
    }
  } catch (err) {
    renderUserProfile(null);
  }
}

function renderUserProfile(user) {
  const dict = translations[currentLang] || translations.en;
  if (user) {
    dbUserName.textContent = user.name || user.email.split('@')[0];
    settingProfileName.value = user.name || '';
    settingProfileEmail.value = user.email || '';

    userProfileArea.innerHTML = `
      <div class="user-badge-box">
        <div class="user-avatar-circle">${(user.name || user.email)[0].toUpperCase()}</div>
        <div class="user-meta-name">${user.name || user.email.split('@')[0]}</div>
        <button id="logoutBtn" class="btn-logout" title="Logout">
          <i data-lucide="log-out"></i>
        </button>
      </div>
    `;
    document.getElementById('logoutBtn').addEventListener('click', logoutUser);
  } else {
    userProfileArea.innerHTML = `
      <button id="openAuthModalBtn" class="btn-auth">
        <i data-lucide="log-in"></i> <span class="auth-btn-text">${dict.btn_login_signup}</span>
      </button>
    `;
    document.getElementById('openAuthModalBtn').addEventListener('click', () => {
      authModal.classList.remove('hidden');
    });
  }
  lucide.createIcons();
}

// ================= OTP AUTH HANDLERS =================

// Step 1: Send OTP to Email
async function handleSendOtp(e) {
  if (e) e.preventDefault();
  const email = (otpEmailInput ? otpEmailInput.value : '').trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast(currentLang === 'mr' ? 'कृपया वैध ईमेल पत्ता टाका.' : 'Please enter a valid email address.', 'error');
    if (otpEmailInput) otpEmailInput.focus();
    return;
  }

  const origText = btnSendOtpText ? btnSendOtpText.textContent : '';
  if (btnSendOtp) btnSendOtp.disabled = true;
  if (btnSendOtpText) btnSendOtpText.textContent = currentLang === 'mr' ? 'कोड पाठवत आहे... ⏳' : 'Sending code... ⏳';

  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    if (data.success) {
      pendingAuthEmail = email;
      if (otpRecipientEmail) otpRecipientEmail.textContent = email;

      // If dev OTP returned (when SMTP is not configured in local environment)
      if (data.devOtp) {
        if (otpDevHint) otpDevHint.classList.remove('hidden');
        if (otpDevCode) otpDevCode.textContent = data.devOtp;
      } else {
        if (otpDevHint) otpDevHint.classList.add('hidden');
      }

      showAuthStep('otp');
      startResendTimer();
      showToast(currentLang === 'mr' ? '६ अंकी व्हेरिफिकेशन कोड ईमेलवर पाठवला! ✉️' : 'Verification code sent to your email! ✉️', 'success');
    } else {
      showToast(data.error || 'Failed to send verification code. Please try again.', 'error');
    }
  } catch (err) {
    showToast('Network error: ' + err.message, 'error');
  } finally {
    if (btnSendOtp) btnSendOtp.disabled = false;
    if (btnSendOtpText) btnSendOtpText.textContent = origText;
  }
}

// Resend OTP
async function handleResendOtp() {
  if (!pendingAuthEmail || resendCountdown > 0) return;
  if (btnResendOtp) btnResendOtp.disabled = true;

  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pendingAuthEmail })
    });
    const data = await res.json();
    if (data.success) {
      if (data.devOtp && otpDevCode) {
        otpDevCode.textContent = data.devOtp;
        if (otpDevHint) otpDevHint.classList.remove('hidden');
      }
      resetOtpBoxes();
      startResendTimer();
      showToast(currentLang === 'mr' ? 'नवीन कोड पाठवला आहे! ✉️' : 'New code sent to your email! ✉️', 'success');
      const firstBox = document.querySelector('.otp-box-input[data-idx="0"]');
      if (firstBox) firstBox.focus();
    } else {
      showToast(data.error || 'Failed to resend code.', 'error');
      if (btnResendOtp) btnResendOtp.disabled = false;
    }
  } catch (err) {
    showToast('Network error: ' + err.message, 'error');
    if (btnResendOtp) btnResendOtp.disabled = false;
  }
}

// Step 2: Verify 6-digit OTP
async function handleVerifyOtp(e) {
  if (e) e.preventDefault();
  const otp = getOtpInputValue();

  if (otp.length < 6) {
    showToast(currentLang === 'mr' ? 'कृपया पूर्ण ६ अंकी कोड टाका.' : 'Please enter the 6-digit code.', 'error');
    return;
  }

  const origText = btnVerifyOtpText ? btnVerifyOtpText.textContent : '';
  if (btnVerifyOtpSubmit) btnVerifyOtpSubmit.disabled = true;
  if (btnVerifyOtpText) btnVerifyOtpText.textContent = currentLang === 'mr' ? 'तपासत आहे... ⏳' : 'Verifying... ⏳';

  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pendingAuthEmail, otp })
    });

    const data = await res.json();
    if (data.success) {
      if (data.isNewUser) {
        // Step 3: Prompt for Name
        showAuthStep('name');
        showToast(currentLang === 'mr' ? 'ईमेल व्हेरिफाय झाले! आपले नाव टाका.' : 'Email verified! Please enter your name.', 'success');
      } else {
        // Existing user -> Login directly
        await completeUserSession(data, false);
      }
    } else {
      showToast(data.error || (currentLang === 'mr' ? 'अवैध कोड, कृपया पुन्हा तपासा.' : 'Invalid code, please check and try again.'), 'error');
      resetOtpBoxes();
      const firstBox = document.querySelector('.otp-box-input[data-idx="0"]');
      if (firstBox) firstBox.focus();
    }
  } catch (err) {
    showToast('Network error: ' + err.message, 'error');
  } finally {
    if (btnVerifyOtpSubmit) btnVerifyOtpSubmit.disabled = false;
    if (btnVerifyOtpText) btnVerifyOtpText.textContent = origText;
  }
}

// Step 3: Complete Signup (New User provides Name)
async function handleCompleteSignup(e) {
  if (e) e.preventDefault();
  const name = (otpFullNameInput ? otpFullNameInput.value : '').trim();

  if (!name) {
    showToast(currentLang === 'mr' ? 'कृपया आपले पूर्ण नाव टाका.' : 'Please enter your full name.', 'error');
    if (otpFullNameInput) otpFullNameInput.focus();
    return;
  }

  if (btnCompleteSignup) btnCompleteSignup.disabled = true;

  try {
    const res = await fetch('/api/auth/complete-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: pendingAuthEmail,
        name,
        otp: getOtpInputValue()
      })
    });

    const data = await res.json();
    if (data.success) {
      await completeUserSession(data, true);
    } else {
      showToast(data.error || 'Failed to complete registration.', 'error');
    }
  } catch (err) {
    showToast('Network error: ' + err.message, 'error');
  } finally {
    if (btnCompleteSignup) btnCompleteSignup.disabled = false;
  }
}

// Step 4: Legacy Password Login
async function handleLegacyPasswordLogin(e) {
  if (e) e.preventDefault();
  const email = (legacyAuthEmail ? legacyAuthEmail.value : '').trim();
  const password = (legacyAuthPassword ? legacyAuthPassword.value : '');

  if (!email || !password) {
    showToast(currentLang === 'mr' ? 'कृपया ईमेल आणि पासवर्ड टाका.' : 'Please enter your email and password.', 'error');
    return;
  }

  if (btnLegacyPasswordSubmit) btnLegacyPasswordSubmit.disabled = true;

  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (data.success) {
      await completeUserSession(data, false);
    } else {
      showToast(data.error || 'Invalid credentials.', 'error');
    }
  } catch (err) {
    showToast('Network error: ' + err.message, 'error');
  } finally {
    if (btnLegacyPasswordSubmit) btnLegacyPasswordSubmit.disabled = false;
  }
}

// Helper to complete user authentication session
async function completeUserSession(data, isNew = false) {
  authToken = data.token;
  currentUser = data.user;
  localStorage.setItem('ekpost_auth_token', authToken);
  renderUserProfile(currentUser);

  if (authModal) authModal.classList.add('hidden');
  clearInterval(resendTimerInterval);

  if (isNew) {
    if (onboardingModal) onboardingModal.classList.remove('hidden');
    showToast(currentLang === 'mr' ? `खाते तयार झाले! स्वागत आहे, ${data.user.name} 🎉` : `Account created! Welcome, ${data.user.name} 🎉`, 'success');
  } else {
    showToast(currentLang === 'mr' ? `स्वागत आहे, ${data.user.name}! 🚀` : `Welcome back, ${data.user.name}! 🚀`, 'success');
  }

  navigateToView('dashboard-view');
  await loadAccounts();
  await loadPosts();
}

function logoutUser() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('ekpost_auth_token');
  renderUserProfile(null);
  showToast('Logged out.', 'success');
  navigateToView('landing-view');
  loadAccounts();
  loadPosts();
}

async function disconnectAccount(accId) {
  if (!confirm('Are you sure you want to disconnect this social account?')) return;
  try {
    const res = await fetchWithAuth(`/api/accounts/${accId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Account disconnected.', 'success');
      await loadAccounts();
      await loadAnalytics();
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

function setDefaultScheduleTime() {
  const tomorrow = new Date();
  tomorrow.setHours(tomorrow.getHours() + 2);
  tomorrow.setMinutes(0, 0, 0);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  const hours = String(tomorrow.getHours()).padStart(2, '0');
  const mins = String(tomorrow.getMinutes()).padStart(2, '0');
  scheduleDateTimeInput.value = `${year}-${month}-${day}T${hours}:${mins}`;
}

function updatePreviews(text, imageUrl) {
  const displayText = text.trim() || (currentLang === 'mr' ? 'पोस्टचा मजकूर येथे दिसेल...' : 'Your post preview will appear here...');
  liPreviewText.textContent = displayText;
  igPreviewText.textContent = displayText;
  fbPreviewText.textContent = displayText;
  twPreviewText.textContent = displayText.slice(0, 280);

  const updateImg = (container, imgUrl) => {
    if (imgUrl) {
      container.classList.remove('hidden');
      const img = container.querySelector('img');
      if (img) img.src = imgUrl;
    } else {
      container.classList.add('hidden');
    }
  };

  updateImg(liImagePreview, imageUrl);
  updateImg(fbImagePreview, imageUrl);
  updateImg(twImagePreview, imageUrl);

  if (imageUrl) {
    igImagePreview.querySelector('img').src = imageUrl;
  } else {
    igImagePreview.querySelector('img').src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&auto=format&fit=crop&q=80';
  }
}

async function loadAccounts() {
  try {
    const res = await fetchWithAuth('/api/accounts');
    const data = await res.json();
    if (data.success) {
      connectedAccounts = data.data;
      renderAccounts();
      renderDashboardAccountsSummary();
      renderSettingsAccounts();
    }
  } catch (err) {
    console.error('Failed to load accounts:', err);
  }
}

function connectLinkedIn() {
  if (!currentUser) {
    showToast('Please sign in before connecting LinkedIn.', 'error');
    openAuthModal();
    return;
  }
  const tokenParam = authToken ? `?token=${encodeURIComponent(authToken)}` : '';
  window.location.href = `/api/auth/linkedin${tokenParam}`;
}
window.connectLinkedIn = connectLinkedIn;

async function disconnectLinkedIn() {
  if (!confirm('Are you sure you want to disconnect your LinkedIn account?')) return;
  try {
    const res = await fetchWithAuth('/api/auth/linkedin/disconnect', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('LinkedIn account disconnected.', 'success');
      await loadAccounts();
      await loadAnalytics();
    } else {
      showToast(data.error || 'Failed to disconnect LinkedIn account.', 'error');
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}
window.disconnectLinkedIn = disconnectLinkedIn;

function connectTwitter() {
  if (!currentUser) {
    showToast('Please sign in before connecting X (Twitter).', 'error');
    openAuthModal();
    return;
  }
  const tokenParam = authToken ? `?token=${encodeURIComponent(authToken)}` : '';
  window.location.href = `/api/auth/twitter${tokenParam}`;
}
window.connectTwitter = connectTwitter;

async function disconnectTwitter() {
  if (!confirm('Are you sure you want to disconnect your X (Twitter) account?')) return;
  try {
    const res = await fetchWithAuth('/api/auth/twitter/disconnect', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('X (Twitter) account disconnected.', 'success');
      await loadAccounts();
      await loadAnalytics();
    } else {
      showToast(data.error || 'Failed to disconnect X (Twitter) account.', 'error');
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}
window.disconnectTwitter = disconnectTwitter;

function installEkPost() {
  if (!currentUser) {
    switchToSignupMode();
    authModal.classList.remove('hidden');
    return;
  }

  navigateToView('dashboard-view');
}
window.installEkPost = installEkPost;

function connectFacebook() {
  if (!currentUser) {
    showToast('Please sign in before connecting Facebook.', 'error');
    switchToSignupMode();
    authModal.classList.remove('hidden');
    return;
  }

  const tokenParam = authToken ? `?token=${encodeURIComponent(authToken)}` : '';
  window.location.href = `/api/auth/meta${tokenParam}`;
}
window.connectFacebook = connectFacebook;

function connectInstagram() {
  if (!currentUser) {
    showToast('Please sign in before connecting Instagram.', 'error');
    switchToSignupMode();
    authModal.classList.remove('hidden');
    return;
  }

  const tokenParam = authToken ? `?token=${encodeURIComponent(authToken)}` : '';
  window.location.href = `/api/auth/instagram${tokenParam}`;
}
window.connectInstagram = connectInstagram;

// Safe fallback for older markup or bookmarks: do not route to Facebook login.
window.connectMeta = installEkPost;

async function disconnectMeta() {
  if (!confirm('Are you sure you want to disconnect Facebook and Instagram accounts?')) return;
  try {
    const res = await fetchWithAuth('/api/auth/meta/disconnect', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Facebook & Instagram accounts disconnected.', 'success');
      await loadAccounts();
      await loadAnalytics();
    } else {
      showToast(data.error || 'Failed to disconnect Meta accounts.', 'error');
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}
window.disconnectMeta = disconnectMeta;

function getActiveLinkedInAccount() {
  return connectedAccounts.find(
    a => (a.platform || '').toLowerCase() === 'linkedin'
  );
}

function getActiveTwitterAccount() {
  return connectedAccounts.find(
    a => (a.platform || '').toLowerCase() === 'twitter' || (a.platform || '').toLowerCase() === 'x'
  );
}

function getActiveFacebookAccount() {
  return connectedAccounts.find(
    a => (a.platform || '').toLowerCase() === 'facebook'
  );
}

function getActiveInstagramAccount() {
  return connectedAccounts.find(
    a => (a.platform || '').toLowerCase() === 'instagram'
  );
}

function renderAccounts() {
  accountsListEl.innerHTML = '';
  selectedAccountIds.clear();

  const liAccount = getActiveLinkedInAccount();
  const twAccount = getActiveTwitterAccount();
  const fbAccount = getActiveFacebookAccount();
  const igAccount = getActiveInstagramAccount();

  // 1. LinkedIn Card
  if (liAccount) {
    selectedAccountIds.add(liAccount.id);
    const item = document.createElement('div');
    item.className = 'target-account-card platform-linkedin account-item-linkedin selected';
    item.id = 'accountItemLinkedIn';
    item.innerHTML = `
      <div class="target-account-left">
        <div class="chk-box"><i data-lucide="check"></i></div>
        <img src="${liAccount.avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100'}" class="target-account-avatar" alt="${liAccount.name}"/>
        <div class="target-account-info">
          <div class="target-account-name">
            <span class="social-logo social-logo-linkedin social-logo-small">in</span>
            <span>LinkedIn</span>
          </div>
          <div class="target-account-sub" title="${liAccount.name}">${liAccount.name}</div>
        </div>
      </div>
      <div class="target-account-status">
        <span class="badge-active">Active</span>
      </div>
    `;

    item.addEventListener('click', () => {
      if (selectedAccountIds.has(liAccount.id)) {
        selectedAccountIds.delete(liAccount.id);
        item.classList.remove('selected');
        item.querySelector('.chk-box').innerHTML = '';
      } else {
        selectedAccountIds.add(liAccount.id);
        item.classList.add('selected');
        item.querySelector('.chk-box').innerHTML = '<i data-lucide="check"></i>';
      }
      updateSelectedCount();
      lucide.createIcons();
    });
    accountsListEl.appendChild(item);
  } else {
    const item = document.createElement('div');
    item.className = 'target-account-card platform-linkedin account-item-linkedin unconnected';
    item.id = 'accountItemLinkedIn';
    item.innerHTML = `
      <div class="target-account-left">
        <div class="target-account-icon" style="background: #0a66c2;">
          <span class="social-logo social-logo-linkedin">in</span>
        </div>
        <div class="target-account-info">
          <div class="target-account-name">LinkedIn</div>
          <div class="target-account-sub">Not connected</div>
        </div>
      </div>
      <div class="target-account-status">
        <button class="btn-card-connect" type="button">
          <i data-lucide="link"></i> <span>Connect</span>
        </button>
      </div>
    `;
    item.addEventListener('click', () => {
      connectLinkedIn();
    });
    accountsListEl.appendChild(item);
  }

  // 2. X (Twitter) Card
  if (twAccount) {
    selectedAccountIds.add(twAccount.id);
    const twItem = document.createElement('div');
    twItem.className = 'target-account-card platform-twitter account-item-twitter selected';
    twItem.id = 'accountItemTwitter';
    twItem.innerHTML = `
      <div class="target-account-left">
        <div class="chk-box"><i data-lucide="check"></i></div>
        <img src="${twAccount.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}" class="target-account-avatar" alt="${twAccount.name}"/>
        <div class="target-account-info">
          <div class="target-account-name">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            <span>X (Twitter)</span>
          </div>
          <div class="target-account-sub" title="${twAccount.name}">${twAccount.name}</div>
        </div>
      </div>
      <div class="target-account-status">
        <span class="badge-active">Active</span>
      </div>
    `;

    twItem.addEventListener('click', () => {
      if (selectedAccountIds.has(twAccount.id)) {
        selectedAccountIds.delete(twAccount.id);
        twItem.classList.remove('selected');
        twItem.querySelector('.chk-box').innerHTML = '';
      } else {
        selectedAccountIds.add(twAccount.id);
        twItem.classList.add('selected');
        twItem.querySelector('.chk-box').innerHTML = '<i data-lucide="check"></i>';
      }
      updateSelectedCount();
      lucide.createIcons();
    });
    accountsListEl.appendChild(twItem);
  } else {
    const twItem = document.createElement('div');
    twItem.className = 'target-account-card platform-twitter account-item-twitter unconnected';
    twItem.id = 'accountItemTwitter';
    twItem.innerHTML = `
      <div class="target-account-left">
        <div class="target-account-icon" style="background: #000; border: 1px solid rgba(255,255,255,0.2);">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        </div>
        <div class="target-account-info">
          <div class="target-account-name">X (Twitter)</div>
          <div class="target-account-sub">Not connected</div>
        </div>
      </div>
      <div class="target-account-status">
        <button class="btn-card-connect" type="button">
          <i data-lucide="link"></i> <span>Connect</span>
        </button>
      </div>
    `;
    twItem.addEventListener('click', () => {
      connectTwitter();
    });
    accountsListEl.appendChild(twItem);
  }

  // 3. Facebook Page Card
  if (fbAccount) {
    selectedAccountIds.add(fbAccount.id);
    const fbItem = document.createElement('div');
    fbItem.className = 'target-account-card platform-facebook account-item-facebook selected';
    fbItem.id = 'accountItemFacebook';
    fbItem.innerHTML = `
      <div class="target-account-left">
        <div class="chk-box"><i data-lucide="check"></i></div>
        <img src="${fbAccount.avatar || 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/600px-Facebook_Logo_%282019%29.png'}" class="target-account-avatar" alt="${fbAccount.name}"/>
        <div class="target-account-info">
          <div class="target-account-name">
            <span class="social-logo social-logo-facebook">f</span>
            <span>Facebook Page</span>
          </div>
          <div class="target-account-sub" title="${fbAccount.name}">${fbAccount.name}</div>
        </div>
      </div>
      <div class="target-account-status">
        <span class="badge-active">Active</span>
      </div>
    `;

    fbItem.addEventListener('click', () => {
      if (selectedAccountIds.has(fbAccount.id)) {
        selectedAccountIds.delete(fbAccount.id);
        fbItem.classList.remove('selected');
        fbItem.querySelector('.chk-box').innerHTML = '';
      } else {
        selectedAccountIds.add(fbAccount.id);
        fbItem.classList.add('selected');
        fbItem.querySelector('.chk-box').innerHTML = '<i data-lucide="check"></i>';
      }
      updateSelectedCount();
      lucide.createIcons();
    });
    accountsListEl.appendChild(fbItem);
  } else {
    const fbItem = document.createElement('div');
    fbItem.className = 'target-account-card platform-facebook account-item-facebook unconnected';
    fbItem.id = 'accountItemFacebook';
    fbItem.innerHTML = `
      <div class="target-account-left">
        <div class="target-account-icon" style="background: #1877f2;">
          <span class="social-logo social-logo-facebook">f</span>
        </div>
        <div class="target-account-info">
          <div class="target-account-name">Facebook Page</div>
          <div class="target-account-sub">Not connected</div>
        </div>
      </div>
      <div class="target-account-status">
        <button class="btn-card-connect" type="button">
          <i data-lucide="link"></i> <span>Connect</span>
        </button>
      </div>
    `;
    fbItem.addEventListener('click', () => {
      connectFacebook();
    });
    accountsListEl.appendChild(fbItem);
  }

  // 4. Instagram Business Card
  if (igAccount) {
    selectedAccountIds.add(igAccount.id);
    const igItem = document.createElement('div');
    igItem.className = 'target-account-card platform-instagram account-item-instagram selected';
    igItem.id = 'accountItemInstagram';
    igItem.innerHTML = `
      <div class="target-account-left">
        <div class="chk-box"><i data-lucide="check"></i></div>
        <img src="${igAccount.avatar || 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/600px-Instagram_icon.png'}" class="target-account-avatar" alt="${igAccount.name}"/>
        <div class="target-account-info">
          <div class="target-account-name">
            <span class="social-logo social-logo-instagram">◎</span>
            <span>Instagram Business</span>
          </div>
          <div class="target-account-sub" title="${igAccount.name}">${igAccount.name}</div>
        </div>
      </div>
      <div class="target-account-status">
        <span class="badge-active">Active</span>
      </div>
    `;

    igItem.addEventListener('click', () => {
      if (selectedAccountIds.has(igAccount.id)) {
        selectedAccountIds.delete(igAccount.id);
        igItem.classList.remove('selected');
        igItem.querySelector('.chk-box').innerHTML = '';
      } else {
        selectedAccountIds.add(igAccount.id);
        igItem.classList.add('selected');
        igItem.querySelector('.chk-box').innerHTML = '<i data-lucide="check"></i>';
      }
      updateSelectedCount();
      lucide.createIcons();
    });
    accountsListEl.appendChild(igItem);
  } else {
    const igItem = document.createElement('div');
    igItem.className = 'target-account-card platform-instagram account-item-instagram unconnected';
    igItem.id = 'accountItemInstagram';
    igItem.innerHTML = `
      <div class="target-account-left">
        <div class="target-account-icon" style="background: linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045);">
          <span class="social-logo social-logo-instagram">◎</span>
        </div>
        <div class="target-account-info">
          <div class="target-account-name">Instagram</div>
          <div class="target-account-sub">Not connected</div>
        </div>
      </div>
      <div class="target-account-status">
        <button class="btn-card-connect" type="button">
          <i data-lucide="link"></i> <span>Connect</span>
        </button>
      </div>
    `;
    igItem.addEventListener('click', () => {
      connectInstagram();
    });
    accountsListEl.appendChild(igItem);
  }

  // 5. Any additional connected custom accounts
  connectedAccounts.forEach(acc => {
    const p = (acc.platform || '').toLowerCase();
    if (p !== 'linkedin' && p !== 'twitter' && p !== 'x' && p !== 'facebook' && p !== 'instagram') {
      selectedAccountIds.add(acc.id);
      const otherItem = document.createElement('div');
      otherItem.className = 'target-account-card selected';
      otherItem.innerHTML = `
        <div class="target-account-left">
          <div class="chk-box"><i data-lucide="check"></i></div>
          <div class="target-account-info">
            <div class="target-account-name">${acc.platform}</div>
            <div class="target-account-sub" title="${acc.name}">${acc.name}</div>
          </div>
        </div>
        <div class="target-account-status">
          <span class="badge-active">Active</span>
        </div>
      `;
      otherItem.addEventListener('click', () => {
        if (selectedAccountIds.has(acc.id)) {
          selectedAccountIds.delete(acc.id);
          otherItem.classList.remove('selected');
          otherItem.querySelector('.chk-box').innerHTML = '';
        } else {
          selectedAccountIds.add(acc.id);
          otherItem.classList.add('selected');
          otherItem.querySelector('.chk-box').innerHTML = '<i data-lucide="check"></i>';
        }
        updateSelectedCount();
        lucide.createIcons();
      });
      accountsListEl.appendChild(otherItem);
    }
  });

  updateSelectedCount();
  lucide.createIcons();
}

function renderDashboardAccountsSummary() {
  const liAccount = getActiveLinkedInAccount();
  const twAccount = getActiveTwitterAccount();
  const fbAccount = getActiveFacebookAccount();
  const igAccount = getActiveInstagramAccount();

  let html = '';

  // LinkedIn summary box
  if (liAccount) {
    html += `
      <div class="linkedin-connection-box connected" style="width: 100%;">
        <div class="li-info-left">
          <div class="li-badge-icon">
            <span class="social-logo social-logo-linkedin">in</span>
          </div>
          <div>
            <div class="li-connected-title">
              <span>LinkedIn account connected</span>
              <span style="font-size: 0.75rem; background: rgba(16,185,129,0.2); color: #10b981; padding: 2px 8px; border-radius: 12px;">Connected</span>
            </div>
            <div class="li-connected-meta">${liAccount.name} • Ready to publish</div>
          </div>
        </div>
        <button class="btn-disconnect-li" onclick="disconnectLinkedIn()">
          <i data-lucide="unlink" style="width: 14px; height: 14px;"></i> Disconnect
        </button>
      </div>
    `;
  } else {
    html += `
      <div class="linkedin-connection-box not-connected" style="width: 100%;">
        <div class="li-info-left">
          <div class="li-badge-icon" style="background: rgba(10, 102, 194, 0.2); color: #38bdf8;">
            <span class="social-logo social-logo-linkedin">in</span>
          </div>
          <div>
            <div class="li-connected-title">LinkedIn Not Connected</div>
            <div class="li-connected-meta">Authorize EkPost to publish and schedule posts to your LinkedIn profile.</div>
          </div>
        </div>
        <button class="btn-connect-li" onclick="connectLinkedIn()">
          <span class="social-logo social-logo-linkedin social-logo-small">in</span> Connect LinkedIn
        </button>
      </div>
    `;
  }

  // X (Twitter) summary box
  if (twAccount) {
    html += `
      <div class="twitter-connection-box connected" style="width: 100%;">
        <div class="tw-info-left">
          <div class="tw-badge-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </div>
          <div>
            <div class="tw-connected-title">
              <span>X (Twitter) account connected</span>
              <span style="font-size: 0.75rem; background: rgba(16,185,129,0.2); color: #10b981; padding: 2px 8px; border-radius: 12px;">Connected</span>
            </div>
            <div class="tw-connected-meta">${twAccount.name} • Ready to tweet</div>
          </div>
        </div>
        <button class="btn-disconnect-tw" onclick="disconnectTwitter()">
          <i data-lucide="unlink" style="width: 14px; height: 14px;"></i> Disconnect
        </button>
      </div>
    `;
  } else {
    html += `
      <div class="twitter-connection-box not-connected" style="width: 100%;">
        <div class="tw-info-left">
          <div class="tw-badge-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </div>
          <div>
            <div class="tw-connected-title">X (Twitter) Not Connected</div>
            <div class="tw-connected-meta">Authorize EkPost to publish tweets to your X account.</div>
          </div>
        </div>
        <button class="btn-connect-tw" onclick="connectTwitter()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px;"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> Connect X
        </button>
      </div>
    `;
  }

  // Facebook summary box
  if (fbAccount) {
    html += `
      <div class="meta-connection-box connected" style="width: 100%;">
        <div class="meta-info-left">
          <div class="meta-badge-icon" style="background: rgba(24,119,242,0.2); color: #60a5fa;">
            <span class="social-logo social-logo-facebook">f</span>
          </div>
          <div>
            <div class="meta-connected-title">
              <span>Facebook account connected</span>
              <span style="font-size: 0.75rem; background: rgba(16,185,129,0.2); color: #10b981; padding: 2px 8px; border-radius: 12px;">Connected</span>
            </div>
            <div class="meta-connected-meta">${fbAccount.name} • Ready to publish</div>
          </div>
        </div>
        <button class="btn-disconnect-meta" onclick="disconnectMeta()">
          <i data-lucide="unlink" style="width: 14px; height: 14px;"></i> Disconnect
        </button>
      </div>
    `;
  } else {
    html += `
      <div class="meta-connection-box not-connected" style="width: 100%;">
        <div class="meta-info-left">
          <div class="meta-badge-icon" style="background: rgba(24,119,242,0.2); color: #60a5fa;">
            <span class="social-logo social-logo-facebook">f</span>
          </div>
          <div>
            <div class="meta-connected-title">Facebook Not Connected</div>
            <div class="meta-connected-meta">Authorize EkPost to publish posts directly to your Facebook Pages.</div>
          </div>
        </div>
        <button class="btn-connect-meta btn-connect-facebook" onclick="connectFacebook()">
          <span class="social-logo social-logo-facebook">f</span> Connect Facebook
        </button>
      </div>
    `;
  }

  // Instagram summary box
  if (igAccount) {
    html += `
      <div class="meta-connection-box connected" style="width: 100%;">
        <div class="meta-info-left">
          <div class="meta-badge-icon" style="background: linear-gradient(135deg, rgba(131,58,180,0.25), rgba(225,48,108,0.25), rgba(252,176,69,0.25)); color: #f472b6;">
            <span class="social-logo social-logo-instagram">◎</span>
          </div>
          <div>
            <div class="meta-connected-title">
              <span>Instagram account connected</span>
              <span style="font-size: 0.75rem; background: rgba(16,185,129,0.2); color: #10b981; padding: 2px 8px; border-radius: 12px;">Connected</span>
            </div>
            <div class="meta-connected-meta">${igAccount.name} • Ready to publish</div>
          </div>
        </div>
        <button class="btn-disconnect-meta" onclick="disconnectMeta()">
          <i data-lucide="unlink" style="width: 14px; height: 14px;"></i> Disconnect
        </button>
      </div>
    `;
  } else {
    html += `
      <div class="meta-connection-box not-connected" style="width: 100%;">
        <div class="meta-info-left">
          <div class="meta-badge-icon" style="background: linear-gradient(135deg, rgba(131,58,180,0.25), rgba(225,48,108,0.25), rgba(252,176,69,0.25)); color: #f472b6;">
            <span class="social-logo social-logo-instagram">◎</span>
          </div>
          <div>
            <div class="meta-connected-title">Instagram Not Connected</div>
            <div class="meta-connected-meta">Authorize EkPost to publish posts directly to your Instagram Business account.</div>
          </div>
        </div>
        <button class="btn-connect-meta btn-connect-instagram" onclick="connectInstagram()">
          <span class="social-logo social-logo-instagram">◎</span> Connect Instagram
        </button>
      </div>
    `;
  }

  dbAccountsSummary.innerHTML = html;
  lucide.createIcons();
}

function renderSettingsAccounts() {
  if (connectedAccounts.length === 0) {
    settingsAccountsList.innerHTML = `
      <div style="padding: 1rem; text-align: center;">
        <p class="empty-state" style="margin-bottom: 0.75rem;">No social media accounts connected yet.</p>
        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
          <button class="btn-connect-li" onclick="connectLinkedIn()">
            <span class="social-logo social-logo-linkedin social-logo-small">in</span> Connect LinkedIn
          </button>
          <button class="btn-connect-tw" onclick="connectTwitter()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px;"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> Connect X
          </button>
          <button class="btn-connect-meta" onclick="connectFacebook()">
            <span class="social-logo social-logo-facebook">f</span> Connect Facebook
          </button>
          <button class="btn-connect-meta" onclick="connectInstagram()">
            <span class="social-logo social-logo-instagram">◎</span> Connect Instagram via Meta
          </button>
        </div>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  settingsAccountsList.innerHTML = connectedAccounts.map(acc => {
    const p = (acc.platform || '').toLowerCase();
    const isTw = p === 'twitter' || p === 'x';
    const isFb = p === 'facebook';
    const isIg = p === 'instagram';
    
    let iconHtml = `<i data-lucide="${p}" style="width:18px;height:18px;"></i>`;
    let bgColor = '#0a66c2';
    let disconnectFn = `disconnectAccount('${acc.id}')`;

    if (isTw) {
      iconHtml = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
      bgColor = '#000000';
      disconnectFn = 'disconnectTwitter()';
    } else if (isFb) {
      iconHtml = `<span class="social-logo social-logo-facebook">f</span>`;
      bgColor = '#1877f2';
      disconnectFn = 'disconnectMeta()';
    } else if (isIg) {
      iconHtml = `<span class="social-logo social-logo-instagram">◎</span>`;
      bgColor = 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)';
      disconnectFn = 'disconnectMeta()';
    } else if (p === 'linkedin') {
      disconnectFn = 'disconnectLinkedIn()';
    }

    return `
      <div class="setting-account-row" style="margin-bottom: 0.75rem;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:36px; height:36px; border-radius:50%; background:${bgColor}; display:flex; align-items:center; justify-content:center; color:white; border: 1px solid rgba(255,255,255,0.2);">
            ${iconHtml}
          </div>
          <div>
            <div style="font-weight:700; font-size:0.9rem;">${acc.name}</div>
            <div style="font-size:0.75rem; color:#10b981;">Connected (${acc.platform.toUpperCase()})</div>
          </div>
        </div>
        <button class="btn-disconnect-li" onclick="${disconnectFn}">
          Disconnect
        </button>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function updateSelectedCount() {
  const label = currentLang === 'mr' ? 'खाती निवडली' : 'selected';
  selectedCountEl.textContent = `${selectedAccountIds.size} ${label}`;
}

async function handlePublishOrSchedule() {
  const content = postContentInput.value.trim();
  const mediaUrl = mediaUrlInput.value.trim();
  const isSchedule = scheduleToggle.checked;
  const scheduledAt = scheduleDateTimeInput.value;
  const dict = translations[currentLang] || translations.en;

  if (selectedAccountIds.size === 0) {
    showToast('Please select at least one connected social account to publish.', 'error');
    return;
  }

  if (!content) {
    showToast('Write your post text before publishing.', 'error');
    postContentInput.focus();
    return;
  }

  // Twitter Character Limit check
  const selectedAccounts = connectedAccounts.filter(a => selectedAccountIds.has(a.id));
  const hasTwitter = selectedAccounts.some(a => (a.platform || '').toLowerCase() === 'twitter' || (a.platform || '').toLowerCase() === 'x');
  if (hasTwitter && content.length > 280) {
    const proceed = confirm(`Notice: Your post is ${content.length} characters. X (Twitter) has a 280 character limit and will be trimmed to 280 characters for X. Proceed with publishing?`);
    if (!proceed) return;
  }

  // Instagram Image Requirement check
  const hasInstagram = selectedAccounts.some(a => (a.platform || '').toLowerCase() === 'instagram');
  if (hasInstagram && !mediaUrl) {
    showToast(currentLang === 'mr' ? 'इन्स्टाग्रामसाठी फोटो किंवा व्हिडिओ जोडणे आवश्यक आहे.' : 'Instagram requires an image or video URL to publish. Please attach media or deselect Instagram.', 'error');
    mediaUrlInput.focus();
    return;
  }

  if (hasInstagram && !/^https:\/\//i.test(mediaUrl)) {
    showToast(currentLang === 'mr' ? 'इन्स्टाग्रामसाठी सार्वजनिक HTTPS मीडिया URL आवश्यक आहे.' : 'Instagram requires a publicly accessible HTTPS media URL.', 'error');
    mediaUrlInput.focus();
    return;
  }

  const endpoint = isSchedule ? '/api/posts/schedule' : '/api/posts/publish';
  const payload = {
    content,
    mediaUrl,
    accountIds: Array.from(selectedAccountIds),
    ...(isSchedule ? { scheduledAt } : {})
  };

  publishBtn.disabled = true;
  publishBtnText.textContent = isSchedule ? dict.btn_scheduling : 'Publishing to all selected accounts...';

  try {
    const res = await fetchWithAuth(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      showToast(
        isSchedule 
          ? `Post scheduled successfully! (${new Date(scheduledAt).toLocaleString()})`
          : '🎉 Post published successfully to all selected channels!',
        'success'
      );
      
      postContentInput.value = '';
      mediaUrlInput.value = '';
      charCountEl.textContent = '0';
      updatePreviews('', '');
      
      await loadPosts();
      await loadAnalytics();
      navigateToView('history-view');
    } else {
      showToast(data.error || 'Failed to publish post.', 'error');
    }
  } catch (err) {
    showToast('Network error: ' + err.message, 'error');
  } finally {
    publishBtn.disabled = false;
    publishBtnText.textContent = isSchedule ? dict.label_schedule_toggle : dict.btn_publish_now;
  }
}

async function retryPost(postId) {
  showToast('Retrying post publishing...', 'success');
  try {
    const res = await fetchWithAuth(`/api/posts/${postId}/retry`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Post published successfully! 🚀', 'success');
      await loadPosts();
      await loadAnalytics();
    } else {
      showToast(data.error || 'Retry failed', 'error');
    }
  } catch (err) {
    showToast('Retry error: ' + err.message, 'error');
  }
}

async function handleAiGeneration() {
  const prompt = aiPromptInput.value.trim();
  const tone = aiToneSelect.value;

  if (!prompt) {
    showToast('Please enter a topic for AI.', 'error');
    return;
  }

  generateAiBtn.disabled = true;
  generateAiBtn.textContent = 'Generating Captions with AI...';

  try {
    const res = await fetchWithAuth('/api/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, tone })
    });

    const data = await res.json();
    if (data.success) {
      aiLiResult.textContent = data.captions.linkedin;
      aiTwResult.textContent = data.captions.twitter;
      aiIgResult.textContent = data.captions.instagram;
      aiResultsArea.classList.remove('hidden');
    } else {
      showToast(data.error || 'AI generation failed', 'error');
    }
  } catch (err) {
    showToast('AI Error: ' + err.message, 'error');
  } finally {
    generateAiBtn.disabled = false;
    generateAiBtn.innerHTML = '<i data-lucide="zap"></i> Generate Multi-Platform Captions';
    lucide.createIcons();
  }
}

async function generateAndInsertAI(topic, tone) {
  showToast(`Generating ${tone} caption...`, 'success');
  try {
    const res = await fetchWithAuth('/api/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt: topic, tone })
    });
    const data = await res.json();
    if (data.success) {
      postContentInput.value = data.captions.linkedin;
      charCountEl.textContent = postContentInput.value.length;
      updatePreviews(postContentInput.value, mediaUrlInput.value);
      showToast('AI Caption Loaded! 🚀', 'success');
    }
  } catch (e) {
    showToast('AI error', 'error');
  }
}

async function loadPosts() {
  const status = filterStatusSelect?.value || 'ALL';
  const platform = filterPlatformSelect?.value || 'ALL';

  try {
    const res = await fetchWithAuth(`/api/posts?status=${status}&platform=${platform}`);
    const data = await res.json();
    if (data.success && data.data) {
      allPosts = data.data;
      renderPosts(allPosts);
      renderDashboardPosts(allPosts);
      if (currentViewMode === 'calendar') renderCalendar();
    }
  } catch (err) {
    console.error('Failed to load posts:', err);
  }
}

function renderPosts(posts) {
  if (posts.length === 0) {
    postsHistoryList.innerHTML = '<p class="empty-state">No posts found matching the filters.</p>';
    return;
  }

  postsHistoryList.innerHTML = posts.map(post => `
    <div class="history-item">
      <div class="history-header">
        <span class="history-date">${new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${new Date(post.createdAt).toLocaleDateString()}</span>
        <span class="history-status-badge ${post.status}">${post.status}</span>
      </div>
      <div class="history-content">${post.content || '<em>[Media only]</em>'}</div>
      <div class="history-results">
        ${(post.results || []).map(r => `
          <span class="result-chip">
            ${r.status === 'SUCCESS' ? '✅' : '❌'} ${r.platform || 'Network'}
          </span>
        `).join('')}
        ${post.status === 'FAILED' || post.status === 'PARTIALLY_FAILED' ? `
          <button class="btn-retry-post" onclick="retryPost('${post.id}')">🔄 Retry</button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function renderDashboardPosts(posts) {
  const upcoming = posts.filter(p => p.status === 'SCHEDULED');
  const recent = posts.slice(0, 5);

  if (upcoming.length === 0) {
    dbUpcomingList.innerHTML = '<p class="empty-state">No upcoming scheduled posts.</p>';
  } else {
    dbUpcomingList.innerHTML = upcoming.map(p => `
      <div class="history-item">
        <div class="history-header">
          <span class="history-date">⏰ ${new Date(p.scheduledAt || p.createdAt).toLocaleString()}</span>
          <span class="history-status-badge SCHEDULED">SCHEDULED</span>
        </div>
        <div class="history-content">${p.content}</div>
      </div>
    `).join('');
  }

  if (recent.length === 0) {
    dbRecentList.innerHTML = '<p class="empty-state">No posts published yet.</p>';
  } else {
    dbRecentList.innerHTML = recent.map(p => `
      <div class="history-item">
        <div class="history-header">
          <span class="history-date">${new Date(p.createdAt).toLocaleDateString()}</span>
          <span class="history-status-badge ${p.status}">${p.status}</span>
        </div>
        <div class="history-content">${p.content}</div>
      </div>
    `).join('');
  }
}

function renderCalendar() {
  calendarDaysGrid.innerHTML = '';
  const daysInMonth = 30; // September 2026

  for (let i = 1; i <= daysInMonth; i++) {
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day-cell';
    dayCell.innerHTML = `<span class="day-num">${i} Sep</span>`;

    const matchingPosts = allPosts.filter(p => {
      const d = new Date(p.scheduledAt || p.createdAt);
      return d.getDate() === i;
    });

    matchingPosts.forEach(p => {
      const pill = document.createElement('div');
      pill.className = 'day-event-pill';
      pill.title = p.content;
      pill.textContent = `${p.status === 'PUBLISHED' ? '✅' : '⏰'} ${p.content.slice(0, 14)}...`;
      dayCell.appendChild(pill);
    });

    calendarDaysGrid.appendChild(dayCell);
  }
}

async function loadAnalytics() {
  try {
    const res = await fetchWithAuth('/api/analytics');
    const data = await res.json();
    if (data.success) {
      dbStatTotalPublished.textContent = data.summary.publishedPosts;
      dbStatUpcoming.textContent = data.summary.scheduledPosts;
      dbStatReach.textContent = data.summary.impressions;
      dbStatActiveChannels.textContent = connectedAccounts.length;
    }
  } catch (err) {
    console.error('Failed to load analytics:', err);
  }
}

// Global functions for inline HTML calls
window.retryPost = retryPost;
window.disconnectAccount = disconnectAccount;

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  setTimeout(() => toast.classList.add('hidden'), 4000);
}
