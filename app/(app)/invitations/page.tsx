'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { 
  Plus, 
  Mail, 
  Copy, 
  Eye, 
  Edit, 
  Trash2, 
  RotateCcw,
  ExternalLink,
  Calendar,
  Users,
  FileText,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { authenticatedFetch } from '@/lib/api';
import { formatDate } from '@/utils/date';
import { InviteDocument, InviteStatus, DEFAULT_ALLOWED_MIME_TYPES, DEFAULT_ALLOWED_EXTENSIONS } from '@/lib/validators/invites';

export default function InvitationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [invites, setInvites] = useState<InviteDocument[]>([]);
  const [inviteTokens, setInviteTokens] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InviteStatus | ''>('');

  // Create invite form state
  const [formData, setFormData] = useState({
    label: '',
    cdnId: '',
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    allowedExtensions: ['png', 'jpg', 'jpeg', 'webp'],
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
    maxUses: 10 as number | null,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // 7 days from now
    neverExpire: false,
    uploadPrefix: 'invites/{label}/{YYYY}/{MM}/{DD}/',
    notifyEmails: [] as string[],
    notes: '',
  });

  const [cdns, setCdns] = useState<any[]>([]);

  const fetchInvites = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery) params.append('q', searchQuery);
      
      const response = await authenticatedFetch(`/api/invites?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setInvites(data.invites || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch invitations",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch invitations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery, toast]);

  const fetchCDNs = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/cdns');
      if (response.ok) {
        const data = await response.json();
        setCdns(data.cdns || []);
      }
    } catch (error) {
      console.error('Error fetching CDNs:', error);
    }
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  useEffect(() => {
    fetchCDNs();
  }, [fetchCDNs]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await authenticatedFetch('/api/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          expiresAt: formData.neverExpire ? null : new Date(formData.expiresAt),
          maxUses: formData.maxUses || null,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Store the token for later copying
        setInviteTokens(prev => ({
          ...prev,
          [result.id]: result.token
        }));
        
        toast({
          title: "Success",
          description: "Invitation created successfully",
        });
        setIsCreateDialogOpen(false);
        setFormData({
          label: '',
          cdnId: '',
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
          allowedExtensions: ['png', 'jpg', 'jpeg', 'webp'],
          maxSizeBytes: 50 * 1024 * 1024,
          maxUses: 10 as number | null,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
          neverExpire: false,
          uploadPrefix: 'invites/{label}/{YYYY}/{MM}/{DD}/',
          notifyEmails: [],
          notes: '',
        });
        fetchInvites();
        
        // Show invite URL in a modal
        toast({
          title: "Invite URL Created",
          description: (
            <div className="space-y-2">
              <p>Your invite URL has been created:</p>
              <div className="flex items-center space-x-2">
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">
                  {result.inviteUrl}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(result.inviteUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ),
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to create invitation",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create invitation",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const response = await authenticatedFetch(`/api/invites/${inviteId}/revoke`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Invitation status updated",
        });
        fetchInvites();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update invitation",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update invitation",
        variant: "destructive",
      });
    }
  };

  const copyInviteUrl = async (inviteId: string) => {
    try {
      const token = inviteTokens[inviteId];
      if (token) {
        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cdn-manager.nord95.com'}/invite/${token}`;
        await navigator.clipboard.writeText(inviteUrl);
        toast({
          title: "Success",
          description: "Invite URL copied to clipboard",
        });
      } else {
        toast({
          title: "Error",
          description: "Invite URL not available. Please recreate the invitation.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy invite URL",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: InviteStatus) => {
    const variants = {
      ACTIVE: 'default',
      REVOKED: 'destructive',
      EXPIRED: 'secondary',
    } as const;

    return (
      <Badge variant={variants[status]}>
        {status}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Invitations</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage upload invitations for external users</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Invitation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Upload Invitation</DialogTitle>
              <DialogDescription>
                Create a time-limited invitation for external users to upload files.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateInvite} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="label">Label</Label>
                  <Input
                    id="label"
                    placeholder="Press Kit - Acme Corp"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cdnId">Target CDN</Label>
                  <select
                    id="cdnId"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    value={formData.cdnId}
                    onChange={(e) => setFormData({ ...formData, cdnId: e.target.value })}
                    required
                  >
                    <option value="">Select CDN</option>
                    {cdns.map((cdn) => (
                      <option key={cdn.id} value={cdn.id}>
                        {cdn.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Allowed MIME Types</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DEFAULT_ALLOWED_MIME_TYPES.map((mimeType) => (
                    <div key={mimeType} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`mime-${mimeType}`}
                        checked={formData.allowedMimeTypes.includes(mimeType)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              allowedMimeTypes: [...formData.allowedMimeTypes, mimeType]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              allowedMimeTypes: formData.allowedMimeTypes.filter(m => m !== mimeType)
                            });
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={`mime-${mimeType}`} className="text-sm">
                        {mimeType}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Allowed Extensions</Label>
                <div className="grid grid-cols-4 gap-2">
                  {DEFAULT_ALLOWED_EXTENSIONS.map((ext) => (
                    <div key={ext} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`ext-${ext}`}
                        checked={formData.allowedExtensions.includes(ext)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              allowedExtensions: [...formData.allowedExtensions, ext]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              allowedExtensions: formData.allowedExtensions.filter(e => e !== ext)
                            });
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={`ext-${ext}`} className="text-sm">
                        .{ext}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxSizeBytes">Max File Size (MB)</Label>
                  <Input
                    id="maxSizeBytes"
                    type="number"
                    value={formData.maxSizeBytes / (1024 * 1024)}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      maxSizeBytes: parseInt(e.target.value) * 1024 * 1024 
                    })}
                    min="1"
                    max="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxUses">Max Uses</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    value={formData.maxUses || ''}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value ? parseInt(e.target.value) : null })}
                    min="1"
                    placeholder="Unlimited if empty"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="neverExpire"
                    checked={formData.neverExpire}
                    onCheckedChange={(checked) => setFormData({ ...formData, neverExpire: checked })}
                  />
                  <Label htmlFor="neverExpire">Never Expire</Label>
                </div>
                {!formData.neverExpire && (
                  <div>
                    <Label htmlFor="expiresAt">Expires At</Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                      required
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="uploadPrefix">Upload Prefix</Label>
                <Input
                  id="uploadPrefix"
                  value={formData.uploadPrefix}
                  onChange={(e) => setFormData({ ...formData, uploadPrefix: e.target.value })}
                  placeholder="invites/{label}/{YYYY}/{MM}/{DD}/"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <textarea
                  id="notes"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Internal notes about this invitation..."
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
                  {isCreating ? 'Creating...' : 'Create Invitation'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search invitations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InviteStatus | '')}
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="REVOKED">Revoked</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {invites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No invitations found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-4">
              Create your first upload invitation to get started.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Invitation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {invites.map((invite) => (
            <Card key={invite.id} className="hover:shadow-md dark:hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg dark:text-white">{invite.label}</CardTitle>
                  {getStatusBadge(invite.status)}
                </div>
                <CardDescription className="dark:text-gray-400">
                  {cdns.find(cdn => cdn.id === invite.cdnId)?.name || 'Unknown CDN'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>{invite.remainingUses}/{invite.maxUses || '∞'} uses</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>{formatFileSize(invite.maxSizeBytes)} max</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(invite.expiresAt)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>{formatDate(invite.createdAt)}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyInviteUrl(invite.id)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Link
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRevokeInvite(invite.id)}
                  >
                    {invite.status === 'REVOKED' ? (
                      <>
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Revoke
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                  >
                    <Link href={`/invitations/${invite.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      View Uploads
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
