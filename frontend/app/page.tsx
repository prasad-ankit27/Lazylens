"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  PRESET_LAYOUTS,
  CATEGORIES_DATA,
  LayoutPreset,
  LayoutSlot,
  SlotTransform,
  TextElement,
  StickerElement,
} from "./presets";
import {
  Layers, ArrowLeftRight, Download, Upload, RefreshCw, Sparkles,
  CheckCircle2, Sliders, Image as ImageIcon, Copy, Check, Bot,
  GripVertical, ChevronUp, ChevronDown, Plus, Trash2, ChevronLeft,
  ChevronRight, Terminal, Type, Move, ZoomIn, ZoomOut, RotateCw,
  Palette, Grid, Film, BookOpen, Camera, Scissors, Search,
  SlidersHorizontal, X, ExternalLink, Home as HomeIcon, Layout,
  Folder, Settings, Wand2, Compass, Heart, Share2, Eye, EyeOff,
  Lock, Unlock, Maximize2, Minimize2, MousePointer, FlipHorizontal,
  FlipVertical, Crop, Magnet, MoreHorizontal, MoreVertical, Undo2,
  Redo2, Cloud, Sparkle, Smile, Sun, Ratio, CheckCheck, Square,
  AlignLeft, AlignCenter, AlignRight, AlertCircle,
} from "lucide-react";

interface CaptionSuggestion {
  tone: string;
  label: string;
  text: string;
}

interface TemplateRecommendation {
  layout_id: string;
  name: string;
  category?: string;
  photo_count: number;
  match_reason: string;
  score: number;
  preset: LayoutPreset;
}

interface CaptionPayload {
  summary?: string;
  aesthetic: string;
  witty: string;
  hinglish: string;
  hashtags: string[];
}

interface PhotoItem {
  id: string;
  url: string;
  file: File | null;
  name: string;
  isCustom?: boolean;
}

export interface CarouselSlide {
  id: string;
  presetId: string;
  photos: PhotoItem[];
  alignments: ("top" | "center" | "bottom")[];
  transforms: SlotTransform[];
  textElements: TextElement[];
  stickers?: StickerElement[];
}

