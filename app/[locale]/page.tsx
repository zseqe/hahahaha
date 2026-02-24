"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Camera, History, ImageIcon, RotateCcw, X, Info, Leaf, Pill, AlertTriangle, XOctagon, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Locale = "en" | "hi" | "kn";
type QueueItem = { id: string; blob: Blob; createdAt: number; location?: { lat: number; lng: number } };

type PlantDemoData = {
  id?: string;
  commonName: string;
  scientificName: string;
  description: string;
  morphology: string;
  differentiation: string;
  uses: string;
  preparationUrl?: string;
  preparationText: string;
  adverseEffects: string;
  contraindications: string;
  imageUrl?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const DB_NAME = "plant-finder-db";
const STORE = "detect-queue";
const HISTORY_STORE = "history";
const DB_VERSION = 3; // Increment version to apply new store

export type HistoryRecord = {
  id: string;
  plantId: string | undefined;
  blob: Blob;
  createdAt: number;
  location?: { lat: number; lng: number };
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

async function dbPut(item: QueueItem) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();
    tx.objectStore(STORE).put(item);
  });
  db.close();
}

async function dbGetAll(): Promise<QueueItem[]> {
  const db = await openDb();
  const items = await new Promise<QueueItem[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result as QueueItem[]);
  });
  db.close();
  return items.sort((a, b) => a.createdAt - b.createdAt);
}

async function dbDelete(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();
    tx.objectStore(STORE).delete(id);
  });
  db.close();
}

async function dbAddHistory(item: HistoryRecord) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(HISTORY_STORE, "readwrite");
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();
    tx.objectStore(HISTORY_STORE).put(item);
  });
  db.close();
}

async function dbGetHistory(): Promise<HistoryRecord[]> {
  const db = await openDb();
  const items = await new Promise<HistoryRecord[]>((resolve, reject) => {
    const tx = db.transaction(HISTORY_STORE, "readonly");
    const req = tx.objectStore(HISTORY_STORE).getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result as HistoryRecord[]);
  });
  db.close();
  return items.sort((a, b) => b.createdAt - a.createdAt); // Newest first
}

function BigButton({
  onClick,
  disabled,
  variant = "primary",
  icon,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "w-full rounded-lg px-4 py-2 text-lg font-semibold flex items-center justify-center gap-3",
        "focus:outline-none focus:ring-4 focus:ring-offset-2 active:scale-[0.99] transition",
        variant === "primary"
          ? "bg-emerald-800 text-white hover:bg-emerald-900 focus:ring-emerald-300 disabled:bg-emerald-300"
          : "bg-white text-gray-900 border-2 border-gray-300 hover:border-gray-400 focus:ring-gray-200 disabled:opacity-60"
      )}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

