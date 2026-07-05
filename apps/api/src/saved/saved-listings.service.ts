import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MAX_SAVED_LISTINGS, type PublicListing, type PublicSavedListing } from '@bdph/types';
import { ListingsService } from '../listings/listings.service';
import { SavedListing, SavedListingDocument } from './schemas/saved-listing.schema';

@Injectable()
export class SavedListingsService {
  constructor(
    @InjectModel(SavedListing.name)
    private readonly savedModel: Model<SavedListingDocument>,
    private readonly listings: ListingsService,
  ) {}

  // Bookmark a listing for the given buyer. Only a publicly-viewable (approved)
  // listing can be saved: findPublicListing throws a clean 404 for a missing,
  // non-approved, or malformed id, which is exactly the behavior we want here too
  // (a buyer can't save something they couldn't otherwise see). Idempotent — an
  // upsert means saving an already-saved listing returns the existing record
  // instead of erroring on the unique index.
  async save(userId: string, listingId: string): Promise<PublicSavedListing> {
    await this.listings.findPublicListing(listingId);

    const filter = {
      userId: new Types.ObjectId(userId),
      listingId: new Types.ObjectId(listingId),
    };

    // Soft cap on saves per user (bounds the collection and keeps the dashboard's
    // $in hydration tractable). Only enforced when adding a *new* save — an
    // already-saved listing re-saves idempotently below regardless of the count,
    // so hitting the cap never blocks toggling an existing favorite.
    const alreadySaved = await this.savedModel.exists(filter);
    if (!alreadySaved) {
      const count = await this.savedModel.countDocuments({ userId: filter.userId });
      if (count >= MAX_SAVED_LISTINGS) {
        throw new BadRequestException('Saved listing limit reached');
      }
    }

    const saved = await this.savedModel
      .findOneAndUpdate(filter, { $setOnInsert: filter }, { new: true, upsert: true })
      .exec();
    return this.toPublic(saved);
  }

  // Remove a bookmark. Idempotent and forgiving: a malformed id or an id the user
  // never saved is simply a no-op (nothing to delete), so unsave never 500s or
  // leaks whether a given listing existed.
  async unsave(userId: string, listingId: string): Promise<void> {
    if (!Types.ObjectId.isValid(listingId)) return;
    await this.savedModel
      .deleteOne({
        userId: new Types.ObjectId(userId),
        listingId: new Types.ObjectId(listingId),
      })
      .exec();
  }

  // The buyer's saved listings, hydrated to full public projections for the
  // dashboard, newest-saved first. A save whose listing has since been withdrawn,
  // sold-and-removed, or is otherwise no longer public simply drops off the list
  // (findPublicByIds only returns approved listings) — the stale save row stays
  // harmlessly in the DB.
  async listSaved(userId: string): Promise<PublicListing[]> {
    const orderedIds = await this.listSavedIds(userId);
    if (orderedIds.length === 0) return [];

    const listings = await this.listings.findPublicByIds(orderedIds);
    const byId = new Map(listings.map((listing) => [listing._id.toString(), listing]));

    return orderedIds
      .map((id) => byId.get(id))
      .filter((listing): listing is NonNullable<typeof listing> => listing != null)
      .map((listing) => this.listings.toPublic(listing));
  }

  // Just the saved listing ids (newest-saved first), used by the client to render
  // the correct save/unsave toggle state without hydrating full listings.
  async listSavedIds(userId: string): Promise<string[]> {
    const saved = await this.savedModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .select('listingId')
      .exec();
    return saved.map((entry) => entry.listingId.toString());
  }

  private toPublic(saved: SavedListingDocument): PublicSavedListing {
    const createdAt = saved.get('createdAt') as Date | undefined;
    return {
      id: saved._id.toString(),
      listingId: saved.listingId.toString(),
      createdAt: (createdAt ?? new Date()).toISOString(),
    };
  }
}
