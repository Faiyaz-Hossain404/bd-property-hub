import { Controller, Get, Header, Query } from '@nestjs/common';
import {
  geoDistrictsQuerySchema,
  type GeoDistrict,
  type GeoDistrictsQuery,
  type GeoDivision,
} from '@bdph/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { GeoService } from './geo.service';

// Public geography selectors (API_DESIGN.md §5) — no auth, long-cacheable. These
// back the cascading "division → Zilla" pickers used by both the posting form
// (FR-G2) and the catalog facets. Reference data changes rarely, so responses
// carry a long Cache-Control; the response-envelope interceptor wraps each array
// in `{ data }`. No PII here, so anonymous caching is safe.
@Controller('geo')
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @Get('divisions')
  @Header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
  divisions(): Promise<GeoDivision[]> {
    return this.geo.listDivisions();
  }

  @Get('districts')
  @Header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
  districts(
    @Query(new ZodValidationPipe(geoDistrictsQuerySchema)) query: GeoDistrictsQuery,
  ): Promise<GeoDistrict[]> {
    return this.geo.listDistricts(query.division_id);
  }
}
