import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Lang = 'en' | 'ur';

const translations = {
    en: {
        // ── Splash ──
        tagline: 'SAFETY FIRST FOR ALL',

        // ── Language / Role Screen ──
        getStartedTitle: 'GET\nSTARTED',
        getStartedSub: 'Choose your language and role to continue',
        selectLanguage: 'SELECT LANGUAGE',
        selectRole: 'SELECT YOUR ROLE',
        iAmPassenger: 'I am a Passenger',
        passengerSub: 'Book rides safely',
        iAmDriver: 'I am a Driver',
        driverSub: 'Earn on your route',
        continueBtn: 'Continue →',

        // ── Login ──
        welcomeBack: 'WELCOME\nBACK',
        signInSub: 'Sign in to your SAFORA account',
        passengerLogin: '🔒 PASSENGER LOGIN',
        phoneOtpTab: '📱  Phone OTP',
        emailTab: '✉️  Email',
        phoneNumberLabel: 'PHONE NUMBER',
        getOtp: 'Get OTP →',
        emailAddressLabel: 'EMAIL ADDRESS',
        passwordLabel: 'PASSWORD',
        forgotPassword: 'Forgot Password?',
        loginBtn: 'Login →',
        orDivider: 'or',
        noAccount: "Don't have an account?",
        registerLink: 'Register',
        agreeTerms: 'I agree to the',
        safetyTerms: 'Safety Terms',
        and: 'and',
        privacyPolicy: 'Privacy Policy',
        ofSafora: 'of SAFORA.',

        // ── OTP ──
        verifyTitle: 'VERIFY\nNUMBER',
        codeSentTo: 'Code sent to',
        codeExpires: 'Code expires in',
        resendOtp: 'Resend OTP',
        verifyBtn: 'Verify & Continue ✓',
        devModeLabel: 'DEV MODE — Tap to auto-fill OTP:',

        // ── Register ──
        joinTitle: 'JOIN\nSAFORA',
        joinSub: 'Safe, affordable rides — register below',
        createAccountBadge: '📋 CREATE ACCOUNT',
        fullNameLabel: 'Full Name',
        fullNamePlaceholder: 'Enter your full name',
        emailPlaceholder: 'you@example.com',
        phonePlaceholder: '+92 300 1234567',
        genderLabel: 'GENDER',
        male: 'Male',
        female: 'Female',
        other: 'Other',
        passwordPlaceholder: 'Minimum 8 characters',
        confirmPasswordLabel: 'Confirm Password',
        confirmPasswordPlaceholder: 'Re-enter your password',
        acceptTerms: 'I accept the',
        termsAndConditions: 'Terms & Conditions',
        createAccountBtn: 'Create Account',
        alreadyHaveAccount: 'Already have an account?',
        loginLink: 'Login',

        // ── Home ──
        welcomeUser: 'Welcome',
        whereTo: 'Where would you like to go today?',
        searchPlaceholder: 'Search destination...',
        homeQuick: 'Home',
        workQuick: 'Work',
        pinkPassQuick: 'Pink Pass',

        // ── Ride Selection ──
        chooseRide: 'CHOOSE RIDE',
        availableOptions: 'AVAILABLE OPTIONS',
        cashPayment: 'Cash Payment',
        addPromoCode: 'Add Promo Code',
        confirm: 'Confirm',
        away: 'away',
        popular: 'POPULAR',

        // ── Tracking ──
        driverArriving: 'Driver Arriving',
        youAreOnboard: "You're Onboard",
        dropped: 'Dropped Off',
        sos: 'SOS',

        // ── Safety ──
        safetyCenter: 'SAFETY CENTER',
        emergency: 'EMERGENCY',
        holdForEmergency: 'Hold for emergency',
        sosActiveLabel: 'Tap to cancel',
        sosBanner: '🚨 SOS ACTIVE — Contacts Notified',
        sosBannerSub: 'Your live location is being shared',
        sentinelActive: 'SafetySentinel Active',
        sentinelSub: 'Monitoring route deviations in real-time',
        emergencyContacts: 'EMERGENCY CONTACTS',
        addContact: '+ Add',
        cancelAdd: '✕ Cancel',
        saveContact: 'Save Contact',
        safetyTips: 'SAFETY TIPS',
        tip1: 'Always verify driver details before boarding',
        tip2: 'Share your trip details with trusted contacts',
        tip3: 'Sit in the back seat for easier exit',
        tip4: 'Keep location services ON during rides',
        noContacts: 'No emergency contacts added',
        noContactsSub: 'Add contacts to notify in case of SOS',
        confirmSos: '🚨 Send SOS Alert?',
        sosConfirmMsg: 'This will immediately notify all your emergency contacts and the SAFORA safety team with your live location.',
        sendSos: 'SEND SOS',
        cancelSos: 'Cancel SOS',
        keepActive: 'Keep Active',
        removeContact: 'Remove this emergency contact?',

        // ── Profile ──
        profileTitle: 'PROFILE',
        completedRides: 'Completed',
        rating: 'Rating',
        saved: 'Saved',
        emailInfo: 'EMAIL',
        phoneInfo: 'PHONE',
        pinkPassMenu: 'Pink Pass',
        pinkPassSub: 'Female safety verification',
        notificationsMenu: 'Notifications',
        notificationsSub: 'Alert preferences',
        safetyCenterMenu: 'Safety Center',
        safetyMenuSub: 'Emergency contacts & SOS',
        paymentMenu: 'Payment Methods',
        paymentSub: 'Cash, Card, Wallet',
        historyMenu: 'Ride History',
        historySub: 'Your past trips',
        helpMenu: 'Help & Support',
        helpSub: 'FAQs and contact us',
        logoutBtn: 'Logout',
        logoutConfirm: 'Are you sure you want to logout?',
        cancel: 'Cancel',

        // ── Ride History ──
        rideHistoryTitle: 'RIDE HISTORY',
        allFilter: 'All',
        completedFilter: 'Completed',
        cancelledFilter: 'Cancelled',
        totalSpent: 'Total Spent',
        noRidesFound: 'No rides found',
        completedBadge: '✓ Completed',
        cancelledBadge: '✕ Cancelled',

        // ── Driver Dashboard ──
        today: 'TODAY',
        trips: 'TRIPS',
        rating2: 'RATING',
        offline: 'OFFLINE',
        online: 'ONLINE',
        newRequest: 'NEW RIDE REQUEST',
        accept: 'ACCEPT',
        decline: 'DECLINE',
    },

    ur: {
        // ── Splash ──
        tagline: 'سب کے لیے حفاظت پہلے',

        // ── Language / Role Screen ──
        getStartedTitle: 'شروع\nکریں',
        getStartedSub: 'آگے بڑھنے کے لیے زبان اور کردار منتخب کریں',
        selectLanguage: 'زبان منتخب کریں',
        selectRole: 'اپنا کردار منتخب کریں',
        iAmPassenger: 'میں مسافر ہوں',
        passengerSub: 'محفوظ سواری بک کریں',
        iAmDriver: 'میں ڈرائیور ہوں',
        driverSub: 'اپنے راستے پر کمائیں',
        continueBtn: 'جاری رکھیں ←',

        // ── Login ──
        welcomeBack: 'خوش آمدید\nواپس',
        signInSub: 'اپنے سفورا اکاؤنٹ میں سائن ان کریں',
        passengerLogin: '🔒 مسافر لاگ ان',
        phoneOtpTab: '📱  فون OTP',
        emailTab: '✉️  ای میل',
        phoneNumberLabel: 'فون نمبر',
        getOtp: 'OTP حاصل کریں ←',
        emailAddressLabel: 'ای میل ایڈریس',
        passwordLabel: 'پاس ورڈ',
        forgotPassword: 'پاس ورڈ بھول گئے؟',
        loginBtn: 'لاگ ان ←',
        orDivider: 'یا',
        noAccount: 'اکاؤنٹ نہیں؟',
        registerLink: 'رجسٹر',
        agreeTerms: 'میں متفق ہوں',
        safetyTerms: 'حفاظتی شرائط',
        and: 'اور',
        privacyPolicy: 'رازداری پالیسی',
        ofSafora: 'سفورا کی۔',

        // ── OTP ──
        verifyTitle: 'نمبر\nتصدیق',
        codeSentTo: 'کوڈ بھیجا گیا',
        codeExpires: 'کوڈ ختم ہو گا',
        resendOtp: 'OTP دوبارہ بھیجیں',
        verifyBtn: 'تصدیق کریں ✓',
        devModeLabel: 'ڈیو موڈ — OTP خودکار بھریں:',

        // ── Register ──
        joinTitle: 'سفورا\nجوائن',
        joinSub: 'محفوظ، سستی سواری — نیچے رجسٹر کریں',
        createAccountBadge: '📋 اکاؤنٹ بنائیں',
        fullNameLabel: 'پورا نام',
        fullNamePlaceholder: 'اپنا پورا نام درج کریں',
        emailPlaceholder: 'آپ@مثال.com',
        phonePlaceholder: '+92 300 1234567',
        genderLabel: 'جنس',
        male: 'مرد',
        female: 'خاتون',
        other: 'دیگر',
        passwordPlaceholder: 'کم از کم 8 حروف',
        confirmPasswordLabel: 'پاس ورڈ کی تصدیق',
        confirmPasswordPlaceholder: 'پاس ورڈ دوبارہ درج کریں',
        acceptTerms: 'میں قبول کرتا ہوں',
        termsAndConditions: 'شرائط و ضوابط',
        createAccountBtn: 'اکاؤنٹ بنائیں',
        alreadyHaveAccount: 'پہلے سے اکاؤنٹ ہے؟',
        loginLink: 'لاگ ان',

        // ── Home ──
        welcomeUser: 'خوش آمدید',
        whereTo: 'آج کہاں جانا ہے؟',
        searchPlaceholder: 'منزل تلاش کریں...',
        homeQuick: 'گھر',
        workQuick: 'دفتر',
        pinkPassQuick: 'پنک پاس',

        // ── Ride Selection ──
        chooseRide: 'سواری منتخب کریں',
        availableOptions: 'دستیاب آپشنز',
        cashPayment: 'نقد ادائیگی',
        addPromoCode: 'پرومو کوڈ شامل کریں',
        confirm: 'تصدیق',
        away: 'دور',
        popular: 'مشہور',

        // ── Tracking ──
        driverArriving: 'ڈرائیور آ رہا ہے',
        youAreOnboard: 'آپ سفر میں ہیں',
        dropped: 'پہنچ گئے',
        sos: 'ایس او ایس',

        // ── Safety ──
        safetyCenter: 'حفاظتی مرکز',
        emergency: 'ہنگامی',
        holdForEmergency: 'ہنگامی صورت میں دبائیں',
        sosActiveLabel: 'منسوخ کرنے کے لیے ٹیپ کریں',
        sosBanner: '🚨 SOS فعال — رابطوں کو اطلاع دے دی گئی',
        sosBannerSub: 'آپ کی لائیو لوکیشن شیئر ہو رہی ہے',
        sentinelActive: 'سیف‌ٹی‌سینٹینل فعال',
        sentinelSub: 'ریئل ٹائم میں راستہ نگرانی',
        emergencyContacts: 'ہنگامی رابطے',
        addContact: '+ شامل کریں',
        cancelAdd: '✕ منسوخ',
        saveContact: 'رابطہ محفوظ کریں',
        safetyTips: 'حفاظتی مشورے',
        tip1: 'سوار ہونے سے پہلے ڈرائیور کی تفصیلات چیک کریں',
        tip2: 'اپنے سفر کی تفصیلات قابل اعتماد افراد سے شیئر کریں',
        tip3: 'آسان اخراج کے لیے پچھلی نشست پر بیٹھیں',
        tip4: 'سواری کے دوران لوکیشن سروس آن رکھیں',
        noContacts: 'کوئی ہنگامی رابطہ نہیں',
        noContactsSub: 'SOS کی صورت میں اطلاع کے لیے رابطے شامل کریں',
        confirmSos: '🚨 SOS الرٹ بھیجیں؟',
        sosConfirmMsg: 'یہ آپ کے تمام ہنگامی رابطوں اور سفورا سیفٹی ٹیم کو فوری طور پر آپ کی لائیو لوکیشن کے ساتھ مطلع کرے گا۔',
        sendSos: 'SOS بھیجیں',
        cancelSos: 'SOS منسوخ',
        keepActive: 'فعال رکھیں',
        removeContact: 'یہ ہنگامی رابطہ ہٹائیں؟',

        // ── Profile ──
        profileTitle: 'پروفائل',
        completedRides: 'مکمل',
        rating: 'ریٹنگ',
        saved: 'محفوظ',
        emailInfo: 'ای میل',
        phoneInfo: 'فون',
        pinkPassMenu: 'پنک پاس',
        pinkPassSub: 'خواتین کی حفاظتی تصدیق',
        notificationsMenu: 'اطلاعات',
        notificationsSub: 'الرٹ ترجیحات',
        safetyCenterMenu: 'حفاظتی مرکز',
        safetyMenuSub: 'ہنگامی رابطے اور SOS',
        paymentMenu: 'ادائیگی کے طریقے',
        paymentSub: 'نقد، کارڈ، والیٹ',
        historyMenu: 'سواری کی تاریخ',
        historySub: 'آپ کے پچھلے سفر',
        helpMenu: 'مدد اور سپورٹ',
        helpSub: 'عام سوالات اور ہم سے رابطہ',
        logoutBtn: 'لاگ آؤٹ',
        logoutConfirm: 'کیا آپ واقعی لاگ آؤٹ کرنا چاہتے ہیں؟',
        cancel: 'منسوخ',

        // ── Ride History ──
        rideHistoryTitle: 'سواری کی تاریخ',
        allFilter: 'سب',
        completedFilter: 'مکمل',
        cancelledFilter: 'منسوخ',
        totalSpent: 'کل خرچ',
        noRidesFound: 'کوئی سواری نہیں ملی',
        completedBadge: '✓ مکمل',
        cancelledBadge: '✕ منسوخ',

        // ── Driver Dashboard ──
        today: 'آج',
        trips: 'سفر',
        rating2: 'ریٹنگ',
        offline: 'آف لائن',
        online: 'آن لائن',
        newRequest: 'نئی سواری کی درخواست',
        accept: 'قبول',
        decline: 'رد',
    },
};

export type Translations = typeof translations.en;

interface LanguageContextType {
    lang: Lang;
    setLang: (lang: Lang) => void;
    t: Translations;
    isUrdu: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
    lang: 'en',
    setLang: () => {},
    t: translations.en,
    isUrdu: false,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [lang, setLangState] = useState<Lang>('en');

    useEffect(() => {
        AsyncStorage.getItem('@safora_language').then(saved => {
            if (saved === 'ur' || saved === 'en') setLangState(saved);
        });
    }, []);

    const setLang = async (newLang: Lang) => {
        setLangState(newLang);
        await AsyncStorage.setItem('@safora_language', newLang);
    };

    return (
        <LanguageContext.Provider value={{
            lang,
            setLang,
            t: translations[lang],
            isUrdu: lang === 'ur',
        }}>
            {children}
        </LanguageContext.Provider>
    );
};
