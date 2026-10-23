"use client";

import { useEffect } from "react";
import { PLACE_COOKIE, type LivePlace } from "@/lib/nigeria";
import { placeHasLocation } from "@/lib/place-urls";

export function persistLivePlace(place: LivePlace) {
  const value = JSON.stringify(place);
  try {
    localStorage.setItem(PLACE_COOKIE, value);
  } catch {
    /* private mode */
  }
  document.cookie = `${PLACE_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}

export function PlaceSync({ place }: { place: LivePlace | null }) {
  useEffect(() => {
    if (!place || !placeHasLocation(place)) return;
    persistLivePlace(place);
  }, [place]);
  return null;
}
