"use client"

import { useState, useTransition } from "react"
import { useFormatter, useTranslations } from "next-intl"
import { ArrowRight, LoaderCircle, ShieldAlert } from "lucide-react"

import { canSubmitListings, type PublicUser } from "@bdph/types"
import { becomeSeller } from "@/lib/api"
import { Link } from "@/i18n/navigation"
import { draftsOf, submittedOf, useMyListings } from "@/hooks/use-my-listings"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CreateListingDialog } from "./create-listing-dialog"
import { WhatsAppButton } from "@/components/contact/whatsapp-button"
import { WHATSAPP_SELLER_SUPPORT } from "@/lib/contact"

const SELLER_ROLES = ["seller", "admin", "admin_prime"] as const

type SectionT = ReturnType<typeof useTranslations>

type Props = { user: PublicUser; onUserRefresh: () => void }

export function ListingsSection({ user, onUserRefresh }: Props) {
  const t = useTranslations("dashboard.listings")
  const tWhatsapp = useTranslations("whatsapp")
  const isSeller = user.roles.some((role) =>
    SELLER_ROLES.includes(role as (typeof SELLER_ROLES)[number]),
  )
  // Mirrors the server's submit gate (FR-S8) so Submit is disabled with a hint
  // rather than failing the click; the API still enforces it.
  const kycVerified = canSubmitListings(user.kycStatus)

  // Vertical rhythm comes from the dashboard's column grid.
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold text-foreground">{t("sectionTitle")}</h2>
        {/* Seller support → WhatsApp seller desk. Only shown to actual sellers. */}
        {isSeller ? (
          <WhatsAppButton
            number={WHATSAPP_SELLER_SUPPORT}
            label={tWhatsapp("sellerCta")}
            message={tWhatsapp("sellerSupport")}
            variant="outline"
            size="sm"
          />
        ) : null}
      </div>
      {isSeller ? (
        <SellerWorkspace t={t} kycVerified={kycVerified} />
      ) : (
        <BecomeSellerCard onUserRefresh={onUserRefresh} t={t} />
      )}
    </div>
  )
}

function BecomeSellerCard({ onUserRefresh, t }: { onUserRefresh: () => void; t: SectionT }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      try {
        await becomeSeller()
        onUserRefresh()
      } catch {
        setError(t("becomeSellerError"))
      }
    })
  }

  return (
    <Card className="mt-4 gap-0 p-0">
      <CardHeader className="border-b px-6 py-5">
        <CardTitle className="text-lg">{t("becomeSellerTitle")}</CardTitle>
        <CardDescription>{t("becomeSellerBody")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-6 py-5">
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="button" onClick={handleClick} disabled={isPending} className="w-fit">
          {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {isPending ? t("becomingSeller") : t("becomeSellerCta")}
        </Button>
      </CardContent>
    </Card>
  )
}

// The dashboard is now a summary, not a workspace. It used to render every
// listing the seller owned, each one expanding into a location form, a details
// form, a map pin and a photo grid — so the page a seller lands on was several
// screens of forms before it said anything about the state of their account.
// Drafts moved to /dashboard/drafts and everything submitted moved to
// /dashboard/listings; what stays here is the count of each and the way in.
function SellerWorkspace({ t, kycVerified }: { t: SectionT; kycVerified: boolean }) {
  const { data: listings, isPending, isError } = useMyListings()

  const draftCount = listings ? draftsOf(listings).length : null
  const submittedCount = listings ? submittedOf(listings).length : null

  return (
    <Card className="mt-4 gap-0 p-0">
      <CardHeader className="border-b px-6 py-5">
        {/* Its own title: createTitle/createDescription now head the dialog,
            where they still read as instructions for the form they introduce. */}
        <CardTitle className="text-lg">{t("workspaceTitle")}</CardTitle>
        <CardDescription>{t("workspaceDescription")}</CardDescription>
        {/* The create form is withheld entirely until the seller is verified —
            not merely disabled — so an unverified seller cannot start filling in
            a listing they would then be blocked from submitting (FR-S8). Their
            EXISTING drafts stay reachable below; hiding those would strand work
            they already did. The API is still the authority on both actions. */}
        {kycVerified ? (
          <CardAction>
            <CreateListingDialog t={t} />
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-5 px-6 py-5">
        {!kycVerified ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-5 py-6 text-center">
            <ShieldAlert className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">
              {t("createNeedsVerificationTitle")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t("createNeedsVerificationBody")}</p>
            <Button asChild size="sm" className="mt-4">
              <a href="#seller-verification">{t("createNeedsVerificationCta")}</a>
            </Button>
          </div>
        ) : null}

        {isError ? (
          <p role="alert" className="text-sm text-destructive">
            {t("loadError")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SummaryTile
              href="/dashboard/drafts"
              label={t("draftsSummaryLabel")}
              cta={t("draftsLink")}
              count={draftCount}
              isPending={isPending}
            />
            <SummaryTile
              href="/dashboard/listings"
              label={t("listingsSummaryLabel")}
              cta={t("listingsLink")}
              count={submittedCount}
              isPending={isPending}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// One tile per surface: the number is the headline, the link is the whole tile.
function SummaryTile({
  href,
  label,
  cta,
  count,
  isPending,
}: {
  href: string
  label: string
  cta: string
  count: number | null
  isPending: boolean
}) {
  const format = useFormatter()

  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/30 px-5 py-4 transition-colors hover:border-primary/40 hover:bg-muted/60 focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {/* div, not span: Skeleton renders a div, and a div inside a span is
          invalid nesting. Flow content inside an <a> is fine in HTML5. */}
      <div className="min-w-0">
        {/* A skeleton rather than a 0: showing zero drafts to a seller who has
            three, for the half-second before the query lands, is worse than
            showing nothing. */}
        {isPending || count === null ? (
          <Skeleton className="h-9 w-12" />
        ) : (
          <span className="block font-heading text-3xl font-semibold tabular-nums text-foreground">
            {format.number(count)}
          </span>
        )}
        <span className="mt-1 block text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary">
        {cta}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}
