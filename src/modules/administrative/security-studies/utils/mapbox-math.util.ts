export interface BoundingBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Mathematical utilities for Web Mercator (EPSG:3857) projection calculations
 * used to interpolate between Canvas Pixels (X, Y) and GPS Coordinates (Lat, Lng).
 */
export class MapboxMathUtil {
  private static readonly TILE_SIZE = 512; // Mapbox uses 512px tiles for styles/v1

  /**
   * Calculates the exact bounding box (WGS84 Lat/Lng) of a Mapbox static map image
   * given its center coordinates, zoom level, and pixel dimensions.
   */
  static calculateWebMercatorBbox(
    centerLat: number,
    centerLng: number,
    zoom: number,
    width: number,
    height: number,
  ): BoundingBox {
    const scale = MapboxMathUtil.TILE_SIZE * Math.pow(2, zoom);

    // Center to Web Mercator world pixels
    const centerX = ((centerLng + 180) / 360) * scale;
    const sinLat = Math.sin((centerLat * Math.PI) / 180);
    // Clamp sinLat to avoid infinities near the poles
    const clampedSinLat = Math.max(-0.9999, Math.min(0.9999, sinLat));
    const centerY =
      (0.5 - Math.log((1 + clampedSinLat) / (1 - clampedSinLat)) / (4 * Math.PI)) *
      scale;

    // Half dimensions
    const halfW = width / 2;
    const halfH = height / 2;

    const minX = centerX - halfW;
    const maxX = centerX + halfW;
    const minY = centerY - halfH; // North (top)
    const maxY = centerY + halfH; // South (bottom)

    // Convert pixel bounds back to Lat/Lng
    const minLng = (minX / scale) * 360 - 180;
    const maxLng = (maxX / scale) * 360 - 180;

    const maxLat = MapboxMathUtil.pixelYToLat(minY, scale);
    const minLat = MapboxMathUtil.pixelYToLat(maxY, scale);

    return {
      minLat,
      minLng,
      maxLat,
      maxLng,
    };
  }

  private static pixelYToLat(pixelY: number, scale: number): number {
    const yNorm = 0.5 - pixelY / scale;
    const latRad = 2 * Math.atan(Math.exp(yNorm * 2 * Math.PI)) - Math.PI / 2;
    return (latRad * 180) / Math.PI;
  }

  /**
   * Converts a canvas pixel coordinate (X, Y) inside the base image to (Lat, Lng)
   */
  static pixelToLatLng(
    x: number,
    y: number,
    bbox: BoundingBox,
    width: number,
    height: number,
  ): LatLng {
    const lng = bbox.minLng + (x / width) * (bbox.maxLng - bbox.minLng);
    // Y is inverted in canvas (0 is top = maxLat, height is bottom = minLat)
    const lat = bbox.maxLat - (y / height) * (bbox.maxLat - bbox.minLat);
    return { lat, lng };
  }

  /**
   * Converts a GPS coordinate (Lat, Lng) to canvas pixel coordinate (X, Y)
   */
  static latLngToPixel(
    lat: number,
    lng: number,
    bbox: BoundingBox,
    width: number,
    height: number,
  ): Point2D {
    const x = ((lng - bbox.minLng) / (bbox.maxLng - bbox.minLng)) * width;
    const y = ((bbox.maxLat - lat) / (bbox.maxLat - bbox.minLat)) * height;
    return { x, y };
  }
}
