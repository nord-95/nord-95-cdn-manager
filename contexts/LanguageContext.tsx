'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ro';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation files
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.settings': 'Settings',
    'nav.signOut': 'Sign out',
    
    // Dashboard
    'dashboard.title': 'CDN Manager',
    'dashboard.subtitle': 'Manage your Cloudflare R2-backed CDNs',
    'dashboard.createCDN': 'Create CDN',
    'dashboard.noCDNs': 'No CDNs found',
    'dashboard.createFirst': 'Create your first CDN to get started',
    
    // CDN Page
    'cdn.files': 'Files',
    'cdn.access': 'Access',
    'cdn.settings': 'Settings',
    'cdn.audit': 'Audit',
    'cdn.deleteCDN': 'Delete CDN',
    'cdn.publicURL': 'Public URL',
    'cdn.bucket': 'Bucket',
    'cdn.prefix': 'Prefix',
    'cdn.uploadFiles': 'Drop files here or click to upload',
    'cdn.noFiles': 'No files uploaded yet',
    'cdn.preview': 'Preview',
    'cdn.copyURL': 'Copy URL',
    'cdn.download': 'Download',
    'cdn.delete': 'Delete',
    'cdn.deleteFile': 'Delete File',
    'cdn.deleteFileConfirm': 'Type DELETE to confirm:',
    'cdn.deleteFileWarning': 'This action cannot be undone. This will permanently delete the file.',
    'cdn.fileToDelete': 'File to be deleted:',
    'cdn.cancel': 'Cancel',
    'cdn.deleting': 'Deleting...',
    
    // Access Control
    'access.title': 'Access Control',
    'access.subtitle': 'Manage user access to this CDN',
    'access.addUser': 'Add User',
    'access.userEmail': 'Enter user email',
    'access.add': 'Add',
    'access.adding': 'Adding...',
    'access.users': 'Users',
    'access.remove': 'Remove',
    'access.noUsers': 'No users have access to this CDN',
    
    // Settings
    'settings.title': 'CDN Settings',
    'settings.subtitle': 'Configure CDN settings and preferences',
    'settings.name': 'Name',
    'settings.publicBase': 'Public Base URL',
    'settings.bucket': 'Bucket',
    'settings.prefix': 'Prefix',
    'settings.update': 'Update',
    'settings.updating': 'Updating...',
    'settings.language': 'Language',
    'settings.selectLanguage': 'Select Language',
    'settings.english': 'English',
    'settings.romanian': 'Romanian',
    
    // Audit Logs
    'audit.title': 'Audit Logs',
    'audit.subtitle': 'View activity logs for this CDN',
    'audit.noLogs': 'No audit logs found',
    'audit.user': 'User',
    
    // Account Settings
    'account.title': 'Account',
    'account.subtitle': 'Your account information and permissions',
    'account.role': 'Role',
    'account.cdnAccess': 'CDN Access',
    'account.memberSince': 'Member Since',
    'account.superAdmin': 'Super Administrator',
    'account.user': 'User',
    
    // Theme Settings
    'theme.title': 'Theme',
    'theme.subtitle': 'Customize the appearance of the application',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.system': 'System',
    
    // File View Settings
    'fileView.title': 'File View',
    'fileView.subtitle': 'Choose how files are displayed',
    'fileView.list': 'List View',
    'fileView.grid': 'Grid View',
    
    // API Key Management
    'apiKey.title': 'API Key Management',
    'apiKey.subtitle': 'Generate and manage your API keys',
    'apiKey.generate': 'Generate New Key',
    'apiKey.generating': 'Generating...',
    'apiKey.copy': 'Copy',
    'apiKey.regenerate': 'Regenerate',
    'apiKey.regenerating': 'Regenerating...',
    
    // PWA Status
    'pwa.title': 'PWA Status',
    'pwa.subtitle': 'Information about the Progressive Web App installation',
    'pwa.installationStatus': 'Installation Status',
    'pwa.installed': 'Installed',
    'pwa.notInstalled': 'Not Installed',
    'pwa.displayMode': 'Display Mode',
    'pwa.standaloneApp': 'Standalone App',
    'pwa.browserTab': 'Browser Tab',
    'pwa.networkStatus': 'Network Status',
    'pwa.online': 'Online',
    'pwa.offline': 'Offline',
    'pwa.installHint': 'Look for an "Install" button in your browser\'s address bar or menu to add this app to your device.',
    
    // Login/Register
    'auth.signIn': 'Sign in',
    'auth.signUp': 'Create Account',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.signingIn': 'Signing in...',
    'auth.creatingAccount': 'Creating Account...',
    'auth.dontHaveAccount': 'Don\'t have an account?',
    'auth.alreadyHaveAccount': 'Already have an account?',
    'auth.createOne': 'Create one',
    'auth.signInHere': 'Sign in',
    'auth.enterEmailPassword': 'Enter your email and password to access the CDN Manager',
    'auth.signUpDescription': 'Sign up to access the CDN Manager',
    
    // Common
    'common.success': 'Success',
    'common.error': 'Error',
    'common.loading': 'Loading...',
    'common.copied': 'Copied',
    'common.close': 'Close',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.download': 'Download',
    'common.upload': 'Upload',
    'common.copy': 'Copy',
    'common.refresh': 'Refresh',
  },
  ro: {
    // Navigation
    'nav.dashboard': 'Panou de Control',
    'nav.settings': 'Setări',
    'nav.signOut': 'Deconectare',
    
    // Dashboard
    'dashboard.title': 'Manager CDN',
    'dashboard.subtitle': 'Gestionează CDN-urile tale bazate pe Cloudflare R2',
    'dashboard.createCDN': 'Creează CDN',
    'dashboard.noCDNs': 'Nu au fost găsite CDN-uri',
    'dashboard.createFirst': 'Creează primul tău CDN pentru a începe',
    
    // CDN Page
    'cdn.files': 'Fișiere',
    'cdn.access': 'Acces',
    'cdn.settings': 'Setări',
    'cdn.audit': 'Audit',
    'cdn.deleteCDN': 'Șterge CDN',
    'cdn.publicURL': 'URL Public',
    'cdn.bucket': 'Bucket',
    'cdn.prefix': 'Prefix',
    'cdn.uploadFiles': 'Trage fișierele aici sau apasă pentru a încărca',
    'cdn.noFiles': 'Nu au fost încărcate fișiere',
    'cdn.preview': 'Previzualizare',
    'cdn.copyURL': 'Copiază URL',
    'cdn.download': 'Descarcă',
    'cdn.delete': 'Șterge',
    'cdn.deleteFile': 'Șterge Fișier',
    'cdn.deleteFileConfirm': 'Tastează DELETE pentru a confirma:',
    'cdn.deleteFileWarning': 'Această acțiune nu poate fi anulată. Aceasta va șterge permanent fișierul.',
    'cdn.fileToDelete': 'Fișierul care va fi șters:',
    'cdn.cancel': 'Anulează',
    'cdn.deleting': 'Se șterge...',
    
    // Access Control
    'access.title': 'Controlul Accesului',
    'access.subtitle': 'Gestionează accesul utilizatorilor la acest CDN',
    'access.addUser': 'Adaugă Utilizator',
    'access.userEmail': 'Introdu email-ul utilizatorului',
    'access.add': 'Adaugă',
    'access.adding': 'Se adaugă...',
    'access.users': 'Utilizatori',
    'access.remove': 'Elimină',
    'access.noUsers': 'Niciun utilizator nu are acces la acest CDN',
    
    // Settings
    'settings.title': 'Setări CDN',
    'settings.subtitle': 'Configurează setările și preferințele CDN-ului',
    'settings.name': 'Nume',
    'settings.publicBase': 'URL de Bază Public',
    'settings.bucket': 'Bucket',
    'settings.prefix': 'Prefix',
    'settings.update': 'Actualizează',
    'settings.updating': 'Se actualizează...',
    'settings.language': 'Limbă',
    'settings.selectLanguage': 'Selectează Limba',
    'settings.english': 'Engleză',
    'settings.romanian': 'Română',
    
    // Audit Logs
    'audit.title': 'Jurnale de Audit',
    'audit.subtitle': 'Vezi jurnalele de activitate pentru acest CDN',
    'audit.noLogs': 'Nu au fost găsite jurnale de audit',
    'audit.user': 'Utilizator',
    
    // Account Settings
    'account.title': 'Cont',
    'account.subtitle': 'Informațiile și permisiunile contului tău',
    'account.role': 'Rol',
    'account.cdnAccess': 'Acces CDN',
    'account.memberSince': 'Membru din',
    'account.superAdmin': 'Super Administrator',
    'account.user': 'Utilizator',
    
    // Theme Settings
    'theme.title': 'Temă',
    'theme.subtitle': 'Personalizează aspectul aplicației',
    'theme.light': 'Luminos',
    'theme.dark': 'Întunecat',
    'theme.system': 'Sistem',
    
    // File View Settings
    'fileView.title': 'Vizualizare Fișiere',
    'fileView.subtitle': 'Alege cum sunt afișate fișierele',
    'fileView.list': 'Vizualizare Listă',
    'fileView.grid': 'Vizualizare Grilă',
    
    // API Key Management
    'apiKey.title': 'Gestionarea Cheilor API',
    'apiKey.subtitle': 'Generează și gestionează cheile tale API',
    'apiKey.generate': 'Generează Cheie Nouă',
    'apiKey.generating': 'Se generează...',
    'apiKey.copy': 'Copiază',
    'apiKey.regenerate': 'Regenerează',
    'apiKey.regenerating': 'Se regenerează...',
    
    // PWA Status
    'pwa.title': 'Status PWA',
    'pwa.subtitle': 'Informații despre instalarea Progressive Web App',
    'pwa.installationStatus': 'Status Instalare',
    'pwa.installed': 'Instalat',
    'pwa.notInstalled': 'Neinstalat',
    'pwa.displayMode': 'Mod Afișare',
    'pwa.standaloneApp': 'Aplicație Standalone',
    'pwa.browserTab': 'Tab Browser',
    'pwa.networkStatus': 'Status Rețea',
    'pwa.online': 'Online',
    'pwa.offline': 'Offline',
    'pwa.installHint': 'Caută un buton "Instalare" în bara de adresă sau meniul browserului pentru a adăuga această aplicație pe dispozitivul tău.',
    
    // Login/Register
    'auth.signIn': 'Conectare',
    'auth.signUp': 'Creează Cont',
    'auth.email': 'Email',
    'auth.password': 'Parolă',
    'auth.confirmPassword': 'Confirmă Parola',
    'auth.signingIn': 'Se conectează...',
    'auth.creatingAccount': 'Se creează contul...',
    'auth.dontHaveAccount': 'Nu ai cont?',
    'auth.alreadyHaveAccount': 'Ai deja cont?',
    'auth.createOne': 'Creează unul',
    'auth.signInHere': 'Conectează-te',
    'auth.enterEmailPassword': 'Introdu email-ul și parola pentru a accesa Managerul CDN',
    'auth.signUpDescription': 'Înregistrează-te pentru a accesa Managerul CDN',
    
    // Common
    'common.success': 'Succes',
    'common.error': 'Eroare',
    'common.loading': 'Se încarcă...',
    'common.copied': 'Copiat',
    'common.close': 'Închide',
    'common.save': 'Salvează',
    'common.cancel': 'Anulează',
    'common.delete': 'Șterge',
    'common.edit': 'Editează',
    'common.view': 'Vezi',
    'common.download': 'Descarcă',
    'common.upload': 'Încarcă',
    'common.copy': 'Copiază',
    'common.refresh': 'Actualizează',
  },
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ro')) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Save language to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
