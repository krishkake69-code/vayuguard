"use client";

import { useEffect, useRef, useState } from "react";
import { Search, MapPin, Loader2, X, LocateFixed, Globe2 } from "lucide-react";
import { INDIAN_CITIES, type City } from "@/types";
import { geocodeCity, reverseGeocode, searchLocalities } from "@/lib/open-meteo";
import { cn } from "@/lib/utils";

/* Local offline index of Indian cities — guarantees Indian-city search works
 * even if the external geocoding API is unreachable from the browser. */
const LOCAL_INDIAN_CITIES: City[] = [
  { name: "Delhi", admin1: "Delhi", latitude: 28.6139, longitude: 77.209, country: "IN" },
  { name: "New Delhi", admin1: "Delhi", latitude: 28.6139, longitude: 77.209, country: "IN" },
  { name: "Gurugram", admin1: "Haryana", latitude: 28.4595, longitude: 77.0266, country: "IN" },
  { name: "Noida", admin1: "Uttar Pradesh", latitude: 28.5355, longitude: 77.391, country: "IN" },
  {
    name: "Ghaziabad",
    admin1: "Uttar Pradesh",
    latitude: 28.6692,
    longitude: 77.4538,
    country: "IN",
  },
  { name: "Faridabad", admin1: "Haryana", latitude: 28.4089, longitude: 77.3178, country: "IN" },
  { name: "Mumbai", admin1: "Maharashtra", latitude: 19.076, longitude: 72.8777, country: "IN" },
  { name: "Bengaluru", admin1: "Karnataka", latitude: 12.9716, longitude: 77.5946, country: "IN" },
  { name: "Chennai", admin1: "Tamil Nadu", latitude: 13.0827, longitude: 80.2707, country: "IN" },
  { name: "Kolkata", admin1: "West Bengal", latitude: 22.5726, longitude: 88.3639, country: "IN" },
  { name: "Hyderabad", admin1: "Telangana", latitude: 17.385, longitude: 78.4867, country: "IN" },
  { name: "Pune", admin1: "Maharashtra", latitude: 18.5196, longitude: 73.8553, country: "IN" },
  { name: "Ahmedabad", admin1: "Gujarat", latitude: 23.0225, longitude: 72.5714, country: "IN" },
  { name: "Jaipur", admin1: "Rajasthan", latitude: 26.9124, longitude: 75.7873, country: "IN" },
  {
    name: "Lucknow",
    admin1: "Uttar Pradesh",
    latitude: 26.8467,
    longitude: 80.9462,
    country: "IN",
  },
  { name: "Kanpur", admin1: "Uttar Pradesh", latitude: 26.4499, longitude: 80.3319, country: "IN" },
  { name: "Nagpur", admin1: "Maharashtra", latitude: 21.1458, longitude: 79.0882, country: "IN" },
  {
    name: "Indore",
    admin1: "Madhya Pradesh",
    latitude: 22.7196,
    longitude: 75.8577,
    country: "IN",
  },
  {
    name: "Bhopal",
    admin1: "Madhya Pradesh",
    latitude: 23.2599,
    longitude: 77.4126,
    country: "IN",
  },
  { name: "Patna", admin1: "Bihar", latitude: 25.5941, longitude: 85.1376, country: "IN" },
  {
    name: "Varanasi",
    admin1: "Uttar Pradesh",
    latitude: 25.3176,
    longitude: 82.9739,
    country: "IN",
  },
  { name: "Agra", admin1: "Uttar Pradesh", latitude: 27.1767, longitude: 78.0081, country: "IN" },
  {
    name: "Chandigarh",
    admin1: "Chandigarh",
    latitude: 30.7333,
    longitude: 76.7794,
    country: "IN",
  },
  { name: "Amritsar", admin1: "Punjab", latitude: 31.634, longitude: 74.8723, country: "IN" },
  { name: "Ludhiana", admin1: "Punjab", latitude: 30.901, longitude: 75.8573, country: "IN" },
  { name: "Jalandhar", admin1: "Punjab", latitude: 31.326, longitude: 75.5762, country: "IN" },
  { name: "Dehradun", admin1: "Uttarakhand", latitude: 30.3165, longitude: 78.0322, country: "IN" },
  {
    name: "Shimla",
    admin1: "Himachal Pradesh",
    latitude: 31.1048,
    longitude: 77.1734,
    country: "IN",
  },
  { name: "Guwahati", admin1: "Assam", latitude: 26.1445, longitude: 91.7362, country: "IN" },
  { name: "Bhubaneswar", admin1: "Odisha", latitude: 20.9517, longitude: 85.3922, country: "IN" },
  { name: "Raipur", admin1: "Chhattisgarh", latitude: 21.2514, longitude: 81.6296, country: "IN" },
  { name: "Jodhpur", admin1: "Rajasthan", latitude: 26.2389, longitude: 73.0243, country: "IN" },
  { name: "Udaipur", admin1: "Rajasthan", latitude: 24.5854, longitude: 73.7125, country: "IN" },
  { name: "Kochi", admin1: "Kerala", latitude: 9.9312, longitude: 76.2673, country: "IN" },
  {
    name: "Thiruvananthapuram",
    admin1: "Kerala",
    latitude: 8.5241,
    longitude: 76.9366,
    country: "IN",
  },
  {
    name: "Coimbatore",
    admin1: "Tamil Nadu",
    latitude: 11.0168,
    longitude: 76.9558,
    country: "IN",
  },
  { name: "Madurai", admin1: "Tamil Nadu", latitude: 9.9252, longitude: 78.1198, country: "IN" },
  {
    name: "Visakhapatnam",
    admin1: "Andhra Pradesh",
    latitude: 17.6868,
    longitude: 83.2185,
    country: "IN",
  },
  { name: "Surat", admin1: "Gujarat", latitude: 21.1702, longitude: 72.8311, country: "IN" },
  { name: "Vadodara", admin1: "Gujarat", latitude: 22.3072, longitude: 73.1812, country: "IN" },
  { name: "Nashik", admin1: "Maharashtra", latitude: 19.9975, longitude: 73.7898, country: "IN" },
  {
    name: "Aurangabad",
    admin1: "Maharashtra",
    latitude: 19.076,
    longitude: 75.3433,
    country: "IN",
  },
  { name: "Solapur", admin1: "Maharashtra", latitude: 17.6599, longitude: 75.9064, country: "IN" },
  { name: "Meerut", admin1: "Uttar Pradesh", latitude: 29.0052, longitude: 77.6455, country: "IN" },
  {
    name: "Bareilly",
    admin1: "Uttar Pradesh",
    latitude: 28.367,
    longitude: 79.4304,
    country: "IN",
  },
  { name: "Aligarh", admin1: "Uttar Pradesh", latitude: 27.8974, longitude: 78.088, country: "IN" },
  { name: "Ranchi", admin1: "Jharkhand", latitude: 23.3441, longitude: 85.3096, country: "IN" },
  { name: "Jamshedpur", admin1: "Jharkhand", latitude: 22.8046, longitude: 86.2029, country: "IN" },
  { name: "Mysuru", admin1: "Karnataka", latitude: 12.2958, longitude: 76.6394, country: "IN" },
  { name: "Mangaluru", admin1: "Karnataka", latitude: 12.9141, longitude: 74.856, country: "IN" },
  { name: "Thrissur", admin1: "Kerala", latitude: 10.5276, longitude: 76.2144, country: "IN" },
  { name: "Kozhikode", admin1: "Kerala", latitude: 11.2588, longitude: 75.7804, country: "IN" },
  {
    name: "Tiruchirappalli",
    admin1: "Tamil Nadu",
    latitude: 10.7905,
    longitude: 78.7047,
    country: "IN",
  },
  { name: "Salem", admin1: "Tamil Nadu", latitude: 11.6643, longitude: 78.146, country: "IN" },
  {
    name: "Guntur",
    admin1: "Andhra Pradesh",
    latitude: 16.3067,
    longitude: 80.4365,
    country: "IN",
  },
  {
    name: "Vijayawada",
    admin1: "Andhra Pradesh",
    latitude: 16.5062,
    longitude: 80.648,
    country: "IN",
  },
  { name: "Kota", admin1: "Rajasthan", latitude: 25.2138, longitude: 75.8648, country: "IN" },
  { name: "Panaji", admin1: "Goa", latitude: 15.4909, longitude: 73.8278, country: "IN" },
  {
    name: "Srinagar",
    admin1: "Jammu & Kashmir",
    latitude: 34.0837,
    longitude: 74.7973,
    country: "IN",
  },
  { name: "Jammu", admin1: "Jammu & Kashmir", latitude: 32.7266, longitude: 74.857, country: "IN" },
  { name: "Ajmer", admin1: "Rajasthan", latitude: 26.4499, longitude: 74.6399, country: "IN" },
  {
    name: "Ujjain",
    admin1: "Madhya Pradesh",
    latitude: 23.1765,
    longitude: 75.7885,
    country: "IN",
  },
];

