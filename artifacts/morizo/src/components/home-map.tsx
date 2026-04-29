import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { loadYandexMaps, NIZHNY_NOVGOROD } from "@/lib/yandex-maps";

type QuestPin = {
  id: number;
  title: string;
  city: string | null;
  difficulty: number;
  lat: number;
  lng: number;
};

export function HomeMap({
  pins,
  height = 480,
}: {
  pins: QuestPin[];
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!containerRef.current) return;

    loadYandexMaps()
      .then((ymaps) => {
        if (cancelled || !containerRef.current) return;
        const center: [number, number] =
          pins.length > 0 ? [pins[0].lat, pins[0].lng] : NIZHNY_NOVGOROD;
        const map = new ymaps.Map(containerRef.current, {
          center,
          zoom: 12,
          controls: ["zoomControl", "fullscreenControl", "geolocationControl"],
        });
        mapRef.current = map;

        const clusterer = new ymaps.Clusterer({
          preset: "islands#invertedVioletClusterIcons",
          groupByCoordinates: false,
          clusterDisableClickZoom: false,
          clusterHideIconOnBalloonOpen: false,
          geoObjectHideIconOnBalloonOpen: false,
          clusterIconColor: "#a3e635",
          clusterBalloonContentBodyLayout: ymaps.templateLayoutFactory?.createClass?.(
            '<div style="font-family:monospace;font-size:12px;">Квесты: $[properties.geoObjects.length]</div>'
          ),
        });

        const placemarks = pins.map((p) => {
          const pm = new ymaps.Placemark(
            [p.lat, p.lng],
            {
              balloonContentHeader: `<a href="/quests/${p.id}" style="color:#a3e635;font-weight:900;text-decoration:none">${escapeHtml(p.title)}</a>`,
              balloonContentBody: `<div style="font-family:monospace;font-size:11px;color:#94a3b8">Город: ${escapeHtml(p.city ?? "")}<br/>Сложность: ${"★".repeat(p.difficulty)}</div>`,
              balloonContentFooter: `<a href="/quests/${p.id}" style="display:inline-block;margin-top:6px;background:#a3e635;color:#0a0a0a;padding:4px 10px;font-weight:900;text-decoration:none;font-family:monospace">К КВЕСТУ →</a>`,
              hintContent: p.title,
            },
            {
              preset:
                p.difficulty >= 4
                  ? "islands#redIcon"
                  : p.difficulty >= 3
                    ? "islands#orangeIcon"
                    : "islands#greenIcon",
            },
          );
          return pm;
        });

        clusterer.add(placemarks);
        map.geoObjects.add(clusterer);

        if (pins.length > 1) {
          try {
            map.setBounds(clusterer.getBounds(), {
              checkZoomRange: true,
              zoomMargin: 40,
            });
          } catch {}
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [pins]);

  if (error) {
    return (
      <div
        style={{ height }}
        className="border-2 border-destructive bg-destructive/5 flex flex-col items-center justify-center text-destructive font-mono text-xs p-4 text-center"
      >
        <span className="font-black uppercase mb-2">Карта недоступна</span>
        <span>{error}</span>
        <Link href="/quests">
          <span className="mt-3 underline cursor-pointer">К каталогу квестов →</span>
        </Link>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="border-2 border-border z-0"
    />
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
