"use client"

import { useState, type FormEvent } from "react"
import { useTranslations } from "next-intl"
import { LoaderCircle } from "lucide-react"
import {
  ASSIGNABLE_ROLES,
  ROLES,
  USER_STATUSES,
  type AssignableRole,
  type PublicUser,
  type UserStatus,
} from "@bdph/types"

import { ApiError } from "@/lib/api"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useAdminUsers, useSetAdminUserRole, useSetAdminUserStatus } from "@/hooks/use-admin-users"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type PanelT = ReturnType<typeof useTranslations>

// Radix Select rejects an empty-string item value, so "no filter applied" is
// represented by this sentinel and translated back to "" at the boundary.
const ALL_VALUE = "__all__"

function statusVariant(status: UserStatus): "default" | "outline" | "destructive" {
  if (status === "active") return "default"
  if (status === "suspended" || status === "deleted") return "destructive"
  return "outline"
}

function Filter({
  value,
  onChange,
  options,
  allLabel,
  label,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  allLabel: string
  label: string
}) {
  return (
    <Select
      value={value || ALL_VALUE}
      onValueChange={(next) => onChange(next === ALL_VALUE ? "" : next)}
    >
      <SelectTrigger aria-label={label} className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function UsersPanel() {
  const t = useTranslations("admin")
  const current = useCurrentUser()
  const viewer = current.status === "authenticated" ? current.user : null
  // Only the prime admin may change roles — the API's PATCH …/role endpoint 403s
  // everyone else, so a standard admin sees the list but no role control.
  const canManageRoles = viewer?.role === "admin_prime"

  const [queryInput, setQueryInput] = useState("")
  const [filters, setFilters] = useState<{ q: string; role: string; status: string }>({
    q: "",
    role: "",
    status: "",
  })

  // Caches per distinct filters value — re-applying a filter combo already seen
  // this session (e.g. via back/forward) renders instantly from cache instead
  // of re-fetching. The two mutations below (in UserRow) patch this cache
  // directly, so a status/role change shows up immediately without a refetch.
  const { data, isPending, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAdminUsers(filters)
  const users = data?.pages.flatMap((page) => page.data) ?? []

  function applySearch(event: FormEvent) {
    event.preventDefault()
    setFilters((prev) => ({ ...prev, q: queryInput.trim() }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {t("users.title")}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t("users.subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={applySearch} className="flex items-center gap-2">
          <Input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder={t("users.searchPlaceholder")}
            className="h-8 w-56"
          />
          <Button type="submit" size="sm" variant="outline">
            {t("users.searchCta")}
          </Button>
        </form>
        <Filter
          label={t("users.filterRole")}
          value={filters.role}
          onChange={(role) => setFilters((prev) => ({ ...prev, role }))}
          allLabel={t("users.allRoles")}
          options={ROLES.map((role) => ({ value: role, label: t(`breakdown.role.${role}`) }))}
        />
        <Filter
          label={t("users.filterStatus")}
          value={filters.status}
          onChange={(status) => setFilters((prev) => ({ ...prev, status }))}
          allLabel={t("users.allStatuses")}
          options={USER_STATUSES.map((status) => ({
            value: status,
            label: t(`breakdown.userStatus.${status}`),
          }))}
        />
      </div>

      <Card className="gap-0 p-0">
        <CardContent className="divide-y divide-border/60 px-6 py-2">
          {isPending ? (
            <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              {t("loading")}
            </p>
          ) : null}
          {isError && !isPending ? (
            <p className="py-6 text-sm text-destructive">{t("users.loadError")}</p>
          ) : null}
          {!isPending && !isError && users.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">{t("users.empty")}</p>
          ) : null}
          {users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              viewerId={viewer?.id ?? null}
              canManageRoles={canManageRoles}
              t={t}
            />
          ))}
        </CardContent>
      </Card>

      {hasNextPage ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {t("users.loadMore")}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function UserRow({
  user,
  viewerId,
  canManageRoles,
  t,
}: {
  user: PublicUser
  viewerId: string | null
  canManageRoles: boolean
  t: PanelT
}) {
  const [error, setError] = useState<string | null>(null)
  const statusMutation = useSetAdminUserStatus()
  const roleMutation = useSetAdminUserRole()
  const isPending = statusMutation.isPending || roleMutation.isPending

  const isSelf = user.id === viewerId
  const suspended = user.status === "suspended"
  // The prime never edits their OWN role here (self-lockout guard — the server
  // enforces it too); they get the "This is you" note instead of a selector.
  const showRoleSelect = canManageRoles && !isSelf

  function toggleStatus() {
    setError(null)
    statusMutation.mutate(
      { userId: user.id, input: { status: suspended ? "active" : "suspended" } },
      {
        onError: (caught) => {
          setError(caught instanceof ApiError ? caught.message : t("users.actionError"))
        },
      },
    )
  }

  function applyRole(role: AssignableRole) {
    setError(null)
    roleMutation.mutate(
      { userId: user.id, input: { role } },
      {
        onError: (caught) => {
          setError(caught instanceof ApiError ? caught.message : t("users.actionError"))
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-2 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Badge variant="secondary">{t(`breakdown.role.${user.role}`)}</Badge>
          <Badge variant={statusVariant(user.status)}>
            {t(`breakdown.userStatus.${user.status}`)}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={suspended ? "outline" : "destructive"}
          onClick={toggleStatus}
          disabled={isPending || isSelf}
          title={isSelf ? t("users.notSelf") : undefined}
        >
          {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {suspended ? t("users.reactivate") : t("users.suspend")}
        </Button>

        {showRoleSelect ? (
          <Select
            value={ASSIGNABLE_ROLES.includes(user.role as AssignableRole) ? user.role : undefined}
            onValueChange={(next) => applyRole(next as AssignableRole)}
            disabled={isPending}
          >
            <SelectTrigger aria-label={t("users.changeRole")} className="h-8 w-40">
              <SelectValue placeholder={t("users.changeRole")} />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNABLE_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {t(`breakdown.role.${role}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {isSelf ? (
          <span className="text-xs text-muted-foreground">{t("users.youBadge")}</span>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