/* Well-known neighbourhoods / colonies inside Indian cities — so searches like
 * "Shastri Nagar" or "Indirapuram" resolve to a hyper-local point immediately. */
const LOCAL_NEIGHBOURHOODS: City[] = [
  {
    name: "Shastri Nagar",
    admin1: "Ghaziabad, Uttar Pradesh",
    latitude: 28.6713,
    longitude: 77.4604,
    country: "IN",
  },
  {
    name: "Indirapuram",
    admin1: "Ghaziabad, Uttar Pradesh",
    latitude: 28.6417,
    longitude: 77.3567,
    country: "IN",
  },
  {
    name: "Vaishali",
    admin1: "Ghaziabad, Uttar Pradesh",
    latitude: 28.6336,
    longitude: 77.3393,
    country: "IN",
  },
  {
    name: "Kaushambi",
    admin1: "Ghaziabad, Uttar Pradesh",
    latitude: 28.6097,
    longitude: 77.3719,
    country: "IN",
  },
  {
    name: "Raj Nagar",
    admin1: "Ghaziabad, Uttar Pradesh",
    latitude: 28.6526,
    longitude: 77.4593,
    country: "IN",
  },
  {
    name: "Ashok Nagar",
    admin1: "Ghaziabad, Uttar Pradesh",
    latitude: 28.6577,
    longitude: 77.4542,
    country: "IN",
  },
  {
    name: "Mohan Nagar",
    admin1: "Ghaziabad, Uttar Pradesh",
    latitude: 28.6683,
    longitude: 77.5061,
    country: "IN",
  },
  {
    name: "Vasundhara Enclave",
    admin1: "Delhi",
    latitude: 28.6044,
    longitude: 77.3106,
    country: "IN",
  },
  { name: "Shahdara", admin1: "Delhi", latitude: 28.6624, longitude: 77.3191, country: "IN" },
  { name: "Rohini", admin1: "Delhi", latitude: 28.7444, longitude: 77.0681, country: "IN" },
  { name: "Dwarka", admin1: "Delhi", latitude: 28.5921, longitude: 77.046, country: "IN" },
  { name: "Narela", admin1: "Delhi", latitude: 28.8569, longitude: 77.0998, country: "IN" },
  {
    name: "Connaught Place",
    admin1: "Delhi",
    latitude: 28.6315,
    longitude: 77.2167,
    country: "IN",
  },
  { name: "Lajpat Nagar", admin1: "Delhi", latitude: 28.5678, longitude: 77.2435, country: "IN" },
  { name: "Saket", admin1: "Delhi", latitude: 28.5244, longitude: 77.2094, country: "IN" },
  {
    name: "Noida Sector 62",
    admin1: "Noida, Uttar Pradesh",
    latitude: 28.6275,
    longitude: 77.3594,
    country: "IN",
  },
  {
    name: "Noida Sector 18",
    admin1: "Noida, Uttar Pradesh",
    latitude: 28.5706,
    longitude: 77.3271,
    country: "IN",
  },
  {
    name: "Greater Noida",
    admin1: "Uttar Pradesh",
    latitude: 28.4595,
    longitude: 77.6385,
    country: "IN",
  },
  {
    name: "Sector 21 Gurugram",
    admin1: "Haryana",
    latitude: 28.4575,
    longitude: 77.0266,
    country: "IN",
  },
  {
    name: "Cyber City Gurugram",
    admin1: "Haryana",
    latitude: 28.494,
    longitude: 77.0896,
    country: "IN",
  },
  {
    name: "Bandra West",
    admin1: "Mumbai, Maharashtra",
    latitude: 19.0596,
    longitude: 72.8295,
    country: "IN",
  },
  {
    name: "Andheri West",
    admin1: "Mumbai, Maharashtra",
    latitude: 19.1364,
    longitude: 72.8266,
    country: "IN",
  },
  {
    name: "Powai",
    admin1: "Mumbai, Maharashtra",
    latitude: 19.1176,
    longitude: 72.906,
    country: "IN",
  },
  {
    name: "Koramangala",
    admin1: "Bengaluru, Karnataka",
    latitude: 12.9352,
    longitude: 77.6245,
    country: "IN",
  },
  {
    name: "Indiranagar",
    admin1: "Bengaluru, Karnataka",
    latitude: 12.9719,
    longitude: 77.6412,
    country: "IN",
  },
  {
    name: "Whitefield",
    admin1: "Bengaluru, Karnataka",
    latitude: 12.9698,
    longitude: 77.75,
    country: "IN",
  },
  {
    name: "Salt Lake City",
    admin1: "Kolkata, West Bengal",
    latitude: 22.5726,
    longitude: 88.4063,
    country: "IN",
  },
  {
    name: "New Town",
    admin1: "Kolkata, West Bengal",
    latitude: 22.5853,
    longitude: 88.4031,
    country: "IN",
  },
];

