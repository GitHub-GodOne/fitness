"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Edit,
  Trash2,
  Video,
  Box,
  Dumbbell,
  Link2,
  Loader2,
  Upload,
  X,
  FolderOpen,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import { MediaAssetPickerDialog } from "@/shared/blocks/admin/media-asset-picker-dialog";
import { Header, Main, MainHeader } from "@/shared/blocks/dashboard";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { cn } from "@/shared/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { uploadAdminMediaFilesDirect } from "@/shared/lib/admin-media-upload";
import { Crumb } from "@/shared/types/blocks/common";

interface FitnessObject {
  id: string;
  name: string;
  nameZh?: string;
  aliases?: string;
  category: string;
  description?: string;
  image?: string;
  status: string;
  priority: number;
  createdAt: string;
}

interface BodyPart {
  id: string;
  name: string;
  nameZh?: string;
  icon?: string;
  description?: string;
  status: string;
  sort: number;
  createdAt: string;
}

interface FitnessVideoGroup {
  id: string;
  title: string;
  titleZh?: string;
  description?: string;
  descriptionZh?: string;
  thumbnailUrl?: string;
  difficulty: string;
  gender: string;
  accessType: string;
  ageGroup: string;
  instructions?: string;
  instructionsZh?: string;
  tags?: string;
  status: string;
  viewCount: number;
  sort: number;
  createdAt: string;
}

interface FitnessVideo {
  id: string;
  groupId: string;
  viewAngle: string;
  viewAngleZh?: string;
  videoUrl: string;
  duration?: number;
  sort: number;
  status: string;
  createdAt: string;
}

interface VideoGroupWithVideos extends FitnessVideoGroup {
  videos?: FitnessVideo[];
}

interface VideoMapping {
  mapping: {
    id: string;
    objectId: string;
    videoGroupId: string;
    bodyPartId: string;
    isPrimary: boolean;
    createdAt: string;
  };
  object?: FitnessObject;
  bodyPart?: BodyPart;
}

