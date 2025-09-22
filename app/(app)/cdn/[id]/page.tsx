'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFileView } from '@/contexts/FileViewContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { 
  Copy, 
  Download, 
  Trash2, 
  Upload, 
  Users, 
  Settings, 
  FileText,
  ExternalLink,
  MoreVertical,
  List,
  Grid3X3
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { buildPublicUrl, copyToClipboard } from '@/utils/urls';
import { authenticatedFetch } from '@/lib/api';

interface CDN {
  id: string;
  name: string;
  publicBase: string;
  bucket: string;
  prefix: string;
  owners: string[];
  allowedUsers: string[];
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

interface FileObject {
  key: string;
  size: number;
  lastModified: string;
  etag: string;
}

export default function CDNPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { fileView, setFileView } = useFileView();
  const { toast } = useToast();
  const [cdn, setCdn] = useState<CDN | null>(null);
  const [files, setFiles] = useState<FileObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchCDN = useCallback(async () => {
    try {
      const response = await authenticatedFetch(`/api/cdns/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setCdn(data);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch CDN details",
          variant: "destructive",
        });
        router.push('/dashboard');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch CDN details",
        variant: "destructive",
      });
      router.push('/dashboard');
    }
  }, [params.id, router, toast]);

  const fetchFiles = useCallback(async () => {
    try {
      const response = await authenticatedFetch(`/api/cdns/${params.id}/files`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.objects || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch files",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch files",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [params.id, toast]);

  useEffect(() => {
    if (params.id) {
      fetchCDN();
      fetchFiles();
    }
  }, [params.id, fetchCDN, fetchFiles]);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Get presigned URL
      const signResponse = await authenticatedFetch(`/api/cdns/${params.id}/files/sign-put`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: file.name,
          contentType: file.type,
        }),
      });

      if (!signResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { signedUrl } = await signResponse.json();

      // Upload file directly to R2
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      toast({
        title: "Success",
        description: "File uploaded successfully",
      });

      // Refresh file list
      fetchFiles();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileDelete = async (key: string) => {
    try {
      const response = await authenticatedFetch(`/api/cdns/${params.id}/files/${key}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "File deleted successfully",
        });
        fetchFiles();
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const copyPublicUrl = async (key: string) => {
    if (!cdn) return;
    
    const publicUrl = buildPublicUrl(cdn.publicBase, key, cdn.prefix);
    await copyToClipboard(publicUrl);
    toast({
      title: "Copied",
      description: "Public URL copied to clipboard",
    });
  };

  const getSignedUrl = async (key: string) => {
    try {
      const response = await authenticatedFetch(`/api/cdns/${params.id}/files/sign-get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key }),
      });

      if (response.ok) {
        const { signedUrl } = await response.json();
        await copyToClipboard(signedUrl);
        toast({
          title: "Copied",
          description: "Signed URL copied to clipboard",
        });
      } else {
        throw new Error('Failed to get signed URL');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get signed URL",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading || !cdn) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{cdn.name}</h1>
          <div className="mt-2 space-y-1">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span className="font-medium">Public URL:</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                {cdn.publicBase}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(cdn.publicBase)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span className="font-medium">Bucket:</span>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                {cdn.bucket}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(cdn.bucket)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {cdn.prefix && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span className="font-medium">Prefix:</span>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {cdn.prefix}
                </code>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="files" className="space-y-4">
        <TabsList>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
          {user?.role === 'SUPER_ADMIN' && (
            <TabsTrigger value="settings">Settings</TabsTrigger>
          )}
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Files</CardTitle>
              <CardDescription>
                Upload and manage files in this CDN
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <div className="mt-4">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
                      Drop files here or click to upload
                    </span>
                    <input
                      id="file-upload"
                      type="file"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      disabled={isUploading}
                    />
                  </label>
                </div>
                {isUploading && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Uploading...</p>
                  </div>
                )}
              </div>

              {/* File List */}
              <div className="mt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <h3 className="text-lg font-medium dark:text-white">Files ({files.length})</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">View:</span>
                    <div className="flex border rounded-md">
                      <Button
                        variant={fileView === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFileView('list')}
                        className="rounded-r-none"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={fileView === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFileView('grid')}
                        className="rounded-l-none"
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                {files.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">No files uploaded yet</p>
                ) : fileView === 'list' ? (
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div
                        key={file.key}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {file.key}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatFileSize(file.size)} • {new Date(file.lastModified).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyPublicUrl(file.key)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => getSignedUrl(file.key)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={() => handleFileDelete(file.key)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {files.map((file) => (
                      <div
                        key={file.key}
                        className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700 group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <FileText className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => copyPublicUrl(file.key)}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy URL
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => getSignedUrl(file.key)}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleFileDelete(file.key)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={file.key}>
                            {file.key.split('/').pop()}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(file.size)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(file.lastModified).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Access Control</CardTitle>
              <CardDescription>
                Manage user access to this CDN
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Access management coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        {user?.role === 'SUPER_ADMIN' && (
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>CDN Settings</CardTitle>
                <CardDescription>
                  Configure CDN settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Settings management coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>
                View activity logs for this CDN
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Audit logs coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
