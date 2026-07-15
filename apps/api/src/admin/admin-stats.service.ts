import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import {
  ADMIN_TRENDS_WINDOW_DAYS,
  ASSET_TYPES,
  LISTING_PUBLICATION_STATUSES,
  ROLES,
  TRANSACTION_TYPES,
  USER_STATUSES,
  type AdminBreakdownBucket,
  type AdminDailyPoint,
  type AdminStats,
} from '@bdph/types';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Listing, ListingDocument } from '../listings/schemas/listing.schema';

// One row of a `$group`-by-field aggregation.
interface GroupCount {
  _id: string | null;
  count: number;
}

// The one method the shared aggregation helpers need. Typing the parameter by
// this structural surface (rather than `Model<T>`) lets a single helper serve
// both the User and Listing models — Mongoose's `Model<T>` is invariant in
// several type params, so a generic `Model<T>` parameter rejects the concrete
// injected models (the double-hydration trap).
interface Aggregatable {
  aggregate<R>(pipeline: PipelineStage[]): { exec(): Promise<R[]> };
}

// Backs the analytics dashboard (FR-A3). Everything here is a read-only
// aggregate over collections that already exist — no per-user PII beyond the
// counts, per USER_ROLES.md §6. The queries are small (a handful of grouped
// counts plus two 30-day trends); at the current data size a monthly rollup /
// cache isn't warranted yet and is noted as a later optimization.
@Injectable()
export class AdminStatsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Listing.name) private readonly listingModel: Model<ListingDocument>,
  ) {}

  async getStats(): Promise<AdminStats> {
    const since = this.trendWindowStart();

    // Run the independent aggregations concurrently — none depends on another.
    const [
      totalUsers,
      totalListings,
      approvedListings,
      pendingModeration,
      pendingSellerVerification,
      removedListings,
      rolesRaw,
      userStatusRaw,
      listingStatusRaw,
      assetTypeRaw,
      transactionTypeRaw,
      signupsRaw,
      listingsRaw,
    ] = await Promise.all([
      this.userModel.countDocuments({}).exec(),
      this.listingModel.countDocuments({}).exec(),
      this.listingModel.countDocuments({ publicationStatus: 'approved' }).exec(),
      this.listingModel.countDocuments({ publicationStatus: 'pending_review' }).exec(),
      this.userModel.countDocuments({ kycStatus: 'pending' }).exec(),
      this.listingModel.countDocuments({ publicationStatus: 'removed' }).exec(),
      // Users can hold multiple roles, so unwind the array before grouping.
      this.userModel
        .aggregate<GroupCount>([
          { $unwind: '$roles' },
          { $group: { _id: '$roles', count: { $sum: 1 } } },
        ])
        .exec(),
      this.groupBy(this.userModel, '$status'),
      this.groupBy(this.listingModel, '$publicationStatus'),
      this.groupBy(this.listingModel, '$assetType'),
      this.groupBy(this.listingModel, '$transactionType'),
      this.dailyCounts(this.userModel, since),
      this.dailyCounts(this.listingModel, since),
    ]);

    return {
      totals: {
        users: totalUsers,
        listings: totalListings,
        approvedListings,
        pendingModeration,
        pendingSellerVerification,
        removedListings,
      },
      // Zero-fill against the known enum values so a category with no rows still
      // appears (a stable set of bars/slices rather than a chart that reshapes as
      // data arrives), and any unexpected value is dropped rather than rendered.
      usersByRole: this.bucketize(rolesRaw, ROLES),
      usersByStatus: this.bucketize(userStatusRaw, USER_STATUSES),
      listingsByStatus: this.bucketize(listingStatusRaw, LISTING_PUBLICATION_STATUSES),
      listingsByAssetType: this.bucketize(assetTypeRaw, ASSET_TYPES),
      listingsByTransactionType: this.bucketize(transactionTypeRaw, TRANSACTION_TYPES),
      signupsTrend: signupsRaw,
      listingsTrend: listingsRaw,
    };
  }

  private groupBy(model: Aggregatable, field: string): Promise<GroupCount[]> {
    return model
      .aggregate<GroupCount>([{ $group: { _id: field, count: { $sum: 1 } } }])
      .exec();
  }

  // Maps raw `$group` rows to a fixed, ordered set of buckets. Keys absent from
  // the data are reported as 0; keys not in `allowed` are ignored.
  private bucketize(rows: GroupCount[], allowed: readonly string[]): AdminBreakdownBucket[] {
    const counts = new Map(rows.map((row) => [row._id, row.count]));
    return allowed.map((key) => ({ key, count: counts.get(key) ?? 0 }));
  }

  // 00:00 UTC on the first day of the trailing window (inclusive), so the series
  // spans exactly ADMIN_TRENDS_WINDOW_DAYS calendar days ending today.
  private trendWindowStart(): Date {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - (ADMIN_TRENDS_WINDOW_DAYS - 1));
    return start;
  }

  // New documents per UTC calendar day since `since`, zero-filled so the client
  // gets a gapless series (every day present, in order).
  private async dailyCounts(model: Aggregatable, since: Date): Promise<AdminDailyPoint[]> {
    const rows = await model
      .aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();
    const counts = new Map(rows.map((row) => [row._id, row.count]));

    const points: AdminDailyPoint[] = [];
    const cursor = new Date(since);
    for (let i = 0; i < ADMIN_TRENDS_WINDOW_DAYS; i += 1) {
      const date = cursor.toISOString().slice(0, 10); // YYYY-MM-DD
      points.push({ date, count: counts.get(date) ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return points;
  }
}