const DEFAULT_DEMO_PHOTOS: PhotoItem[] = [
  { id: "p1", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1080&q=80", file: null, name: "Neon Cyberpunk Portrait" },
  { id: "p2", url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1080&q=80", file: null, name: "Mountain Lake Vista" },
  { id: "p3", url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1080&q=80", file: null, name: "Urban Street Style" },
  { id: "p4", url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1080&q=80", file: null, name: "Sunset Editorial Glow" },
];

const DEFAULT_TRANSFORM: SlotTransform = {
  scale: 1.0,
  offset_x: 0,
  offset_y: 0,
  rotation: 0,
  flip_h: false,
  flip_v: false,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  filter: "none",
  border_width: 0,
  border_color: "#ffffff",
  border_style: "none",
  shadow: false,
  locked: false,
  hidden: false,
};

export function getPresetSlotImageUrl(preset: LayoutPreset, slotIndex: number): string {
  if (preset && preset.sample_images && preset.sample_images.length > 0) {
    if (preset.sample_images[slotIndex]) {
      return preset.sample_images[slotIndex];
    }
    return preset.sample_images[slotIndex % preset.sample_images.length];
  }
  return DEFAULT_DEMO_PHOTOS[slotIndex % DEFAULT_DEMO_PHOTOS.length].url;
}

export function createSlideFromPreset(slideId: string, presetId: string): CarouselSlide {
  const preset = PRESET_LAYOUTS.find((p) => p.layout_id === presetId) || PRESET_LAYOUTS[0];
  const photos: PhotoItem[] = preset.slots.map((_, sIdx) => ({
    id: `photo_${preset.layout_id}_${slideId}_${sIdx}`,
    url: getPresetSlotImageUrl(preset, sIdx),
    file: null,
    name: `${preset.name} - Slot #${sIdx + 1}`,
  }));
  const transforms: SlotTransform[] = preset.slots.map(() => ({ ...DEFAULT_TRANSFORM }));
  const alignments: ("top" | "center" | "bottom")[] = preset.slots.map(() => "center" as const);
  
  // Clean initial composition: no auto-injected text or stickers
  const textElements: TextElement[] = [];
  const stickers: StickerElement[] = [];

  return {
    id: slideId,
    presetId: preset.layout_id,
    photos,
    alignments,
    transforms,
    textElements,
    stickers,
  };
}

interface TemplatePreviewProps {
  preset: LayoutPreset;
  active?: boolean;
  className?: string;
  onSelect?: () => void;
}

function TemplatePreview({ preset, active, className, onSelect }: TemplatePreviewProps) {
  const canvasWidth = preset.canvas?.width || 1080;
  const canvasHeight = preset.canvas?.height || 1350;
  const bgColor = preset.canvas?.background_color || "#121214";

  return (
    <div
      className={`template-thumb-preview ${className || ""}`}
      style={{
        position: "relative",
        aspectRatio: "4 / 5",
        width: "100%",
        backgroundColor: bgColor,
        borderRadius: "var(--r-md)",
        overflow: "hidden",
        border: active ? "2px solid var(--accent-violet-mid)" : "1px solid var(--border-faint)",
        cursor: onSelect ? "pointer" : "default",
      }}
      onClick={onSelect}
    >
      {/* Photo Slots only - clean, no extra decorative text or overlays */}
      {preset.slots.map((s) => {
        const imgUrl = getPresetSlotImageUrl(preset, s.slot_index);
        const leftPct = (s.x / canvasWidth) * 100;
        const topPct = (s.y / canvasHeight) * 100;
        const widthPct = (s.width / canvasWidth) * 100;
        const heightPct = (s.height / canvasHeight) * 100;
        const radiusPx = Math.max(1, Math.round((s.border_radius / canvasWidth) * 130));

        return (
          <div
            key={`thumb-slot-${preset.layout_id}-${s.slot_index}`}
            style={{
              position: "absolute",
              left: `${leftPct}%`,
              top: `${topPct}%`,
              width: `${widthPct}%`,
              height: `${heightPct}%`,
              borderRadius: `${radiusPx}px`,
              overflow: "hidden",
              backgroundColor: "#161b22",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}
          >
            <img
              src={imgUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: (s.fit_mode as any) || "cover",
                display: "block",
              }}
              onError={(e) => {
                const target = e.currentTarget;
                const fallback = DEFAULT_DEMO_PHOTOS[s.slot_index % DEFAULT_DEMO_PHOTOS.length].url;
                if (target.src !== fallback) {
                  target.src = fallback;
                }
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

const INITIAL_SLIDES: CarouselSlide[] = [
  {
    ...createSlideFromPreset("slide_1", "grid_2x2"),
    textElements: [
      {
        id: "text_initial_1",
        text: "Adventure",
        font: "Playfair Display",
        color: "#FFFFFF",
        size: 56,
        weight: 700,
        align: "center",
        letterSpacing: 1,
        lineHeight: 1.2,
        opacity: 100,
        x: 540,
        y: 675,
        rotation: 0,
        shadow: true,
        locked: false,
        hidden: false,
      },
    ],
  },
  createSlideFromPreset("slide_2", "wanderlust_pill"),
  createSlideFromPreset("slide_3", "cinematic_letterbox"),
];

const FILTER_PRESETS: { id: SlotTransform["filter"]; name: string; filter: string }[] = [
  { id: "none", name: "None", filter: "none" },
  { id: "natural", name: "Natural", filter: "contrast(1.05) saturate(1.08)" },
  { id: "vivid", name: "Vivid", filter: "contrast(1.15) saturate(1.25)" },
  { id: "film", name: "Film", filter: "sepia(0.2) contrast(1.1) brightness(0.95) saturate(0.9)" },
  { id: "bw", name: "B&W", filter: "grayscale(1) contrast(1.15)" },
  { id: "warm", name: "Warm", filter: "sepia(0.3) saturate(1.15) hue-rotate(-10deg)" },
];

export default function Home() {
  const [slides, setSlides] = useState<CarouselSlide[]>(INITIAL_SLIDES);
  const [history, setHistory] = useState<CarouselSlide[][]>([INITIAL_SLIDES]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);

  // Template selection state: starts null until user chooses a template
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set(["grid_2x2", "film_diary", "nature_escape"]));

  // Selection state (unified layer selection)
  const [selectedLayer, setSelectedLayer] = useState<{ type: "slot" | "text" | "sticker"; id: number | string } | null>({ type: "slot", id: 0 });
  const selectedSlotIndex = selectedLayer?.type === "slot" ? (selectedLayer.id as number) : null;
  const selectedTextId = selectedLayer?.type === "text" ? (selectedLayer.id as string) : null;
  const selectedStickerId = selectedLayer?.type === "sticker" ? (selectedLayer.id as string) : null;

  // Main Navigation View: dashboard, editor (Studio), templates, ai, projects
  const [appView, setAppView] = useState<"dashboard" | "editor" | "templates" | "ai" | "projects">("templates");

  // Right Inspector active tab
  const [rightInspectorTab, setRightInspectorTab] = useState<"edit" | "layers" | "ai">("edit");
  const [canvasTool, setCanvasTool] = useState<"select" | "move" | "crop" | "rotate" | "flip" | "fit" | "fill" | "text">("select");
  const [isTextPanelOpen, setIsTextPanelOpen] = useState<boolean>(true);
  const [showAllFilters, setShowAllFilters] = useState<boolean>(false);
  const [deleteConfirmSlideIndex, setDeleteConfirmSlideIndex] = useState<number | null>(null);
  const [isDeletingSlide, setIsDeletingSlide] = useState<boolean>(false);
  const [addSlideModalOpen, setAddSlideModalOpen] = useState<boolean>(false);
  const [addSlideStep, setAddSlideStep] = useState<"choice" | "templates">("choice");
  const [selectedTemplateForSlide, setSelectedTemplateForSlide] = useState<LayoutPreset | null>(null);
  const [templateSearchQuery, setTemplateSearchQuery] = useState<string>("");
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>("All");
  const [isAddingSlide, setIsAddingSlide] = useState<boolean>(false);

  // Canvas View Controls
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showGridGuides, setShowGridGuides] = useState<boolean>(true);
  const [isSnappingEnabled, setIsSnappingEnabled] = useState<boolean>(true);
  const [projectTitle, setProjectTitle] = useState<string>("Neon Moments Vol. 1");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Carousel Global Settings
  const [carouselRatio, setCarouselRatio] = useState<"1080x1350" | "1080x1080" | "1080x1920">("1080x1350");
  const [carouselDuration, setCarouselDuration] = useState<string>("0.5s");

  // AI & Processing States
  const [isAutoEnhanceEnabled, setIsAutoEnhanceEnabled] = useState<boolean>(true);
  const [isRendering, setIsRendering] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"jpg" | "png">("jpg");
  const [exportQuality, setExportQuality] = useState<number>(95);
  const [exportScope, setExportScope] = useState<"all" | "active">("all");

  const [renderedImageUrl, setRenderedImageUrl] = useState<string | null>(null);
  const [renderedSlides, setRenderedSlides] = useState<{ slide_index: number; slide_number: number; download_url: string; filename: string; layout_id?: string }[]>([]);
  const [modalPreviewIndex, setModalPreviewIndex] = useState<number>(0);
  const [zipDownloadUrl, setZipDownloadUrl] = useState<string | null>(null);
  const [captions, setCaptions] = useState<CaptionPayload | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [swapNotification, setSwapNotification] = useState<string | null>(null);

  // Dragging states
  const [draggedSlotIndex, setDraggedSlotIndex] = useState<number | null>(null);
  const [dragOverSlotIndex, setDragOverSlotIndex] = useState<number | null>(null);
  const [draggingSlot, setDraggingSlot] = useState<{ slotIndex: number; startX: number; startY: number; initialOffsetX: number; initialOffsetY: number } | null>(null);
  const [draggingText, setDraggingText] = useState<{ textId: string; startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const [draggingSticker, setDraggingSticker] = useState<{ stickerId: string; startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  // AI Studio interactive review modal
  const [activeAiModal, setActiveAiModal] = useState<"captions" | "layouts" | "enhance" | "bg" | "hashtags" | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);

  // Dedicated AI Captions state (Phase 1)
  const [generatedCaptions, setGeneratedCaptions] = useState<CaptionSuggestion[]>([]);
  const [recentCaptions, setRecentCaptions] = useState<string[]>([]);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState<boolean>(false);
  const [captionLoadingStep, setCaptionLoadingStep] = useState<string>("Analyzing slide photos with AI vision…");
  const [captionError, setCaptionError] = useState<string | null>(null);
  const [sceneSummary, setSceneSummary] = useState<string | null>(null);
  const [copiedCaptionIdx, setCopiedCaptionIdx] = useState<number | null>(null);

  // Dedicated Suggest Templates state (Phase 2)
  const [suggestedTemplates, setSuggestedTemplates] = useState<TemplateRecommendation[]>([]);
  const [recentTemplateIds, setRecentTemplateIds] = useState<string[]>([]);
  const [isSuggestingTemplates, setIsSuggestingTemplates] = useState<boolean>(false);
  const [templateLoadingStep, setTemplateLoadingStep] = useState<string>("Analyzing image style & composition…");
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<TemplateRecommendation | null>(null);
  const [previewModalTemplate, setPreviewModalTemplate] = useState<LayoutPreset | null>(null);
  const [confirmApplyModalTemplate, setConfirmApplyModalTemplate] = useState<LayoutPreset | null>(null);

  const [mediaLibraryPool, setMediaLibraryPool] = useState<PhotoItem[]>([
    ...DEFAULT_DEMO_PHOTOS,
    { id: "lib_1", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80", file: null, name: "Sunset Horizon" },
    { id: "lib_2", url: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=800&auto=format&fit=crop&q=80", file: null, name: "Studio Portrait" },
    { id: "lib_3", url: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&auto=format&fit=crop&q=80", file: null, name: "Tokyo City Lights" },
    { id: "lib_4", url: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&auto=format&fit=crop&q=80", file: null, name: "Alpine Fjord" },
  ]);

  const [savedProjects, setSavedProjects] = useState([
    { id: "proj_1", title: "Neon Moments Vol. 1", slidesCount: 3, updatedAt: "Just now", thumbnail: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80", presetName: "Balanced Quad (2x2)" },
    { id: "proj_2", title: "Mediterranean Wanderlust", slidesCount: 4, updatedAt: "2 hours ago", thumbnail: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80", presetName: "Wanderlust Pill" },
    { id: "proj_3", title: "Cinematic 35mm Tokyo", slidesCount: 5, updatedAt: "Yesterday", thumbnail: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80", presetName: "Cinematic Letterbox" },
    { id: "proj_4", title: "Editorial Fashion Lookbook", slidesCount: 3, updatedAt: "3 days ago", thumbnail: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80", presetName: "Editorial Split" },
  ]);

  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const batchUploadRef = useRef<HTMLInputElement | null>(null);

  const activeSlide = slides[activeSlideIndex] || slides[0];
  const activePreset: LayoutPreset = PRESET_LAYOUTS.find((p) => p.layout_id === activeSlide?.presetId) || PRESET_LAYOUTS[0];
  const photos = activeSlide?.photos || [];
  const alignments = activeSlide?.alignments || [];
  const transforms = activeSlide?.transforms || [];
  const textElements = activeSlide?.textElements || [];
  const stickers = activeSlide?.stickers || [];

  const activeSlotTransform: SlotTransform =
    selectedSlotIndex !== null && transforms[selectedSlotIndex]
      ? transforms[selectedSlotIndex]
      : { ...DEFAULT_TRANSFORM };

  const activeSelectedText: TextElement | undefined =
    selectedTextId
      ? textElements.find((t) => t.id === selectedTextId)
      : (canvasTool === "text" || isTextPanelOpen) && textElements.length > 0
      ? textElements[0]
      : undefined;

  const activeSelectedSticker: StickerElement | undefined =
    selectedStickerId ? stickers.find((s) => s.id === selectedStickerId) : undefined;

  // Toast feedback
  const showToast = (msg: string) => {
    setSwapNotification(msg);
    setTimeout(() => setSwapNotification(null), 3000);
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Push state to Undo/Redo history
  const pushHistory = useCallback((nextSlides: CarouselSlide[]) => {
    setHistory((prev) => {
      const slice = prev.slice(0, historyIndex + 1);
      return [...slice, nextSlides].slice(-30);
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  }, [historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const target = historyIndex - 1;
      setHistoryIndex(target);
      setSlides(history[target]);
      showToast("Undo applied");
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const target = historyIndex + 1;
      setHistoryIndex(target);
      setSlides(history[target]);
      showToast("Redo applied");
    }
  };

  // Keyboard shortcuts (Undo, Redo, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === "input" || targetTag === "textarea") return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedTextId) {
          e.preventDefault();
          handleDeleteTextElement(selectedTextId);
        } else if (selectedStickerId) {
          e.preventDefault();
          handleDeleteSticker(selectedStickerId);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyIndex, history, selectedTextId, selectedStickerId]);

  // Backend Health Polling
  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/health", { cache: "no-store" });
        if (res.ok && isMounted) setBackendStatus("online");
        else if (isMounted) setBackendStatus("offline");
      } catch {
        if (isMounted) setBackendStatus("offline");
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  // Update slide helper
  const updateActiveSlide = useCallback((updater: (prev: CarouselSlide) => CarouselSlide) => {
    setSlides((prev) => {
      const copy = [...prev];
      if (!copy[activeSlideIndex]) return prev;
      copy[activeSlideIndex] = updater(copy[activeSlideIndex]);
      pushHistory(copy);
      return copy;
    });
  }, [activeSlideIndex, pushHistory]);

  // Mouse pan interaction for slot
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingSlot) return;
      const stage = document.getElementById("canvas-preview-stage");
      const stageRect = stage?.getBoundingClientRect();
      const scaleFactor = stageRect ? 1080 / stageRect.width : 2.0;
      let deltaX = (e.clientX - draggingSlot.startX) * scaleFactor;
      let deltaY = (e.clientY - draggingSlot.startY) * scaleFactor;

      // Snapping to center
      if (isSnappingEnabled) {
        if (Math.abs(draggingSlot.initialOffsetX + deltaX) < 15) deltaX = -draggingSlot.initialOffsetX;
        if (Math.abs(draggingSlot.initialOffsetY + deltaY) < 15) deltaY = -draggingSlot.initialOffsetY;
      }

      updateActiveSlide((slide) => {
        const nextTransforms = [...(slide.transforms || [])];
        while (nextTransforms.length <= draggingSlot.slotIndex) nextTransforms.push({ ...DEFAULT_TRANSFORM });
        const current = nextTransforms[draggingSlot.slotIndex] || { ...DEFAULT_TRANSFORM };
        nextTransforms[draggingSlot.slotIndex] = {
          ...current,
          offset_x: Math.round(draggingSlot.initialOffsetX + deltaX),
          offset_y: Math.round(draggingSlot.initialOffsetY + deltaY),
        };
        return { ...slide, transforms: nextTransforms };
      });
    };
    const handleMouseUp = () => { if (draggingSlot) setDraggingSlot(null); };
    if (draggingSlot) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingSlot, isSnappingEnabled, updateActiveSlide]);

  // Mouse drag interaction for text
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingText) return;
      const stage = document.getElementById("canvas-preview-stage");
      const stageRect = stage?.getBoundingClientRect();
      const scaleFactorX = stageRect ? 1080 / stageRect.width : 2.0;
      const scaleFactorY = stageRect ? 1350 / stageRect.height : 2.0;
      let deltaX = (e.clientX - draggingText.startX) * scaleFactorX;
      let deltaY = (e.clientY - draggingText.startY) * scaleFactorY;

      updateActiveSlide((slide) => {
        const nextTexts = (slide.textElements || []).map((t) => {
          if (t.id === draggingText.textId) {
            let targetX = Math.round(draggingText.initialX + deltaX);
            let targetY = Math.round(draggingText.initialY + deltaY);
            if (isSnappingEnabled) {
              if (Math.abs(targetX - 540) < 20) targetX = 540;
              if (Math.abs(targetY - 675) < 20) targetY = 675;
            }
            return {
              ...t,
              x: Math.max(0, Math.min(1000, targetX)),
              y: Math.max(0, Math.min(1300, targetY)),
            };
          }
          return t;
        });
        return { ...slide, textElements: nextTexts };
      });
    };
    const handleMouseUp = () => { if (draggingText) setDraggingText(null); };
    if (draggingText) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingText, isSnappingEnabled, updateActiveSlide]);

  // Update transform for a specific slot
  const updateSlotTransform = (slotIndex: number, delta: Partial<SlotTransform>) => {
    updateActiveSlide((slide) => {
      const nextTransforms = [...(slide.transforms || [])];
      while (nextTransforms.length <= slotIndex) nextTransforms.push({ ...DEFAULT_TRANSFORM });
      nextTransforms[slotIndex] = { ...nextTransforms[slotIndex], ...delta };
      return { ...slide, transforms: nextTransforms };
    });
  };

  const handleResetSlotTransform = (slotIndex: number) => {
    updateActiveSlide((slide) => {
      const nextTransforms = [...(slide.transforms || [])];
      nextTransforms[slotIndex] = { ...DEFAULT_TRANSFORM };
      return { ...slide, transforms: nextTransforms };
    });
    showToast(`Reset transform for Slot #${slotIndex + 1}`);
  };

  // Wheel zoom on slot
  const handleSlotWheel = (slotIndex: number, e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentScale = transforms[slotIndex]?.scale || 1.0;
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    const newScale = Math.min(Math.max(0.5, currentScale + delta), 3.0);
    updateSlotTransform(slotIndex, { scale: Number(newScale.toFixed(2)) });
  };

  // Image replacement file input
  const handleFileChange = (slotIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      const newPhotoItem: PhotoItem = {
        id: `custom_${Date.now()}_${slotIndex}`,
        url: objectUrl,
        file: file,
        name: file.name,
        isCustom: true,
      };
      updateActiveSlide((slide) => {
        const nextPhotos = [...slide.photos];
        nextPhotos[slotIndex] = newPhotoItem;
        return { ...slide, photos: nextPhotos };
      });
      setMediaLibraryPool((prev) => [newPhotoItem, ...prev]);
      showToast(`Replaced photo in Slot #${slotIndex + 1}`);
    }
  };

  // Batch upload photos
  const handleBatchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newItems: PhotoItem[] = Array.from(files).map((f, i) => ({
        id: `upload_${Date.now()}_${i}`,
        url: URL.createObjectURL(f),
        file: f,
        name: f.name,
        isCustom: true,
      }));
      setMediaLibraryPool((prev) => [...newItems, ...prev]);
      updateActiveSlide((slide) => {
        const nextPhotos = [...slide.photos];
        newItems.forEach((item, idx) => {
          if (idx < nextPhotos.length) nextPhotos[idx] = item;
        });
        return { ...slide, photos: nextPhotos };
      });
      showToast(`Uploaded and assigned ${newItems.length} photos`);
    }
  };

  // Select a preset template
  const handleSelectPreset = (presetId: string) => {
    const preset = PRESET_LAYOUTS.find((p) => p.layout_id === presetId) || PRESET_LAYOUTS[0];
    setSelectedPresetId(presetId);
    updateActiveSlide((slide) => {
      const photos: PhotoItem[] = preset.slots.map((_, sIdx) => ({
        id: `photo_${preset.layout_id}_${sIdx}`,
        url: getPresetSlotImageUrl(preset, sIdx),
        file: null,
        name: `${preset.name} - Slot #${sIdx + 1}`,
      }));
      const transforms: SlotTransform[] = preset.slots.map(() => ({ ...DEFAULT_TRANSFORM }));
      const alignments: ("top" | "center" | "bottom")[] = preset.slots.map(() => "center" as const);
      return {
        ...slide,
        presetId: preset.layout_id,
        photos,
        transforms,
        alignments,
      };
    });
    showToast(`Applied ${preset.name} template`);
  };

  // Select a template from library and enter Studio
  const handleSelectTemplateCard = (preset: LayoutPreset) => {
    handleSelectPreset(preset.layout_id);
    setAppView("editor");
  };

  // Slide management
  const openAddSlideModal = () => {
    setAddSlideStep("choice");
    setSelectedTemplateForSlide(activePreset || PRESET_LAYOUTS[0]);
    setTemplateSearchQuery("");
    setTemplateCategoryFilter("All");
    setAddSlideModalOpen(true);
  };

  const handleAddNewSlide = () => {
    openAddSlideModal();
  };

  const handleAddBlankSlide = () => {
    if (isAddingSlide) return;
    setIsAddingSlide(true);
    const nextId = `slide_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const presetId = activePreset?.layout_id || PRESET_LAYOUTS[0].layout_id;
    const newSlide = createSlideFromPreset(nextId, presetId);
    setSlides((prev) => {
      const next = [...prev, newSlide];
      pushHistory(next);
      return next;
    });
    setActiveSlideIndex(slides.length);
    setSelectedLayer({ type: "slot", id: 0 });
    showToast("Added blank slide");
    setAddSlideModalOpen(false);
    setIsAddingSlide(false);
  };

  const confirmAddSlideFromTemplate = () => {
    if (!selectedTemplateForSlide || isAddingSlide) return;
    setIsAddingSlide(true);
    const nextId = `slide_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newSlide = createSlideFromPreset(nextId, selectedTemplateForSlide.layout_id);
    setSlides((prev) => {
      const next = [...prev, newSlide];
      pushHistory(next);
      return next;
    });
    setActiveSlideIndex(slides.length);
    setSelectedLayer({ type: "slot", id: 0 });
    showToast(`Added slide: ${selectedTemplateForSlide.name}`);
    setAddSlideModalOpen(false);
    setIsAddingSlide(false);
  };

  const handleDuplicateSlide = (idx: number) => {
    const source = slides[idx];
    const dup: CarouselSlide = {
      ...source,
      id: `slide_${Date.now()}`,
      photos: [...source.photos],
      transforms: source.transforms.map((t) => ({ ...t })),
      textElements: (source.textElements || []).map((t) => ({ ...t, id: `txt_${Date.now()}_${Math.random()}` })),
      stickers: (source.stickers || []).map((s) => ({ ...s, id: `stk_${Date.now()}_${Math.random()}` })),
    };
    setSlides((prev) => {
      const next = [...prev];
      next.splice(idx + 1, 0, dup);
      pushHistory(next);
      return next;
    });
    setActiveSlideIndex(idx + 1);
    showToast("Duplicated slide");
  };

  // Check if a slide contains edited content (text, stickers, custom photos, modified transforms)
  const isSlideEdited = (slide?: CarouselSlide): boolean => {
    if (!slide) return false;
    const hasCustomPhotos = (slide.photos || []).some((p) => p.file !== null || p.isCustom);
    const hasTextElements = (slide.textElements || []).length > 0;
    const hasStickers = (slide.stickers || []).length > 0;
    const hasCustomTransforms = (slide.transforms || []).some(
      (t) =>
        (t.scale !== undefined && t.scale !== 1.0) ||
        (t.rotation !== undefined && t.rotation !== 0) ||
        (t.brightness !== undefined && t.brightness !== 0) ||
        (t.contrast !== undefined && t.contrast !== 0) ||
        (t.saturation !== undefined && t.saturation !== 0) ||
        (t.warmth !== undefined && t.warmth !== 0) ||
        (t.filter && t.filter !== "none") ||
        t.flip_h ||
        t.flip_v
    );
    return hasCustomPhotos || hasTextElements || hasStickers || hasCustomTransforms;
  };

  const promptDeleteSlide = (idx: number) => {
    if (idx < 0 || idx >= slides.length) return;
    setDeleteConfirmSlideIndex(idx);
  };

  const confirmDeleteSlide = () => {
    if (deleteConfirmSlideIndex === null || isDeletingSlide) return;
    setIsDeletingSlide(true);

    const idxToDelete = deleteConfirmSlideIndex;
    const nextSlides = slides.filter((_, i) => i !== idxToDelete);

    let nextActiveIndex = activeSlideIndex;
    if (nextSlides.length === 0) {
      nextActiveIndex = 0;
    } else if (idxToDelete === activeSlideIndex) {
      nextActiveIndex = Math.min(idxToDelete, nextSlides.length - 1);
    } else if (idxToDelete < activeSlideIndex) {
      nextActiveIndex = activeSlideIndex - 1;
    }
    nextActiveIndex = Math.max(0, Math.min(nextActiveIndex, Math.max(0, nextSlides.length - 1)));

    setSlides(nextSlides);
    pushHistory(nextSlides);
    setActiveSlideIndex(nextActiveIndex);

    if (nextSlides.length > 0) {
      setSelectedLayer({ type: "slot", id: 0 });
    } else {
      setSelectedLayer(null);
    }

    showToast(`Deleted Slide #${idxToDelete + 1}`);
    setDeleteConfirmSlideIndex(null);
    setIsDeletingSlide(false);
  };

  const handleDeleteSlide = (idx: number) => {
    promptDeleteSlide(idx);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (addSlideModalOpen && !isAddingSlide) {
          setAddSlideModalOpen(false);
        } else if (deleteConfirmSlideIndex !== null && !isDeletingSlide) {
          setDeleteConfirmSlideIndex(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addSlideModalOpen, isAddingSlide, deleteConfirmSlideIndex, isDeletingSlide]);

  // Text element actions
  const handleAddTextElement = (preset?: Partial<TextElement>) => {
    const newText: TextElement = {
      id: `text_${Date.now()}`,
      text: preset?.text || "Adventure",
      font: preset?.font || "Playfair Display",
      color: preset?.color || "#FFFFFF",
      size: preset?.size || 56,
      weight: preset?.weight || 700,
      align: preset?.align || "center",
      letterSpacing: preset?.letterSpacing || 1,
      lineHeight: preset?.lineHeight || 1.2,
      opacity: preset?.opacity || 100,
      x: preset?.x || 540,
      y: preset?.y || 675,
      rotation: preset?.rotation || 0,
      shadow: preset?.shadow ?? true,
      locked: false,
      hidden: false,
    };
    updateActiveSlide((s) => ({
      ...s,
      textElements: [...(s.textElements || []), newText],
    }));
    setSelectedLayer({ type: "text", id: newText.id });
    setCanvasTool("text");
    setIsTextPanelOpen(true);
    setRightInspectorTab("edit");
    showToast("Added text layer");
  };

  const handleDeleteTextElement = (textId: string) => {
    updateActiveSlide((s) => ({
      ...s,
      textElements: (s.textElements || []).filter((t) => t.id !== textId),
    }));
    setSelectedLayer(null);
    showToast("Removed text layer");
  };

  const handleDeleteSticker = (stickerId: string) => {
    updateActiveSlide((s) => ({
      ...s,
      stickers: (s.stickers || []).filter((stk) => stk.id !== stickerId),
    }));
    setSelectedLayer(null);
    showToast("Removed sticker");
  };

  // Copy helper
  const handleCopy = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Compile slide into File via client-side canvas
  const compileSlideToFile = async (slide: CarouselSlide, index: number): Promise<File> => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = carouselRatio === "1080x1080" ? 1080 : carouselRatio === "1080x1920" ? 1920 : 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D context");

    const preset = PRESET_LAYOUTS.find((p) => p.layout_id === slide.presetId) || PRESET_LAYOUTS[0];
    ctx.fillStyle = preset.canvas.background_color || "#080a0f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let sIdx = 0; sIdx < preset.slots.length; sIdx++) {
      const slot = preset.slots[sIdx];
      const photo = slide.photos[sIdx] || { url: getPresetSlotImageUrl(preset, sIdx) };
      const t = slide.transforms[sIdx] || DEFAULT_TRANSFORM;
      if (t.hidden) continue;

      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.crossOrigin = "anonymous";
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error("Image load error"));
          image.src = photo.url;
        });

        ctx.save();
        ctx.beginPath();
        if (slot.border_radius > 0) {
          ctx.roundRect(slot.x, slot.y, slot.width, slot.height, slot.border_radius);
        } else {
          ctx.rect(slot.x, slot.y, slot.width, slot.height);
        }
        ctx.clip();

        ctx.translate(slot.x + slot.width / 2 + (t.offset_x || 0), slot.y + slot.height / 2 + (t.offset_y || 0));
        if (t.rotation) ctx.rotate((t.rotation * Math.PI) / 180);
        ctx.scale((t.flip_h ? -1 : 1) * (t.scale || 1.0), (t.flip_v ? -1 : 1) * (t.scale || 1.0));

        const imgAspect = (img.width || 1) / (img.height || 1);
        const slotAspect = slot.width / slot.height;
        let rw = slot.width;
        let rh = slot.height;
        if (imgAspect > slotAspect) rw = slot.height * imgAspect;
        else rh = slot.width / imgAspect;

        ctx.drawImage(img, -rw / 2, -rh / 2, rw, rh);
        ctx.restore();
      } catch (e) {
        console.warn("Failed to render slot for file:", e);
      }
    }

    // Text layers
    for (const te of slide.textElements || []) {
      if (te.hidden) continue;
      ctx.save();
      ctx.translate(te.x, te.y);
      if (te.rotation) ctx.rotate((te.rotation * Math.PI) / 180);
      ctx.fillStyle = te.color || "#FFFFFF";
      ctx.font = `${te.weight || 700} ${te.size || 24}px "${te.font || "Plus Jakarta Sans"}", sans-serif`;
      ctx.textAlign = (te.align as any) || "left";
      if (te.shadow) {
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 2;
      }
      ctx.fillText(te.text, 0, 0);
      ctx.restore();
    }

    return new Promise<File>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], `carousel_slide_${index + 1}.${exportFormat === "png" ? "png" : "jpg"}`, {
            type: exportFormat === "png" ? "image/png" : "image/jpeg",
          }));
        } else {
          reject(new Error("Canvas blob generation failed"));
        }
      }, exportFormat === "png" ? "image/png" : "image/jpeg", exportQuality / 100);
    });
  };

  // Native Web Share API integration
  const handleShare = async (imageFiles: File[]) => {
    if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: imageFiles })) {
      try {
        await navigator.share({
          title: "My LazyLens Carousel",
          text: "Check out this carousel I made with LazyLens Studio!",
          files: imageFiles,
        });
        showToast("Shared successfully!");
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("Error sharing:", error);
          showToast("Failed to share carousel.");
        }
      }
    } else if (typeof navigator !== "undefined" && navigator.canShare && imageFiles.length > 0 && navigator.canShare({ files: [imageFiles[0]] })) {
      try {
        await navigator.share({
          title: "My LazyLens Carousel",
          text: "Check out this carousel I made with LazyLens Studio!",
          files: [imageFiles[0]],
        });
        showToast("Shared slide successfully!");
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("Error sharing:", error);
          showToast("Failed to share slide.");
        }
      }
    } else {
      showToast("Native sharing is not supported on this browser. Please use the Export button.");
      alert("Native sharing is not supported on this browser. Please use the Export button.");
    }
  };

  const handleShareAction = async () => {
    setIsSharing(true);
    try {
      showToast("Compiling carousel for sharing…");
      const imageFiles: File[] = [];

      if (renderedSlides && renderedSlides.length > 0) {
        for (let i = 0; i < renderedSlides.length; i++) {
          try {
            const res = await fetch(`http://localhost:8000${renderedSlides[i].download_url}`);
            if (res.ok) {
              const blob = await res.blob();
              imageFiles.push(new File([blob], `carousel_slide_${i + 1}.jpg`, { type: "image/jpeg" }));
            }
          } catch {
            // fallback
          }
        }
      }

      if (imageFiles.length === 0) {
        for (let i = 0; i < slides.length; i++) {
          const file = await compileSlideToFile(slides[i], i);
          imageFiles.push(file);
        }
      }

      await handleShare(imageFiles);
    } catch (err: any) {
      console.error("Share error:", err);
      showToast("Could not prepare images for sharing.");
    } finally {
      setIsSharing(false);
    }
  };

  // Backend Render API call
  const handleRenderBackend = async () => {
    setIsRendering(true);
    setExportProgress(15);
    try {
      const formData = new FormData();
      const manifest = slides.map((slide, sIdx) => {
        const preset = PRESET_LAYOUTS.find((p) => p.layout_id === slide.presetId) || PRESET_LAYOUTS[0];
        const slotCount = preset.slots.length;
        const photoKeys: string[] = [];

        for (let i = 0; i < slotCount; i++) {
          const photo = slide.photos[i] || { url: getPresetSlotImageUrl(preset, i) };
          const key = `slide_${sIdx}_slot_${i}`;
          photoKeys.push(key);
          if (photo.file) {
            formData.append(key, photo.file);
          } else {
            formData.append(`${key}_url`, photo.url);
          }
        }

        return {
          slide_number: sIdx + 1,
          layout_id: slide.presetId,
          alignments: slide.alignments,
          transforms: slide.transforms,
          text_elements: slide.textElements,
          stickers: slide.stickers,
          photo_keys: photoKeys,
        };
      });

      formData.append("manifest", JSON.stringify(manifest));
      formData.append("format", exportFormat);
      formData.append("quality", exportQuality.toString());
      formData.append("ratio", carouselRatio);
      formData.append("auto_enhance", isAutoEnhanceEnabled ? "true" : "false");

      setExportProgress(45);
      const res = await fetch("http://localhost:8000/api/render-carousel", {
        method: "POST",
        body: formData,
      });

      setExportProgress(80);
      if (!res.ok) throw new Error("Render failed");
      const data = await res.json();

      if (data.status === "success" && data.slides?.length > 0) {
        setRenderedSlides(data.slides);
        setRenderedImageUrl(`http://localhost:8000${data.slides[0].download_url}`);
        if (data.zip_url) setZipDownloadUrl(`http://localhost:8000${data.zip_url}`);
        setIsExportModalOpen(true);
        showToast("Carousel rendered successfully!");
      }
    } catch (err: any) {
      console.warn("Backend render error, falling back to client render:", err);
      try {
        const clientFile = await compileSlideToFile(activeSlide, activeSlideIndex);
        const clientUrl = URL.createObjectURL(clientFile);
        setRenderedImageUrl(clientUrl);
        setRenderedSlides([{
          slide_index: 0,
          slide_number: 1,
          download_url: clientUrl,
          filename: `carousel_slide_1.${exportFormat}`,
        }]);
        setIsExportModalOpen(true);
        showToast("Rendered composition via client engine");
      } catch (e2) {
        showToast("Export failed.");
      }
    } finally {
      setIsRendering(false);
      setExportProgress(100);
    }
  };

  // Resolves image to data URL or path for context-aware multi-image AI analysis
  const getClientImagePayload = async (photo: PhotoItem): Promise<string> => {
    if (photo.file) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(photo.url);
        reader.readAsDataURL(photo.file!);
      });
    }
    if (photo.url && photo.url.startsWith("blob:")) {
      try {
        const blobRes = await fetch(photo.url);
        const blob = await blobRes.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(photo.url);
          reader.readAsDataURL(blob);
        });
      } catch {
        return photo.url;
      }
    }
    return photo.url || "";
  };

  // Phase 1: Context-Aware Caption Generation (analyzes all images in active slide)
  const handleGenerateCaptions = async (isRefresh = false) => {
    if (isGeneratingCaptions) return;
    setIsGeneratingCaptions(true);
    setCaptionError(null);
    setCaptionLoadingStep("Analyzing slide photos with AI vision…");

    // Gather all photos belonging to the current slide context
    const slidePhotos = activeSlide?.photos || [];
    const resolvedUrls = await Promise.all(slidePhotos.map(getClientImagePayload));
    const imageUrls = resolvedUrls.filter(Boolean);

    // Fallback if slide has no photos: use active template sample images
    if (imageUrls.length === 0 && activePreset?.sample_images) {
      imageUrls.push(...activePreset.sample_images);
    }

    if (imageUrls.length === 0) {
      setCaptionError("No images found on the active slide to analyze.");
      setIsGeneratingCaptions(false);
      return;
    }

    const stepTimer = setTimeout(() => {
      setCaptionLoadingStep("Synthesizing 5 distinct perspective captions…");
    }, 4500);

    try {
      const res = await fetch("/api/ai/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: imageUrls,
          recent_captions: recentCaptions,
          title: projectTitle,
          template_name: activePreset?.name,
        }),
      });

      clearTimeout(stepTimer);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Caption generation failed (${res.status})`);
      }

      if (data.captions && Array.isArray(data.captions) && data.captions.length > 0) {
        setGeneratedCaptions(data.captions);
        setSceneSummary(data.scene_summary || null);

        // Track normalized recent captions to avoid repetition across refreshes
        const newTexts = data.captions.map((c: CaptionSuggestion) => c.text);
        setRecentCaptions((prev) => {
          const combined = [...prev, ...newTexts];
          return combined.slice(-25);
        });

        showToast(isRefresh ? "Refreshed 5 new captions" : "Generated 5 tailored captions");
      } else {
        throw new Error("Received empty captions list from generation service.");
      }
    } catch (err: any) {
      console.error("Caption generation error:", err);
      setCaptionError(err?.message || "Failed to generate captions. Please check that Ollama AI service is running.");
      showToast("AI Service Error: Failed to generate captions");
    } finally {
      clearTimeout(stepTimer);
      setIsGeneratingCaptions(false);
    }
  };

  const handleCopyCaption = (text: string, index: number) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedCaptionIdx(index);
    showToast("Caption copied to clipboard");
    setTimeout(() => {
      setCopiedCaptionIdx(null);
    }, 2000);
  };

  const handleApplyCaptionToCanvas = (text: string) => {
    handleAddTextElement({
      text: text,
      font: "Inter",
      size: 34,
    });
    showToast("Added caption as text layer to slide");
  };

  // Dedicated Suggest Templates Handlers (Phase 2)
  const handleSuggestTemplates = async (isRefresh: boolean = false) => {
    if (isSuggestingTemplates) return;

    setIsSuggestingTemplates(true);
    setTemplateError(null);
    setTemplateLoadingStep("Analyzing image style & composition…");

    const imageUrls = (activeSlide?.photos || [])
      .map((p) => p.url)
      .filter((u): u is string => typeof u === "string" && u.trim().length > 0);

    const stepTimer = setTimeout(() => {
      setTemplateLoadingStep("Scoring library layouts & visual balance…");
    }, 1800);

    try {
      const res = await fetch("/api/ai/suggest-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: imageUrls,
          recent_template_ids: isRefresh ? recentTemplateIds : [],
          current_preset_id: activePreset?.layout_id || "",
          current_photo_count: activeSlide?.photos?.length || 4,
          scene_summary: sceneSummary || null,
        }),
      });

      clearTimeout(stepTimer);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Template recommendation failed (${res.status})`);
      }

      if (data.recommendations && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        setSuggestedTemplates(data.recommendations);
        if (data.scene_summary && !sceneSummary) {
          setSceneSummary(data.scene_summary);
        }

        // Track recent template IDs to avoid duplicate recommendations on refresh
        const newIds = data.recommendations.map((r: TemplateRecommendation) => r.layout_id);
        setRecentTemplateIds((prev) => {
          const combined = [...prev, ...newIds];
          return combined.slice(-20);
        });

        if (data.recommendations.length > 0) {
          setSelectedRecommendation(data.recommendations[0]);
        }

        showToast(isRefresh ? "Refreshed layout recommendations" : `Found ${data.recommendations.length} matching layouts`);
      } else {
        throw new Error("No matching templates found for current collection.");
      }
    } catch (err: any) {
      console.error("Template recommendation error:", err);
      setTemplateError(err?.message || "Failed to recommend templates. Please check service status.");
      showToast("AI Service Error: Failed to recommend templates");
    } finally {
      clearTimeout(stepTimer);
      setIsSuggestingTemplates(false);
    }
  };

  const handleInitiateApplyTemplate = (preset: LayoutPreset) => {
    setSelectedRecommendation((prev) =>
      prev?.preset?.layout_id === preset.layout_id
        ? prev
        : {
            layout_id: preset.layout_id,
            name: preset.name,
            category: preset.category || "General",
            photo_count: preset.slots.length,
            match_reason: `Matches aesthetic for ${preset.slots.length} photos`,
            score: 90,
            preset,
          }
    );

    // If active slide has content or different slot count, show safe confirmation dialog
    if (activeSlide && (isSlideEdited(activeSlide) || activeSlide.photos.length !== preset.slots.length || activeSlide.presetId !== preset.layout_id)) {
      setConfirmApplyModalTemplate(preset);
    } else {
      handleApplyTemplate(preset, "replace");
    }
  };

  const handleApplyTemplate = (preset: LayoutPreset, mode: "replace" | "new_slide") => {
    if (mode === "new_slide") {
      const nextId = `slide_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      // Map current slide's photos into new slide slots
      const newPhotos: PhotoItem[] = preset.slots.map((_, sIdx) => {
        if (activeSlide?.photos && activeSlide.photos[sIdx]) {
          return {
            ...activeSlide.photos[sIdx],
            id: `photo_${preset.layout_id}_${nextId}_${sIdx}`,
          };
        }
        return {
          id: `photo_${preset.layout_id}_${nextId}_${sIdx}`,
          url: getPresetSlotImageUrl(preset, sIdx),
          file: null,
          name: `${preset.name} - Slot #${sIdx + 1}`,
        };
      });

      const newSlide: CarouselSlide = {
        id: nextId,
        presetId: preset.layout_id,
        photos: newPhotos,
        alignments: preset.slots.map(() => "center" as const),
        transforms: preset.slots.map(() => ({ ...DEFAULT_TRANSFORM })),
        textElements: (activeSlide?.textElements || []).map((t) => ({ ...t, id: `txt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` })),
        stickers: (activeSlide?.stickers || []).map((s) => ({ ...s, id: `stk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` })),
      };

      setSlides((prev) => {
        const next = [...prev, newSlide];
        pushHistory(next);
        return next;
      });
      setActiveSlideIndex(slides.length);
      setSelectedLayer({ type: "slot", id: 0 });
      showToast(`Added new slide with "${preset.name}"`);
    } else {
      // Replace layout of current slide while preserving existing photos and text elements
      const updatedPhotos: PhotoItem[] = preset.slots.map((_, sIdx) => {
        if (activeSlide?.photos && activeSlide.photos[sIdx]) {
          return activeSlide.photos[sIdx];
        }
        return {
          id: `photo_${preset.layout_id}_${activeSlide?.id || "slide"}_${sIdx}`,
          url: getPresetSlotImageUrl(preset, sIdx),
          file: null,
          name: `${preset.name} - Slot #${sIdx + 1}`,
        };
      });

      const updatedTransforms: SlotTransform[] = preset.slots.map((_, sIdx) => {
        if (activeSlide?.transforms && activeSlide.transforms[sIdx]) {
          return { ...activeSlide.transforms[sIdx] };
        }
        return { ...DEFAULT_TRANSFORM };
      });

      const updatedAlignments = preset.slots.map((_, sIdx) => {
        return (activeSlide?.alignments && activeSlide.alignments[sIdx]) || "center";
      });

      setSlides((prev) => {
        const next = prev.map((slide, idx) => {
          if (idx !== activeSlideIndex) return slide;
          return {
            ...slide,
            presetId: preset.layout_id,
            photos: updatedPhotos,
            transforms: updatedTransforms,
            alignments: updatedAlignments,
          };
        });
        pushHistory(next);
        return next;
      });
      setSelectedLayer({ type: "slot", id: 0 });
      showToast(`Applied "${preset.name}" to Slide ${activeSlideIndex + 1}`);
    }

    setConfirmApplyModalTemplate(null);
    setPreviewModalTemplate(null);
  };

  // AI Actions Trigger
  const handleTriggerAiAction = async (action: "captions" | "layouts" | "enhance" | "bg" | "hashtags") => {
    setActiveAiModal(action);

    if (action === "captions") {
      // Trigger context-aware caption generation if not already generated
      if (generatedCaptions.length === 0 && !isGeneratingCaptions) {
        handleGenerateCaptions(false);
      }
      return;
    }

    if (action === "layouts") {
      // Trigger context-aware template recommendations if not already generated
      if (suggestedTemplates.length === 0 && !isSuggestingTemplates) {
        handleSuggestTemplates(false);
      }
      return;
    }

    setAiSuggestions(null);
    showToast(`AI Studio: Analyzing ${action}…`);

    try {
      const res = await fetch("http://localhost:8000/api/ai-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          preset_id: activePreset.layout_id,
          photo_count: activePreset.slots.length,
          title: projectTitle,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiSuggestions(data.result);
      } else {
        if (action === "hashtags") {
          setAiSuggestions({
            tags: ["#photogram", "#creativeflow", "#visualstory", "#lazylens", "#contentcreator", "#aestheticpost"],
          });
        }
      }
    } catch {
      if (action === "hashtags") {
        setAiSuggestions({
          tags: ["#lazylens", "#visualstory", "#aesthetic"],
        });
      }
    }
  };

  // Filter templates by search and category
  const filteredTemplates = PRESET_LAYOUTS.filter((preset) => {
    const matchesSearch =
      preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (preset.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      preset.layout_id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedCategory === "All") return true;

    const catLower = selectedCategory.toLowerCase();
    const presetCatLower = (preset.category || "").toLowerCase();
    const presetNameLower = preset.name.toLowerCase();

    if (catLower === "minimal") {
      return presetCatLower.includes("minimal") || presetNameLower.includes("minimal");
    }
    return presetCatLower.includes(catLower) || presetNameLower.includes(catLower);
  });

  // Layer list for Inspector
  const unifiedLayers: { type: "slot" | "text" | "sticker"; id: number | string; title: string; locked?: boolean; hidden?: boolean }[] = [];
  activePreset.slots.forEach((s) => {
    const t = transforms[s.slot_index] || DEFAULT_TRANSFORM;
    unifiedLayers.push({
      type: "slot",
      id: s.slot_index,
      title: `Slot #${s.slot_index + 1} (${photos[s.slot_index]?.name?.slice(0, 14) || "Photo"})`,
      locked: t.locked,
      hidden: t.hidden,
    });
  });

  textElements.forEach((te) => {
    unifiedLayers.push({
      type: "text",
      id: te.id,
      title: `Text: "${te.text.slice(0, 16)}"`,
      locked: te.locked,
      hidden: te.hidden,
    });
  });

  stickers.forEach((stk) => {
    unifiedLayers.push({
      type: "sticker",
      id: stk.id,
      title: `${stk.name}${stk.content ? `: ${stk.content.slice(0, 12)}` : ""}`,
      locked: stk.locked,
      hidden: stk.hidden,
    });
  });

  // Navigation Items matching the reference image layout
  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: HomeIcon },
    { id: "templates", label: "Templates", icon: Layers },
    { id: "editor", label: "Studio", icon: Sliders },
    { id: "ai", label: "AI Studio", icon: Wand2 },
    { id: "projects", label: "Projects", icon: Folder },
  ] as const;

  return (
    <div className="app-root">
      {/* Hidden file inputs */}
      <input type="file" ref={batchUploadRef} onChange={handleBatchUpload} multiple accept="image/*" className="file-input-hidden" />

      {/* ── 1. Main Fixed Vertical Sidebar ──────────────────────────────── */}
      <aside className="main-vertical-sidebar">
        {/* Top Brand Logo */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">
            <Layers size={17} color="#fff" strokeWidth={2.5} />
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">LazyLens</span>
            <span className="sidebar-brand-badge">STUDIO</span>
          </div>
        </div>

        {/* Vertical Navigation Items */}
        <nav className="sidebar-nav-list">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            // Mutually exclusive active state
            const isActive = appView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setAppView(item.id)}
                className={`sidebar-nav-item${isActive ? " active" : ""}`}
                title={item.label}
              >
                <div className="sidebar-nav-icon">
                  <Icon size={16} />
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom User Profile (Storage Indicator removed as requested) */}
        <div className="sidebar-bottom-block">
          <div className="user-profile-chip">
            <div className="user-avatar">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" alt="Ankit Prasad" />
            </div>
            <div className="user-info">
              <span className="user-name">Ankit Prasad</span>
              <span className="user-plan">Free Plan</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── 2. Main App Viewport ────────────────────────────────────────── */}
      <div className="app-main-viewport">
        {/* ── VIEW: TEMPLATE LIBRARY (Dedicated Page) ────────────────────── */}
        {appView === "templates" ? (
          <div className="template-library-page">
            <div className="template-library-container">
              {/* Header */}
              <div className="template-library-header">
                <h1 className="template-library-title">Templates</h1>
                <p className="template-library-subtitle">Choose a template to start creating</p>
              </div>

              {/* Search & Filter Row */}
              <div className="template-library-search-row">
                <div className="template-library-search-box">
                  <Search size={15} color="var(--text-muted)" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search templates..."
                    className="template-library-search-input"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="search-clear"><X size={13} /></button>
                  )}
                </div>
                <button className="template-filter-icon-btn" title="Filter options">
                  <SlidersHorizontal size={15} />
                </button>
              </div>

              {/* Category Filter Pills: All, Aesthetic, Minimal, Film, Scrapbook, Travel, Magazine, Cinematic */}
              <div className="template-categories-bar">
                {["All", "Aesthetic", "Minimal", "Film", "Scrapbook", "Travel", "Magazine", "Cinematic"].map((cat) => {
                  const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`template-category-chip${isActive ? " active" : ""}`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* 3-Column Template Grid */}
              <div className="template-gallery-grid">
                {filteredTemplates.map((preset) => {
                  const isSelected = selectedPresetId === preset.layout_id;
                  const isFav = favorites.has(preset.layout_id);
                  return (
                    <div
                      key={preset.layout_id}
                      onClick={() => handleSelectTemplateCard(preset)}
                      className={`template-library-card${isSelected ? " active" : ""}`}
                    >
                      <div className="template-card-preview-box">
                        <TemplatePreview preset={preset} active={isSelected} />
                        {isSelected && (
                          <div className="template-active-badge">
                            <Check size={11} color="#fff" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <div className="template-card-meta-row">
                        <div>
                          <div className="template-card-name-text">{preset.name}</div>
                          <div className="template-card-slots-badge">{preset.slots.length} Slots</div>
                        </div>
                        <button
                          className="template-card-fav-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(preset.layout_id);
                          }}
                          title="Favorite"
                        >
                          <Heart
                            size={15}
                            color={isFav ? "var(--accent-rose)" : "var(--text-faint)"}
                            fill={isFav ? "var(--accent-rose)" : "none"}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : appView === "editor" ? (
          /* ── VIEW: STUDIO EDITOR ──────────────────────────────────────── */
          selectedPresetId === null ? (
            /* Studio Empty State if no template selected yet */
            <div className="studio-empty-state">
              <div className="empty-state-card">
                <div className="empty-state-icon-circle">
                  <Layout size={30} />
                </div>
                <h3 className="empty-state-heading">No Template Selected</h3>
                <p className="empty-state-subtext">
                  Choose a template from our curated library to start editing your carousel composition.
                </p>
                <button className="btn-primary" onClick={() => setAppView("templates")}>
                  <Compass size={14} />
                  <span>Choose a Template</span>
                </button>
              </div>
            </div>
          ) : (
            /* Studio Full Editor */
            <>
              {/* Top Header Bar */}
              <header className="top-navbar">
                <div className="top-navbar-left">
                  {/* Clean header left */}
                </div>

                <div className="navbar-right">
                  <select
                    className="ratio-select"
                    value={zoomLevel}
                    onChange={(e) => setZoomLevel(Number(e.target.value))}
                    style={{ marginRight: 4 }}
                  >
                    <option value={50}>50%</option>
                    <option value={75}>75%</option>
                    <option value={100}>100%</option>
                    <option value={125}>125%</option>
                    <option value={150}>150%</option>
                  </select>

                  <button className="btn-ghost" onClick={() => setZoomLevel(100)} title="Fit to screen">
                    Fit
                  </button>

                  <div style={{ display: "flex", alignItems: "center", gap: 3, margin: "0 6px" }}>
                    <button className="btn-ghost" onClick={handleUndo} disabled={historyIndex <= 0} title="Undo (Ctrl+Z)">
                      <Undo2 size={13} />
                    </button>
                    <button className="btn-ghost" onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Y)">
                      <Redo2 size={13} />
                    </button>
                  </div>

                  <button className="btn-primary" onClick={handleRenderBackend} disabled={isRendering}>
                    <Sparkles size={13} />
                    <span>{isRendering ? "Exporting…" : "Export"}</span>
                  </button>

                  <button className="btn-ghost" onClick={handleShareAction} disabled={isSharing || isRendering} title="Share carousel">
                    <Share2 size={13} />
                    <span>{isSharing ? "Preparing…" : "Share"}</span>
                  </button>
                </div>
              </header>

              {/* Studio Body (Central Canvas + Right Inspector) */}
              <div className="studio-body">
                {/* ── Center Canvas Stage ───────────────────────────────── */}
                <section className="canvas-stage-area">
                  {/* Single Top Horizontal Toolbar */}
                  <div className="canvas-toolbar-horizontal" style={{ marginTop: 12 }}>
                    <button
                      className={`toolbar-tool-btn${canvasTool === "select" ? " active" : ""}`}
                      onClick={() => setCanvasTool("select")}
                      title="Select element"
                    >
                      <MousePointer size={13} />
                      <span>Select</span>
                    </button>

                    <button
                      className={`toolbar-tool-btn${canvasTool === "move" ? " active" : ""}`}
                      onClick={() => setCanvasTool("move")}
                      title="Move pan mode"
                    >
                      <Move size={13} />
                      <span>Move</span>
                    </button>

                    <button
                      className={`toolbar-tool-btn${canvasTool === "crop" ? " active" : ""}`}
                      onClick={() => {
                        setCanvasTool("crop");
                        if (selectedSlotIndex !== null) setRightInspectorTab("edit");
                      }}
                      title="Crop image"
                    >
                      <Crop size={13} />
                      <span>Crop</span>
                    </button>

                    <button
                      className="toolbar-tool-btn"
                      onClick={() => {
                        if (selectedSlotIndex !== null) {
                          updateSlotTransform(selectedSlotIndex, {
                            rotation: ((activeSlotTransform.rotation || 0) + 90) % 360,
                          });
                        }
                      }}
                      title="Rotate 90 degrees"
                    >
                      <RotateCw size={13} />
                      <span>Rotate</span>
                    </button>

                    <button
                      className="toolbar-tool-btn"
                      onClick={() => {
                        if (selectedSlotIndex !== null) {
                          updateSlotTransform(selectedSlotIndex, {
                            flip_h: !activeSlotTransform.flip_h,
                          });
                          showToast(activeSlotTransform.flip_h ? "Reset Flip H" : "Flip Horizontal");
                        }
                      }}
                      title="Flip horizontally"
                    >
                      <FlipHorizontal size={13} />
                      <span>Flip H</span>
                    </button>

                    <button
                      className="toolbar-tool-btn"
                      onClick={() => {
                        if (selectedSlotIndex !== null) {
                          updateSlotTransform(selectedSlotIndex, {
                            flip_v: !activeSlotTransform.flip_v,
                          });
                          showToast(activeSlotTransform.flip_v ? "Reset Flip V" : "Flip Vertical");
                        }
                      }}
                      title="Flip vertically"
                    >
                      <FlipVertical size={13} />
                      <span>Flip V</span>
                    </button>

                    <button
                      className="toolbar-tool-btn"
                      onClick={() => {
                        if (selectedSlotIndex !== null) {
                          updateSlotTransform(selectedSlotIndex, { scale: 1.0 });
                          showToast("Fit image to slot");
                        }
                      }}
                      title="Fit image inside slot"
                    >
                      <Minimize2 size={13} />
                      <span>Fit</span>
                    </button>

                    <button
                      className="toolbar-tool-btn"
                      onClick={() => {
                        if (selectedSlotIndex !== null) {
                          updateSlotTransform(selectedSlotIndex, { scale: 1.35 });
                          showToast("Fill slot");
                        }
                      }}
                      title="Fill slot"
                    >
                      <Maximize2 size={13} />
                      <span>Fill</span>
                    </button>

                    <button
                      className="toolbar-tool-btn"
                      onClick={() => {
                        if (selectedSlotIndex !== null) handleResetSlotTransform(selectedSlotIndex);
                        else if (selectedTextId) handleDeleteTextElement(selectedTextId);
                        else if (selectedStickerId) handleDeleteSticker(selectedStickerId);
                      }}
                      title="Delete/Reset selection"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>

                    <div className="toolbar-divider" />

                    <button
                      className={`toolbar-tool-btn${canvasTool === "text" || selectedTextId ? " active" : ""}`}
                      onClick={() => {
                        setCanvasTool("text");
                        setIsTextPanelOpen(true);
                        setRightInspectorTab("edit");
                        if (!selectedTextId) {
                          if (textElements.length > 0) {
                            setSelectedLayer({ type: "text", id: textElements[0].id });
                          } else {
                            handleAddTextElement({ text: "Adventure" });
                          }
                        }
                      }}
                      title="Text tool"
                    >
                      <Type size={13} />
                      <span>Text</span>
                    </button>

                    <button
                      className="toolbar-tool-btn"
                      onClick={() => setShowGridGuides(!showGridGuides)}
                      title="Toggle alignment grid"
                    >
                      <Grid size={13} style={{ color: showGridGuides ? "var(--accent-violet-mid)" : "inherit" }} />
                      <span>Grid</span>
                    </button>
                  </div>

                  {/* Canvas Outer Stage */}
                  <div className="canvas-card-outer">
                    {showGridGuides && (
                      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, opacity: 0.12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: "100%", height: 1, borderBottom: "1px dashed rgba(139,92,246,0.5)", position: "absolute" }} />
                        <div style={{ height: "100%", width: 1, borderRight: "1px dashed rgba(139,92,246,0.5)", position: "absolute" }} />
                      </div>
                    )}

                    <div
                      id="canvas-preview-stage"
                      style={{
                        transform: `scale(${zoomLevel / 100})`,
                        backgroundColor: activePreset.canvas.background_color || "#080a0f",
                        aspectRatio: carouselRatio === "1080x1080" ? "1/1" : carouselRatio === "1080x1920" ? "9/16" : "4/5",
                      }}
                      onClick={() => {
                        if (canvasTool !== "text") {
                          setSelectedLayer(null);
                        }
                      }}
                    >
                      {slides.length === 0 ? (
                        <div style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 32,
                          textAlign: "center",
                          background: "radial-gradient(circle at center, rgba(139,92,246,0.08) 0%, rgba(8,10,15,0.98) 75%)",
                        }}>
                          <div style={{
                            width: 52,
                            height: 52,
                            borderRadius: "50%",
                            background: "rgba(139,92,246,0.12)",
                            border: "1px solid rgba(139,92,246,0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: 14,
                            color: "var(--accent-violet-mid)",
                          }}>
                            <Layout size={24} />
                          </div>
                          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Carousel is Empty</h3>
                          <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 18, maxWidth: 220, lineHeight: 1.5 }}>
                            All slides have been deleted. Add a slide or select a template to continue.
                          </p>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={handleAddNewSlide}
                              style={{ padding: "7px 14px", fontSize: 11.5 }}
                            >
                              <Plus size={13} />
                              <span>Add Slide</span>
                            </button>
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => setAppView("templates")}
                              style={{ padding: "7px 12px", fontSize: 11.5 }}
                            >
                              <Compass size={13} />
                              <span>Templates</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
                          {/* Photo Slots */}
                          {activePreset.slots.map((slot) => {
                            const photo = photos[slot.slot_index] || {
                              id: `fallback-${slot.slot_index}`,
                              url: getPresetSlotImageUrl(activePreset, slot.slot_index),
                              file: null,
                              name: `${activePreset.name} - Slot #${slot.slot_index + 1}`,
                            };
                            const isSelected = selectedSlotIndex === slot.slot_index;
                            const transform = transforms[slot.slot_index] || { ...DEFAULT_TRANSFORM };
                            if (transform.hidden) return null;

                            const leftPct = (slot.x / 1080) * 100;
                            const topPct = (slot.y / 1350) * 100;
                            const widthPct = (slot.width / 1080) * 100;
                            const heightPct = (slot.height / 1350) * 100;
                            const radiusPx = (slot.border_radius / 1080) * 350;

                            // Build image filter string
                            const filterList: string[] = [];
                            if (isAutoEnhanceEnabled) filterList.push("saturate(1.15) contrast(1.10)");
                            if (transform.brightness) filterList.push(`brightness(${1 + transform.brightness / 100})`);
                            if (transform.contrast) filterList.push(`contrast(${1 + transform.contrast / 100})`);
                            if (transform.saturation) filterList.push(`saturate(${1 + transform.saturation / 100})`);
                            if (transform.warmth) filterList.push(`sepia(${Math.max(0, transform.warmth / 100)})`);
                            if (transform.filter === "natural") filterList.push("contrast(1.05) saturate(1.08)");
                            else if (transform.filter === "vivid") filterList.push("contrast(1.15) saturate(1.25)");
                            else if (transform.filter === "film") filterList.push("sepia(0.2) contrast(1.1) brightness(0.95)");
                            else if (transform.filter === "bw") filterList.push("grayscale(1) contrast(1.15)");
                            else if (transform.filter === "warm") filterList.push("sepia(0.3) saturate(1.15)");
                            const filterStyle = filterList.join(" ") || "none";

                            return (
                              <div
                                key={`slot-${slot.slot_index}-${photo.id}`}
                                id={`slot-${slot.slot_index}`}
                                className={`canvas-slot-interactive${isSelected ? " slot-selected" : ""}`}
                                style={{
                                  position: "absolute",
                                  left: `${leftPct}%`,
                                  top: `${topPct}%`,
                                  width: `${widthPct}%`,
                                  height: `${heightPct}%`,
                                  borderRadius: `${radiusPx}px`,
                                  backgroundColor: "#0d1017",
                                  border: transform.border_style && transform.border_style !== "none"
                                    ? `${transform.border_width || 2}px ${transform.border_style} ${transform.border_color || "#fff"}`
                                    : undefined,
                                  boxShadow: transform.shadow ? "0 14px 36px rgba(0,0,0,0.6)" : undefined,
                                  overflow: "hidden",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLayer({ type: "slot", id: slot.slot_index });
                                  setRightInspectorTab("edit");
                                }}
                                onMouseDown={(e) => {
                                  if (transform.locked) return;
                                  setSelectedLayer({ type: "slot", id: slot.slot_index });
                                  setDraggingSlot({
                                    slotIndex: slot.slot_index,
                                    startX: e.clientX,
                                    startY: e.clientY,
                                    initialOffsetX: transform.offset_x || 0,
                                    initialOffsetY: transform.offset_y || 0,
                                  });
                                }}
                                onWheel={(e) => handleSlotWheel(slot.slot_index, e)}
                              >
                                <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
                                  <img
                                    src={photo.url}
                                    alt={photo.name}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: (slot.fit_mode as any) || "cover",
                                      display: "block",
                                      pointerEvents: "none",
                                      transform: `translate(${transform.offset_x || 0}px, ${transform.offset_y || 0}px) scale(${(transform.flip_h ? -1 : 1) * (transform.scale || 1.0)}, ${(transform.flip_v ? -1 : 1) * (transform.scale || 1.0)}) rotate(${transform.rotation || 0}deg)`,
                                      transformOrigin: "center center",
                                      filter: filterStyle,
                                    }}
                                    draggable={false}
                                  />
                                </div>

                                {/* Corner Slot Badge */}
                                <div className="slot-corner-badge">
                                  <span>{String(slot.slot_index + 1).padStart(2, "0")}</span>
                                  {transform.scale !== 1.0 && <span>{Math.round((transform.scale || 1) * 100)}%</span>}
                                </div>

                                {/* Selection Bounding Handles */}
                                {isSelected && (
                                  <>
                                    <div className="selection-bounding-box" />
                                    <div className="selection-handle tl" />
                                    <div className="selection-handle tm" />
                                    <div className="selection-handle tr" />
                                    <div className="selection-handle ml" />
                                    <div className="selection-handle mr" />
                                    <div className="selection-handle bl" />
                                    <div className="selection-handle bm" />
                                    <div className="selection-handle br" />

                                    {/* Floating Mini Toolbar */}
                                    <div className="slot-mini-toolbar" onClick={(e) => e.stopPropagation()}>
                                      <button className="mini-btn" onClick={() => setRightInspectorTab("edit")} title="Crop/Transform">
                                        <Crop size={11} />
                                      </button>
                                      <button className="mini-btn" onClick={() => updateSlotTransform(slot.slot_index, { scale: 1.0 })} title="Fit">
                                        <Minimize2 size={11} />
                                      </button>
                                      <button className="mini-btn" onClick={() => updateSlotTransform(slot.slot_index, { scale: 1.35 })} title="Fill">
                                        <Maximize2 size={11} />
                                      </button>
                                      <button
                                        className="mini-btn"
                                        onClick={() => updateSlotTransform(slot.slot_index, { flip_h: !transform.flip_h })}
                                        title="Flip Horizontally"
                                      >
                                        <FlipHorizontal size={11} />
                                      </button>
                                      <button className="mini-btn" onClick={() => handleResetSlotTransform(slot.slot_index)} title="Reset">
                                        <RefreshCw size={11} />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}

                          {/* Interactive Text Layers (User added) */}
                          {textElements.map((te) => {
                            if (te.hidden) return null;
                            const isSelected = selectedTextId === te.id;
                            return (
                              <div
                                key={te.id}
                                id={te.id}
                                className={`canvas-text-interactive${isSelected ? " text-selected" : ""}`}
                                style={{
                                  position: "absolute",
                                  left: `${(te.x / 1080) * 100}%`,
                                  top: `${(te.y / 1350) * 100}%`,
                                  transform: `translate(-50%, -50%) rotate(${te.rotation || 0}deg)`,
                                  color: te.color,
                                  fontFamily: `"${te.font}", sans-serif`,
                                  fontSize: `${(te.size / 1080) * 360}px`,
                                  fontWeight: te.weight,
                                  textAlign: te.align as any,
                                  letterSpacing: `${te.letterSpacing}px`,
                                  lineHeight: te.lineHeight,
                                  opacity: (te.opacity ?? 100) / 100,
                                  textShadow: te.shadow ? "0 4px 16px rgba(0,0,0,0.8)" : "none",
                                  zIndex: isSelected ? 25 : 20,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLayer({ type: "text", id: te.id });
                                  setCanvasTool("text");
                                  setIsTextPanelOpen(true);
                                  setRightInspectorTab("edit");
                                }}
                                onMouseDown={(e) => {
                                  if (te.locked) return;
                                  e.stopPropagation();
                                  setSelectedLayer({ type: "text", id: te.id });
                                  setCanvasTool("text");
                                  setIsTextPanelOpen(true);
                                  setDraggingText({ textId: te.id, startX: e.clientX, startY: e.clientY, initialX: te.x, initialY: te.y });
                                }}
                              >
                                <span>{te.text}</span>
                                {isSelected && (
                                  <div className="text-select-border">
                                    <div className="selection-handle tl" />
                                    <div className="selection-handle tr" />
                                    <div className="selection-handle bl" />
                                    <div className="selection-handle br" />
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Stickers (User added) */}
                          {stickers.map((stk) => {
                            if (stk.hidden) return null;
                            const isSelected = selectedStickerId === stk.id;
                            if (stk.type === "note") {
                              return (
                                <div
                                  key={stk.id}
                                  className={`canvas-sticker-interactive note-sticker${isSelected ? " sticker-selected" : ""}`}
                                  style={{
                                    position: "absolute",
                                    left: `${(stk.x / 1080) * 100}%`,
                                    top: `${(stk.y / 1350) * 100}%`,
                                    transform: `rotate(${stk.rotation || 0}deg) scale(${stk.scale || 1.0})`,
                                    zIndex: isSelected ? 30 : 22,
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLayer({ type: "sticker", id: stk.id });
                                    setRightInspectorTab("edit");
                                  }}
                                  onMouseDown={(e) => {
                                    if (stk.locked) return;
                                    e.stopPropagation();
                                    setSelectedLayer({ type: "sticker", id: stk.id });
                                    setDraggingSticker({ stickerId: stk.id, startX: e.clientX, startY: e.clientY, initialX: stk.x, initialY: stk.y });
                                  }}
                                >
                                  <span>{stk.content}</span>
                                </div>
                              );
                            } else if (stk.type === "heart") {
                              return (
                                <div
                                  key={stk.id}
                                  className={`canvas-sticker-interactive doodle-heart${isSelected ? " sticker-selected" : ""}`}
                                  style={{
                                    position: "absolute",
                                    left: `${(stk.x / 1080) * 100}%`,
                                    top: `${(stk.y / 1350) * 100}%`,
                                    transform: `rotate(${stk.rotation || 0}deg) scale(${stk.scale || 1.0})`,
                                    zIndex: isSelected ? 30 : 22,
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLayer({ type: "sticker", id: stk.id });
                                    setRightInspectorTab("edit");
                                  }}
                                  onMouseDown={(e) => {
                                    if (stk.locked) return;
                                    e.stopPropagation();
                                    setSelectedLayer({ type: "sticker", id: stk.id });
                                    setDraggingSticker({ stickerId: stk.id, startX: e.clientX, startY: e.clientY, initialX: stk.x, initialY: stk.y });
                                  }}
                                >
                                  <span style={{ color: "#fff" }}>♡</span>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      )}

                      {/* Hint badge */}
                      <div className="canvas-hint-badge">
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent-violet-mid)", animation: "pulse-dot 1.5s infinite" }} />
                        <span>Drag to pan • Scroll to zoom • Click element to inspect</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Bottom Slides Timeline Strip ───────────────────────── */}
                  <div className="bottom-timeline-strip">
                    <div className="timeline-left-block">
                      <div className="timeline-label-block">
                        <span className="timeline-kicker">Timeline</span>
                        <span className="timeline-count">Slides ({slides.length})</span>
                      </div>

                      <button className="btn-ghost" onClick={handleAddNewSlide} style={{ border: "1px dashed var(--border-subtle)" }}>
                        <Plus size={13} />
                        <span>Add Slide</span>
                      </button>

                      {slides.length > 0 && (
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => promptDeleteSlide(activeSlideIndex)}
                          style={{
                            border: "1px solid rgba(244,63,94,0.25)",
                            color: "var(--accent-rose)",
                            background: "rgba(244,63,94,0.06)",
                            fontSize: 11,
                            padding: "6px 10px",
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                          title={`Delete currently selected slide #${activeSlideIndex + 1}`}
                        >
                          <Trash2 size={12} />
                          <span>Delete Slide</span>
                        </button>
                      )}
                    </div>

                    {/* Slides Thumbnails Container */}
                    <div className="timeline-slides-container">
                      {slides.length === 0 && (
                        <span style={{ fontSize: 11, color: "var(--text-faint)", fontStyle: "italic", padding: "0 8px" }}>
                          No slides in project
                        </span>
                      )}
                      {slides.map((s, idx) => {
                        const isActive = activeSlideIndex === idx;
                        const slidePreset = PRESET_LAYOUTS.find((p) => p.layout_id === s.presetId) || PRESET_LAYOUTS[0];
                        const previewThumb = s.photos[0]?.url || getPresetSlotImageUrl(slidePreset, 0);

                        return (
                          <div
                            key={`timeline-${s.id}-${idx}`}
                            onClick={() => {
                              setActiveSlideIndex(idx);
                              setSelectedLayer({ type: "slot", id: 0 });
                            }}
                            className={`timeline-slide-box${isActive ? " active" : ""}`}
                            title={`Slide #${idx + 1} (${slidePreset.name})`}
                          >
                            <img src={previewThumb} alt="" onError={(e) => { e.currentTarget.src = "/demo/demo1.jpg"; }} />
                            <div className="slide-box-badge">{idx + 1}</div>

                            <div className="slide-box-options" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="slide-opt-btn"
                                onClick={() => handleDuplicateSlide(idx)}
                                title="Duplicate slide"
                              >
                                <Copy size={9} />
                              </button>
                              <button
                                type="button"
                                className="slide-opt-btn danger"
                                onClick={() => promptDeleteSlide(idx)}
                                title="Delete slide"
                              >
                                <Trash2 size={9} />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      <button onClick={handleAddNewSlide} className="add-slide-btn" title="Add new slide">
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Carousel Settings */}
                    <div className="carousel-settings-block">
                      <div className="carousel-settings-title">Canvas Size</div>
                      <div className="carousel-settings-row">
                        <select
                          value={carouselRatio}
                          onChange={(e) => setCarouselRatio(e.target.value as any)}
                          className="ratio-select"
                        >
                          <option value="1080x1350">1080 × 1350 (4:5)</option>
                          <option value="1080x1080">1080 × 1080 (1:1)</option>
                          <option value="1080x1920">1080 × 1920 (9:16)</option>
                        </select>

                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 10, color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>Duration:</span>
                          <input
                            type="text"
                            value={carouselDuration}
                            onChange={(e) => setCarouselDuration(e.target.value)}
                            style={{ width: 44, padding: "4px 6px", borderRadius: 4, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)", color: "#fff", fontSize: 10, fontFamily: "var(--font-mono)" }}
                          />
                        </div>
                      </div>
                      <button onClick={() => showToast("Applied settings to all slides")} style={{ background: "none", border: "none", color: "var(--accent-violet-mid)", fontSize: 10, cursor: "pointer", textDecoration: "underline" }}>
                        Apply to All Slides
                      </button>
                    </div>
                  </div>
                </section>

                {/* ── Right Contextual Inspector ─────────────────────────── */}
                <aside className="right-inspector" style={{ width: 300 }}>
                  {/* Tabs: Edit, Layers, AI Tools */}
                  <div className="inspector-nav-tabs">
                    {(["edit", "layers", "ai"] as const).map((tab) => {
                      const labels = { edit: "Edit", layers: `Layers (${unifiedLayers.length})`, ai: "AI Tools" };
                      return (
                        <button
                          key={tab}
                          onClick={() => setRightInspectorTab(tab)}
                          className={`inspector-nav-tab${rightInspectorTab === tab ? " active" : ""}`}
                        >
                          {labels[tab]}
                        </button>
                      );
                    })}
                  </div>

                  <div className="inspector-body">
                    {slides.length === 0 ? (
                      <div style={{ padding: "48px 16px", textAlign: "center", color: "var(--text-muted)" }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: "var(--text-faint)" }}>
                          <Layout size={20} />
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>No Active Slide</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.4 }}>Add a slide to edit images, transforms, and layers.</p>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={handleAddNewSlide}
                          style={{ fontSize: 11, margin: "0 auto", gap: 6, padding: "6px 12px" }}
                        >
                          <Plus size={12} />
                          <span>Add Slide</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* ── TAB 1: EDIT (CONTEXTUAL) ────────────────────────── */}
                        {rightInspectorTab === "edit" && (
                      <>
                        {/* When Text is selected, show dedicated text formatting controls */}
                        {selectedTextId && activeSelectedText ? (
                          <div className="inspector-section">
                            <div className="inspector-section-header">
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <Type size={13} color="var(--accent-violet-mid)" />
                                <span className="inspector-section-label" style={{ color: "var(--text-primary)", fontSize: 12, fontWeight: 700, textTransform: "none", letterSpacing: "normal" }}>Typography</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteTextElement(activeSelectedText.id)}
                                style={{ background: "none", border: "none", color: "var(--accent-rose)", fontSize: 10, cursor: "pointer" }}
                                title="Delete text layer"
                              >
                                Delete
                              </button>
                            </div>

                            <div style={{ marginTop: 8 }}>
                              {/* Text Content Input */}
                              <div style={{ marginBottom: 10 }}>
                                <label style={{ fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Text Content</label>
                                <input
                                  type="text"
                                  value={activeSelectedText.text}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    updateActiveSlide((s) => ({
                                      ...s,
                                      textElements: (s.textElements || []).map((t) => t.id === activeSelectedText.id ? { ...t, text: val } : t),
                                    }));
                                  }}
                                  placeholder="Type your text..."
                                  style={{
                                    width: "100%",
                                    padding: "8px 10px",
                                    borderRadius: 6,
                                    background: "rgba(255,255,255,0.04)",
                                    border: "1px solid var(--border-subtle)",
                                    color: "#ffffff",
                                    fontSize: 12.5,
                                    fontWeight: 500,
                                  }}
                                />
                              </div>

                              {/* Font Family & Size Row */}
                              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                                <div style={{ flex: 1 }}>
                                  <label style={{ fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Font Family</label>
                                  <select
                                    value={activeSelectedText.font}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      updateActiveSlide((s) => ({
                                        ...s,
                                        textElements: (s.textElements || []).map((t) => t.id === activeSelectedText.id ? { ...t, font: val } : t),
                                      }));
                                    }}
                                    className="ratio-select"
                                    style={{ width: "100%", padding: "6px 8px", fontSize: 11.5 }}
                                  >
                                    {["Playfair Display", "Plus Jakarta Sans", "Caveat", "Outfit", "Inter", "Cinzel", "JetBrains Mono"].map((f) => (
                                      <option key={f} value={f}>{f}</option>
                                    ))}
                                  </select>
                                </div>
                                <div style={{ width: 64 }}>
                                  <label style={{ fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Size</label>
                                  <input
                                    type="number"
                                    min={14}
                                    max={140}
                                    value={activeSelectedText.size}
                                    onChange={(e) => {
                                      const val = Math.max(10, Math.min(160, Number(e.target.value) || 14));
                                      updateActiveSlide((s) => ({
                                        ...s,
                                        textElements: (s.textElements || []).map((t) => t.id === activeSelectedText.id ? { ...t, size: val } : t),
                                      }));
                                    }}
                                    style={{
                                      width: "100%",
                                      padding: "6px 4px",
                                      borderRadius: 6,
                                      background: "rgba(255,255,255,0.04)",
                                      border: "1px solid var(--border-subtle)",
                                      color: "#fff",
                                      fontSize: 11.5,
                                      textAlign: "center",
                                    }}
                                    title="Font size (px)"
                                  />
                                </div>
                              </div>

                              {/* Formatting Bar: B, I, Alignments, Color */}
                              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
                                <button
                                  type="button"
                                  className={`btn-ghost${(activeSelectedText.weight || 400) >= 700 ? " align-active" : ""}`}
                                  onClick={() => {
                                    const nextWeight = (activeSelectedText.weight || 400) >= 700 ? 400 : 700;
                                    updateActiveSlide((s) => ({
                                      ...s,
                                      textElements: (s.textElements || []).map((t) => t.id === activeSelectedText.id ? { ...t, weight: nextWeight } : t),
                                    }));
                                  }}
                                  style={{ width: 28, height: 28, padding: 0, justifyContent: "center", fontWeight: 700, fontSize: 12 }}
                                  title="Bold"
                                >
                                  B
                                </button>

                                <button
                                  type="button"
                                  className={`btn-ghost${activeSelectedText.font === "Caveat" ? " align-active" : ""}`}
                                  onClick={() => {
                                    const nextFont = activeSelectedText.font === "Caveat" ? "Playfair Display" : "Caveat";
                                    updateActiveSlide((s) => ({
                                      ...s,
                                      textElements: (s.textElements || []).map((t) => t.id === activeSelectedText.id ? { ...t, font: nextFont } : t),
                                    }));
                                  }}
                                  style={{ width: 28, height: 28, padding: 0, justifyContent: "center", fontStyle: "italic", fontSize: 12 }}
                                  title="Script / Italic style"
                                >
                                  I
                                </button>

                                <div className="toolbar-divider" style={{ margin: "0 2px" }} />

                                <button
                                  type="button"
                                  className={`btn-ghost${activeSelectedText.align === "left" ? " align-active" : ""}`}
                                  onClick={() => {
                                    updateActiveSlide((s) => ({
                                      ...s,
                                      textElements: (s.textElements || []).map((t) => t.id === activeSelectedText.id ? { ...t, align: "left" } : t),
                                    }));
                                  }}
                                  style={{ width: 28, height: 28, padding: 0, justifyContent: "center" }}
                                  title="Align Left"
                                >
                                  <AlignLeft size={12} />
                                </button>

                                <button
                                  type="button"
                                  className={`btn-ghost${(!activeSelectedText.align || activeSelectedText.align === "center") ? " align-active" : ""}`}
                                  onClick={() => {
                                    updateActiveSlide((s) => ({
                                      ...s,
                                      textElements: (s.textElements || []).map((t) => t.id === activeSelectedText.id ? { ...t, align: "center" } : t),
                                    }));
                                  }}
                                  style={{ width: 28, height: 28, padding: 0, justifyContent: "center" }}
                                  title="Align Center"
                                >
                                  <AlignCenter size={12} />
                                </button>

                                <button
                                  type="button"
                                  className={`btn-ghost${activeSelectedText.align === "right" ? " align-active" : ""}`}
                                  onClick={() => {
                                    updateActiveSlide((s) => ({
                                      ...s,
                                      textElements: (s.textElements || []).map((t) => t.id === activeSelectedText.id ? { ...t, align: "right" } : t),
                                    }));
                                  }}
                                  style={{ width: 28, height: 28, padding: 0, justifyContent: "center" }}
                                  title="Align Right"
                                >
                                  <AlignRight size={12} />
                                </button>

                                <div style={{ flex: 1 }} />

                                <label
                                  style={{
                                    position: "relative",
                                    width: 22,
                                    height: 22,
                                    borderRadius: "50%",
                                    backgroundColor: activeSelectedText.color || "#ffffff",
                                    border: "2px solid rgba(255,255,255,0.6)",
                                    cursor: "pointer",
                                    boxShadow: "0 0 6px rgba(0,0,0,0.5)",
                                    display: "inline-block",
                                    flexShrink: 0,
                                  }}
                                  title="Text Color"
                                >
                                  <input
                                    type="color"
                                    value={activeSelectedText.color || "#ffffff"}
                                    onChange={(e) => {
                                      const col = e.target.value;
                                      updateActiveSlide((s) => ({
                                        ...s,
                                        textElements: (s.textElements || []).map((t) => t.id === activeSelectedText.id ? { ...t, color: col } : t),
                                      }));
                                    }}
                                    style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
                                  />
                                </label>
                              </div>

                              {/* Letter Spacing */}
                              <div className="slider-row">
                                <div className="slider-header">
                                  <span>Letter spacing</span>
                                  <span className="slider-value">{activeSelectedText.letterSpacing ?? 1}px</span>
                                </div>
                                <input
                                  type="range"
                                  min={-2}
                                  max={12}
                                  step={0.5}
                                  value={activeSelectedText.letterSpacing ?? 1}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    updateActiveSlide((s) => ({
                                      ...s,
                                      textElements: (s.textElements || []).map((t) => t.id === activeSelectedText.id ? { ...t, letterSpacing: val } : t),
                                    }));
                                  }}
                                  className="custom-range-slider"
                                />
                              </div>

                              {/* Line Spacing */}
                              <div className="slider-row">
                                <div className="slider-header">
                                  <span>Line spacing</span>
                                  <span className="slider-value">{activeSelectedText.lineHeight ?? 1.2}</span>
                                </div>
                                <input
                                  type="range"
                                  min={0.8}
                                  max={2.5}
                                  step={0.1}
                                  value={activeSelectedText.lineHeight ?? 1.2}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    updateActiveSlide((s) => ({
                                      ...s,
                                      textElements: (s.textElements || []).map((t) => t.id === activeSelectedText.id ? { ...t, lineHeight: val } : t),
                                    }));
                                  }}
                                  className="custom-range-slider"
                                />
                              </div>

                              <button
                                type="button"
                                className="btn-ghost"
                                onClick={() => handleAddTextElement({ text: "THROUGH MY LENS", size: 28, y: 750 })}
                                style={{ width: "100%", justifyContent: "center", gap: 6, padding: "6px 10px", marginTop: 8, fontSize: 11 }}
                              >
                                <Plus size={12} />
                                <span>Add Another Text</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Image-Specific Settings */
                          <>
                            {/* 1. Image Settings Section (List of Slots) */}
                            <div className="inspector-section">
                              <div className="inspector-section-header">
                                <span className="inspector-section-label">Image Settings</span>
                              </div>

                              <div className="inspector-images-list">
                                {activePreset.slots.map((slot) => {
                                  const isSlotActive = selectedSlotIndex === slot.slot_index;
                                  const photo = photos[slot.slot_index] || {
                                    url: getPresetSlotImageUrl(activePreset, slot.slot_index),
                                    name: `Image ${slot.slot_index + 1}`,
                                  };
                                  return (
                                    <div
                                      key={`inspector-slot-${slot.slot_index}`}
                                      className={`inspector-image-row${isSlotActive ? " active" : ""}`}
                                      onClick={() => {
                                        setSelectedLayer({ type: "slot", id: slot.slot_index });
                                        setRightInspectorTab("edit");
                                      }}
                                    >
                                      <div className="inspector-image-thumb">
                                        <img src={photo.url} alt="" />
                                      </div>
                                      <span className="inspector-image-name">Image {slot.slot_index + 1}</span>
                                      {isSlotActive ? (
                                        <div>
                                          <input
                                            type="file"
                                            ref={(el) => { fileInputRefs.current[slot.slot_index] = el; }}
                                            className="file-input-hidden"
                                            accept="image/*"
                                            onChange={(e) => handleFileChange(slot.slot_index, e)}
                                          />
                                          <button
                                            className="replace-btn"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              fileInputRefs.current[slot.slot_index]?.click();
                                            }}
                                            title="Replace image"
                                          >
                                            <RefreshCw size={10} />
                                            <span>Replace</span>
                                          </button>
                                        </div>
                                      ) : (
                                        <ChevronRight size={14} className="inspector-image-chevron" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* 2. Transform Section */}
                            <div className="inspector-section">
                              <div className="inspector-section-header">
                                <span className="inspector-section-label">Transform</span>
                              </div>

                              {/* Zoom Slider */}
                              <div className="slider-row">
                                <div className="slider-header">
                                  <span>Zoom</span>
                                  <span className="slider-value">{Math.round((activeSlotTransform.scale || 1.0) * 100)}%</span>
                                </div>
                                <input
                                  type="range"
                                  min={50}
                                  max={250}
                                  value={Math.round((activeSlotTransform.scale || 1.0) * 100)}
                                  onChange={(e) => {
                                    const sIdx = selectedSlotIndex ?? 0;
                                    updateSlotTransform(sIdx, { scale: Number(e.target.value) / 100 });
                                  }}
                                  className="custom-range-slider"
                                />
                              </div>

                              {/* Rotate Slider */}
                              <div className="slider-row">
                                <div className="slider-header">
                                  <span>Rotate</span>
                                  <span className="slider-value">{activeSlotTransform.rotation || 0}°</span>
                                </div>
                                <input
                                  type="range"
                                  min={-180}
                                  max={180}
                                  value={activeSlotTransform.rotation || 0}
                                  onChange={(e) => {
                                    const sIdx = selectedSlotIndex ?? 0;
                                    updateSlotTransform(sIdx, { rotation: Number(e.target.value) });
                                  }}
                                  className="custom-range-slider"
                                />
                              </div>
                            </div>

                            {/* 3. Adjustments Section */}
                            <div className="inspector-section">
                              <div className="inspector-section-header">
                                <span className="inspector-section-label">Adjustments</span>
                                <button
                                  onClick={() => {
                                    const sIdx = selectedSlotIndex ?? 0;
                                    handleResetSlotTransform(sIdx);
                                  }}
                                  style={{ background: "none", border: "none", color: "var(--accent-violet-mid)", fontSize: 10, cursor: "pointer" }}
                                >
                                  Reset
                                </button>
                              </div>

                              {/* Brightness */}
                              <div className="slider-row">
                                <div className="slider-header">
                                  <span>Brightness</span>
                                  <span className="slider-value">{activeSlotTransform.brightness || 0}</span>
                                </div>
                                <input
                                  type="range"
                                  min={-100}
                                  max={100}
                                  value={activeSlotTransform.brightness || 0}
                                  onChange={(e) => {
                                    const sIdx = selectedSlotIndex ?? 0;
                                    updateSlotTransform(sIdx, { brightness: Number(e.target.value) });
                                  }}
                                  className="custom-range-slider"
                                />
                              </div>

                              {/* Contrast */}
                              <div className="slider-row">
                                <div className="slider-header">
                                  <span>Contrast</span>
                                  <span className="slider-value">{activeSlotTransform.contrast || 0}</span>
                                </div>
                                <input
                                  type="range"
                                  min={-100}
                                  max={100}
                                  value={activeSlotTransform.contrast || 0}
                                  onChange={(e) => {
                                    const sIdx = selectedSlotIndex ?? 0;
                                    updateSlotTransform(sIdx, { contrast: Number(e.target.value) });
                                  }}
                                  className="custom-range-slider"
                                />
                              </div>

                              {/* Saturation */}
                              <div className="slider-row">
                                <div className="slider-header">
                                  <span>Saturation</span>
                                  <span className="slider-value">{activeSlotTransform.saturation || 0}</span>
                                </div>
                                <input
                                  type="range"
                                  min={-100}
                                  max={100}
                                  value={activeSlotTransform.saturation || 0}
                                  onChange={(e) => {
                                    const sIdx = selectedSlotIndex ?? 0;
                                    updateSlotTransform(sIdx, { saturation: Number(e.target.value) });
                                  }}
                                  className="custom-range-slider"
                                />
                              </div>

                              {/* Warmth */}
                              <div className="slider-row">
                                <div className="slider-header">
                                  <span>Warmth</span>
                                  <span className="slider-value">{activeSlotTransform.warmth || 0}</span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={activeSlotTransform.warmth || 0}
                                  onChange={(e) => {
                                    const sIdx = selectedSlotIndex ?? 0;
                                    updateSlotTransform(sIdx, { warmth: Number(e.target.value) });
                                  }}
                                  className="custom-range-slider"
                                />
                              </div>
                            </div>

                            {/* 4. Filters Section */}
                            <div className="inspector-section">
                              <div className="inspector-section-header">
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <SlidersHorizontal size={13} color="var(--text-secondary)" />
                                  <span className="inspector-section-label" style={{ color: "var(--text-primary)", fontSize: 12, fontWeight: 700, textTransform: "none", letterSpacing: "normal" }}>Filters</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowAllFilters(!showAllFilters)}
                                  className="filter-see-all-btn"
                                  title={showAllFilters ? "Collapse filter grid" : "Expand all filters"}
                                >
                                  <span>{showAllFilters ? "Collapse" : "See all"}</span>
                                  <ChevronRight size={11} style={{ transform: showAllFilters ? "rotate(-90deg)" : "none", transition: "transform 0.15s ease" }} />
                                </button>
                              </div>
                              <div className={`filters-strip${showAllFilters ? " expanded" : ""}`}>
                                {FILTER_PRESETS.map((f) => {
                                  const isActive = (activeSlotTransform.filter || "none") === f.id;
                                  const sIdx = selectedSlotIndex ?? 0;
                                  return (
                                    <div
                                      key={f.id}
                                      onClick={() => updateSlotTransform(sIdx, { filter: f.id })}
                                      className={`filter-thumb-card${isActive ? " active" : ""}`}
                                      title={`${f.name} filter`}
                                    >
                                      <div className="filter-preview-box">
                                        <img
                                          src={photos[sIdx]?.url || getPresetSlotImageUrl(activePreset, sIdx)}
                                          alt={f.name}
                                          style={{ filter: f.filter }}
                                        />
                                      </div>
                                      <span className="filter-label">{f.name}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {/* ── TAB 2: LAYERS ───────────────────────────────────── */}
                    {rightInspectorTab === "layers" && (
                      <div className="inspector-section">
                        <div className="inspector-section-header">
                          <span className="inspector-section-label">Canvas Layers</span>
                          <span className="inspector-section-meta">{unifiedLayers.length} Layers</span>
                        </div>

                        <div className="layers-tree-list">
                          {unifiedLayers.map((layer) => {
                            const isSelected = selectedLayer?.type === layer.type && selectedLayer.id === layer.id;
                            return (
                              <div
                                key={`${layer.type}-${layer.id}`}
                                className={`layer-tree-item${isSelected ? " active-layer" : ""}`}
                                onClick={() => {
                                  setSelectedLayer({ type: layer.type, id: layer.id });
                                  setRightInspectorTab("edit");
                                }}
                              >
                                <div className="layer-type-badge">
                                  {layer.type === "slot" ? <ImageIcon size={11} /> : layer.type === "text" ? <Type size={11} /> : <Smile size={11} />}
                                </div>
                                <span className="layer-item-title">{layer.title}</span>

                                <div className="layer-actions" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    className={`layer-icon-btn${layer.hidden ? " active" : ""}`}
                                    onClick={() => {
                                      if (layer.type === "slot") {
                                        const sIdx = layer.id as number;
                                        updateSlotTransform(sIdx, { hidden: !layer.hidden });
                                      } else if (layer.type === "text") {
                                        updateActiveSlide((s) => ({
                                          ...s,
                                          textElements: (s.textElements || []).map((t) => t.id === layer.id ? { ...t, hidden: !layer.hidden } : t),
                                        }));
                                      }
                                    }}
                                    title={layer.hidden ? "Unhide" : "Hide"}
                                  >
                                    {layer.hidden ? <EyeOff size={11} /> : <Eye size={11} />}
                                  </button>

                                  <button
                                    className={`layer-icon-btn${layer.locked ? " active" : ""}`}
                                    onClick={() => {
                                      if (layer.type === "slot") {
                                        const sIdx = layer.id as number;
                                        updateSlotTransform(sIdx, { locked: !layer.locked });
                                      } else if (layer.type === "text") {
                                        updateActiveSlide((s) => ({
                                          ...s,
                                          textElements: (s.textElements || []).map((t) => t.id === layer.id ? { ...t, locked: !layer.locked } : t),
                                        }));
                                      }
                                    }}
                                    title={layer.locked ? "Unlock" : "Lock"}
                                  >
                                    {layer.locked ? <Lock size={11} /> : <Unlock size={11} />}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ── TAB 3: STUDIO AI TOOLS ──────────────────────────── */}
                    {rightInspectorTab === "ai" && (
                      <div className="inspector-section">
                        {activeAiModal === "captions" ? (
                          <div className="ai-captions-view">
                            {/* Top Back Navigation */}
                            <div className="ai-captions-nav">
                              <button className="ai-back-btn" onClick={() => setActiveAiModal(null)}>
                                <ChevronLeft size={14} /> Back to AI Tools
                              </button>
                              <span className="ai-badge-model">Ollama Vision + Gemma 2</span>
                            </div>

                            {/* Section Header */}
                            <div className="ai-captions-header">
                              <div className="ai-captions-title-row">
                                <div className="ai-captions-title">Context-Aware Captions</div>
                              </div>
                              <div className="ai-captions-subtitle">
                                Analyzing all {activeSlide.photos.length} photos on Slide {activeSlideIndex + 1}
                              </div>

                              {/* Mini Photos Preview Strip */}
                              <div className="ai-photos-preview-strip">
                                {activeSlide.photos.map((p, idx) => (
                                  <div key={`cap-strip-${p.id || idx}`} className="ai-strip-thumb" title={p.name || `Photo #${idx + 1}`}>
                                    <img
                                      src={p.url}
                                      alt=""
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src = "/demo/demo1.jpg";
                                      }}
                                    />
                                    <span className="ai-strip-badge">{idx + 1}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Loading State */}
                            {isGeneratingCaptions && (
                              <div className="ai-captions-loading">
                                <div className="ai-loading-spinner-wrap">
                                  <RotateCw size={20} className="ai-spin-icon" />
                                </div>
                                <div className="ai-loading-step-text">{captionLoadingStep}</div>
                                <div className="ai-loading-subtext">Examining combined mood, lighting & setting</div>
                                <div className="ai-skeleton-stack">
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <div key={n} className="ai-caption-skeleton" />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Error State */}
                            {!isGeneratingCaptions && captionError && (
                              <div className="ai-caption-error-box">
                                <div className="ai-error-header">
                                  <AlertCircle size={16} className="ai-error-icon" />
                                  <span className="ai-error-title">AI Service Unavailable</span>
                                </div>
                                <p className="ai-error-desc">{captionError}</p>
                                <button
                                  className="btn-retry"
                                  onClick={() => handleGenerateCaptions(false)}
                                >
                                  <RotateCw size={13} /> Retry Generation
                                </button>
                              </div>
                            )}

                            {/* Captions Results State */}
                            {!isGeneratingCaptions && !captionError && generatedCaptions.length === 5 && (
                              <div className="ai-captions-results">
                                {sceneSummary && (
                                  <div className="ai-scene-summary-pill" title={sceneSummary}>
                                    <span className="ai-summary-label">Scene Context:</span> {sceneSummary}
                                  </div>
                                )}

                                <div className="ai-results-bar">
                                  <span className="ai-results-count">5 Tailored Captions</span>
                                  <button
                                    className="ai-refresh-btn"
                                    onClick={() => handleGenerateCaptions(true)}
                                    disabled={isGeneratingCaptions}
                                    title="Generate a new batch of 5 distinct captions without repeating recent ones"
                                  >
                                    <RotateCw size={12} /> Refresh Batch
                                  </button>
                                </div>

                                <div className="ai-caption-cards-list">
                                  {generatedCaptions.map((cap, idx) => {
                                    const isCopied = copiedCaptionIdx === idx;
                                    const toneColors: Record<string, { bg: string; color: string; border: string }> = {
                                      aesthetic: { bg: "rgba(168, 85, 247, 0.12)", color: "#c084fc", border: "rgba(168, 85, 247, 0.3)" },
                                      witty: { bg: "rgba(59, 130, 246, 0.12)", color: "#60a5fa", border: "rgba(59, 130, 246, 0.3)" },
                                      hinglish: { bg: "rgba(16, 185, 129, 0.12)", color: "#34d399", border: "rgba(16, 185, 129, 0.3)" },
                                      story: { bg: "rgba(245, 158, 11, 0.12)", color: "#fbbf24", border: "rgba(245, 158, 11, 0.3)" },
                                      punchy: { bg: "rgba(244, 63, 94, 0.12)", color: "#fb7185", border: "rgba(244, 63, 94, 0.3)" },
                                    };
                                    const style = toneColors[cap.tone] || toneColors.aesthetic;

                                    return (
                                      <div key={`gen-cap-${idx}`} className="caption-card-item">
                                        <div className="caption-card-top">
                                          <span
                                            className="caption-tone-pill"
                                            style={{ background: style.bg, color: style.color, borderColor: style.border }}
                                          >
                                            {cap.label || cap.tone}
                                          </span>
                                          <div className="caption-card-actions">
                                            <button
                                              className="caption-action-btn"
                                              onClick={() => handleCopyCaption(cap.text, idx)}
                                              title="Copy caption to clipboard"
                                            >
                                              {isCopied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                                              <span>{isCopied ? "Copied" : "Copy"}</span>
                                            </button>
                                            <button
                                              className="caption-action-btn caption-apply-btn"
                                              onClick={() => handleApplyCaptionToCanvas(cap.text)}
                                              title="Add as text layer to current slide"
                                            >
                                              <Plus size={12} />
                                              <span>Add</span>
                                            </button>
                                          </div>
                                        </div>
                                        <div className="caption-card-body">
                                          "{cap.text}"
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Empty State before first generation */}
                            {!isGeneratingCaptions && !captionError && generatedCaptions.length === 0 && (
                              <div className="ai-captions-empty">
                                <p className="ai-empty-desc">
                                  Analyze all images in this slide together to create five distinct, highly contextual captions matching their shared mood, lighting, and aesthetic.
                                </p>
                                <button
                                  className="btn-primary"
                                  style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
                                  onClick={() => handleGenerateCaptions(false)}
                                  disabled={isGeneratingCaptions}
                                >
                                  <Sparkles size={14} /> Generate 5 Captions
                                </button>
                              </div>
                            )}
                          </div>
                        ) : activeAiModal === "layouts" ? (
                          <div className="ai-layouts-view">
                            {/* Top Back Navigation */}
                            <div className="ai-captions-nav">
                              <button className="ai-back-btn" onClick={() => setActiveAiModal(null)}>
                                <ChevronLeft size={14} /> Back to AI Tools
                              </button>
                              <span className="ai-badge-model" style={{ color: "#10b981", borderColor: "rgba(16, 185, 129, 0.3)" }}>
                                Style & Geometry AI
                              </span>
                            </div>

                            {/* Section Header */}
                            <div className="ai-captions-header">
                              <div className="ai-captions-title-row">
                                <div className="ai-captions-title">Suggested Templates</div>
                              </div>
                              <div className="ai-captions-subtitle">
                                Matched to {activeSlide.photos.length} photos on Slide {activeSlideIndex + 1}
                              </div>

                              {/* Mini Photos Preview Strip */}
                              <div className="ai-photos-preview-strip">
                                {activeSlide.photos.map((p, idx) => (
                                  <div key={`layout-strip-${p.id || idx}`} className="ai-strip-thumb" title={p.name || `Photo #${idx + 1}`}>
                                    <img
                                      src={p.url}
                                      alt=""
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src = "/demo/demo1.jpg";
                                      }}
                                    />
                                    <span className="ai-strip-badge">{idx + 1}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Loading State */}
                            {isSuggestingTemplates && (
                              <div className="ai-captions-loading">
                                <div className="ai-loading-spinner-wrap" style={{ color: "#10b981" }}>
                                  <RotateCw size={20} className="ai-spin-icon" />
                                </div>
                                <div className="ai-loading-step-text">{templateLoadingStep}</div>
                                <div className="ai-loading-subtext">Evaluating color harmony, lighting & framing balance</div>
                                <div className="ai-skeleton-stack">
                                  {[1, 2, 3, 4].map((n) => (
                                    <div key={n} className="ai-caption-skeleton" style={{ height: 64 }} />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Error State */}
                            {!isSuggestingTemplates && templateError && (
                              <div className="ai-caption-error-box">
                                <div className="ai-error-header">
                                  <AlertCircle size={16} className="ai-error-icon" />
                                  <span className="ai-error-title">Recommendation Unavailable</span>
                                </div>
                                <p className="ai-error-desc">{templateError}</p>
                                <button
                                  className="btn-retry"
                                  onClick={() => handleSuggestTemplates(false)}
                                >
                                  <RotateCw size={13} /> Retry Search
                                </button>
                              </div>
                            )}

                            {/* Recommendations List */}
                            {!isSuggestingTemplates && !templateError && suggestedTemplates.length > 0 && (
                              <div className="ai-layouts-results">
                                <div className="ai-results-bar">
                                  <span className="ai-results-count" style={{ color: "#10b981" }}>
                                    {suggestedTemplates.length} Top Matches
                                  </span>
                                  <button
                                    className="ai-refresh-btn"
                                    onClick={() => handleSuggestTemplates(true)}
                                    disabled={isSuggestingTemplates}
                                    title="Recalculate layout recommendations with new variations"
                                  >
                                    <RotateCw size={12} /> Refresh
                                  </button>
                                </div>

                                <div className="ai-layouts-cards-list">
                                  {suggestedTemplates.map((rec) => {
                                    const isSelected = selectedRecommendation?.layout_id === rec.layout_id;
                                    const categoryColors: Record<string, { bg: string; color: string; border: string }> = {
                                      minimalist: { bg: "rgba(59, 130, 246, 0.12)", color: "#60a5fa", border: "rgba(59, 130, 246, 0.3)" },
                                      film: { bg: "rgba(245, 158, 11, 0.12)", color: "#fbbf24", border: "rgba(245, 158, 11, 0.3)" },
                                      editorial: { bg: "rgba(168, 85, 247, 0.12)", color: "#c084fc", border: "rgba(168, 85, 247, 0.3)" },
                                      scrapbook: { bg: "rgba(244, 63, 94, 0.12)", color: "#fb7185", border: "rgba(244, 63, 94, 0.3)" },
                                      polaroid: { bg: "rgba(16, 185, 129, 0.12)", color: "#34d399", border: "rgba(16, 185, 129, 0.3)" },
                                    };
                                    const catStyle = categoryColors[(rec.category || "minimalist").toLowerCase()] || categoryColors.minimalist;

                                    return (
                                      <div
                                        key={`rec-${rec.layout_id}`}
                                        className={`ai-layout-card-item${isSelected ? " selected" : ""}`}
                                        onClick={() => setSelectedRecommendation(rec)}
                                      >
                                        {/* Thumbnail Preview from real Template library */}
                                        <div className="ai-layout-card-thumb">
                                          <TemplatePreview preset={rec.preset} />
                                        </div>

                                        {/* Details */}
                                        <div className="ai-layout-card-info">
                                          <div className="ai-layout-card-title-row">
                                            <span className="ai-layout-card-name" title={rec.name}>{rec.name}</span>
                                            <span
                                              className="ai-layout-cat-pill"
                                              style={{ background: catStyle.bg, color: catStyle.color, borderColor: catStyle.border }}
                                            >
                                              {rec.category}
                                            </span>
                                          </div>

                                          <div className="ai-layout-card-meta">
                                            <span className="ai-layout-slots-badge">{rec.photo_count} Slots</span>
                                            <span style={{ fontSize: 9.5, color: "#10b981", fontWeight: 600 }}>
                                              {Math.round(rec.score)}% Match
                                            </span>
                                          </div>

                                          <p className="ai-layout-card-reason" title={rec.match_reason}>
                                            {rec.match_reason}
                                          </p>

                                          <div className="ai-layout-card-actions">
                                            <button
                                              className="ai-layout-action-btn ai-layout-preview-btn"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setPreviewModalTemplate(rec.preset);
                                              }}
                                              title="Preview how your photos look in this template"
                                            >
                                              <Eye size={11} /> Preview
                                            </button>

                                            <button
                                              className="ai-layout-action-btn ai-layout-apply-btn"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleInitiateApplyTemplate(rec.preset);
                                              }}
                                              title="Apply this template to your post"
                                            >
                                              <Sparkles size={11} /> Apply
                                            </button>
                                          </div>
                                        </div>

                                        {isSelected && (
                                          <div className="ai-layout-badge-selected">
                                            <Check size={10} color="#fff" strokeWidth={3} />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Empty State before first generation */}
                            {!isSuggestingTemplates && !templateError && suggestedTemplates.length === 0 && (
                              <div className="ai-captions-empty">
                                <p className="ai-empty-desc">
                                  Analyze all images in this slide together to find 4–5 context-aware templates matching your post's visual style, lighting, and composition.
                                </p>
                                <button
                                  className="btn-primary"
                                  style={{ width: "100%", justifyContent: "center", marginTop: 8, background: "#10b981", borderColor: "#10b981" }}
                                  onClick={() => handleSuggestTemplates(false)}
                                  disabled={isSuggestingTemplates}
                                >
                                  <Sparkles size={14} /> Suggest Templates
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="inspector-section-header">
                              <span className="inspector-section-label">AI Studio Suite</span>
                              <span className="inspector-section-meta">One-Click Actions</span>
                            </div>

                            <div className="ai-cards-stack">
                              <div
                                className="ai-tool-card"
                                onClick={() => {
                                  setActiveAiModal("captions");
                                  if (generatedCaptions.length === 0 && !isGeneratingCaptions) {
                                    handleGenerateCaptions(false);
                                  }
                                }}
                              >
                                <div className="ai-card-icon-box" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "#a855f7" }}>
                                  <Sparkles size={16} />
                                </div>
                                <div className="ai-card-info">
                                  <div className="ai-card-title">Generate Captions</div>
                                  <div className="ai-card-desc">
                                    {generatedCaptions.length === 5
                                      ? "5 tailored captions ready • Click to view"
                                      : "Get creative captions tailored for this post"}
                                  </div>
                                </div>
                              </div>

                              <div
                                className="ai-tool-card"
                                onClick={() => {
                                  setActiveAiModal("layouts");
                                  if (suggestedTemplates.length === 0 && !isSuggestingTemplates) {
                                    handleSuggestTemplates(false);
                                  }
                                }}
                              >
                                <div className="ai-card-icon-box" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981" }}>
                                  <Layout size={16} />
                                </div>
                                <div className="ai-card-info">
                                  <div className="ai-card-title">Suggest Layouts</div>
                                  <div className="ai-card-desc">
                                    {suggestedTemplates.length > 0
                                      ? `${suggestedTemplates.length} recommendations ready • Click to view`
                                      : `Get alternative design variations for ${activePreset.slots.length} photos`}
                                  </div>
                                </div>
                              </div>

                              <div className="ai-tool-card" onClick={() => handleTriggerAiAction("enhance")}>
                                <div className="ai-card-icon-box" style={{ background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)", color: "#06b6d4" }}>
                                  <Sun size={16} />
                                </div>
                                <div className="ai-card-info">
                                  <div className="ai-card-title">Enhance Photos</div>
                                  <div className="ai-card-desc">Auto improve lighting, contrast, and vivid colors</div>
                                </div>
                              </div>

                              <div className="ai-tool-card" onClick={() => handleTriggerAiAction("bg")}>
                                <div className="ai-card-icon-box" style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6" }}>
                                  <Scissors size={16} />
                                </div>
                                <div className="ai-card-info">
                                  <div className="ai-card-title">Remove Background</div>
                                  <div className="ai-card-desc">Isolate subject and add backdrop color</div>
                                </div>
                              </div>

                              <div className="ai-tool-card" onClick={() => handleTriggerAiAction("hashtags")}>
                                <div className="ai-card-icon-box" style={{ background: "rgba(236,72,153,0.15)", border: "1px solid rgba(236,72,153,0.3)", color: "#ec4899" }}>
                                  <Terminal size={16} />
                                </div>
                                <div className="ai-card-info">
                                  <div className="ai-card-title">Generate Hashtags</div>
                                  <div className="ai-card-desc">Trending relevant tags for high engagement</div>
                                </div>
                              </div>
                            </div>

                            {/* Other AI Modals (layouts, hashtags) */}
                            {activeAiModal && aiSuggestions && (
                              <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.3)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>AI Suggestions</span>
                                  <button onClick={() => setActiveAiModal(null)} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer" }}><X size={12} /></button>
                                </div>

                                {activeAiModal === "hashtags" && (
                                  <div>
                                    <div style={{ fontSize: 11, color: "var(--accent-violet-mid)", lineHeight: 1.6, marginBottom: 8 }}>
                                      {aiSuggestions.tags?.join(" ")}
                                    </div>
                                    <button
                                      className="copy-btn"
                                      onClick={() => {
                                        handleCopy(aiSuggestions.tags?.join(" "), "tags_copy");
                                        setActiveAiModal(null);
                                      }}
                                    >
                                      Copy Tags
                                    </button>
                                  </div>
                                )}

                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </aside>
              </div>
            </>
          )
        ) : appView === "dashboard" ? (
          <div className="full-view">
            <div className="full-view-inner">
              <div className="dashboard-hero">
                <div className="hero-badge"><Sparkles size={13} /><span>LazyLens Studio Engine</span></div>
                <h1 className="hero-title">Create Beautiful Social Carousels <span>Effortlessly.</span></h1>
                <p className="hero-desc">Curate multi-slide stories with seamless layouts, auto-enhancement, typography overlays, and native social sharing.</p>
                <div className="hero-actions">
                  <button className="btn-primary" onClick={() => setAppView("templates")}><Compass size={13} /><span>Explore Templates</span></button>
                  <button className="btn-ghost" onClick={() => setAppView("editor")}><Layers size={13} /><span>Open Studio</span></button>
                </div>
              </div>
            </div>
          </div>
        ) : appView === "ai" ? (
          <div className="full-view">
            <div className="full-view-inner">
              <div className="section-title-row">
                <div>
                  <h2 className="page-heading">AI Studio</h2>
                  <p className="page-sub">Generate captions, analyze compositions, and craft hashtags with Ollama AI.</p>
                </div>
              </div>
              <div className="dashboard-hero" style={{ padding: 32 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Intelligent Content Generation</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: 13, maxWidth: 600, lineHeight: 1.6, marginBottom: 20 }}>
                  Our AI engine automatically analyzes your photos and provides poetic, witty, and Hinglish captions along with high-engagement hashtags.
                </p>
                <button className="btn-primary" onClick={() => { setAppView("editor"); setRightInspectorTab("ai"); }}>
                  <span>Open AI Tools in Studio</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="full-view">
            <div className="full-view-inner">
              <div className="section-title-row">
                <div>
                  <h2 className="page-heading">Projects</h2>
                  <p className="page-sub">Access your saved carousel projects.</p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
                {savedProjects.map((p) => (
                  <div key={p.id} className="project-card" onClick={() => { setProjectTitle(p.title); setAppView("editor"); }}>
                    <div className="project-thumb">
                      <img src={p.thumbnail} alt="" />
                      <div className="project-slides-badge">{p.slidesCount} Slides</div>
                    </div>
                    <div className="project-name">{p.title}</div>
                    <div className="project-meta"><span>{p.presetName}</span><span>{p.updatedAt}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Slide Deletion Confirmation Modal ──────────────────────────── */}
      {deleteConfirmSlideIndex !== null && slides[deleteConfirmSlideIndex] && (
        <div
          className="modal-overlay"
          onClick={() => !isDeletingSlide && setDeleteConfirmSlideIndex(null)}
          style={{ zIndex: 130 }}
        >
          <div
            className="modal-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 420,
              padding: 24,
              background: "rgba(13, 16, 26, 0.98)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(244, 63, 94, 0.15)",
              borderRadius: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: "rgba(244, 63, 94, 0.12)",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent-rose)",
                  flexShrink: 0,
                }}
              >
                <Trash2 size={20} />
              </div>

              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                  Delete Slide #{deleteConfirmSlideIndex + 1}?
                </h3>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: 16 }}>
                  {slides.length <= 1
                    ? "This is the last remaining slide in your carousel. Deleting it will clear the canvas and reset the carousel."
                    : isSlideEdited(slides[deleteConfirmSlideIndex])
                    ? "This slide contains customized photos, text layers, or visual styling. Deleting it cannot be undone."
                    : "Are you sure you want to permanently remove this slide from your carousel project?"}
                </p>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setDeleteConfirmSlideIndex(null)}
                    disabled={isDeletingSlide}
                    style={{ padding: "7px 14px", fontSize: 12 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteSlide}
                    disabled={isDeletingSlide}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 15px",
                      borderRadius: 8,
                      background: "linear-gradient(135deg, #ef4444, #dc2626)",
                      border: "none",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: isDeletingSlide ? "not-allowed" : "pointer",
                      boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)",
                      opacity: isDeletingSlide ? 0.7 : 1,
                    }}
                  >
                    <Trash2 size={13} />
                    <span>{isDeletingSlide ? "Deleting..." : "Delete Slide"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Slide Choice / Template Library Modal ──────────────────── */}
      {addSlideModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => !isAddingSlide && setAddSlideModalOpen(false)}
          style={{ zIndex: 125 }}
        >
          <div
            className="modal-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: addSlideStep === "choice" ? 480 : 720,
              width: "100%",
              maxHeight: "88vh",
              padding: 24,
              background: "rgba(12, 14, 24, 0.98)",
              border: "1px solid rgba(139, 92, 246, 0.28)",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(139, 92, 246, 0.12)",
              borderRadius: 16,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {addSlideStep === "choice" ? (
              /* ── Step 1: Two Clear Choices (Blank vs Template) ── */
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(139, 92, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-violet-mid)" }}>
                      <Plus size={16} />
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Add Slide</h3>
                  </div>
                  <button
                    className="modal-close-btn"
                    onClick={() => setAddSlideModalOpen(false)}
                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}
                  >
                    <X size={16} />
                  </button>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 18 }}>
                  Choose how you'd like to create your next slide in this carousel:
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {/* Choice 1: Blank Slide */}
                  <div
                    className="add-slide-choice-card"
                    onClick={handleAddBlankSlide}
                    style={{
                      padding: "22px 16px",
                      borderRadius: 14,
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid var(--border-subtle)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      transition: "all 0.18s ease",
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text-secondary)",
                        marginBottom: 12,
                      }}
                    >
                      <Square size={22} strokeWidth={1.75} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 5 }}>Blank Slide</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.45 }}>
                      Add a clean slide matching your current layout
                    </div>
                  </div>

                  {/* Choice 2: Choose from Templates */}
                  <div
                    className="add-slide-choice-card"
                    onClick={() => setAddSlideStep("templates")}
                    style={{
                      padding: "22px 16px",
                      borderRadius: 14,
                      background: "rgba(139, 92, 246, 0.06)",
                      border: "1px solid rgba(139, 92, 246, 0.3)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      transition: "all 0.18s ease",
                      boxShadow: "0 4px 20px rgba(139, 92, 246, 0.1)",
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: "linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(6, 182, 212, 0.2))",
                        border: "1px solid rgba(139, 92, 246, 0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--accent-violet-mid)",
                        marginBottom: 12,
                      }}
                    >
                      <Layout size={22} strokeWidth={1.75} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 5 }}>Choose Template</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.45 }}>
                      Browse curated multi-photo layouts and presets
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Step 2: Compact Template Library Browser ── */
              <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
                {/* Header with Back button */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setAddSlideStep("choice")}
                      style={{ padding: "5px 10px", fontSize: 11.5, gap: 4 }}
                      title="Back to choices"
                    >
                      <ChevronLeft size={14} />
                      <span>Back</span>
                    </button>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Choose from Templates</h3>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>Select a layout preset for your new slide</p>
                    </div>
                  </div>
                  <button
                    className="modal-close-btn"
                    onClick={() => setAddSlideModalOpen(false)}
                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Search & Category Filter */}
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <div style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 8,
                    padding: "6px 10px",
                  }}>
                    <Search size={14} color="var(--text-muted)" />
                    <input
                      type="text"
                      value={templateSearchQuery}
                      onChange={(e) => setTemplateSearchQuery(e.target.value)}
                      placeholder="Search 100+ templates..."
                      style={{
                        background: "none",
                        border: "none",
                        outline: "none",
                        color: "#fff",
                        fontSize: 12,
                        width: "100%",
                      }}
                    />
                    {templateSearchQuery && (
                      <button
                        onClick={() => setTemplateSearchQuery("")}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2 }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Category Pills */}
                <div style={{
                  display: "flex",
                  gap: 6,
                  overflowX: "auto",
                  paddingBottom: 8,
                  marginBottom: 10,
                  scrollbarWidth: "none",
                }}>
                  {["All", "Aesthetic", "Minimal", "Film", "Scrapbook", "Travel", "Magazine", "Cinematic"].map((cat) => {
                    const isActive = templateCategoryFilter.toLowerCase() === cat.toLowerCase();
                    return (
                      <button
                        key={cat}
                        onClick={() => setTemplateCategoryFilter(cat)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          background: isActive ? "var(--accent-violet-mid)" : "rgba(255, 255, 255, 0.04)",
                          color: isActive ? "#fff" : "var(--text-secondary)",
                          border: isActive ? "1px solid var(--accent-violet-mid)" : "1px solid var(--border-subtle)",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {/* Scrollable Templates Grid */}
                <div style={{
                  flex: 1,
                  maxHeight: 340,
                  overflowY: "auto",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: 10,
                  padding: 2,
                  marginBottom: 14,
                }}>
                  {PRESET_LAYOUTS.filter((p) => {
                    const query = templateSearchQuery.trim().toLowerCase();
                    const matchesSearch =
                      !query ||
                      p.name.toLowerCase().includes(query) ||
                      (p.category && p.category.toLowerCase().includes(query));
                    const matchesCategory =
                      templateCategoryFilter === "All" ||
                      (p.category && p.category.toLowerCase() === templateCategoryFilter.toLowerCase());
                    return matchesSearch && matchesCategory;
                  }).map((preset) => {
                    const isSelected = selectedTemplateForSlide?.layout_id === preset.layout_id;
                    return (
                      <div
                        key={`modal-tpl-${preset.layout_id}`}
                        onClick={() => setSelectedTemplateForSlide(preset)}
                        style={{
                          padding: 6,
                          borderRadius: 10,
                          background: isSelected ? "rgba(139, 92, 246, 0.12)" : "rgba(255, 255, 255, 0.02)",
                          border: isSelected ? "1.5px solid var(--accent-violet-mid)" : "1px solid var(--border-subtle)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          position: "relative",
                        }}
                      >
                        <div style={{ position: "relative", width: "100%", aspectRatio: "4/5", borderRadius: 8, overflow: "hidden", marginBottom: 6 }}>
                          <TemplatePreview preset={preset} active={isSelected} />
                          {isSelected && (
                            <div style={{
                              position: "absolute",
                              top: 5,
                              right: 5,
                              width: 18,
                              height: 18,
                              borderRadius: "50%",
                              background: "var(--accent-violet-mid)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
                              zIndex: 5,
                            }}>
                              <Check size={11} color="#fff" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: isSelected ? "#fff" : "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {preset.name}
                        </div>
                        <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 2 }}>
                          {preset.slots.length} Photos
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Confirmation Bar */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: 14,
                  borderTop: "1px solid var(--border-faint)",
                }}>
                  <div>
                    {selectedTemplateForSlide ? (
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                        Selected: <strong style={{ color: "#fff" }}>{selectedTemplateForSlide.name}</strong> ({selectedTemplateForSlide.slots.length} photos)
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Select a template above</span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setAddSlideModalOpen(false)}
                      disabled={isAddingSlide}
                      style={{ padding: "7px 14px", fontSize: 12 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={confirmAddSlideFromTemplate}
                      disabled={!selectedTemplateForSlide || isAddingSlide}
                      style={{
                        padding: "7px 16px",
                        fontSize: 12,
                        gap: 6,
                        opacity: !selectedTemplateForSlide || isAddingSlide ? 0.6 : 1,
                        cursor: !selectedTemplateForSlide || isAddingSlide ? "not-allowed" : "pointer",
                      }}
                    >
                      <Plus size={13} />
                      <span>{isAddingSlide ? "Adding..." : "Add Slide"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Comprehensive Export Workflow Modal ─────────────────────────── */}
      {isExportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-panel">
            <div className="modal-header">
              <div className="modal-header-info">
                <span className="modal-status-dot" />
                <span className="modal-title">Export Carousel — {carouselRatio}</span>
              </div>
              <button className="modal-close-btn" onClick={() => setIsExportModalOpen(false)}><X size={14} /></button>
            </div>

            <div className="modal-body">
              {renderedImageUrl && (
                <div className="modal-preview-col">
                  <div className="modal-image-frame">
                    <img
                      src={renderedSlides.length > 0 && renderedSlides[modalPreviewIndex]
                        ? `http://localhost:8000${renderedSlides[modalPreviewIndex].download_url}`
                        : renderedImageUrl}
                      alt="Rendered Composition"
                    />
                  </div>
                  {renderedSlides.length > 1 && (
                    <div className="modal-slide-tabs">
                      {renderedSlides.map((s, idx) => (
                        <button
                          key={s.filename}
                          onClick={() => setModalPreviewIndex(idx)}
                          className={`modal-slide-tab${modalPreviewIndex === idx ? " active-tab" : ""}`}
                        >
                          Slide {idx + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="modal-info-col">
                <div className="modal-caption-card">
                  <div className="modal-caption-kicker">Format & Quality</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button
                      className={`btn-ghost${exportFormat === "jpg" ? " align-active" : ""}`}
                      onClick={() => setExportFormat("jpg")}
                      style={{ flex: 1, justifyContent: "center" }}
                    >
                      JPEG (Standard)
                    </button>
                    <button
                      className={`btn-ghost${exportFormat === "png" ? " align-active" : ""}`}
                      onClick={() => setExportFormat("png")}
                      style={{ flex: 1, justifyContent: "center" }}
                    >
                      PNG (Lossless)
                    </button>
                  </div>
                </div>

                {captions && (
                  <div className="modal-caption-card">
                    <div className="modal-caption-kicker">AI Generated Caption</div>
                    <div className="modal-caption-text">"{captions.aesthetic}"</div>
                    {captions.hashtags && (
                      <div className="modal-hashtags">{captions.hashtags.join(" ")}</div>
                    )}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      <button className={`copy-btn${copiedKey === "modal_aes" ? " copied" : ""}`} onClick={() => handleCopy(captions.aesthetic, "modal_aes")}>
                        {copiedKey === "modal_aes" ? "✓ Copied" : "Copy Caption"}
                      </button>
                      {captions.hashtags && (
                        <button className={`copy-btn${copiedKey === "modal_tags" ? " copied" : ""}`} onClick={() => handleCopy(captions.hashtags.join(" "), "modal_tags")}>
                          {copiedKey === "modal_tags" ? "✓ Copied" : "Copy Tags"}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
                  {zipDownloadUrl ? (
                    <a href={zipDownloadUrl} download className="download-btn">
                      <Download size={14} /><span>Download All Slides (.ZIP)</span>
                    </a>
                  ) : (
                    renderedImageUrl && (
                      <a href={renderedImageUrl} download={`carousel_slide.${exportFormat}`} className="download-btn">
                        <Download size={14} /><span>Download Slide</span>
                      </a>
                    )
                  )}

                  <button
                    className="copy-btn"
                    onClick={handleShareAction}
                    disabled={isSharing}
                    style={{ justifyContent: "center", padding: "10px 14px", background: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255, 255, 255, 0.12)", width: "100%", borderRadius: "8px" }}
                  >
                    <Share2 size={14} />
                    <span>{isSharing ? "Preparing…" : "Share via Web Share API"}</span>
                  </button>

                  <button className="modal-close-action" onClick={() => setIsExportModalOpen(false)}>Close Preview</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Phase 2: Recommended Template Interactive Preview Modal ───── */}
      {previewModalTemplate && (
        <div
          className="modal-overlay"
          onClick={() => setPreviewModalTemplate(null)}
          style={{ zIndex: 130 }}
        >
          <div
            className="modal-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 640,
              width: "92%",
              maxHeight: "90vh",
              padding: 24,
              background: "rgba(12, 14, 24, 0.98)",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(16, 185, 129, 0.15)",
              borderRadius: 16,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                  <Eye size={18} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>
                      {previewModalTemplate.name}
                    </h3>
                    <span className="ai-layout-cat-pill" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", borderColor: "rgba(16, 185, 129, 0.3)" }}>
                      {previewModalTemplate.category}
                    </span>
                  </div>
                  <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "2px 0 0" }}>
                    Interactive Preview — Your project is untouched until applied
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewModalTemplate(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 6 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Main Preview Area */}
            <div style={{ display: "flex", gap: 20, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
              <div
                style={{
                  position: "relative",
                  width: 260,
                  aspectRatio: "4 / 5",
                  background: previewModalTemplate.canvas?.background_color || "#121214",
                  borderRadius: 10,
                  overflow: "hidden",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
                  flexShrink: 0,
                }}
              >
                {previewModalTemplate.slots.map((slot, sIdx) => {
                  const photo = activeSlide?.photos?.[sIdx] || { url: getPresetSlotImageUrl(previewModalTemplate, sIdx) };
                  const canvasW = previewModalTemplate.canvas?.width || 1080;
                  const canvasH = previewModalTemplate.canvas?.height || 1350;
                  return (
                    <div
                      key={`preview-slot-${sIdx}`}
                      style={{
                        position: "absolute",
                        left: `${(slot.x / canvasW) * 100}%`,
                        top: `${(slot.y / canvasH) * 100}%`,
                        width: `${(slot.width / canvasW) * 100}%`,
                        height: `${(slot.height / canvasH) * 100}%`,
                        borderRadius: slot.border_radius ? `${slot.border_radius / 3.5}px` : "2px",
                        overflow: "hidden",
                        background: "#1c1e28",
                      }}
                    >
                      <img
                        src={photo.url}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/demo/demo1.jpg";
                        }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          top: 4,
                          left: 4,
                          background: "rgba(0,0,0,0.65)",
                          padding: "1px 5px",
                          borderRadius: 3,
                          fontSize: 8.5,
                          color: "#fff",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        Slot {sIdx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Details & Specs Column */}
              <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4 }}>
                    WHY THIS TEMPLATE MATCHES
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.4 }}>
                    {selectedRecommendation?.preset?.layout_id === previewModalTemplate.layout_id
                      ? selectedRecommendation.match_reason
                      : `Balanced ${previewModalTemplate.slots.length}-photo arrangement styled for cohesive presentation.`}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Photo Slots</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{previewModalTemplate.slots.length} Photos</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Aspect Ratio</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>4:5 Vertical</div>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.35 }}>
                  Tip: You can replace Slide {activeSlideIndex + 1}'s layout or add this as a new slide in your carousel without affecting existing slides.
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8, paddingTop: 14, borderTop: "1px solid var(--border-subtle)" }}>
              <button
                className="btn-secondary"
                onClick={() => setPreviewModalTemplate(null)}
                style={{ padding: "8px 16px" }}
              >
                Close Preview
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  handleInitiateApplyTemplate(previewModalTemplate);
                }}
                style={{ padding: "8px 18px", background: "#10b981", borderColor: "#10b981" }}
              >
                <Sparkles size={14} /> Apply Template…
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Phase 2: Safe Template Application Confirmation Modal ──────── */}
      {confirmApplyModalTemplate && (
        <div
          className="modal-overlay"
          onClick={() => setConfirmApplyModalTemplate(null)}
          style={{ zIndex: 135 }}
        >
          <div
            className="modal-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 480,
              width: "90%",
              padding: 24,
              background: "rgba(12, 14, 24, 0.98)",
              border: "1px solid rgba(139, 92, 246, 0.35)",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(139, 92, 246, 0.15)",
              borderRadius: 16,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(139, 92, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-violet-mid)" }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>
                    Apply "{confirmApplyModalTemplate.name}"
                  </h3>
                  <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "2px 0 0" }}>
                    Choose how you'd like to apply this recommended layout
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfirmApplyModalTemplate(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 6 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
              {/* Choice A: Replace Current Slide */}
              <div
                className="add-slide-choice-card"
                onClick={() => handleApplyTemplate(confirmApplyModalTemplate, "replace")}
                style={{
                  padding: "16px 16px",
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--border-subtle)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  transition: "all 0.18s ease",
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981", flexShrink: 0 }}>
                  <Check size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                    Replace Slide {activeSlideIndex + 1} Layout
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                    Preserves your current photos and text layers into the new template slots.
                  </div>
                </div>
              </div>

              {/* Choice B: Add as New Slide (Zero risk) */}
              <div
                className="add-slide-choice-card"
                onClick={() => handleApplyTemplate(confirmApplyModalTemplate, "new_slide")}
                style={{
                  padding: "16px 16px",
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--border-subtle)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  transition: "all 0.18s ease",
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(139, 92, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-violet-mid)", flexShrink: 0 }}>
                  <Plus size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                    Add as New Slide (Safe)
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                    Keeps Slide {activeSlideIndex + 1} exactly as is and appends a new slide with this layout.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <button
                className="btn-secondary"
                onClick={() => setConfirmApplyModalTemplate(null)}
                style={{ padding: "6px 14px", fontSize: 11.5 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ────────────────────────────────────────────── */}
      {swapNotification && (
        <div className="toast-notification">
          <span className="toast-dot" />
          <span>{swapNotification}</span>
        </div>
      )}
    </div>
  );
}
