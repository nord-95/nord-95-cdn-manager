'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { authenticatedFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Cloud, 
  Home, 
  LogOut, 
  Menu, 
  Settings, 
  User,
  Sun,
  Moon,
  Monitor,
  ChevronRight,
  GitCommit
} from 'lucide-react';
import Link from 'next/link';
import { SearchBar } from '@/components/SearchBar';

interface CDN {
  id: string;
  name: string;
  publicBase: string;
  bucket: string;
  prefix?: string;
  createdAt: string;
  ownerId: string;
  allowedUsers: string[];
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, signOut } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [cdns, setCdns] = useState<CDN[]>([]);
  const [isLoadingCdns, setIsLoadingCdns] = useState(false);

  const fetchCdns = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingCdns(true);
    try {
      const response = await authenticatedFetch('/api/cdns');
      if (response.ok) {
        const data = await response.json();
        setCdns(data.cdns || []);
      }
    } catch (error) {
      console.error('Error fetching CDNs:', error);
    } finally {
      setIsLoadingCdns(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && !isLoading) {
      fetchCdns();
    }
  }, [user, isLoading, fetchCdns]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <Cloud className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
                <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">CDN Manager</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Navigation Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="h-4 w-4 mr-2" />
                    Menu
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center">
                      <Home className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/releases" className="flex items-center">
                      <GitCommit className="mr-2 h-4 w-4" />
                      Releases
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <span className="hidden sm:inline text-sm text-gray-700 dark:text-gray-300">
                {user.email} ({user.role})
              </span>
              <span className="sm:hidden text-xs text-gray-700 dark:text-gray-300 truncate max-w-20">
                {user.role}
              </span>
              
              {/* Theme Toggle */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    {resolvedTheme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme('light')}>
                    <Sun className="mr-2 h-4 w-4" />
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('dark')}>
                    <Moon className="mr-2 h-4 w-4" />
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('system')}>
                    <Monitor className="mr-2 h-4 w-4" />
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* CDN Sidebar */}
          <div className="w-full lg:w-64 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">CDNs</h3>
                <Link href="/dashboard">
                  <Button size="sm" variant="outline">
                    <Cloud className="h-4 w-4 mr-1" />
                    New
                  </Button>
                </Link>
              </div>
              
              {isLoadingCdns ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : cdns.length === 0 ? (
                <div className="text-center py-8">
                  <Cloud className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No CDNs found</p>
                  <Link href="/dashboard">
                    <Button size="sm" variant="outline" className="mt-2">
                      Create CDN
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {cdns.map((cdn) => {
                    const isActive = pathname.includes(`/cdn/${cdn.id}`);
                    return (
                      <Link
                        key={cdn.id}
                        href={`/cdn/${cdn.id}`}
                        className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <Cloud className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{cdn.name}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 flex-shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </div>
      
      {/* Search Bar */}
      <SearchBar />
    </div>
  );
}
