import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type {
  GeoAreaThana,
  GeoCityCorporation,
  GeoCityUpazila,
  GeoDistrict,
  GeoDivision,
  ListingLocationInput,
} from '@bdph/types';
import { Division, DivisionDocument } from './schemas/division.schema';
import { District, DistrictDocument } from './schemas/district.schema';
import { CityUpazila, CityUpazilaDocument } from './schemas/city-upazila.schema';
import { AreaThana, AreaThanaDocument } from './schemas/area-thana.schema';
import { CityCorporation, CityCorporationDocument } from './schemas/city-corporation.schema';
import { DIVISION_SEED } from './data/divisions';
import { DISTRICT_SEED } from './data/districts';
import { UPAZILA_SEED } from './data/cities-upazilas';
import { AREA_SEED } from './data/areas-thanas';
import { CITY_CORPORATION_SEED } from './data/city-corporations';

export interface GeoSeedResult {
  divisions: number;
  districts: number;
  citiesUpazilas: number;
  areasThanas: number;
  cityCorporations: number;
}

// Storage-ready denormalized location snapshot for a listing (MAP-5). String ids
// keep the geo layer DTO-oriented; ListingsService converts them to ObjectIds
// when it persists the subdoc. District + division are always resolved; the finer
// levels are present only when the seller drilled down that far.
export interface ListingLocationSnapshot {
  divisionId: string;
  divisionCode: string;
  divisionNameEn: string;
  divisionNameBn: string;
  districtId: string;
  districtCode: string;
  districtNameEn: string;
  districtNameBn: string;
  cityUpazilaId?: string;
  cityUpazilaCode?: string;
  cityUpazilaNameEn?: string;
  cityUpazilaNameBn?: string;
  areaThanaId?: string;
  areaThanaCode?: string;
  areaThanaNameEn?: string;
  areaThanaNameBn?: string;
  cityCorporationId?: string;
  cityCorporationCode?: string;
  cityCorporationNameEn?: string;
  cityCorporationNameBn?: string;
}

@Injectable()
export class GeoService {
  constructor(
    @InjectModel(Division.name) private readonly divisionModel: Model<DivisionDocument>,
    @InjectModel(District.name) private readonly districtModel: Model<DistrictDocument>,
    @InjectModel(CityUpazila.name) private readonly cityUpazilaModel: Model<CityUpazilaDocument>,
    @InjectModel(AreaThana.name) private readonly areaThanaModel: Model<AreaThanaDocument>,
    @InjectModel(CityCorporation.name)
    private readonly cityCorporationModel: Model<CityCorporationDocument>,
  ) {}

  // Public selector data — all 8 divisions, ordered for display.
  async listDivisions(): Promise<GeoDivision[]> {
    const divisions = await this.divisionModel.find().sort({ nameEn: 1 }).exec();
    return divisions.map((division) => this.divisionToPublic(division));
  }

  // Districts, optionally narrowed to one division (the cascading Zilla picker).
  // `divisionId` is a boundary-validated 24-hex string; we only filter when it is
  // present, otherwise the full list of 64 is returned.
  async listDistricts(divisionId?: string): Promise<GeoDistrict[]> {
    const filter = divisionId ? { divisionId: new Types.ObjectId(divisionId) } : {};
    const districts = await this.districtModel.find(filter).sort({ nameEn: 1 }).exec();
    return districts.map((district) => this.districtToPublic(district));
  }

  // Cities/upazilas, optionally narrowed to one district (district → upazila
  // cascade). `districtId` is boundary-validated; the full list is large, so the
  // picker always passes a district.
  async listCitiesUpazilas(districtId?: string): Promise<GeoCityUpazila[]> {
    const filter = districtId ? { districtId: new Types.ObjectId(districtId) } : {};
    const rows = await this.cityUpazilaModel.find(filter).sort({ nameEn: 1 }).exec();
    return rows.map((row) => this.cityUpazilaToPublic(row));
  }

  // Areas/thanas, optionally narrowed to one city/upazila (upazila → area cascade).
  async listAreasThanas(cityUpazilaId?: string): Promise<GeoAreaThana[]> {
    const filter = cityUpazilaId ? { cityUpazilaId: new Types.ObjectId(cityUpazilaId) } : {};
    const rows = await this.areaThanaModel.find(filter).sort({ nameEn: 1 }).exec();
    return rows.map((row) => this.areaThanaToPublic(row));
  }

  // The flat city-corporation tag list (FR-S7c), ordered for display.
  async listCityCorporations(): Promise<GeoCityCorporation[]> {
    const rows = await this.cityCorporationModel.find().sort({ nameEn: 1 }).exec();
    return rows.map((row) => this.cityCorporationToPublic(row));
  }

