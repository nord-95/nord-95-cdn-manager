'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function PublicInvitePage() {
  const params = useParams();
  const token = params.token as string;
  const [invite, setInvite] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [uploads, setUploads] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchInviteMetadata = async () => {
      try {
        const response = await fetch(`/api/invites/public/${token}`);
        if (response.ok) {
          const data = await response.json();
          setInvite(data);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching invite:', error);
        setIsLoading(false);
      }
    };

    if (token) {
      fetchInviteMetadata();
    }
  }, [token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const uploadFile = async (file: File) => {
    try {
      // Step 1: Get upload policy
      const signResponse = await fetch(`/api/invites/public/${token}/sign-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: file.type,
          filename: file.name
        })
      });

      if (!signResponse.ok) {
        const error = await signResponse.json();
        throw new Error(error.error || 'Failed to get upload policy');
      }

      const signData = await signResponse.json();

      // Step 2: Upload to R2
      const formData = new FormData();
      Object.entries(signData.fields).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
      formData.append('file', file);

      const uploadResponse = await fetch(signData.url, {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      // Step 3: Commit upload
      const commitResponse = await fetch(`/api/invites/public/${token}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: signData.key,
          contentType: file.type,
          size: file.size,
          extension: file.name.split('.').pop(),
          etag: uploadResponse.headers.get('etag') || 'unknown'
        })
      });

      if (!commitResponse.ok) {
        const error = await commitResponse.json();
        throw new Error(error.error || 'Failed to commit upload');
      }

      const commitData = await commitResponse.json();
      
      setUploads(prev => [...prev, {
        file: file.name,
        status: 'success',
        url: commitData.publicUrl,
        key: commitData.key
      }]);

      // Update invite remaining uses
      setInvite((prev: any) => ({
        ...prev,
        remainingUses: prev.remainingUses - 1
      }));

      return commitData;
    } catch (error) {
      console.error('Upload failed:', error);
      setUploads(prev => [...prev, {
        file: file.name,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }]);
      throw error;
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    
    for (const file of files) {
      try {
        await uploadFile(file);
      } catch (error) {
        console.error('Failed to upload', file.name, error);
      }
    }
    
    setIsUploading(false);
    setFiles([]); // Clear selected files
    
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!invite || invite.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invitation Not Found</h1>
          <p className="text-gray-600">The invitation link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const isExpired = invite.expiresAt && new Date(invite.expiresAt) < new Date();
  const isRevoked = invite.status === 'REVOKED';
  const isExhausted = invite.maxUses && invite.remainingUses <= 0;

  if (isExpired || isRevoked || isExhausted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {isExpired ? 'Invitation Expired' : 
             isRevoked ? 'Invitation Revoked' : 
             'No Uploads Remaining'}
          </h1>
          <p className="text-gray-600">This invitation is no longer valid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b">
            <h1 className="text-2xl font-bold text-gray-900">
              {invite.label}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Upload files to {invite.cdnDisplayName}
            </p>
          </div>

          {/* Info Section */}
          <div className="px-6 py-4 bg-gray-50 border-b">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Allowed File Types</h3>
                <div className="flex flex-wrap gap-1">
                  {invite.allowedExtensions.map((ext: string) => (
                    <span key={ext} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      .{ext}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Limits</h3>
                <div className="text-sm text-gray-600">
                  <div>Max size: {Math.round(invite.maxSizeBytes / 1024 / 1024)} MB per file</div>
                  {invite.maxUses && (
                    <div>Uploads remaining: {invite.remainingUses} / {invite.maxUses}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="p-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                accept={invite.allowedMimeTypes.join(',')}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isUploading}
              />
              
              <p className="mt-2 text-sm text-gray-600">
                Select files to upload or drag and drop them here
              </p>
            </div>
            
            {files.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-3">Selected Files ({files.length})</h3>
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{file.name}</div>
                        <div className="text-sm text-gray-600">{Math.round(file.size / 1024)} KB</div>
                      </div>
                      <div className="text-sm text-gray-500">{file.type}</div>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className={`mt-4 w-full px-4 py-2 rounded-lg font-medium ${
                    isUploading 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isUploading ? 'Uploading...' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            )}

            {uploads.length > 0 && (
              <div className="mt-8">
                <h3 className="font-medium text-gray-900 mb-4">Upload Results</h3>
                <div className="space-y-3">
                  {uploads.map((upload, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${
                      upload.status === 'success' 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className={`font-medium ${
                            upload.status === 'success' ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {upload.file}
                          </div>
                          {upload.status === 'success' && upload.url && (
                            <div className="mt-1">
                              <a 
                                href={upload.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 hover:underline text-sm flex items-center"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                View File
                              </a>
                            </div>
                          )}
                          {upload.status === 'error' && (
                            <div className="text-sm text-red-700 mt-1">{upload.error}</div>
                          )}
                        </div>
                        <div className={`ml-4 ${
                          upload.status === 'success' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {upload.status === 'success' ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}