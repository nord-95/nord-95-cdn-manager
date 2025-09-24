'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
  Clock,
  AlertCircle,
  Download
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { InviteMetadata } from '@/lib/validators/invites';

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  result?: {
    publicUrl?: string;
    signedUrl?: string;
    key: string;
  };
}

export default function PublicInvitePage() {
  const params = useParams();
  const { toast } = useToast();
  const token = params.token as string;
  
  const [invite, setInvite] = useState<InviteMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [isRevoked, setIsRevoked] = useState(false);
  const [isExhausted, setIsExhausted] = useState(false);
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const fetchInviteMetadata = useCallback(async () => {
    try {
      const response = await fetch(`/api/invites/public/${token}`);
      if (response.ok) {
        const data = await response.json();
        setInvite(data);
        
        // Check if expired
        const expiresAt = new Date(data.expiresAt);
        const now = new Date();
        if (now > expiresAt) {
          setIsExpired(true);
        }
        
        // Check if revoked
        if (data.status === 'REVOKED') {
          setIsRevoked(true);
        }
        
        // Check if exhausted
        if (data.remainingUses <= 0 && data.maxUses !== null) {
          setIsExhausted(true);
        }
        
        // Calculate time remaining
        const timeDiff = expiresAt.getTime() - now.getTime();
        if (timeDiff > 0) {
          const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
          
          if (days > 0) {
            setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
          } else if (hours > 0) {
            setTimeRemaining(`${hours}h ${minutes}m`);
          } else {
            setTimeRemaining(`${minutes}m`);
          }
        } else {
          setIsExpired(true);
        }
      } else {
        toast({
          title: "Error",
          description: "Invalid invitation link",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load invitation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    fetchInviteMetadata();
  }, [fetchInviteMetadata]);

  const uploadFile = useCallback(async (fileUpload: UploadFile) => {
    try {
      // Update status to uploading
      setUploads(prev => prev.map(u => 
        u.id === fileUpload.id ? { ...u, status: 'uploading', progress: 0 } : u
      ));
      
      // Get POST policy
      const signResponse = await fetch(`/api/invites/public/${token}/sign-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentType: fileUpload.file.type,
          filename: fileUpload.file.name,
        }),
      });
      
      if (!signResponse.ok) {
        const error = await signResponse.json();
        throw new Error(error.error || 'Failed to get upload policy');
      }
      
      const { url, fields, key } = await signResponse.json();
      
      // Create form data for R2 upload
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
      formData.append('file', fileUpload.file);
      
      // Upload to R2
      const uploadResponse = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }
      
      // Get ETag from response headers
      const etag = uploadResponse.headers.get('etag');
      
      // Commit the upload
      const commitResponse = await fetch(`/api/invites/public/${token}/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key,
          size: fileUpload.file.size,
          contentType: fileUpload.file.type,
          extension: fileUpload.file.name.split('.').pop()?.toLowerCase() || '',
          etag,
        }),
      });
      
      if (!commitResponse.ok) {
        const error = await commitResponse.json();
        throw new Error(error.error || 'Failed to commit upload');
      }
      
      const result = await commitResponse.json();
      
      // Update status to success
      setUploads(prev => prev.map(u => 
        u.id === fileUpload.id ? { 
          ...u, 
          status: 'success', 
          progress: 100,
          result: {
            publicUrl: result.publicUrl,
            signedUrl: result.signedUrl,
            key: result.key,
          }
        } : u
      ));
      
      toast({
        title: "Success",
        description: `${fileUpload.file.name} uploaded successfully`,
      });
      
    } catch (error) {
      // Update status to error
      setUploads(prev => prev.map(u => 
        u.id === fileUpload.id ? { 
          ...u, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed'
        } : u
      ));
      
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : 'Upload failed',
        variant: "destructive",
      });
    }
  }, [token, toast]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!invite || isExpired || isRevoked || isExhausted) return;
    
    const newUploads: UploadFile[] = acceptedFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      progress: 0,
    }));
    
    setUploads(prev => [...prev, ...newUploads]);
    
    // Process each file
    newUploads.forEach(fileUpload => {
      uploadFile(fileUpload);
    });
  }, [invite, isExpired, isRevoked, isExhausted, uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: !invite || isExpired || isRevoked || isExhausted,
    accept: invite ? Object.fromEntries(
      invite.allowedMimeTypes.map(type => [type, invite.allowedExtensions.map(ext => `.${ext}`)])
    ) : undefined,
  });

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

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Invalid Invitation
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              This invitation link is invalid or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isDisabled = isExpired || isRevoked || isExhausted;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{invite.label}</CardTitle>
            <CardDescription>
              Upload files to {invite.cdnDisplayName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status and Info */}
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant={invite.status === 'ACTIVE' ? 'default' : 'destructive'}>
                {invite.status}
              </Badge>
              {timeRemaining && (
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  {timeRemaining} remaining
                </Badge>
              )}
              <Badge variant="outline">
                {invite.remainingUses}/{invite.maxUses || '∞'} uses
              </Badge>
              <Badge variant="outline">
                Max {formatFileSize(invite.maxSizeBytes)}
              </Badge>
            </div>

            {/* Error States */}
            {isExpired && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-red-700 dark:text-red-300">
                    This invitation has expired.
                  </p>
                </div>
              </div>
            )}

            {isRevoked && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-red-700 dark:text-red-300">
                    This invitation has been revoked.
                  </p>
                </div>
              </div>
            )}

            {isExhausted && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-red-700 dark:text-red-300">
                    This invitation has no remaining uses.
                  </p>
                </div>
              </div>
            )}

            {/* Upload Area */}
            {!isDisabled && (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  or click to select files
                </p>
                <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  <p>Allowed types: {invite.allowedMimeTypes.join(', ')}</p>
                  <p>Allowed extensions: .{invite.allowedExtensions.join(', .')}</p>
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {uploads.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Upload Progress
                </h3>
                {uploads.map((upload) => (
                  <div
                    key={upload.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {upload.file.name}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({formatFileSize(upload.file.size)})
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {upload.status === 'success' && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                        {upload.status === 'error' && (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        {upload.status === 'uploading' && (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        )}
                      </div>
                    </div>
                    
                    {upload.status === 'uploading' && (
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${upload.progress}%` }}
                        ></div>
                      </div>
                    )}
                    
                    {upload.status === 'error' && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {upload.error}
                      </p>
                    )}
                    
                    {upload.status === 'success' && upload.result && (
                      <div className="flex items-center space-x-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyUrl(upload.result!.publicUrl || upload.result!.signedUrl || '')}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy URL
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a
                            href={upload.result.publicUrl || upload.result.signedUrl || ''}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Open
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
