import { useEffect, useRef, useState } from "react";
import { loadYandexMaps, NIZHNY_NOVGOROD } from "@/lib/yandex-maps";

type Marker = { lat: number; lng: number; label?: string; index: number };

export function PickerMap({
  markers,
  height = 400,
  onPick,
  selectedIndex,
}: {
  markers: Marker[];
  height?: number;
  onPick?: (lat: number, lng: number) => void;
  selectedIndex?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const placemarksRef = useRef<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Init map once
  useEffect(() => {
    let cancelled = false;
    if (!containerRef.current) return;

    loadYandexMaps()
      .then((ymaps) => {
        if (cancelled || !containerRef.current) return;
        const center: [number, number] =
          markers.length > 0
            ? [markers[0].lat, markers[0].lng]
            : NIZHNY_NOVGOROD;
        const map = new ymaps.Map(containerRef.current, {
          center,
          zoom: 13,
          controls: ["zoomControl", "geolocationControl", "searchControl"],
        });
        mapRef.current = map;
        if (onPick) {
          map.events.add("click", (e: any) => {
            const coords = e.get("coords");
            onPick(coords[0], coords[1]);
          });
        }
        renderMarkers(ymaps, map);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render markers whenever they change
  useEffect(() => {
    if (!mapRef.current || !window.ymaps) return;
    renderMarkers(window.ymaps, mapRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, selectedIndex]);

  function renderMarkers(ymaps: any, map: any) {
    placemarksRef.current.forEach((pm) => map.geoObjects.remove(pm));
    placemarksRef.current = [];

    markers.forEach((m) => {
      const isSelected = selectedIndex === m.index;
      const pm = new ymaps.Placemark(
        [m.lat, m.lng],
        {
          iconCaption: String(m.index + 1),
          balloonContent: m.label ?? `Точка ${m.index + 1}`,
        },
        {
          preset: isSelected
            ? "islands#redCircleIcon"
            : "islands#blueCircleIcon",
          draggable: false,
        },
      );
      map.geoObjects.add(pm);
      placemarksRef.current.push(pm);
    });

    if (markers.length > 1) {
      try {
        map.setBounds(map.geoObjects.getBounds(), {
          checkZoomRange: true,
          zoomMargin: 30,
        });
      } catch {}
    }
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
    <div className="space-y-2">
      <div
        ref={containerRef}
        style={{ height }}
        className="border-2 border-border z-0"
      />
      {onPick && (
        <p className="text-xs font-mono text-muted-foreground">
          Кликните по карте, чтобы установить координаты выбранной точки.
        </p>
      )}
    </div>
  );
}
