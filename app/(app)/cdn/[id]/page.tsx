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
  Grid3X3,
  Eye
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { buildPublicUrl, copyToClipboard } from '@/utils/urls';
import { authenticatedFetch } from '@/lib/api';
import { FilePreviewModal } from '@/components/FilePreviewModal';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import { FileGridPreview } from '@/components/FileGridPreview';
import { formatDateTime } from '@/utils/date';

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
  const [accessUsers, setAccessUsers] = useState<any[]>([]);
  const [isLoadingAccess, setIsLoadingAccess] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [settings, setSettings] = useState({
    name: '',
    publicBase: '',
    bucket: '',
    prefix: '',
  });
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  
  // Preview modal state
  const [previewFile, setPreviewFile] = useState<FileObject | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Delete confirmation state
  const [deleteFile, setDeleteFile] = useState<FileObject | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const fetchAccessUsers = useCallback(async () => {
    if (!cdn) return;
    setIsLoadingAccess(true);
    try {
      const response = await authenticatedFetch(`/api/cdns/${params.id}/access`);
      if (response.ok) {
        const data = await response.json();
        setAccessUsers(data.users || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch access users",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching access users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch access users",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAccess(false);
    }
  }, [params.id, cdn, toast]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;
    
    setIsAddingUser(true);
    try {
      const response = await authenticatedFetch(`/api/cdns/${params.id}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newUserEmail.trim() }),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "User added successfully",
        });
        setNewUserEmail('');
        fetchAccessUsers();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to add user",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error adding user:', error);
      toast({
        title: "Error",
        description: "Failed to add user",
        variant: "destructive",
      });
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    try {
      const response = await authenticatedFetch(`/api/cdns/${params.id}/access`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: userId }),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "User removed successfully",
        });
        fetchAccessUsers();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to remove user",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error removing user:', error);
      toast({
        title: "Error",
        description: "Failed to remove user",
        variant: "destructive",
      });
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingSettings(true);
    try {
      const response = await authenticatedFetch(`/api/cdns/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "CDN settings updated successfully",
        });
        fetchCDN(); // Refresh CDN data
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to update settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const fetchAuditLogs = useCallback(async () => {
    setIsLoadingAudit(true);
    try {
      const response = await authenticatedFetch(`/api/cdns/${params.id}/audit`);
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs || []);
      } else {
        console.warn('Failed to fetch audit logs:', response.status);
        setAuditLogs([]); // Set empty array instead of showing error
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setAuditLogs([]); // Set empty array instead of showing error
    } finally {
      setIsLoadingAudit(false);
    }
  }, [params.id]);

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
      
        // Log the action (optional - don't break main functionality)
        try {
          await authenticatedFetch(`/api/cdns/${params.id}/audit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'UPLOAD_FILE',
              details: { key: file.name, size: file.size, type: file.type },
            }),
          });
        } catch (error) {
          console.warn('Failed to log upload action:', error);
        }
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

  const handleFileDelete = (file: FileObject) => {
    console.log('Delete button clicked for file:', file.key);
    setDeleteFile(file);
    setIsDeleteDialogOpen(true);
    console.log('Dialog should be open now');
  };

  const confirmFileDelete = async () => {
    if (!deleteFile) return;
    
    setIsDeleting(true);
    try {
      const response = await authenticatedFetch(`/api/cdns/${params.id}/files/${deleteFile.key}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "File deleted successfully",
        });
        fetchFiles();
        
        // Log the action (optional - don't break main functionality)
        try {
          await authenticatedFetch(`/api/cdns/${params.id}/audit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'DELETE_FILE',
              details: { key: deleteFile.key },
            }),
          });
        } catch (error) {
          console.warn('Failed to log delete action:', error);
        }
        
        // Close dialog
        setIsDeleteDialogOpen(false);
        setDeleteFile(null);
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setDeleteFile(null);
  };

  const copyPublicUrl = async (key: string) => {
    if (!cdn) return;
    
    const publicUrl = buildPublicUrl(cdn.publicBase, key, cdn.prefix);
    await copyToClipboard(publicUrl);
    toast({
      title: "Copied",
      description: "Public URL copied to clipboard",
    });
    
    // Log the action (optional - don't break main functionality)
    try {
      await authenticatedFetch(`/api/cdns/${params.id}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'COPY_PUBLIC_URL',
          details: { key, publicUrl },
        }),
      });
    } catch (error) {
      console.warn('Failed to log copy action:', error);
    }
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
        
        // Log the action (optional - don't break main functionality)
        try {
          await authenticatedFetch(`/api/cdns/${params.id}/audit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'GENERATE_SIGNED_URL',
              details: { key },
            }),
          });
        } catch (error) {
          console.warn('Failed to log signed URL action:', error);
        }
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

  const handlePreview = (file: FileObject) => {
    setPreviewFile(file);
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setPreviewFile(null);
  };

  // Load access users when access tab is accessed
  useEffect(() => {
    if (cdn && accessUsers.length === 0) {
      fetchAccessUsers();
    }
  }, [cdn, accessUsers.length, fetchAccessUsers]);

  // Load audit logs when audit tab is accessed
  useEffect(() => {
    if (cdn && auditLogs.length === 0) {
      fetchAuditLogs();
    }
  }, [cdn, auditLogs.length, fetchAuditLogs]);

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
                            onClick={() => handlePreview(file)}
                            title="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyPublicUrl(file.key)}
                            title="Copy URL"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => getSignedUrl(file.key)}
                            title="Download"
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
                                onClick={() => handleFileDelete(file)}
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
                        className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700 group relative"
                      >
                        {/* File Preview */}
                        <FileGridPreview
                          file={file}
                          cdnId={params.id as string}
                          onPreview={() => handlePreview(file)}
                        />
                        
                        {/* Actions Dropdown */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handlePreview(file)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Preview
                              </DropdownMenuItem>
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
                                onClick={() => handleFileDelete(file)}
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
            <CardContent className="space-y-6">
              {/* Add User Form */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4 dark:text-white">Add User</h3>
                <form onSubmit={handleAddUser} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter user email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="flex-1"
                    required
                  />
                  <Button type="submit" disabled={isAddingUser}>
                    {isAddingUser ? 'Adding...' : 'Add User'}
                  </Button>
                </form>
              </div>

              {/* Users List */}
              <div>
                <h3 className="text-lg font-medium mb-4 dark:text-white">Current Users</h3>
                {isLoadingAccess ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                  </div>
                ) : accessUsers.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">No users have access to this CDN</p>
                ) : (
                  <div className="space-y-2">
                    {accessUsers.map((user) => (
                      <div
                        key={user.uid}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{user.email}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Role: {user.role} • Added: {new Date(user.addedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveUser(user.uid)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                <form onSubmit={handleUpdateSettings} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="settings-name">Name</Label>
                      <Input
                        id="settings-name"
                        value={settings.name}
                        onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                        placeholder="CDN name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="settings-bucket">Bucket</Label>
                      <Input
                        id="settings-bucket"
                        value={settings.bucket}
                        onChange={(e) => setSettings({ ...settings, bucket: e.target.value })}
                        placeholder="Bucket name"
                        required
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="settings-publicBase">Public Base URL</Label>
                      <Input
                        id="settings-publicBase"
                        value={settings.publicBase}
                        onChange={(e) => setSettings({ ...settings, publicBase: e.target.value })}
                        placeholder="https://pub-xxx.r2.dev"
                        required
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="settings-prefix">Prefix (optional)</Label>
                      <Input
                        id="settings-prefix"
                        value={settings.prefix}
                        onChange={(e) => setSettings({ ...settings, prefix: e.target.value })}
                        placeholder="images"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isUpdatingSettings}>
                      {isUpdatingSettings ? 'Updating...' : 'Update Settings'}
                    </Button>
                  </div>
                </form>
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
              {isLoadingAudit ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                </div>
              ) : auditLogs.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No audit logs found</p>
              ) : (
                <div className="space-y-4">
                  {auditLogs.map((log, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {log.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDateTime(log.createdAt)}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {log.details && Object.keys(log.details).length > 0 && (
                            <span>
                              {Object.entries(log.details).map(([key, value]) => (
                                <span key={key}>
                                  <strong>{key}:</strong> {String(value)} 
                                  {Object.keys(log.details).indexOf(key) < Object.keys(log.details).length - 1 ? ' • ' : ''}
                                </span>
                              ))}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          User: {log.actorEmail || 'Unknown'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* File Preview Modal */}
      {previewFile && params.id && typeof params.id === 'string' && (
        <FilePreviewModal
          isOpen={isPreviewOpen}
          onClose={closePreview}
          file={previewFile}
          cdnId={params.id}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteFile && (
        <DeleteConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={closeDeleteDialog}
          onConfirm={confirmFileDelete}
          fileName={deleteFile.key}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
