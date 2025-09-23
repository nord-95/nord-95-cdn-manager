'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  GitCommit, 
  User, 
  Calendar, 
  Code, 
  RefreshCw,
  ExternalLink,
  CheckCircle,
  Clock,
  Shield
} from 'lucide-react';
import { authenticatedFetch } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

interface Release {
  id: string;
  commitHash: string;
  commitMessage: string;
  branch: string;
  author: string;
  timestamp: string;
  version?: string;
  features?: string[];
  changes?: string[];
  createdAt: string;
  deployedAt: string;
  status: string;
}

export default function ReleasesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [releases, setReleases] = useState<Release[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const { toast } = useToast();

  // Check if user is super admin
  useEffect(() => {
    if (!authLoading && user && user.role !== 'SUPER_ADMIN') {
      toast({
        title: "Access Denied",
        description: "This page is only available to super administrators.",
        variant: "destructive",
      });
      router.push('/dashboard');
    }
  }, [user, authLoading, router, toast]);

  const fetchReleases = useCallback(async (refresh = false) => {
    // Only fetch if user is super admin
    if (!user || user.role !== 'SUPER_ADMIN') {
      return;
    }

    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await authenticatedFetch('/api/releases?limit=20');
      if (response.ok) {
        const data = await response.json();
        setReleases(data.releases);
        setTotal(data.total);
        setHasMore(data.hasMore);
      } else {
        throw new Error('Failed to fetch releases');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch releases",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast, user]);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'deployed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'deployed':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Deployed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show access denied if not super admin
  if (user && user.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              This page is only available to super administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Releases</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Track all deployments and version history
          </p>
        </div>
        <Button 
          onClick={() => fetchReleases(true)} 
          disabled={isRefreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6">
        {releases.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <GitCommit className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No releases found
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Releases will appear here after deployments
              </p>
            </CardContent>
          </Card>
        ) : (
          releases.map((release) => (
            <Card key={release.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <GitCommit className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-lg">{release.commitMessage.split('\n')[0]}</span>
                    </CardTitle>
                    <CardDescription className="mt-2">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Code className="h-4 w-4" />
                          {release.commitHash.substring(0, 8)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {release.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(release.deployedAt)}
                        </span>
                      </div>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(release.status)}
                    {getStatusBadge(release.status)}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {/* Features */}
                  {release.features && release.features.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Features
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        {release.features.map((feature, index) => (
                          <li key={index}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Changes */}
                  {release.changes && release.changes.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-1">
                        <RefreshCw className="h-4 w-4" />
                        Changes
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        {release.changes.map((change, index) => (
                          <li key={index}>{change}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Full commit message */}
                  <div>
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Full Commit Message
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md text-sm font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {release.commitMessage}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                      <span>Branch: {release.branch}</span>
                      {release.version && <span>Version: {release.version}</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      <span>Deployed {formatDate(release.deployedAt)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {hasMore && (
        <div className="text-center">
          <Button variant="outline" onClick={() => fetchReleases()}>
            Load More Releases
          </Button>
        </div>
      )}

      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        Showing {releases.length} of {total} releases
      </div>
    </div>
  );
}