function MediaUrlField({
  mediaType,
  value,
  onChange,
  uploadPath,
  placeholder,
  libraryButtonText,
}: {
  mediaType: "image" | "video";
  value: string;
  onChange: (value: string) => void;
  uploadPath: string;
  placeholder: string;
  libraryButtonText: string;
}) {
  const [mode, setMode] = useState<"upload" | "url" | "library">(
    value ? "url" : "upload",
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <MediaAssetPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mediaType={mediaType}
        onSelect={(asset) => {
          onChange(asset.url);
          setMode("library");
        }}
      />

      <Tabs value={mode} onValueChange={(next) => setMode(next as typeof mode)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="url">URL</TabsTrigger>
          <TabsTrigger value="library">Library</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={mediaType === "image" ? "image/*" : "video/*"}
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }

              try {
                setUploading(true);
                const [uploaded] = await uploadAdminMediaFilesDirect({
                  files: [file],
                  path: uploadPath,
                });

                if (!uploaded?.url) {
                  throw new Error("Upload failed");
                }

                onChange(uploaded.url);
                toast.success(
                  mediaType === "image"
                    ? "Image uploaded successfully"
                    : "Video uploaded successfully",
                );
              } catch (error: any) {
                toast.error(error?.message || "Upload failed");
              } finally {
                setUploading(false);
                event.target.value = "";
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {mediaType === "image" ? "Image" : "Video"}
              </>
            )}
          </Button>
        </TabsContent>

        <TabsContent value="url" className="space-y-3">
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
          />
        </TabsContent>

        <TabsContent value="library" className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setPickerOpen(true)}
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            {libraryButtonText}
          </Button>
        </TabsContent>
      </Tabs>

      {value ? (
        <div className="space-y-2 rounded-lg border bg-muted/10 p-3">
          {mediaType === "image" ? (
            <div className="relative h-24 w-32 overflow-hidden rounded-lg border bg-background">
              <img
                src={value}
                alt="Preview"
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border bg-black">
              <video
                src={value}
                controls
                preload="metadata"
                className="max-h-56 w-full"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => window.open(value, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="h-4 w-4" />
              Open
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onChange("")}>
              <X className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function VideoLibraryPage() {
  const t = useTranslations("admin");
  const crumbs: Crumb[] = [
    { title: "Admin", url: "/admin" },
    { title: "Video Library", is_active: true },
  ];
  const [activeTab, setActiveTab] = useState("videos");
  const [loading, setLoading] = useState(false);

  // Objects state
  const [objects, setObjects] = useState<FitnessObject[]>([]);
  const [objectDialogOpen, setObjectDialogOpen] = useState(false);
  const [editingObject, setEditingObject] = useState<FitnessObject | null>(
    null,
  );
  const [objectForm, setObjectForm] = useState({
    name: "",
    nameZh: "",
    category: "household",
    description: "",
    status: "active",
    priority: 0,
  });

  // Body parts state
  const [bodyParts, setBodyParts] = useState<BodyPart[]>([]);
  const [bodyPartDialogOpen, setBodyPartDialogOpen] = useState(false);
  const [editingBodyPart, setEditingBodyPart] = useState<BodyPart | null>(null);
  const [bodyPartForm, setBodyPartForm] = useState({
    name: "",
    nameZh: "",
    icon: "",
    description: "",
    status: "active",
    sort: 0,
  });

  // Video Groups state
  const [videoGroups, setVideoGroups] = useState<VideoGroupWithVideos[]>([]);
  const [videoGroupDialogOpen, setVideoGroupDialogOpen] = useState(false);
  const [editingVideoGroup, setEditingVideoGroup] = useState<VideoGroupWithVideos | null>(null);
  const [videoGroupForm, setVideoGroupForm] = useState({
    title: "",
    titleZh: "",
    description: "",
    descriptionZh: "",
    thumbnailUrl: "",
    difficulty: "beginner",
    gender: "unisex",
    accessType: "free",
    ageGroup: "all",
    instructions: "",
    instructionsZh: "",
    tags: "",
    status: "active",
    sort: 0,
  });

  // Videos within a group
  const [groupVideos, setGroupVideos] = useState<Array<{
    viewAngle: string;
    viewAngleZh: string;
    videoUrl: string;
    duration: number;
    sort: number;
  }>>([]);

  const [mappings, setMappings] = useState<VideoMapping[]>([]);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [selectedVideoGroupForMapping, setSelectedVideoGroupForMapping] =
    useState<string>("");
  const [mappingForm, setMappingForm] = useState({
    objectId: "",
    bodyPartIds: [] as string[],
    isPrimary: false,
  });

  // Fetch data
  const fetchObjects = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/video-library/objects");
      const data = await res.json();
      if (data.code === 0) {
        setObjects(data.data.objects || []);
      }
    } catch (error) {
      console.error("Failed to fetch objects:", error);
    }
  }, []);

  const fetchBodyParts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/video-library/body-parts");
      const data = await res.json();
      if (data.code === 0) {
        setBodyParts(data.data.bodyParts || []);
      }
    } catch (error) {
      console.error("Failed to fetch body parts:", error);
    }
  }, []);

  const fetchVideoGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/video-library/videos");
      const data = await res.json();
      if (data.code === 0) {
        setVideoGroups(data.data.videoGroups || []);
      }
    } catch (error) {
      console.error("Failed to fetch video groups:", error);
    }
  }, []);

  const fetchMappings = useCallback(async (videoGroupId?: string) => {
    try {
      const url = videoGroupId
        ? `/api/admin/video-library/mappings?videoGroupId=${videoGroupId}`
        : "/api/admin/video-library/mappings";
      const res = await fetch(url);
      const data = await res.json();
      if (data.code === 0) {
        if (videoGroupId) {
          setMappings(data.data.mappings || []);
        }
      }
    } catch (error) {
      console.error("Failed to fetch mappings:", error);
    }
  }, []);

  useEffect(() => {
    fetchObjects();
    fetchBodyParts();
    fetchVideoGroups();
  }, [fetchObjects, fetchBodyParts, fetchVideoGroups]);

  // Object CRUD
  const handleSaveObject = async () => {
    setLoading(true);
    try {
      const method = editingObject ? "PUT" : "POST";
      const body = editingObject
        ? { id: editingObject.id, ...objectForm }
        : objectForm;

      const res = await fetch("/api/admin/video-library/objects", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.code === 0) {
        toast.success(editingObject ? "Object updated" : "Object created");
        setObjectDialogOpen(false);
        setEditingObject(null);
        setObjectForm({
          name: "",
          nameZh: "",
          category: "household",
          description: "",
          status: "active",
          priority: 0,
        });
        fetchObjects();
      } else {
        toast.error(data.message || "Failed to save object");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save object");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteObject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this object?")) return;
    try {
      const res = await fetch(`/api/admin/video-library/objects?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.code === 0) {
        toast.success("Object deleted");
        fetchObjects();
      } else {
        toast.error(data.message || "Failed to delete object");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete object");
    }
  };

  // Body Part CRUD
  const handleSaveBodyPart = async () => {
    setLoading(true);
    try {
      const method = editingBodyPart ? "PUT" : "POST";
      const body = editingBodyPart
        ? { id: editingBodyPart.id, ...bodyPartForm }
        : bodyPartForm;

      const res = await fetch("/api/admin/video-library/body-parts", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.code === 0) {
        toast.success(
          editingBodyPart ? "Body part updated" : "Body part created",
        );
        setBodyPartDialogOpen(false);
        setEditingBodyPart(null);
        setBodyPartForm({
          name: "",
          nameZh: "",
          icon: "",
          description: "",
          status: "active",
          sort: 0,
        });
        fetchBodyParts();
      } else {
        toast.error(data.message || "Failed to save body part");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save body part");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBodyPart = async (id: string) => {
    if (!confirm("Are you sure you want to delete this body part?")) return;
    try {
      const res = await fetch(`/api/admin/video-library/body-parts?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.code === 0) {
        toast.success("Body part deleted");
        fetchBodyParts();
      } else {
        toast.error(data.message || "Failed to delete body part");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete body part");
    }
  };

  // Video Group CRUD
  const handleSaveVideoGroup = async () => {
    setLoading(true);
    try {
      const method = editingVideoGroup ? "PUT" : "POST";
      const body = editingVideoGroup
        ? { id: editingVideoGroup.id, ...videoGroupForm, videos: groupVideos }
        : { ...videoGroupForm, videos: groupVideos };

      const res = await fetch("/api/admin/video-library/videos", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.code === 0) {
        toast.success(editingVideoGroup ? "Video group updated" : "Video group created");
        setVideoGroupDialogOpen(false);
        setEditingVideoGroup(null);
        setVideoGroupForm({
          title: "",
          titleZh: "",
          description: "",
          descriptionZh: "",
          thumbnailUrl: "",
          difficulty: "beginner",
          gender: "unisex",
          accessType: "free",
          ageGroup: "all",
          instructions: "",
          instructionsZh: "",
          tags: "",
          status: "active",
          sort: 0,
        });
        setGroupVideos([]);
        fetchVideoGroups();
      } else {
        toast.error(data.message || "Failed to save video group");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save video group");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideoGroup = async (id: string) => {
    if (!confirm("Are you sure you want to delete this video group?")) return;
    try {
      const res = await fetch(`/api/admin/video-library/videos?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.code === 0) {
        toast.success("Video group deleted");
        fetchVideoGroups();
      } else {
        toast.error(data.message || "Failed to delete video group");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete video group");
    }
  };

  // Manage videos within a group
  const handleAddVideoToGroup = () => {
    setGroupVideos([
      ...groupVideos,
      {
        viewAngle: "",
        viewAngleZh: "",
        videoUrl: "",
        duration: 0,
        sort: groupVideos.length,
      },
    ]);
  };

  const handleRemoveVideoFromGroup = (index: number) => {
    setGroupVideos(groupVideos.filter((_, i) => i !== index));
  };

  const handleUpdateGroupVideo = (index: number, field: string, value: any) => {
    const updated = [...groupVideos];
    updated[index] = { ...updated[index], [field]: value };
    setGroupVideos(updated);
  };

  // Mappings CRUD
  const handleSaveMapping = async () => {
    if (!selectedVideoGroupForMapping) {
      toast.error("Please select a video group first");
      return;
    }
    if (!mappingForm.objectId || mappingForm.bodyPartIds.length === 0) {
      toast.error("Please select an object and at least one body part");
      return;
    }
    setLoading(true);
    try {
      for (const bodyPartId of mappingForm.bodyPartIds) {
        const res = await fetch("/api/admin/video-library/mappings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoGroupId: selectedVideoGroupForMapping,
            objectId: mappingForm.objectId,
            bodyPartId,
            isPrimary: mappingForm.isPrimary,
          }),
        });

        const data = await res.json();
        if (data.code !== 0) {
          toast.error(data.message || "Failed to create mapping");
          return;
        }
      }
      toast.success(`${mappingForm.bodyPartIds.length} mapping(s) created`);
      setMappingForm({ objectId: "", bodyPartIds: [], isPrimary: false });
      fetchMappings(selectedVideoGroupForMapping);
    } catch (error: any) {
      toast.error(error.message || "Failed to create mapping");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMapping = async (id: string) => {
    if (!confirm("Are you sure you want to delete this mapping?")) return;
    try {
      const res = await fetch(`/api/admin/video-library/mappings?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.code === 0) {
        toast.success("Mapping deleted");
        if (selectedVideoGroupForMapping) {
          fetchMappings(selectedVideoGroupForMapping);
        }
      } else {
        toast.error(data.message || "Failed to delete mapping");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete mapping");
    }
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title="Video Library Management" />
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="videos" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="objects" className="flex items-center gap-2">
            <Box className="h-4 w-4" />
            Objects
          </TabsTrigger>
          <TabsTrigger value="body-parts" className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Body Parts
          </TabsTrigger>
          <TabsTrigger value="mappings" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Mappings
          </TabsTrigger>
        </TabsList>

        {/* Videos Tab */}
        <TabsContent value="videos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Fitness Video Groups</CardTitle>
              <Button
                onClick={() => {
                  setEditingVideoGroup(null);
                  setVideoGroupForm({
                    title: "",
                    titleZh: "",
                    description: "",
                    descriptionZh: "",
                    thumbnailUrl: "",
                    difficulty: "beginner",
                    gender: "unisex",
                    accessType: "free",
                    ageGroup: "all",
                    instructions: "",
                    instructionsZh: "",
                    tags: "",
                    status: "active",
                    sort: 0,
                  });
                  setGroupVideos([]);
                  setVideoGroupDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Video Group
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Videos</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Age Group</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videoGroups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{group.title}</div>
                          {group.titleZh && (
                            <div className="text-sm text-gray-500">
                              {group.titleZh}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {group.videos?.length || 0} videos
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            group.difficulty === "beginner"
                              ? "secondary"
                              : group.difficulty === "intermediate"
                                ? "default"
                                : "destructive"
                          }
                        >
                          {group.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{group.gender || "unisex"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{group.ageGroup || "all"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            group.accessType === "free"
                              ? "secondary"
                              : group.accessType === "starter"
                                ? "outline"
                                : group.accessType === "premium" || group.accessType === "pro"
                                ? "default"
                                : "destructive"
                          }
                        >
                          {group.accessType === "premium"
                            ? "pro"
                            : group.accessType || "free"}
                        </Badge>
                      </TableCell>
                      <TableCell>{group.viewCount}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            group.status === "active" ? "default" : "secondary"
                          }
                        >
                          {group.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingVideoGroup(group);
                              setVideoGroupForm({
                                title: group.title,
                                titleZh: group.titleZh || "",
                                description: group.description || "",
                                descriptionZh: group.descriptionZh || "",
                                thumbnailUrl: group.thumbnailUrl || "",
                                difficulty: group.difficulty,
                                gender: group.gender || "unisex",
                                accessType: group.accessType || "free",
                                ageGroup: group.ageGroup || "all",
                                instructions: group.instructions || "",
                                instructionsZh: group.instructionsZh || "",
                                tags: group.tags || "",
                                status: group.status,
                                sort: group.sort || 0,
                              });
                              setGroupVideos(
                                group.videos?.map(v => ({
                                  viewAngle: v.viewAngle,
                                  viewAngleZh: v.viewAngleZh || "",
                                  videoUrl: v.videoUrl,
                                  duration: v.duration || 0,
                                  sort: v.sort || 0,
                                })) || []
                              );
                              setVideoGroupDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteVideoGroup(group.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Objects Tab */}
        <TabsContent value="objects">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Fitness Objects</CardTitle>
              <Button
                onClick={() => {
                  setEditingObject(null);
                  setObjectForm({
                    name: "",
                    nameZh: "",
                    category: "household",
                    description: "",
                    status: "active",
                    priority: 0,
                  });
                  setObjectDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Object
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {objects.map((obj) => (
                    <TableRow key={obj.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{obj.name}</div>
                          {obj.nameZh && (
                            <div className="text-sm text-gray-500">
                              {obj.nameZh}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{obj.category}</Badge>
                      </TableCell>
                      <TableCell>{obj.priority ?? 0}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            obj.status === "active" ? "default" : "secondary"
                          }
                        >
                          {obj.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingObject(obj);
                              setObjectForm({
                                name: obj.name,
                                nameZh: obj.nameZh || "",
                                category: obj.category,
                                description: obj.description || "",
                                status: obj.status,
                                priority: obj.priority ?? 0,
                              });
                              setObjectDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteObject(obj.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Body Parts Tab */}
        <TabsContent value="body-parts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Body Parts</CardTitle>
              <Button
                onClick={() => {
                  setEditingBodyPart(null);
                  setBodyPartForm({
                    name: "",
                    nameZh: "",
                    icon: "",
                    description: "",
                    status: "active",
                    sort: 0,
                  });
                  setBodyPartDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Body Part
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Icon</TableHead>
                    <TableHead>Sort</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bodyParts.map((bp) => (
                    <TableRow key={bp.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{bp.name}</div>
                          {bp.nameZh && (
                            <div className="text-sm text-gray-500">
                              {bp.nameZh}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{bp.icon || "-"}</TableCell>
                      <TableCell>{bp.sort}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            bp.status === "active" ? "default" : "secondary"
                          }
                        >
                          {bp.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingBodyPart(bp);
                              setBodyPartForm({
                                name: bp.name,
                                nameZh: bp.nameZh || "",
                                icon: bp.icon || "",
                                description: bp.description || "",
                                status: bp.status,
                                sort: bp.sort,
                              });
                              setBodyPartDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteBodyPart(bp.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mappings Tab */}
        <TabsContent value="mappings">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Video-Object-BodyPart Mappings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Select Video Group */}
              <div className="space-y-2">
                <Label>Select Video Group to Manage Mappings</Label>
                <Select
                  value={selectedVideoGroupForMapping}
                  onValueChange={(v) => {
                    setSelectedVideoGroupForMapping(v);
                    if (v) fetchMappings(v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a video group" />
                  </SelectTrigger>
                  <SelectContent>
                    {videoGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.title} ({group.titleZh || "-"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add New Mapping */}
              {selectedVideoGroupForMapping && (
                <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
                  <h3 className="font-medium">Add New Mapping</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Object</Label>
                      <Select
                        value={mappingForm.objectId}
                        onValueChange={(v) =>
                          setMappingForm({ ...mappingForm, objectId: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select object" />
                        </SelectTrigger>
                        <SelectContent>
                          {objects.map((obj) => (
                            <SelectItem key={obj.id} value={obj.id}>
                              {obj.name} ({obj.nameZh || "-"})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Body Parts</Label>
                      <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                        {bodyParts.map((bp) => (
                          <div key={bp.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`bp-${bp.id}`}
                              checked={mappingForm.bodyPartIds.includes(bp.id)}
                              onCheckedChange={(checked: boolean | "indeterminate") => {
                                const ids = mappingForm.bodyPartIds;
                                if (checked === true) {
                                  setMappingForm({ ...mappingForm, bodyPartIds: [...ids, bp.id] });
                                } else {
                                  setMappingForm({ ...mappingForm, bodyPartIds: ids.filter(id => id !== bp.id) });
                                }
                              }}
                            />
                            <Label htmlFor={`bp-${bp.id}`} className="text-sm font-normal cursor-pointer">
                              {bp.name} {bp.nameZh ? `(${bp.nameZh})` : ""}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {mappingForm.bodyPartIds.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {mappingForm.bodyPartIds.map(id => {
                            const bp = bodyParts.find(b => b.id === id);
                            return bp ? (
                              <Badge key={id} variant="secondary" className="text-xs">
                                {bp.name}
                                <button
                                  type="button"
                                  className="ml-1 hover:text-red-500"
                                  onClick={() => setMappingForm({
                                    ...mappingForm,
                                    bodyPartIds: mappingForm.bodyPartIds.filter(i => i !== id),
                                  })}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-end gap-4">
                      <div className="flex items-center space-x-2 h-10">
                        <Checkbox
                          id="isPrimary"
                          checked={mappingForm.isPrimary}
                          onCheckedChange={(
                            checked: boolean | "indeterminate",
                          ) =>
                            setMappingForm({
                              ...mappingForm,
                              isPrimary: checked === true,
                            })
                          }
                        />
                        <Label htmlFor="isPrimary">Primary</Label>
                      </div>
                      <Button
                        onClick={handleSaveMapping}
                        disabled={
                          loading ||
                          !mappingForm.objectId ||
                          mappingForm.bodyPartIds.length === 0
                        }
                      >
                        {loading && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Add Mapping
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Existing Mappings */}
              {selectedVideoGroupForMapping && mappings.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">Current Mappings</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Object</TableHead>
                        <TableHead>Body Part</TableHead>
                        <TableHead>Primary</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappings.map((item) => (
                        <TableRow key={item.mapping.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {item.object?.name || "Unknown"}
                              </div>
                              {item.object?.nameZh && (
                                <div className="text-sm text-gray-500">
                                  {item.object.nameZh}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>{item.bodyPart?.name || "Unknown"}</div>
                              {item.bodyPart?.nameZh && (
                                <div className="text-sm text-gray-500">
                                  {item.bodyPart.nameZh}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.mapping.isPrimary ? (
                              <Badge variant="default">Yes</Badge>
                            ) : (
                              <Badge variant="secondary">No</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDeleteMapping(item.mapping.id)
                              }
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {selectedVideoGroupForMapping && mappings.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No mappings found for this video group. Add one above.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
          </Tabs>

          {/* Object Dialog */}
          <Dialog open={objectDialogOpen} onOpenChange={setObjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingObject ? "Edit Object" : "Add Object"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name (EN)</Label>
                <Input
                  value={objectForm.name}
                  onChange={(e) =>
                    setObjectForm({ ...objectForm, name: e.target.value })
                  }
                  placeholder="e.g. chair"
                />
              </div>
              <div>
                <Label>Name (ZH)</Label>
                <Input
                  value={objectForm.nameZh}
                  onChange={(e) =>
                    setObjectForm({ ...objectForm, nameZh: e.target.value })
                  }
                  placeholder="e.g. 椅子"
                />
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={objectForm.category}
                onValueChange={(v) =>
                  setObjectForm({ ...objectForm, category: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="household">Household</SelectItem>
                  <SelectItem value="outdoor">Outdoor</SelectItem>
                  <SelectItem value="gym">Gym</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={objectForm.description}
                onChange={(e) =>
                  setObjectForm({ ...objectForm, description: e.target.value })
                }
                placeholder="Description of the object"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={objectForm.priority}
                  onChange={(e) =>
                    setObjectForm({
                      ...objectForm,
                      priority: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="Higher = checked first by AI"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={objectForm.status}
                  onValueChange={(v) =>
                    setObjectForm({ ...objectForm, status: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setObjectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveObject} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
          </Dialog>

          {/* Body Part Dialog */}
          <Dialog open={bodyPartDialogOpen} onOpenChange={setBodyPartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBodyPart ? "Edit Body Part" : "Add Body Part"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name (EN)</Label>
                <Input
                  value={bodyPartForm.name}
                  onChange={(e) =>
                    setBodyPartForm({ ...bodyPartForm, name: e.target.value })
                  }
                  placeholder="e.g. chest"
                />
              </div>
              <div>
                <Label>Name (ZH)</Label>
                <Input
                  value={bodyPartForm.nameZh}
                  onChange={(e) =>
                    setBodyPartForm({ ...bodyPartForm, nameZh: e.target.value })
                  }
                  placeholder="e.g. 胸部"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Icon</Label>
                <Input
                  value={bodyPartForm.icon}
                  onChange={(e) =>
                    setBodyPartForm({ ...bodyPartForm, icon: e.target.value })
                  }
                  placeholder="Icon name"
                />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={bodyPartForm.sort}
                  onChange={(e) =>
                    setBodyPartForm({
                      ...bodyPartForm,
                      sort: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={bodyPartForm.description}
                onChange={(e) =>
                  setBodyPartForm({
                    ...bodyPartForm,
                    description: e.target.value,
                  })
                }
                placeholder="Description"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={bodyPartForm.status}
                onValueChange={(v) =>
                  setBodyPartForm({ ...bodyPartForm, status: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBodyPartDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveBodyPart} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
          </Dialog>

          {/* Video Group Dialog */}
          <Dialog open={videoGroupDialogOpen} onOpenChange={setVideoGroupDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVideoGroup ? "Edit Video Group" : "Add Video Group"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Group Metadata */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Group Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Title (EN)</Label>
                  <Input
                    value={videoGroupForm.title}
                    onChange={(e) =>
                      setVideoGroupForm({ ...videoGroupForm, title: e.target.value })
                    }
                    placeholder="e.g. Chair Squats"
                  />
                </div>
                <div>
                  <Label>Title (ZH)</Label>
                  <Input
                    value={videoGroupForm.titleZh}
                    onChange={(e) =>
                      setVideoGroupForm({ ...videoGroupForm, titleZh: e.target.value })
                    }
                    placeholder="e.g. 椅子深蹲"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Description (EN)</Label>
                  <Textarea
                    value={videoGroupForm.description}
                    onChange={(e) =>
                      setVideoGroupForm({ ...videoGroupForm, description: e.target.value })
                    }
                    placeholder="Exercise description"
                  />
                </div>
                <div>
                  <Label>Description (ZH)</Label>
                  <Textarea
                    value={videoGroupForm.descriptionZh}
                    onChange={(e) =>
                      setVideoGroupForm({ ...videoGroupForm, descriptionZh: e.target.value })
                    }
                    placeholder="运动描述"
                  />
                </div>
              </div>
              <div>
                <Label>Thumbnail</Label>
                <MediaUrlField
                  mediaType="image"
                  value={videoGroupForm.thumbnailUrl}
                  onChange={(thumbnailUrl) =>
                    setVideoGroupForm({ ...videoGroupForm, thumbnailUrl })
                  }
                  uploadPath="video-library/thumbnails"
                  placeholder="https://example.com/thumbnail.jpg"
                  libraryButtonText="Choose Image from Library"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Difficulty</Label>
                  <Select
                    value={videoGroupForm.difficulty}
                    onValueChange={(v) =>
                      setVideoGroupForm({ ...videoGroupForm, difficulty: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="universal">Universal</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select
                    value={videoGroupForm.gender}
                    onValueChange={(v) =>
                      setVideoGroupForm({ ...videoGroupForm, gender: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unisex">Unisex</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Access Type</Label>
                  <Select
                    value={videoGroupForm.accessType}
                    onValueChange={(v) =>
                      setVideoGroupForm({ ...videoGroupForm, accessType: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="hidden">Hidden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Age Group</Label>
                  <Select
                    value={videoGroupForm.ageGroup}
                    onValueChange={(v) =>
                      setVideoGroupForm({ ...videoGroupForm, ageGroup: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Ages</SelectItem>
                      <SelectItem value="young">Young (18-35)</SelectItem>
                      <SelectItem value="middle">Middle-aged (36-55)</SelectItem>
                      <SelectItem value="senior">Senior (56+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={videoGroupForm.sort}
                    onChange={(e) =>
                      setVideoGroupForm({
                        ...videoGroupForm,
                        sort: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Instructions (EN)</Label>
                  <Textarea
                    value={videoGroupForm.instructions}
                    onChange={(e) =>
                      setVideoGroupForm({ ...videoGroupForm, instructions: e.target.value })
                    }
                    placeholder="Exercise instructions"
                  />
                </div>
                <div>
                  <Label>Instructions (ZH)</Label>
                  <Textarea
                    value={videoGroupForm.instructionsZh}
                    onChange={(e) =>
                      setVideoGroupForm({ ...videoGroupForm, instructionsZh: e.target.value })
                    }
                    placeholder="运动说明"
                  />
                </div>
              </div>
              <div>
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={videoGroupForm.tags}
                  onChange={(e) =>
                    setVideoGroupForm({ ...videoGroupForm, tags: e.target.value })
                  }
                  placeholder="e.g. legs, strength, beginner"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={videoGroupForm.status}
                  onValueChange={(v) =>
                    setVideoGroupForm({ ...videoGroupForm, status: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Videos within Group */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Videos (View Angles)</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddVideoToGroup}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Video
                </Button>
              </div>
              {groupVideos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No videos added yet. Click "Add Video" to add viewing angles.
                </p>
              ) : (
                <div className="space-y-4">
                  {groupVideos.map((video, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Video {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveVideoFromGroup(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>View Angle (EN)</Label>
                          <Input
                            value={video.viewAngle}
                            onChange={(e) =>
                              handleUpdateGroupVideo(index, "viewAngle", e.target.value)
                            }
                            placeholder="e.g. Front View"
                          />
                        </div>
                        <div>
                          <Label>View Angle (ZH)</Label>
                          <Input
                            value={video.viewAngleZh}
                            onChange={(e) =>
                              handleUpdateGroupVideo(index, "viewAngleZh", e.target.value)
                            }
                            placeholder="e.g. 正面视角"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Video URL</Label>
                        <MediaUrlField
                          mediaType="video"
                          value={video.videoUrl}
                          onChange={(videoUrl) =>
                            handleUpdateGroupVideo(index, "videoUrl", videoUrl)
                          }
                          uploadPath="video-library/videos"
                          placeholder="https://example.com/video.mp4"
                          libraryButtonText="Choose Video from Library"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Duration (seconds)</Label>
                          <Input
                            type="number"
                            value={video.duration}
                            onChange={(e) =>
                              handleUpdateGroupVideo(index, "duration", parseInt(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div>
                          <Label>Sort Order</Label>
                          <Input
                            type="number"
                            value={video.sort}
                            onChange={(e) =>
                              handleUpdateGroupVideo(index, "sort", parseInt(e.target.value) || 0)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVideoGroupDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveVideoGroup} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
          </Dialog>
        </div>
      </Main>
    </>
  );
}
