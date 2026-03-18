'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Save, Folder, File, ChevronLeft, Image as ImageIcon, Video as VideoIcon, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Public Files Manager</h1>
        <p className="text-muted-foreground mt-2">Browse and edit files in the public directory</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Files</CardTitle>
            <CardDescription>/{currentPath || 'public'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
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
            <div className="flex items-center justify-between">
              <CardTitle>{selectedFile || 'No file selected'}</CardTitle>
              {selectedFile && !selectedItem?.isDirectory && (
                <Button variant="destructive" size="sm" onClick={deleteFile}>
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
    </div>
  );
}