export function CitySelector({
  selected,
  onSelect,
}: {
  selected: City;
  onSelect: (c: City) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const root = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    // Instant local results (offline-capable) — cities first, then neighbourhoods.
    const localCities = LOCAL_INDIAN_CITIES.filter((c) => c.name.toLowerCase().includes(q));
    const localHoods = LOCAL_NEIGHBOURHOODS.filter((c) => c.name.toLowerCase().includes(q));
    setResults([...localCities, ...localHoods].slice(0, 10));

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        // Run both geocoders in parallel: broad cities + fine-grained localities.
        const [geo, localities] = await Promise.all([geocodeCity(query), searchLocalities(query)]);
        setResults((prev) => {
          const key = (c: City) => `${c.name.toLowerCase()}|${c.latitude.toFixed(2)}`;
          const seen = new Set(prev.map(key));
          const merged: City[] = [...prev];
          for (const g of [...localities, ...geo]) {
            if (!seen.has(key(g))) {
              seen.add(key(g));
              merged.push(g);
            }
          }
          return merged.slice(0, 12);
        });
      } finally {
        setLoading(false);
      }
    }, 450);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation isn't available in this browser.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const city = await reverseGeocode(latitude, longitude);
        setLocating(false);
        if (city) {
          onSelect(city);
          setQuery("");
          setOpen(false);
        } else {
          setLocationError("Couldn't resolve your location. Try searching instead.");
        }
      },
      () => {
        setLocating(false);
        setLocationError("Location access denied. Enable it in your browser or search instead.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const pick = (c: City) => {
    onSelect(c);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative w-full min-w-[220px] sm:w-80" ref={root}>
      <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-ring">
        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search any city…"
          className="w-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          aria-label="Search city"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {query && (
          <button onClick={() => setQuery("")} aria-label="Clear search">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 z-50 mt-1 w-full min-w-[280px] rounded-lg border border-border bg-popover p-1 shadow-xl">
          <button
            onClick={useMyLocation}
            disabled={locating}
            className="flex w-full items-center gap-2 rounded-md bg-accent/60 px-2 py-2 text-left text-xs font-semibold hover:bg-accent disabled:opacity-60"
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
            {locating ? "Finding your location…" : "Use my current location"}
          </button>
          {locationError && <p className="px-2 py-1 text-[10px] text-red-600">{locationError}</p>}

          <p className="mt-1 flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Globe2 className="h-3 w-3" /> Search results{" "}
            {query.length >= 2 ? "" : "(type 2+ letters)"}
          </p>
          {results.length > 0 ? (
            <div className="mb-1 max-h-56 overflow-auto">
              {results.map((c, i) => (
                <button
                  key={`${c.name}-${c.latitude}-${i}`}
                  onClick={() => pick(c)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
                >
                  <Search className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{c.name}</span>
                    {c.admin1 ? <span className="text-muted-foreground">, {c.admin1}</span> : null}
                    {!c.admin1 && c.displayName ? (
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {c.displayName.length > 70
                          ? c.displayName.slice(0, 70) + "…"
                          : c.displayName}
                      </span>
                    ) : null}
                    {c.country ? (
                      <span className="text-muted-foreground"> · {c.country}</span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <p className="px-2 py-2 text-[11px] text-muted-foreground">
              No cities found. Try a different spelling.
            </p>
          ) : null}

          <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Popular Indian cities
          </p>
          <div className="grid grid-cols-2 gap-1">
            {INDIAN_CITIES.map((c) => (
              <button
                key={c.name}
                onClick={() => pick(c)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent",
                  selected.name === c.name && "bg-accent font-semibold",
                )}
              >
                <MapPin className="h-3 w-3 text-muted-foreground" />
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