  // Resolve a seller-chosen location into a denormalized snapshot for a listing
  // (MAP-5). District is the required selector; its parent division is looked up and
  // denormalized so callers never pass — or mismatch — a division. The optional
  // finer levels are validated against their parent (an upazila must belong to the
  // chosen district, an area to the chosen upazila) so a listing can't be tagged with
  // an inconsistent chain. A bad reference is a bad request (the client sent an
  // invalid id in a create/update body), not a 500.
  async resolveListingLocation(input: ListingLocationInput): Promise<ListingLocationSnapshot> {
    this.assertValidId(input.districtId, 'Unknown district');
    const district = await this.districtModel.findById(input.districtId).exec();
    if (!district) {
      throw new BadRequestException('Unknown district');
    }
    const division = await this.divisionModel.findById(district.divisionId).exec();
    if (!division) {
      // A seeded district always has a parent; reaching here means the geo
      // collections are inconsistent (re-run `seed:geo`).
      throw new BadRequestException('District has no parent division');
    }

    const snapshot: ListingLocationSnapshot = {
      divisionId: division._id.toString(),
      divisionCode: division.code,
      divisionNameEn: division.nameEn,
      divisionNameBn: division.nameBn,
      districtId: district._id.toString(),
      districtCode: district.code,
      districtNameEn: district.nameEn,
      districtNameBn: district.nameBn,
    };

    if (input.cityUpazilaId) {
      this.assertValidId(input.cityUpazilaId, 'Unknown city/upazila');
      const upazila = await this.cityUpazilaModel.findById(input.cityUpazilaId).exec();
      if (!upazila) {
        throw new BadRequestException('Unknown city/upazila');
      }
      if (upazila.districtId.toString() !== district._id.toString()) {
        throw new BadRequestException('city/upazila does not belong to the chosen district');
      }
      snapshot.cityUpazilaId = upazila._id.toString();
      snapshot.cityUpazilaCode = upazila.code;
      snapshot.cityUpazilaNameEn = upazila.nameEn;
      snapshot.cityUpazilaNameBn = upazila.nameBn;

      if (input.areaThanaId) {
        this.assertValidId(input.areaThanaId, 'Unknown area/thana');
        const area = await this.areaThanaModel.findById(input.areaThanaId).exec();
        if (!area) {
          throw new BadRequestException('Unknown area/thana');
        }
        if (area.cityUpazilaId.toString() !== upazila._id.toString()) {
          throw new BadRequestException('area/thana does not belong to the chosen city/upazila');
        }
        snapshot.areaThanaId = area._id.toString();
        snapshot.areaThanaCode = area.code;
        snapshot.areaThanaNameEn = area.nameEn;
        snapshot.areaThanaNameBn = area.nameBn;
      }
    } else if (input.areaThanaId) {
      // The Zod schema already rejects this, but guard defensively so a caller that
      // bypasses validation can't persist an orphaned area.
      throw new BadRequestException('cityUpazilaId is required when areaThanaId is set');
    }

    if (input.cityCorporationId) {
      this.assertValidId(input.cityCorporationId, 'Unknown city corporation');
      const corporation = await this.cityCorporationModel.findById(input.cityCorporationId).exec();
      if (!corporation) {
        throw new BadRequestException('Unknown city corporation');
      }
      snapshot.cityCorporationId = corporation._id.toString();
      snapshot.cityCorporationCode = corporation.code;
      snapshot.cityCorporationNameEn = corporation.nameEn;
      snapshot.cityCorporationNameBn = corporation.nameBn;
    }

    return snapshot;
  }