export default function Home() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale() as Locale;
  const plants = t.raw("plants") as PlantDemoData[];

  const uploadRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const [selectedPlant, setSelectedPlant] = useState<PlantDemoData | null>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [loading, setLoading] = useState(false);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [retrying, setRetrying] = useState(false);

  const canIdentify = useMemo(() => !!file && !loading, [file, loading]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const stopStream = () => {
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async (mode: "environment" | "user" = facingMode) => {
    setCameraError(null);
    stopStream();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode } },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: unknown) {
      const name = err instanceof DOMException ? err.name : "";

      const msg =
        name === "NotAllowedError"
          ? t("camera.blocked")
          : name === "NotFoundError"
            ? t("camera.notFound")
            : t("camera.failed");

      setCameraError(msg);
    }
  };

  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log("Location permission denied", err),
        { enableHighAccuracy: true }
      );
    }
  };

  const openCamera = () => {
    requestLocation();
    setCameraOpen(true);
    setTimeout(() => void startCamera(facingMode), 50);
  };

  const closeCamera = () => {
    setCameraOpen(false);
    stopStream();
  };

  const flipCamera = async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    await startCamera(next);
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    requestLocation();
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );
    if (!blob) return;

    const captured = new File([blob], `plant-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });

    setFile(captured);
    setPreview(URL.createObjectURL(captured));
    closeCamera();
  };

  const resetAll = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setLoading(false);
    setLocation(null);
  };

  const queueCurrentRequest = async (blob: Blob) => {
    await dbPut({ id: uid(), blob, createdAt: Date.now(), location: location || undefined });
    const all = await dbGetAll();
    setQueueCount(all.length);
  };

  useEffect(() => {
    void (async () => {
      const all = await dbGetAll();
      setQueueCount(all.length);
    })();
  }, []);

  const detectBlob = async (blob: Blob): Promise<{ id: string }> => {
    const form = new FormData();
    form.append("image", blob, "image.jpg");
    const res = await fetch("/api/detect", { method: "POST", body: form });
    if (!res.ok) throw new Error("detect_failed");
    return res.json() as Promise<{ id: string }>;
  };

  const processQueue = async () => {
    if (!navigator.onLine) return;

    const items = await dbGetAll();
    if (items.length === 0) return;

    setRetrying(true);

    for (const it of items) {
      try {
        const data = await detectBlob(it.blob);
        await dbDelete(it.id);
        const left = await dbGetAll();
        setQueueCount(left.length);
        setRetrying(false);
        // Simulate picking random instead of router push to show details directly
        const randomPlant = plants[Math.floor(Math.random() * plants.length)];

        await dbAddHistory({
          id: uid(),
          plantId: randomPlant.id,
          blob: it.blob,
          createdAt: Date.now(),
          location: it.location,
        });

        setSelectedPlant(randomPlant);
        return;
      } catch {
        setRetrying(false);
        return;
      }
    }

    setRetrying(false);
  };

  useEffect(() => {
    if (isOnline) void processQueue();
  }, [isOnline]);

  const handleDetect = async () => {
    if (!file) return;

    if (!navigator.onLine) {
      await queueCurrentRequest(file);
      return;
    }

    setLoading(true);

    try {
      let detectedName = "";

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("http://localhost:8000/detect", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          detectedName = data.detected_plant;
        }
      } catch (err) {
        console.error("FastAPI backend error, falling back to mock:", err);
      }

      // If backend gave a name, find it in our localization list. Otherwise, pick random.
      let identifiedPlant = plants.find(p => p.commonName === detectedName);
      if (!identifiedPlant) {
        identifiedPlant = plants[Math.floor(Math.random() * plants.length)];
      }

      await dbAddHistory({
        id: uid(),
        plantId: identifiedPlant.id,
        blob: file,
        createdAt: Date.now(),
        location: location || undefined,
      });

      setSelectedPlant(identifiedPlant);

    } catch {
      await queueCurrentRequest(file);
    } finally {
      setLoading(false);
    }
  };

  const onLocaleChange = (nextLocale: string) => {
    const l = nextLocale as Locale;

    const url = new URL(window.location.href);
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.length === 0) {
      window.location.href = `/${l}${url.search}`;
      return;
    }

    parts[0] = l;
    url.pathname = `/${parts.join("/")}`;
    window.location.href = url.toString();
  };

  const openHistory = async () => {
    const recs = await dbGetHistory();
    setHistoryRecords(recs);
    setIsHistoryOpen(true);
  };

  useEffect(() => {
    return () => {
      stopStream();
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    // Request location permission on mount
    requestLocation();

    // Request camera permission on mount and immediately stop the stream 
    // to prevent the camera light from staying on until actually needed.
    if ("mediaDevices" in navigator && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          stream.getTracks().forEach((track) => track.stop());
        })
        .catch((err) => console.log("Camera permission denied on load", err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#F7FAF7] text-gray-900">
      <header className="sticky top-0 z-50 bg-white border-b-2 border-gray-200">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-extrabold leading-tight truncate">{t("app.title")}</p>
            <p className="text-xs font-semibold text-gray-800 truncate">{t("app.subtitle")}</p>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={locale}
              onValueChange={(e) => onLocaleChange(e)}
              aria-label={t("lang.label")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="end" sideOffset={2}>
                <SelectItem value="en">{t("lang.en")}</SelectItem>
                <SelectItem value="hi">{t("lang.hi")}</SelectItem>
                <SelectItem value="kn">{t("lang.kn")}</SelectItem>
              </SelectContent>
            </Select>

            <button
              type="button"
              className="h-10 w-10 rounded-lg border-2 border-gray-300 bg-white flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-gray-200"
              onClick={openHistory}
              aria-label={t("actions.history")}
            >
              <History className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />

      <main className="max-w-md mx-auto px-4 py-5 space-y-4">
        <section className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm space-y-4">
          {!isOnline && (
            <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-3">
              <p className="font-extrabold text-amber-900">{t("offline.title")}</p>
              <p className="mt-1 text-base font-semibold text-amber-900">{t("offline.text")}</p>
              <div className="mt-2 text-sm font-extrabold text-amber-900">
                {t("offline.queued")}: {queueCount}
              </div>
            </div>
          )}

          {retrying && (
            <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-3">
              <p className="text-base font-extrabold text-emerald-900">{t("offline.retrying")}</p>
            </div>
          )}

          {!preview ? (
            <>
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Camera className="h-6 w-6 text-emerald-900" />
                </div>
                <div>
                  <p className="text-lg font-extrabold">{t("steps.s1")}</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">{t("tips.t2")}</p>
                </div>
              </div>

              <div className="space-y-3">
                <BigButton onClick={openCamera} icon={<Camera className="h-6 w-6" />}>
                  {t("actions.takePhoto")}
                </BigButton>

                <BigButton
                  variant="secondary"
                  onClick={() => uploadRef.current?.click()}
                  icon={<ImageIcon className="h-6 w-6" />}
                >
                  {t("actions.choosePhoto")}
                </BigButton>
              </div>

              <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-3">
                <p className="font-extrabold text-amber-900">{t("tips.title")}</p>
                <ul className="mt-1 text-base font-semibold text-amber-900 list-disc pl-5 space-y-1">
                  <li>{t("tips.t1")}</li>
                  <li>{t("tips.t2")}</li>
                  <li>{t("tips.t3")}</li>
                </ul>
              </div>

              <div className="rounded-lg border-2 border-gray-200 bg-white p-3">
                <p className="font-extrabold text-gray-900">{t("helper.title")}</p>
                <p className="mt-1 text-base font-semibold text-gray-900">{t("helper.text")}</p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-extrabold">{t("steps.s2")}</p>
                  <p className="text-base font-semibold text-gray-900">{t("tips.t1")}</p>
                </div>
                <button
                  type="button"
                  className="px-4 py-3 rounded-lg border-2 border-gray-300 font-extrabold text-gray-900 bg-white focus:outline-none focus:ring-4 focus:ring-gray-200"
                  onClick={resetAll}
                >
                  {t("actions.clear")}
                </button>
              </div>

              <div className="rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
                <Image
                  src={preview}
                  alt="Selected plant photo preview"
                  width={900}
                  height={900}
                  className="w-full h-80 object-cover"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <BigButton variant="secondary" onClick={openCamera} icon={<Camera className="h-6 w-6" />}>
                  {t("actions.retake")}
                </BigButton>
                <BigButton variant="secondary" onClick={() => uploadRef.current?.click()} icon={<ImageIcon className="h-6 w-6" />}>
                  {t("actions.replace")}
                </BigButton>
              </div>

              <BigButton onClick={handleDetect} disabled={!canIdentify} icon={<span className="text-xl">✓</span>}>
                {loading ? t("actions.checking") : t("actions.next")}
              </BigButton>
            </>
          )}
        </section>
      </main>

      {/* Drawer for History */}
      <Drawer open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DrawerContent className="fixed left-0 right-0 bottom-0 top-16 max-w-md mx-auto rounded-lg-t-3xl border-2 border-t-gray-200 bg-[#F7FAF7] outline-none before:hidden">
          <DrawerHeader className="text-left border-b-2 border-gray-100 flex items-center justify-between pb-4">
            <div>
              <DrawerTitle className="text-2xl font-extrabold text-emerald-950">
                {t("actions.history")}
              </DrawerTitle>
              <DrawerDescription className="text-sm font-medium text-emerald-800">
                {t("drawer.historyDesc") || "Your previous plant scans."}
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <button
                type="button"
                className="h-10 w-10 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"
              >
                <X className="h-5 w-5 text-gray-700" />
              </button>
            </DrawerClose>
          </DrawerHeader>

          <ScrollArea className="h-full px-4 py-4">
            {historyRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-3">
                <History className="h-10 w-10 opacity-30" />
                <p className="font-semibold">{t("drawer.emptyHistory") || "No history yet."}</p>
              </div>
            ) : (
              <div className="space-y-3 pb-8">
                {historyRecords.map((rec) => {
                  const plant = plants.find((p) => p.id === rec.plantId);
                  const imageUrl = URL.createObjectURL(rec.blob);

                  return (
                    <button
                      key={rec.id}
                      onClick={() => {
                        setIsHistoryOpen(false);
                        if (plant) {
                          setTimeout(() => setSelectedPlant(plant), 300);
                        }
                      }}
                      className="w-full text-left bg-white border-2 border-gray-200 rounded-lg p-3 flex gap-4 items-center focus:outline-none focus:ring-4 focus:ring-gray-200 active:scale-[0.98] transition"
                    >
                      <div className="relative h-16 w-16 shrink-0 rounded-lg-xl overflow-hidden bg-gray-100 border-2 border-gray-100">
                        <Image
                          src={imageUrl}
                          alt={plant?.commonName || "Plant"}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 truncate">
                          {plant?.commonName || "Unknown Plant"}
                        </p>
                        <p className="text-sm text-gray-500 font-medium truncate">
                          {new Date(rec.createdAt).toLocaleDateString(locale, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {rec.location && (
                        <button
                          type="button"
                          aria-label={t("drawer.mapLink") || "Open in Google Maps"}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                              `https://www.google.com/maps/search/?api=1&query=${rec.location!.lat},${rec.location!.lng}`,
                              "_blank"
                            );
                          }}
                          className="h-10 w-10 shrink-0 rounded-lg-full bg-emerald-50 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition focus:outline-none focus:ring-4 focus:ring-emerald-200"
                        >
                          <MapPin className="h-5 w-5" />
                        </button>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/* Drawer for Plant Details */}
      <Drawer open={selectedPlant !== null} onOpenChange={(open) => !open && setSelectedPlant(null)}>
        <DrawerContent className="fixed left-0 right-0 bottom-0 top-[4rem] max-w-md mx-auto rounded-lg-t-3xl border-2 border-t-gray-200 bg-[#F7FAF7] outline-none before:hidden">
          {selectedPlant && (
            <ScrollArea className="h-full overflow-y-auto px-4 pb-8 pt-2">
              <DrawerHeader className="px-0 pt-4 pb-2 text-left">
                <div className="relative w-full h-56 rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100 mb-4">
                  <Image
                    src={selectedPlant.imageUrl || "/neem.avif"}
                    alt={selectedPlant.commonName}
                    fill
                    className="object-cover"
                  />
                </div>
                <DrawerTitle className="text-3xl font-extrabold text-emerald-950">
                  {selectedPlant.commonName}
                </DrawerTitle>
                <DrawerDescription className="text-lg italic font-medium text-emerald-800 mt-1">
                  {selectedPlant.scientificName}
                </DrawerDescription>
              </DrawerHeader>

              <div className="space-y-6 mt-4 pb-4">

                {/* Primary Card: Description */}
                <div className="bg-white border-2 border-emerald-100 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2 text-emerald-900">
                    <Info className="w-6 h-6" />
                    <h3 className="text-xl font-bold">{t("drawer.about")}</h3>
                  </div>
                  <p className="text-gray-800 font-medium leading-relaxed">
                    {selectedPlant.description}
                  </p>
                </div>

                {/* Primary Card: Uses */}
                <div className="bg-white border-2 border-emerald-100 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2 text-emerald-900">
                    <Leaf className="w-6 h-6" />
                    <h3 className="text-xl font-bold">{t("drawer.uses")}</h3>
                  </div>
                  <p className="text-gray-800 font-medium leading-relaxed">
                    {selectedPlant.uses}
                  </p>
                </div>

                {/* Secondary Info in Accordion */}
                <div className="bg-white border-2 border-gray-200 rounded-lg p-2 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 px-3 pt-2">{t("drawer.moreInfo")}</h3>
                  <Accordion type="single" collapsible className="w-full">

                    <AccordionItem value="prep" className="border-b-0 px-2">
                      <AccordionTrigger className="text-left font-bold text-gray-800 hover:text-emerald-800 hover:no-underline py-3">
                        <div className="flex items-center gap-2">
                          <Pill className="w-5 h-5 text-emerald-700" />
                          <span>{t("drawer.preparation")}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-700 font-medium pt-1 pb-3 leading-relaxed">
                        {selectedPlant.preparationText}
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="effects" className="border-b-0 px-2 border-t-2 border-gray-100">
                      <AccordionTrigger className="text-left font-bold text-gray-800 hover:text-amber-700 hover:no-underline py-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                          <span>{t("drawer.adverse")}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-700 font-medium pt-1 pb-3 leading-relaxed">
                        {selectedPlant.adverseEffects}
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="contra" className="border-b-0 px-2 border-t-2 border-gray-100">
                      <AccordionTrigger className="text-left font-bold text-gray-800 hover:text-red-700 hover:no-underline py-3">
                        <div className="flex items-center gap-2">
                          <XOctagon className="w-5 h-5 text-red-600" />
                          <span>{t("drawer.contra")}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-700 font-medium pt-1 pb-3 leading-relaxed">
                        {selectedPlant.contraindications}
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="morph" className="border-b-0 px-2 border-t-2 border-gray-100">
                      <AccordionTrigger className="text-left font-bold text-gray-800 hover:text-emerald-800 hover:no-underline py-3">
                        {t("drawer.morphology")}
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-700 font-medium pt-1 pb-3 leading-relaxed">
                        {selectedPlant.morphology}
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="diff" className="border-b-0 px-2 border-t-2 border-gray-100">
                      <AccordionTrigger className="text-left font-bold text-gray-800 hover:text-emerald-800 hover:no-underline py-3">
                        {t("drawer.differentiate")}
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-700 font-medium pt-1 pb-3 leading-relaxed">
                        {selectedPlant.differentiation}
                      </AccordionContent>
                    </AccordionItem>

                  </Accordion>
                </div>
              </div>

              <DrawerFooter className="px-0 pt-0 pb-4">
                <DrawerClose asChild>
                  <BigButton variant="secondary">{t("drawer.close")}</BigButton>
                </DrawerClose>
              </DrawerFooter>
            </ScrollArea>
          )}
        </DrawerContent>
      </Drawer>

      {cameraOpen && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-lg overflow-hidden border-2 border-gray-200">
            {/* <div className="flex items-center justify-between px-4 py-3 border-b-2 border-gray-200">
              <p className="text-lg font-extrabold">{t("camera.title")}</p>
              <button
                type="button"
                className="h-12 w-12 rounded-lg border-2 border-gray-300 bg-white flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-gray-200"
                onClick={closeCamera}
                aria-label={t("actions.cancel")}
              >
                <X className="h-6 w-6" />
              </button>
            </div> */}

            <div className="relative bg-black">
              <video ref={videoRef} playsInline muted className="w-full h-[380px] object-cover" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-56 w-56 rounded-lg border-[3px] border-white/70" />
              </div>

              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="w-full rounded-lg bg-white border-2 border-gray-200 p-4">
                    <p className="text-lg font-extrabold">{t("camera.problemTitle")}</p>
                    <p className="mt-2 text-base font-semibold text-gray-900">{cameraError}</p>
                    <div className="mt-4 space-y-3">
                      <BigButton onClick={() => void startCamera(facingMode)}>{t("actions.tryAgain")}</BigButton>
                      <BigButton variant="secondary" onClick={() => uploadRef.current?.click()}>
                        {t("actions.useGallery")}
                      </BigButton>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 space-y-3">
              <div className="flex flex-col gap-3">
                <BigButton variant="secondary" onClick={() => void flipCamera()} icon={<RotateCcw className="h-6 w-6" />}>
                  {t("actions.flip")}
                </BigButton>
                <BigButton onClick={() => void capturePhoto()} disabled={!!cameraError} icon={<Camera className="h-6 w-6" />}>
                  {t("actions.capture")}
                </BigButton>
              </div>

              <button
                type="button"
                className="w-full rounded-lg px-5 py-4 text-base font-extrabold bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-gray-200"
                onClick={closeCamera}
              >
                {t("actions.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}