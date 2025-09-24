'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Cloud, ExternalLink, Users, Calendar } from 'lucide-react';
import Link from 'next/link';
import { authenticatedFetch } from '@/lib/api';
import { formatDate } from '@/utils/date';

interface CDN {
  id: string;
  name: string;
  publicBase: string;
  bucket: string;
  prefix: string;
  customDomain?: string;
  owners: string[];
  allowedUsers: string[];
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [cdns, setCdns] = useState<CDN[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Create CDN form state
  const [formData, setFormData] = useState({
    name: '',
    publicBase: '',
    bucket: '',
    prefix: '',
    customDomain: '',
  });

  const fetchCDNs = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/cdns');
      if (response.ok) {
        const data = await response.json();
        setCdns(data.cdns || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch CDNs",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch CDNs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCDNs();
  }, [fetchCDNs]);

  const handleCreateCDN = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await authenticatedFetch('/api/cdns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: "CDN created successfully",
        });
        setIsCreateDialogOpen(false);
        setFormData({ name: '', publicBase: '', bucket: '', prefix: '' });
        fetchCDNs();
        router.push(`/cdn/${result.id}`);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to create CDN",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create CDN",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your CDNs and files</p>
        </div>
        {user?.role === 'SUPER_ADMIN' && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add CDN
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New CDN</DialogTitle>
                <DialogDescription>
                  Add a new CDN to manage files and access.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateCDN} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="my-cdn"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="publicBase">Public Base URL</Label>
                  <Input
                    id="publicBase"
                    placeholder="https://pub-xxx.r2.dev"
                    value={formData.publicBase}
                    onChange={(e) => setFormData({ ...formData, publicBase: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bucket">Bucket Name</Label>
                  <Input
                    id="bucket"
                    placeholder="my-bucket"
                    value={formData.bucket}
                    onChange={(e) => setFormData({ ...formData, bucket: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prefix">Prefix (optional)</Label>
                  <Input
                    id="prefix"
                    placeholder="images"
                    value={formData.prefix}
                    onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customDomain">Custom Domain (optional)</Label>
                  <Input
                    id="customDomain"
                    placeholder="https://cdn.example.com"
                    value={formData.customDomain}
                    onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create CDN'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {cdns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Cloud className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No CDNs found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-4">
              {user?.role === 'SUPER_ADMIN' 
                ? 'Get started by creating your first CDN.'
                : 'You don\'t have access to any CDNs yet.'
              }
            </p>
            {user?.role === 'SUPER_ADMIN' && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create CDN
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {cdns.map((cdn) => (
            <Card key={cdn.id} className="hover:shadow-md dark:hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg dark:text-white">{cdn.name}</CardTitle>
                  <Link href={`/cdn/${cdn.id}`}>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <CardDescription className="dark:text-gray-400">{cdn.bucket}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-2">
                    <Cloud className="h-4 w-4" />
                    <span className="truncate">{cdn.publicBase}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>{cdn.allowedUsers.length} users</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(cdn.createdAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