  // Idempotent seed (DATABASE_DESIGN.md §4 / MAP-5). Upserts each level top-down,
  // resolving parents by their stable `code` slug so re-runs update in place and the
  // counts never drift. Safe to re-run. Returns rows seeded per level.
  async seed(): Promise<GeoSeedResult> {
    for (const division of DIVISION_SEED) {
      await this.divisionModel.updateOne(
        { code: division.code },
        { $set: { nameEn: division.nameEn, nameBn: division.nameBn } },
        { upsert: true },
      );
    }
    const divisionIdByCode = this.codeToId(await this.divisionModel.find().exec());

    for (const district of DISTRICT_SEED) {
      const divisionId = this.requireParent(divisionIdByCode, district.divisionCode, district.code, 'division');
      await this.districtModel.updateOne(
        { code: district.code },
        {
          $set: {
            divisionId: new Types.ObjectId(divisionId),
            divisionCode: district.divisionCode,
            nameEn: district.nameEn,
            nameBn: district.nameBn,
          },
        },
        { upsert: true },
      );
    }
    const districtIdByCode = this.codeToId(await this.districtModel.find().exec());

    for (const upazila of UPAZILA_SEED) {
      const districtId = this.requireParent(districtIdByCode, upazila.districtCode, upazila.code, 'district');
      await this.cityUpazilaModel.updateOne(
        { code: upazila.code },
        {
          $set: {
            districtId: new Types.ObjectId(districtId),
            districtCode: upazila.districtCode,
            nameEn: upazila.nameEn,
            nameBn: upazila.nameBn,
          },
        },
        { upsert: true },
      );
    }
    const upazilaIdByCode = this.codeToId(await this.cityUpazilaModel.find().exec());

    // Areas/thanas are ~4.5k rows; a bulk unordered upsert keeps the seed to one
    // round trip instead of thousands. Idempotent, keyed on `code` like every level.
    const areaOps = AREA_SEED.map((area) => {
      const cityUpazilaId = this.requireParent(upazilaIdByCode, area.upazilaCode, area.code, 'city/upazila');
      return {
        updateOne: {
          filter: { code: area.code },
          update: {
            $set: {
              cityUpazilaId: new Types.ObjectId(cityUpazilaId),
              cityUpazilaCode: area.upazilaCode,
              nameEn: area.nameEn,
              nameBn: area.nameBn,
            },
          },
          upsert: true,
        },
      };
    });
    if (areaOps.length > 0) {
      await this.areaThanaModel.bulkWrite(areaOps, { ordered: false });
    }

    for (const corporation of CITY_CORPORATION_SEED) {
      await this.cityCorporationModel.updateOne(
        { code: corporation.code },
        { $set: { nameEn: corporation.nameEn, nameBn: corporation.nameBn } },
        { upsert: true },
      );
    }

    return {
      divisions: DIVISION_SEED.length,
      districts: DISTRICT_SEED.length,
      citiesUpazilas: UPAZILA_SEED.length,
      areasThanas: AREA_SEED.length,
      cityCorporations: CITY_CORPORATION_SEED.length,
    };
  }

  // A malformed id means the client sent an invalid reference, so it surfaces as
  // the same clean 400 as a not-found id (the caller checks existence next).
  private assertValidId(id: string, message: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(message);
    }
  }

  // Builds a { code → id } lookup from already-fetched reference docs. Takes the
  // docs (not the model) so it stays free of Mongoose's invariant Model generics
  // and works for every level with one implementation.
  private codeToId(docs: ReadonlyArray<{ code: string; _id: Types.ObjectId }>): Map<string, string> {
    const map = new Map<string, string>();
    for (const doc of docs) {
      map.set(doc.code, doc._id.toString());
    }
    return map;
  }

  private requireParent(
    idByCode: Map<string, string>,
    parentCode: string,
    childCode: string,
    parentLevel: string,
  ): string {
    const parentId = idByCode.get(parentCode);
    if (!parentId) {
      // Guarded by geo.data.spec.ts; fail loud rather than write an orphan.
      throw new Error(`"${childCode}" references unknown ${parentLevel} "${parentCode}"`);
    }
    return parentId;
  }

  private divisionToPublic(division: DivisionDocument): GeoDivision {
    return {
      id: division._id.toString(),
      code: division.code,
      nameEn: division.nameEn,
      nameBn: division.nameBn,
    };
  }

  private districtToPublic(district: DistrictDocument): GeoDistrict {
    return {
      id: district._id.toString(),
      code: district.code,
      divisionId: district.divisionId.toString(),
      divisionCode: district.divisionCode,
      nameEn: district.nameEn,
      nameBn: district.nameBn,
    };
  }

  private cityUpazilaToPublic(row: CityUpazilaDocument): GeoCityUpazila {
    return {
      id: row._id.toString(),
      code: row.code,
      districtId: row.districtId.toString(),
      districtCode: row.districtCode,
      nameEn: row.nameEn,
      nameBn: row.nameBn,
    };
  }

  private areaThanaToPublic(row: AreaThanaDocument): GeoAreaThana {
    return {
      id: row._id.toString(),
      code: row.code,
      cityUpazilaId: row.cityUpazilaId.toString(),
      cityUpazilaCode: row.cityUpazilaCode,
      nameEn: row.nameEn,
      nameBn: row.nameBn,
    };
  }

  private cityCorporationToPublic(row: CityCorporationDocument): GeoCityCorporation {
    return {
      id: row._id.toString(),
      code: row.code,
      nameEn: row.nameEn,
      nameBn: row.nameBn,
    };
  }
}
