import { useEffect, useRef, useState } from "react";
import { loadYandexMaps, NIZHNY_NOVGOROD } from "@/lib/yandex-maps";

type Point = {
  lat: number;
  lng: number;
  name: string;
  index: number;
  active?: boolean;
  done?: boolean;
};

type TravelMode =
  | "foot"
  | "transport"
  | "public_transport"
  | "dirt_road"
  | "off_road";

const YANDEX_ROUTING_MODE: Record<TravelMode, string> = {
  foot: "pedestrian",
  public_transport: "masstransit",
  transport: "auto",
  dirt_road: "auto",
  off_road: "pedestrian",
};

export function QuestMap({
  points,
  height = 360,
  travelMode,
}: {
  points: Point[];
  height?: number;
  travelMode?: TravelMode | string | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!containerRef.current || points.length === 0) return;

    loadYandexMaps()
      .then((ymaps) => {
        if (cancelled || !containerRef.current) return;

        const center: [number, number] = [points[0].lat, points[0].lng];
        const map = new ymaps.Map(containerRef.current, {
          center,
          zoom: 14,
          controls: ["zoomControl", "fullscreenControl"],
        });
        mapRef.current = map;

        if (points.length > 1) {
          const mode = (travelMode as TravelMode) ?? "foot";
          const routingMode = YANDEX_ROUTING_MODE[mode] ?? "pedestrian";

          try {
            const multiRoute = new ymaps.multiRouter.MultiRoute(
              {
                referencePoints: points.map((p) => [p.lat, p.lng]),
                params: { routingMode },
              },
              {
                boundsAutoApply: true,
                routeActiveStrokeWidth: 5,
                routeActiveStrokeColor: "#22d3ee",
                routeStrokeColor: "#22d3ee80",
                pinVisible: false,
                wayPointVisible: false,
              },
            );
            map.geoObjects.add(multiRoute);
          } catch {
            const line = new ymaps.Polyline(
              points.map((p) => [p.lat, p.lng]),
              {},
              { strokeColor: "#22d3ee", strokeWidth: 3, strokeStyle: "shortdash" },
            );
            map.geoObjects.add(line);
            try {
              map.setBounds(map.geoObjects.getBounds(), {
                checkZoomRange: true,
                zoomMargin: 30,
              });
            } catch {}
          }
        } else {
          try {
            map.setBounds(
              [
                [points[0].lat - 0.005, points[0].lng - 0.005],
                [points[0].lat + 0.005, points[0].lng + 0.005],
              ],
              { checkZoomRange: true },
            );
          } catch {}
        }

        points.forEach((p) => {
          const color = p.done
            ? "#22c55e"
            : p.active
              ? "#f59e0b"
              : "#a1a1aa";
          const placemark = new ymaps.Placemark(
            [p.lat, p.lng],
            {
              balloonContent: `<strong>${p.index + 1}. ${escapeHtml(p.name)}</strong>`,
              iconCaption: String(p.index + 1),
            },
            {
              preset: "islands#circleIcon",
              iconColor: color,
              zIndex: 10,
            },
          );
          map.geoObjects.add(placemark);
        });

        if (points.length === 1) {
          try {
            map.setBounds(map.geoObjects.getBounds(), {
              checkZoomRange: true,
              zoomMargin: 30,
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
  }, [points, travelMode]);

  if (points.length === 0) {
    return (
      <div
        style={{ height }}
        className="border-2 border-dashed border-border bg-card/50 flex items-center justify-center text-muted-foreground font-mono text-sm"
      >
        Нет точек на карте
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{ height }}
        className="border-2 border-destructive bg-destructive/5 flex flex-col items-center justify-center text-destructive font-mono text-xs p-4 text-center"
      >
        <span className="font-black uppercase mb-2">Карта недоступна</span>
        <span>{error}</span>
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

export { NIZHNY_NOVGOROD };
