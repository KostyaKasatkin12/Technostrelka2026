declare global {
  interface Window {
    ymaps?: any;
    __ymapsPromise?: Promise<any>;
  }
}

export const YANDEX_API_KEY = (import.meta.env.VITE_YANDEX_MAPS_API_KEY as
  | string
  | undefined) ?? "";

export function loadYandexMaps(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Yandex Maps доступны только в браузере"));
  }
  if (window.ymaps && window.ymaps.Map) {
    return Promise.resolve(window.ymaps);
  }
  if (window.__ymapsPromise) {
    return window.__ymapsPromise;
  }
  if (!YANDEX_API_KEY) {
    return Promise.reject(
      new Error(
        "Отсутствует VITE_YANDEX_MAPS_API_KEY — добавьте его в Secrets, чтобы карты работали.",
      ),
    );
  }
  window.__ymapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(YANDEX_API_KEY)}&lang=ru_RU`;
    script.async = true;
    script.onload = () => {
      window.ymaps.ready(() => resolve(window.ymaps));
    };
    script.onerror = () =>
      reject(new Error("Не удалось загрузить Яндекс.Карты"));
    document.head.appendChild(script);
  });
  return window.__ymapsPromise;
}

export const NIZHNY_NOVGOROD: [number, number] = [56.3269, 44.0075];
