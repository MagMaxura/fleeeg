export const loadGoogleMapsAPI = (apiKey: string) => {
    return new Promise<void>((resolve, reject) => {
        if (window.google?.maps?.importLibrary) {
            resolve();
            return;
        }

        (window as any).google = (window as any).google || {};
        (window as any).google.maps = (window as any).google.maps || {};

        ((g: any) => {
            var h: any, a: any, k: any, p = "The Google Maps JavaScript API", c = "google", l = "importLibrary", q = "__ib__", m = document, b: any = window;
            b = b[c] || (b[c] = {});
            var d = b.maps || (b.maps = {}), r = new Set, e = new URLSearchParams, u = () => h || (h = new Promise(async (f, n) => {
                await (a = m.createElement("script"));
                e.set("libraries", [...r] + "");
                for (k in g) e.set(k.replace(/[A-Z]/g, (t: string) => "_" + t[0].toLowerCase()), g[k]);
                e.set("callback", c + ".maps." + q);
                a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
                d[q] = f;
                a.onerror = () => h = n(Error(p + " could not load."));
                a.nonce = m.querySelector("script[nonce]")?.nonce || "";
                m.head.append(a)
            }));
            d[l] ? console.warn(p + " only loads once. Ignoring:", g) : d[l] = (f: any, ...n: any[]) => r.add(f) && u().then(() => d[l](f, ...n))
        })({
            key: apiKey,
            v: "weekly"
        });

        // The snippet initializes importLibrary immediately synchronously.
        if (window.google?.maps?.importLibrary) {
            Promise.all([
                window.google.maps.importLibrary("places"),
                window.google.maps.importLibrary("marker"),
                window.google.maps.importLibrary("routes"),
                window.google.maps.importLibrary("geometry")
            ]).then(() => {
                resolve();
            }).catch(reject);
        } else {
            reject(new Error("Failed to initialize importLibrary"));
        }
    });
};
