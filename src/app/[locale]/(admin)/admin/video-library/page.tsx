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
} from "lucide-react";
import { toast } from "sonner";

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

interface FitnessVideo {
  id: string;
  title: string;
  titleZh?: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  difficulty: string;
  gender: string;
  accessType: string;
  ageGroup: string;
  instructions?: string;
  status: string;
  viewCount: number;
  createdAt: string;
}

interface VideoMapping {
  mapping: {
    id: string;
    objectId: string;
    videoId: string;
    bodyPartId: string;
    isPrimary: boolean;
    createdAt: string;
  };
  object?: FitnessObject;
  bodyPart?: BodyPart;
}

export default function VideoLibraryPage() {
  const t = useTranslations("admin");
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

  // Videos state
  const [videos, setVideos] = useState<FitnessVideo[]>([]);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<FitnessVideo | null>(null);
  const [videoForm, setVideoForm] = useState({
    title: "",
    titleZh: "",
    description: "",
    videoUrl: "",
    thumbnailUrl: "",
    duration: 0,
    difficulty: "beginner",
    gender: "unisex",
    accessType: "free",
    ageGroup: "all",
    instructions: "",
    status: "active",
  });

  // Video upload state
  const [videoUploading, setVideoUploading] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [mappings, setMappings] = useState<VideoMapping[]>([]);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [selectedVideoForMapping, setSelectedVideoForMapping] =
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

  const fetchVideos = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/video-library/videos");
      const data = await res.json();
      if (data.code === 0) {
        setVideos(data.data.videos || []);
      }
    } catch (error) {
      console.error("Failed to fetch videos:", error);
    }
  }, []);

  const fetchMappings = useCallback(async (videoId?: string) => {
    try {
      const url = videoId
        ? `/api/admin/video-library/mappings?videoId=${videoId}`
        : "/api/admin/video-library/mappings";
      const res = await fetch(url);
      const data = await res.json();
      if (data.code === 0) {
        if (videoId) {
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
    fetchVideos();
  }, [fetchObjects, fetchBodyParts, fetchVideos]);

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

  // Video CRUD
  const handleSaveVideo = async () => {
    setLoading(true);
    try {
      const method = editingVideo ? "PUT" : "POST";
      const body = editingVideo
        ? { id: editingVideo.id, ...videoForm }
        : videoForm;

      const res = await fetch("/api/admin/video-library/videos", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.code === 0) {
        toast.success(editingVideo ? "Video updated" : "Video created");
        setVideoDialogOpen(false);
        setEditingVideo(null);
        setVideoForm({
          title: "",
          titleZh: "",
          description: "",
          videoUrl: "",
          thumbnailUrl: "",
          duration: 0,
          difficulty: "beginner",
          gender: "unisex",
          accessType: "free",
          ageGroup: "all",
          instructions: "",
          status: "active",
        });
        fetchVideos();
      } else {
        toast.error(data.message || "Failed to save video");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save video");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm("Are you sure you want to delete this video?")) return;
    try {
      const res = await fetch(`/api/admin/video-library/videos?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.code === 0) {
        toast.success("Video deleted");
        fetchVideos();
      } else {
        toast.error(data.message || "Failed to delete video");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete video");
    }
  };

  // Upload handlers
  const uploadFile = async (
    file: File,
    type: "video" | "image",
  ): Promise<string | null> => {
    const formData = new FormData();
    formData.append("files", file);

    try {
      const response = await fetch("/api/admin/video-library/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const result = await response.json();
      if (result.code !== 0 || !result.data?.urls?.length) {
        throw new Error(result.message || "Upload failed");
      }

      return result.data.urls[0] as string;
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast.error(error?.message || "Upload failed");
      return null;
    }
  };

  const handleVideoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }

    // Validate file size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video file must be less than 100MB");
      return;
    }

    setVideoUploading(true);
    const url = await uploadFile(file, "video");
    if (url) {
      setVideoForm({ ...videoForm, videoUrl: url });
      toast.success("Video uploaded successfully");
    }
    setVideoUploading(false);
    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
  };

  const handleThumbnailUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file must be less than 10MB");
      return;
    }

    setThumbnailUploading(true);
    const url = await uploadFile(file, "image");
    if (url) {
      setVideoForm({ ...videoForm, thumbnailUrl: url });
      toast.success("Thumbnail uploaded successfully");
    }
    setThumbnailUploading(false);
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = "";
    }
  };

  // Mappings CRUD
  const handleSaveMapping = async () => {
    if (!selectedVideoForMapping) {
      toast.error("Please select a video first");
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
            videoId: selectedVideoForMapping,
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
      fetchMappings(selectedVideoForMapping);
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
        if (selectedVideoForMapping) {
          fetchMappings(selectedVideoForMapping);
        }
      } else {
        toast.error(data.message || "Failed to delete mapping");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete mapping");
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Video Library Management</h1>
      </div>

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
              <CardTitle>Fitness Videos</CardTitle>
              <Button
                onClick={() => {
                  setEditingVideo(null);
                  setVideoForm({
                    title: "",
                    titleZh: "",
                    description: "",
                    videoUrl: "",
                    thumbnailUrl: "",
                    duration: 0,
                    difficulty: "beginner",
                    gender: "unisex",
                    accessType: "free",
                    ageGroup: "all",
                    instructions: "",
                    status: "active",
                  });
                  setVideoDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Video
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Age Group</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videos.map((video) => (
                    <TableRow key={video.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{video.title}</div>
                          {video.titleZh && (
                            <div className="text-sm text-gray-500">
                              {video.titleZh}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            video.difficulty === "beginner"
                              ? "secondary"
                              : video.difficulty === "intermediate"
                                ? "default"
                                : "destructive"
                          }
                        >
                          {video.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{video.gender || "unisex"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{video.ageGroup || "all"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            video.accessType === "free"
                              ? "secondary"
                              : video.accessType === "premium"
                                ? "default"
                                : "destructive"
                          }
                        >
                          {video.accessType || "free"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {video.duration ? `${video.duration}s` : "-"}
                      </TableCell>
                      <TableCell>{video.viewCount}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            video.status === "active" ? "default" : "secondary"
                          }
                        >
                          {video.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingVideo(video);
                              setVideoForm({
                                title: video.title,
                                titleZh: video.titleZh || "",
                                description: video.description || "",
                                videoUrl: video.videoUrl,
                                thumbnailUrl: video.thumbnailUrl || "",
                                duration: video.duration || 0,
                                difficulty: video.difficulty,
                                gender: video.gender || "unisex",
                                accessType: video.accessType || "free",
                                ageGroup: video.ageGroup || "all",
                                instructions: video.instructions || "",
                                status: video.status,
                              });
                              setVideoDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteVideo(video.id)}
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
              {/* Select Video */}
              <div className="space-y-2">
                <Label>Select Video to Manage Mappings</Label>
                <Select
                  value={selectedVideoForMapping}
                  onValueChange={(v) => {
                    setSelectedVideoForMapping(v);
                    if (v) fetchMappings(v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a video" />
                  </SelectTrigger>
                  <SelectContent>
                    {videos.map((video) => (
                      <SelectItem key={video.id} value={video.id}>
                        {video.title} ({video.titleZh || "-"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add New Mapping */}
              {selectedVideoForMapping && (
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
              {selectedVideoForMapping && mappings.length > 0 && (
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

              {selectedVideoForMapping && mappings.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No mappings found for this video. Add one above.
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

      {/* Video Dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingVideo ? "Edit Video" : "Add Video"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Title (EN)</Label>
                <Input
                  value={videoForm.title}
                  onChange={(e) =>
                    setVideoForm({ ...videoForm, title: e.target.value })
                  }
                  placeholder="Video title"
                />
              </div>
              <div>
                <Label>Title (ZH)</Label>
                <Input
                  value={videoForm.titleZh}
                  onChange={(e) =>
                    setVideoForm({ ...videoForm, titleZh: e.target.value })
                  }
                  placeholder="视频标题"
                />
              </div>
            </div>
            <div>
              <Label>Video</Label>
              <input
                type="file"
                accept="video/*"
                ref={videoInputRef}
                onChange={handleVideoUpload}
                className="hidden"
              />
              {videoForm.videoUrl ? (
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                  <Video className="h-5 w-5 text-primary" />
                  <span className="flex-1 truncate text-sm">
                    {videoForm.videoUrl}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={videoUploading}
                  >
                    {videoUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setVideoForm({ ...videoForm, videoUrl: "" })}
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={videoUploading}
                >
                  {videoUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Video
                    </>
                  )}
                </Button>
              )}
            </div>
            <div>
              <Label>Thumbnail</Label>
              <input
                type="file"
                accept="image/*"
                ref={thumbnailInputRef}
                onChange={handleThumbnailUpload}
                className="hidden"
              />
              {videoForm.thumbnailUrl ? (
                <div className="space-y-2">
                  <div className="relative w-32 h-24 rounded-lg overflow-hidden border">
                    <img
                      src={videoForm.thumbnailUrl}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => thumbnailInputRef.current?.click()}
                      disabled={thumbnailUploading}
                    >
                      {thumbnailUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Change
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setVideoForm({ ...videoForm, thumbnailUrl: "" })
                      }
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => thumbnailInputRef.current?.click()}
                  disabled={thumbnailUploading}
                >
                  {thumbnailUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Thumbnail
                    </>
                  )}
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration (seconds)</Label>
                <Input
                  type="number"
                  value={videoForm.duration}
                  onChange={(e) =>
                    setVideoForm({
                      ...videoForm,
                      duration: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select
                  value={videoForm.difficulty}
                  onValueChange={(v) =>
                    setVideoForm({ ...videoForm, difficulty: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Gender</Label>
                <Select
                  value={videoForm.gender}
                  onValueChange={(v) =>
                    setVideoForm({ ...videoForm, gender: v })
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
                  value={videoForm.accessType}
                  onValueChange={(v) =>
                    setVideoForm({ ...videoForm, accessType: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="hidden">Hidden</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Age Group</Label>
                <Select
                  value={videoForm.ageGroup}
                  onValueChange={(v) =>
                    setVideoForm({ ...videoForm, ageGroup: v })
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
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={videoForm.description}
                onChange={(e) =>
                  setVideoForm({ ...videoForm, description: e.target.value })
                }
                placeholder="Video description"
              />
            </div>
            <div>
              <Label>Instructions</Label>
              <Textarea
                value={videoForm.instructions}
                onChange={(e) =>
                  setVideoForm({ ...videoForm, instructions: e.target.value })
                }
                placeholder="Exercise instructions"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={videoForm.status}
                onValueChange={(v) => setVideoForm({ ...videoForm, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVideoDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveVideo} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
