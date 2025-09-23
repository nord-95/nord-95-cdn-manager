'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useFileView } from '@/contexts/FileViewContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUpdate } from '@/contexts/UpdateContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { PWAStatus } from '@/components/PWAStatus';
import { formatDate } from '@/utils/date';
import { 
  User, 
  Mail, 
  Shield, 
  Palette, 
  Bell, 
  Key,
  Save,
  Eye,
  EyeOff,
  List,
  Grid3X3,
  Globe,
  RefreshCw
} from 'lucide-react';
import { authenticatedFetch } from '@/lib/api';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { fileView, setFileView } = useFileView();
  const { language, setLanguage, t } = useLanguage();
  const { updateInfo, isCheckingForUpdates, checkForUpdates, refreshApp, dismissUpdate } = useUpdate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    cdnUpdates: true,
    securityAlerts: true,
  });

  // Profile settings
  const [profile, setProfile] = useState({
    displayName: '',
    email: '',
  });

  useEffect(() => {
    if (user) {
      setProfile({
        displayName: user.displayName || '',
        email: user.email || '',
      });
    }
  }, [user]);

  useEffect(() => {
    // Load notification settings
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    }
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    toast({
      title: "Theme Updated",
      description: `Switched to ${newTheme} theme`,
    });
  };

  const handleNotificationChange = (key: keyof typeof notifications, value: boolean) => {
    const newNotifications = { ...notifications, [key]: value };
    setNotifications(newNotifications);
    localStorage.setItem('notifications', JSON.stringify(newNotifications));
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authenticatedFetch('/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: profile.displayName,
        }),
      });

      if (response.ok) {
        await refreshUser();
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully",
        });
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateApiKey = async () => {
    try {
      const response = await authenticatedFetch('/api/users/api-key', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "API Key Generated",
          description: "New API key has been generated",
        });
      } else {
        throw new Error('Failed to generate API key');
      }
    } catch (error) {
      console.error('Error generating API key:', error);
      toast({
        title: "Error",
        description: "Failed to generate API key",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={profile.displayName}
                  onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Your display name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-gray-50 dark:bg-gray-800"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Email cannot be changed. Contact support if needed.
                </p>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account
            </CardTitle>
            <CardDescription>
              Your account information and permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Role</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user.role === 'SUPER_ADMIN' ? 'Super Administrator' : 'User'}
                </p>
              </div>
              <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium">
                {user.role}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">CDN Access</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user.cdnIds.length} CDN{user.cdnIds.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Member Since</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(user.createdAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t('settings.language')}
            </CardTitle>
            <CardDescription>
              {t('settings.selectLanguage')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Button
                  variant={language === 'en' ? 'default' : 'outline'}
                  onClick={() => setLanguage('en')}
                  className="flex items-center gap-2"
                >
                  <span className="text-lg">🇺🇸</span>
                  {t('settings.english')}
                </Button>
                <Button
                  variant={language === 'ro' ? 'default' : 'outline'}
                  onClick={() => setLanguage('ro')}
                  className="flex items-center gap-2"
                >
                  <span className="text-lg">🇷🇴</span>
                  {t('settings.romanian')}
                </Button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {language === 'en' 
                  ? 'The interface will be displayed in English.'
                  : 'Interfața va fi afișată în română.'
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Update Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Updates
            </CardTitle>
            <CardDescription>
              Check for and install the latest version of the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {/* Current Version Info */}
              {updateInfo && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Current Version:</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {updateInfo.currentVersion.substring(0, 8)}...
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Build Time:</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(updateInfo.currentBuildTime).toLocaleString()}
                    </span>
                  </div>
                  {updateInfo.hasUpdate && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        Update Available:
                      </span>
                      <span className="text-sm text-green-600 dark:text-green-400">
                        Yes
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Update Actions */}
              <div className="flex items-center space-x-4">
                <Button
                  onClick={checkForUpdates}
                  disabled={isCheckingForUpdates}
                  className="flex items-center gap-2"
                  data-update-check
                >
                  <RefreshCw className={`h-4 w-4 ${isCheckingForUpdates ? 'animate-spin' : ''}`} />
                  {isCheckingForUpdates ? 'Checking...' : 'Check for Updates'}
                </Button>
                
                {updateInfo?.hasUpdate && (
                  <>
                    <Button
                      onClick={refreshApp}
                      variant="default"
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Install Update
                    </Button>
                    <Button
                      onClick={dismissUpdate}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      Dismiss
                    </Button>
                  </>
                )}
              </div>

              {/* Update Status Message */}
              {updateInfo && (
                <div className={`text-sm p-3 rounded-lg ${
                  updateInfo.hasUpdate 
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                    : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                }`}>
                  {updateInfo.message}
                </div>
              )}

              {/* Help Text */}
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <p className="mb-2">
                  <strong>How updates work:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Updates are automatically detected when you visit the app</li>
                  <li>Click &quot;Check for Updates&quot; to manually check for new versions</li>
                  <li>Click &quot;Install Update&quot; to refresh and get the latest version</li>
                  <li>Your data and settings are preserved during updates</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize the look and feel of the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>Theme</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'System' },
                ].map((option) => (
                  <Button
                    key={option.value}
                    variant={theme === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleThemeChange(option.value as 'light' | 'dark' | 'system')}
                    className="w-full"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File View Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              File View
            </CardTitle>
            <CardDescription>
              Choose how files are displayed by default
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>Default View</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'list', label: 'List', icon: List },
                  { value: 'grid', label: 'Grid', icon: Grid3X3 },
                ].map((option) => (
                  <Button
                    key={option.value}
                    variant={fileView === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFileView(option.value as 'list' | 'grid')}
                    className="w-full flex items-center gap-2"
                  >
                    <option.icon className="h-4 w-4" />
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Choose what notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive updates via email
                </p>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={(checked) => handleNotificationChange('email', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">CDN Updates</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Notifications about CDN changes
                </p>
              </div>
              <Switch
                checked={notifications.cdnUpdates}
                onCheckedChange={(checked) => handleNotificationChange('cdnUpdates', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Security Alerts</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Important security notifications
                </p>
              </div>
              <Switch
                checked={notifications.securityAlerts}
                onCheckedChange={(checked) => handleNotificationChange('securityAlerts', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* PWA Status */}
        <PWAStatus />

        {/* API Key Management */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Access
            </CardTitle>
            <CardDescription>
              Manage your API keys for programmatic access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="apiKey"
                    value={showApiKey ? "sk-1234567890abcdef" : "••••••••••••••••"}
                    disabled
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Keep your API key secure and never share it publicly
                </p>
              </div>
              <Button onClick={generateApiKey} variant="outline">
                Generate New Key
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
