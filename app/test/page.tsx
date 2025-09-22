'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestPage() {
  const [status, setStatus] = useState<{
    firebase: 'loading' | 'success' | 'error';
    r2: 'loading' | 'success' | 'error';
    api: 'loading' | 'success' | 'error';
  }>({
    firebase: 'loading',
    r2: 'loading',
    api: 'loading',
  });

  useEffect(() => {
    // Test Firebase connection
    const testFirebase = async () => {
      try {
        const { auth } = await import('@/lib/firebase/client');
        setStatus(prev => ({ ...prev, firebase: 'success' }));
      } catch (error) {
        console.error('Firebase test failed:', error);
        setStatus(prev => ({ ...prev, firebase: 'error' }));
      }
    };

    // Test R2 connection
    const testR2 = async () => {
      try {
        const { r2 } = await import('@/lib/r2');
        const client = r2();
        setStatus(prev => ({ ...prev, r2: 'success' }));
      } catch (error) {
        console.error('R2 test failed:', error);
        setStatus(prev => ({ ...prev, r2: 'error' }));
      }
    };

    // Test API connection
    const testAPI = async () => {
      try {
        const response = await fetch('/api/auth/me');
        setStatus(prev => ({ ...prev, api: response.ok ? 'success' : 'error' }));
      } catch (error) {
        console.error('API test failed:', error);
        setStatus(prev => ({ ...prev, api: 'error' }));
      }
    };

    testFirebase();
    testR2();
    testAPI();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold dark:text-white">System Status</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Component Tests</CardTitle>
          <CardDescription>Testing core system components</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="dark:text-white">Firebase Client</span>
            <span className={`flex items-center space-x-2 ${getStatusColor(status.firebase)}`}>
              <span>{getStatusIcon(status.firebase)}</span>
              <span className="capitalize">{status.firebase}</span>
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="dark:text-white">R2 Client</span>
            <span className={`flex items-center space-x-2 ${getStatusColor(status.r2)}`}>
              <span>{getStatusIcon(status.r2)}</span>
              <span className="capitalize">{status.r2}</span>
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="dark:text-white">API Routes</span>
            <span className={`flex items-center space-x-2 ${getStatusColor(status.api)}`}>
              <span>{getStatusIcon(status.api)}</span>
              <span className="capitalize">{status.api}</span>
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>Check if all required environment variables are set</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="dark:text-white">Firebase API Key:</span>
              <span className={process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'text-green-600' : 'text-red-600'}>
                {process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="dark:text-white">R2 Access Key:</span>
              <span className={process.env.R2_ACCESS_KEY_ID ? 'text-green-600' : 'text-red-600'}>
                {process.env.R2_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="dark:text-white">Super Admin Domains:</span>
              <span className={process.env.SUPERADMIN_ALLOWED_DOMAINS ? 'text-green-600' : 'text-red-600'}>
                {process.env.SUPERADMIN_ALLOWED_DOMAINS ? '✅ Set' : '❌ Missing'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
