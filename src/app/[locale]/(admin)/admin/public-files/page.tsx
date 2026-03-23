'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Save, Folder, File, ChevronLeft, Image as ImageIcon, Video as VideoIcon, Trash2, Upload, FolderPlus } from 'lucide-react';
import { toast } from 'sonner';

import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
}

export default function PublicFilesPage() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [selectedFile, setSelectedFile] = useState('');
  const [content, setContent] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchItems(currentPath);
  }, [currentPath]);

  const fetchItems = async (path: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/public-files?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.code === 0) {
        setItems(data.data.items);
      }
    } catch (error) {
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const loadFile = async (file: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/public-files?file=${encodeURIComponent(file)}`);
      const data = await res.json();
      if (data.code === 0) {
        setContent(data.data.content);
        setSelectedFile(file);
      }
    } catch (error) {
      toast.error('Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const saveFile = async () => {
    if (!selectedFile) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/public-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: selectedFile, content }),
      });
      const data = await res.json();
      if (data.code === 0) {
        toast.success('File saved successfully');
      } else {
        toast.error(data.message || 'Failed to save file');
      }
    } catch (error) {
      toast.error('Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);
  const isVideo = (name: string) => /\.(mp4|webm|ogg)$/i.test(name);
  const isEditable = (name: string) => /\.(txt|json|xml|html|css|js|md|yml|yaml|_headers)$/i.test(name) || !name.includes('.');

  const handleItemClick = (item: FileItem) => {
    if (item.isDirectory) {
      setCurrentPath(item.path);
      setSelectedFile('');
    } else if (isEditable(item.name)) {
      loadFile(item.path);
    } else {
      setSelectedFile(item.path);
      setContent('');
    }
  };

  const goBack = () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.join('/'));
    setSelectedFile('');
  };

  const deleteFile = async () => {
    if (!selectedFile || !confirm('Are you sure you want to delete this file?')) return;
    try {
      const res = await fetch(`/api/admin/public-files?file=${encodeURIComponent(selectedFile)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.code === 0) {
        toast.success('File deleted successfully');
        setSelectedFile('');
        fetchItems(currentPath);
      } else {
        toast.error(data.message || 'Failed to delete file');
      }
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  const createFolder = async () => {
    const folderName = newFolderName.trim();
    if (!folderName) {
      toast.error('Folder name is required');
      return;
    }

    setCreatingFolder(true);
    try {
      const res = await fetch('/api/admin/public-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_folder',
          path: currentPath,
          name: folderName,
        }),
      });
      const data = await res.json();
      if (data.code === 0) {
        toast.success('Folder created successfully');
        setNewFolderName('');
        fetchItems(currentPath);
      } else {
        toast.error(data.message || 'Failed to create folder');
      }
    } catch (error) {
      toast.error('Failed to create folder');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', currentPath);

      const res = await fetch('/api/admin/public-files/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.code === 0) {
        toast.success('File uploaded successfully');
        fetchItems(currentPath);
      } else {
        toast.error(data.message || 'Failed to upload file');
      }
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const selectedItem = items.find(i => i.path === selectedFile);
  const crumbs = [
    { title: 'Admin', url: '/admin' },
    { title: 'Public Files', is_active: true },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader
          title="Public Files Manager"
          description="Browse and edit files in the public directory"
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Files</CardTitle>
            <CardDescription>/{currentPath || 'public'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <div className="flex gap-2">
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="New folder name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void createFolder();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => void createFolder()}
                  disabled={creatingFolder}
                >
                  {creatingFolder ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FolderPlus className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleUpload}
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload File
              </Button>
            </div>
            {loading && !selectedFile ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {currentPath && (
                  <Button variant="ghost" className="w-full justify-start" onClick={goBack}>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                )}
                {items.map((item) => (
                  <Button
                    key={item.path}
                    variant={selectedFile === item.path ? 'default' : 'outline'}
                    className="w-full justify-start text-left"
                    onClick={() => handleItemClick(item)}
                  >
                    {item.isDirectory ? (
                      <Folder className="h-4 w-4 mr-2 flex-shrink-0" />
                    ) : isImage(item.name) ? (
                      <ImageIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    ) : isVideo(item.name) ? (
                      <VideoIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    ) : (
                      <File className="h-4 w-4 mr-2 flex-shrink-0" />
                    )}
                    <span className="truncate">{item.name}</span>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
          </Card>

          <Card className="md:col-span-3">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <CardTitle className="min-w-0 break-all text-base sm:text-lg">
                {selectedFile || 'No file selected'}
              </CardTitle>
              {selectedFile && !selectedItem?.isDirectory && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={deleteFile}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedFile && selectedItem ? (
              <>
                {isImage(selectedItem.name) ? (
                  <img src={`/${selectedFile}`} alt={selectedItem.name} className="max-w-full h-auto rounded-lg" />
                ) : isVideo(selectedItem.name) ? (
                  <video src={`/${selectedFile}`} controls className="max-w-full h-auto rounded-lg" />
                ) : isEditable(selectedItem.name) ? (
                  <>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="min-h-[500px] font-mono text-sm"
                      placeholder="File content..."
                    />
                    <Button onClick={saveFile} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    This file type cannot be edited
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Select a file or folder from the list
              </div>
            )}
          </CardContent>
          </Card>
        </div>
      </Main>
    </>
  );
}
