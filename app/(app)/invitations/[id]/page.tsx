'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  ArrowLeft,
  Copy,
  ExternalLink,
  Calendar,
  Users,
  FileText,
  Clock,
  Download,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import { authenticatedFetch } from '@/lib/api';
import { formatDate } from '@/utils/date';
import { InviteDocument, UploadDocument, InviteStatus } from '@/lib/validators/invites';

export default function InvitationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const inviteId = params.id as string;
  
  const [invite, setInvite] = useState<InviteDocument | null>(null);
  const [uploads, setUploads] = useState<UploadDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUploads, setIsLoadingUploads] = useState(false);
  const [cdn, setCdn] = useState<any>(null);

  const fetchInvite = useCallback(async () => {
    try {
      const response = await authenticatedFetch(`/api/invites/${inviteId}`);
      if (response.ok) {
        const data = await response.json();
        setInvite(data);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch invitation details",
          variant: "destructive",
        });
        router.push('/invitations');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch invitation details",
        variant: "destructive",
      });
      router.push('/invitations');
    } finally {
      setIsLoading(false);
    }
  }, [inviteId, toast, router]);

  const fetchUploads = useCallback(async () => {
    if (!inviteId) return;
    
    setIsLoadingUploads(true);
    try {
      const response = await authenticatedFetch(`/api/invites/${inviteId}/uploads`);
      if (response.ok) {
        const data = await response.json();
        setUploads(data.uploads || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch uploads",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch uploads",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUploads(false);
    }
  }, [inviteId, toast]);

  const fetchCDN = useCallback(async () => {
    if (!invite?.cdnId) return;
    
    try {
      const response = await authenticatedFetch(`/api/cdns/${invite.cdnId}`);
      if (response.ok) {
        const data = await response.json();
        setCdn(data);
      }
    } catch (error) {
      console.error('Error fetching CDN:', error);
    }
  }, [invite?.cdnId]);

  useEffect(() => {
    fetchInvite();
  }, [fetchInvite]);

  useEffect(() => {
    if (invite) {
      fetchUploads();
      fetchCDN();
    }
  }, [invite, fetchUploads, fetchCDN]);

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

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Success",
        description: "URL copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy URL",
        variant: "destructive",
      });
    }
  };

  const getFileUrl = (upload: UploadDocument) => {
    if (cdn?.publicBase) {
      return `${cdn.publicBase}/${upload.key}`;
    }
    return `/api/cdns/${invite?.cdnId}/files/${encodeURIComponent(upload.key)}/sign-get`;
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

  if (!invite) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Invitation not found
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          The invitation you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Button asChild>
          <Link href="/invitations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invitations
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild>
            <Link href="/invitations">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {invite.label}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Upload invitation details and history
            </p>
          </div>
        </div>
        {getStatusBadge(invite.status)}
      </div>

      {/* Invitation Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invitation Details</CardTitle>
            <CardDescription>
              Configuration and status information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-900 dark:text-white">CDN:</span>
                <p className="text-gray-600 dark:text-gray-400">{cdn?.name || 'Unknown'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Status:</span>
                <div className="mt-1">{getStatusBadge(invite.status)}</div>
              </div>
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Uses:</span>
                <p className="text-gray-600 dark:text-gray-400">
                  {invite.remainingUses}/{invite.maxUses || '∞'}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Max Size:</span>
                <p className="text-gray-600 dark:text-gray-400">
                  {formatFileSize(invite.maxSizeBytes)}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Expires:</span>
                <p className="text-gray-600 dark:text-gray-400">
                  {formatDate(invite.expiresAt)}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Created:</span>
                <p className="text-gray-600 dark:text-gray-400">
                  {formatDate(invite.createdAt)}
                </p>
              </div>
            </div>
            
            {invite.notes && (
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Notes:</span>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{invite.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Allowed Types</CardTitle>
            <CardDescription>
              File types and extensions allowed for upload
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="font-medium text-gray-900 dark:text-white">MIME Types:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {invite.allowedMimeTypes.map((type) => (
                  <Badge key={type} variant="outline">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-900 dark:text-white">Extensions:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {invite.allowedExtensions.map((ext) => (
                  <Badge key={ext} variant="outline">
                    .{ext}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-900 dark:text-white">Upload Prefix:</span>
              <p className="text-gray-600 dark:text-gray-400 font-mono text-sm mt-1">
                {invite.uploadPrefix}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Uploads */}
      <Card>
        <CardHeader>
          <CardTitle>Upload History</CardTitle>
          <CardDescription>
            Files uploaded through this invitation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUploads ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : uploads.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No uploads yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Files uploaded through this invitation will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {uploads.map((upload, index) => (
                <div
                  key={`${upload.key}-${index}`}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {upload.key.split('/').pop()}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>{formatFileSize(upload.size)}</span>
                        <span>{upload.contentType}</span>
                        <span>{formatDate(upload.uploadedAt)}</span>
                        {upload.ip && <span>IP: {upload.ip}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={upload.status === 'SUCCESS' ? 'default' : 'destructive'}>
                      {upload.status}
                    </Badge>
                    {upload.status === 'SUCCESS' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyUrl(getFileUrl(upload))}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy URL
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a href={getFileUrl(upload)} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Open
                          </a>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
