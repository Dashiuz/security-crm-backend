import { MapboxMathUtil } from './mapbox-math.util';

describe('MapboxMathUtil', () => {
  const centerLat = 4.711;
  const centerLng = -74.0721;
  const zoom = 17;
  const width = 1280;
  const height = 720;

  it('should calculate bounding box enclosing the center coordinate', () => {
    const bbox = MapboxMathUtil.calculateWebMercatorBbox(
      centerLat,
      centerLng,
      zoom,
      width,
      height,
    );

    expect(bbox.minLat).toBeLessThan(centerLat);
    expect(bbox.maxLat).toBeGreaterThan(centerLat);
    expect(bbox.minLng).toBeLessThan(centerLng);
    expect(bbox.maxLng).toBeGreaterThan(centerLng);
  });

  it('should convert center pixel (width/2, height/2) to approximately center lat/lng', () => {
    const bbox = MapboxMathUtil.calculateWebMercatorBbox(
      centerLat,
      centerLng,
      zoom,
      width,
      height,
    );

    const centerPoint = MapboxMathUtil.pixelToLatLng(
      width / 2,
      height / 2,
      bbox,
      width,
      height,
    );

    expect(centerPoint.lat).toBeCloseTo(centerLat, 4);
    expect(centerPoint.lng).toBeCloseTo(centerLng, 4);
  });

  it('should perform round-trip conversion between Pixel and LatLng', () => {
    const bbox = MapboxMathUtil.calculateWebMercatorBbox(
      centerLat,
      centerLng,
      zoom,
      width,
      height,
    );

    const testX = 350;
    const testY = 220;

    const latLng = MapboxMathUtil.pixelToLatLng(
      testX,
      testY,
      bbox,
      width,
      height,
    );
    const backToPixel = MapboxMathUtil.latLngToPixel(
      latLng.lat,
      latLng.lng,
      bbox,
      width,
      height,
    );

    expect(backToPixel.x).toBeCloseTo(testX, 2);
    expect(backToPixel.y).toBeCloseTo(testY, 2);
  });
});
