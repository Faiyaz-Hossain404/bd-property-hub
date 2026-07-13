"use client"

import { useEffect, useRef } from "react"
import type { Map as MapLibreMap, Marker } from "maplibre-gl"
import type { Feature } from "geojson"
import "maplibre-gl/dist/maplibre-gl.css"

import type { PublicGeoPoint } from "@bdph/types"

// One MapLibre wrapper for both map surfaces (MAP-1):
// - picker mode (`onPick` set): the seller drops/drags an exact pin — dashboard only.
// - display mode (`circleRadiusMeters` set): the public detail page shows the
//   FUZZED point inside a soft "approximate area" circle. The circle is honest UI:
//   it says "somewhere around here", matching what the API actually reveals.
//
// The maplibre-gl library (~700KB parsed) is imported dynamically inside the
// effect so it never lands in the shared bundle; only its small CSS is static.
// Tiles come from the public OpenStreetMap raster endpoint — no API key (the
// .env's MAPS_PROVIDER=maplibre choice); swap the style URL for a commercial tile
// provider when traffic outgrows OSM's usage policy.

const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
}

type Props = {
  center: PublicGeoPoint
  zoom: number
  marker?: PublicGeoPoint | null
  // Display mode: draw a soft circle of this radius (meters) around `marker`.
  circleRadiusMeters?: number
  // Picker mode: called with the new point when the user clicks or drags the pin.
  onPick?: (point: PublicGeoPoint) => void
  className?: string
}

// A ~64-sided polygon approximating a circle on the map — good enough visually,
// and avoids shipping a geo library for one shape.
function circlePolygon(center: PublicGeoPoint, radiusMeters: number): Feature {
  const points = 64
  const latRadius = (radiusMeters / 6_371_000) * (180 / Math.PI)
  const lngRadius = latRadius / Math.cos((center.lat * Math.PI) / 180)
  const ring: [number, number][] = []
  for (let i = 0; i <= points; i += 1) {
    const angle = (i / points) * 2 * Math.PI
    ring.push([center.lng + Math.cos(angle) * lngRadius, center.lat + Math.sin(angle) * latRadius])
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [ring] },
  }
}

export function LocationMap({ center, zoom, marker, circleRadiusMeters, onPick, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markerRef = useRef<Marker | null>(null)
  // The latest onPick without re-creating the map when the parent re-renders.
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  // Create the map once; everything reactive (marker moves) goes through refs.
  useEffect(() => {
    let cancelled = false
    let map: MapLibreMap | null = null

    async function boot() {
      const maplibregl = (await import("maplibre-gl")).default
      if (cancelled || !containerRef.current) return

      map = new maplibregl.Map({
        container: containerRef.current,
        style: OSM_STYLE,
        center: [center.lng, center.lat],
        zoom,
        attributionControl: { compact: true },
      })
      mapRef.current = map
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right")

      if (marker) {
        const pin = new maplibregl.Marker({ draggable: Boolean(onPickRef.current) })
          .setLngLat([marker.lng, marker.lat])
          .addTo(map)
        if (onPickRef.current) {
          pin.on("dragend", () => {
            const at = pin.getLngLat()
            onPickRef.current?.({ lat: at.lat, lng: at.lng })
          })
        }
        markerRef.current = pin
      }

      if (onPickRef.current) {
        map.on("click", (event) => {
          const point = { lat: event.lngLat.lat, lng: event.lngLat.lng }
          if (markerRef.current) {
            markerRef.current.setLngLat([point.lng, point.lat])
          } else if (map) {
            const pin = new maplibregl.Marker({ draggable: true })
              .setLngLat([point.lng, point.lat])
              .addTo(map)
            pin.on("dragend", () => {
              const at = pin.getLngLat()
              onPickRef.current?.({ lat: at.lat, lng: at.lng })
            })
            markerRef.current = pin
          }
          onPickRef.current?.(point)
        })
      }

      if (circleRadiusMeters && marker) {
        map.on("load", () => {
          if (!map) return
          map.addSource("privacy-circle", {
            type: "geojson",
            data: circlePolygon(marker, circleRadiusMeters),
          })
          map.addLayer({
            id: "privacy-circle-fill",
            type: "fill",
            source: "privacy-circle",
            paint: { "fill-color": "#e07a5f", "fill-opacity": 0.15 },
          })
          map.addLayer({
            id: "privacy-circle-line",
            type: "line",
            source: "privacy-circle",
            paint: { "line-color": "#e07a5f", "line-opacity": 0.5, "line-width": 1.5 },
          })
        })
      }
    }

    void boot()
    return () => {
      cancelled = true
      markerRef.current = null
      mapRef.current = null
      map?.remove()
    }
    // Intentionally created once: the initial center/zoom/marker seed the map;
    // later marker moves are handled by the effect below without a teardown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Follow external marker changes (e.g. the parent resets the pin).
  useEffect(() => {
    if (marker && markerRef.current) {
      markerRef.current.setLngLat([marker.lng, marker.lat])
    }
  }, [marker])

  return <div ref={containerRef} className={className} />
}
