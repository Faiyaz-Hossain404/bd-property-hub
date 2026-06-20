import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { GeoDistrict, GeoDivision } from '@bdph/types';
import { Division, DivisionDocument } from './schemas/division.schema';
import { District, DistrictDocument } from './schemas/district.schema';
import { DIVISION_SEED } from './data/divisions';
import { DISTRICT_SEED } from './data/districts';

export interface GeoSeedResult {
  divisions: number;
  districts: number;
}

@Injectable()
export class GeoService {
  constructor(
    @InjectModel(Division.name) private readonly divisionModel: Model<DivisionDocument>,
    @InjectModel(District.name) private readonly districtModel: Model<DistrictDocument>,
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

  // Idempotent seed (DATABASE_DESIGN.md §4 / MAP-5). Upserts divisions first,
  // resolves their ids by `code`, then upserts districts with the resolved parent
  // ref. Safe to re-run: keyed on the stable `code` slug, so renames update in
  // place and the counts never drift. Returns rows seeded per level.
  async seed(): Promise<GeoSeedResult> {
    for (const division of DIVISION_SEED) {
      await this.divisionModel.updateOne(
        { code: division.code },
        { $set: { nameEn: division.nameEn, nameBn: division.nameBn } },
        { upsert: true },
      );
    }

    const divisions = await this.divisionModel.find().exec();
    const idByCode = new Map<string, string>();
    for (const division of divisions) {
      idByCode.set(division.code, division._id.toString());
    }

    for (const district of DISTRICT_SEED) {
      const divisionId = idByCode.get(district.divisionCode);
      if (!divisionId) {
        // Guarded by geo.data.spec.ts; fail loud rather than write an orphan.
        throw new Error(
          `District "${district.code}" references unknown division "${district.divisionCode}"`,
        );
      }
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

    return { divisions: DIVISION_SEED.length, districts: DISTRICT_SEED.length };
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
}
