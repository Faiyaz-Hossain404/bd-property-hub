"use client"

import { useEffect, useState, useTransition, type FormEvent } from "react"
import { useTranslations } from "next-intl"
import { LoaderCircle } from "lucide-react"
import { ROLES, USER_STATUSES, type PublicUser, type Role, type UserStatus } from "@bdph/types"

import {
  ApiError,
  getAdminUsers,
  setAdminUserRoles,
  setAdminUserStatus,
} from "@/lib/api"
import { useCurrentUser } from "@/hooks/use-current-user"
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

const STAFF_ROLES: readonly Role[] = ["super_admin", "admin", "customer_support"]
const isStaff = (user: PublicUser) => user.roles.some((r) => STAFF_ROLES.includes(r))

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
  const canManageRoles = viewer?.roles.includes("super_admin") ?? false

  const [queryInput, setQueryInput] = useState("")
  const [filters, setFilters] = useState<{ q: string; role: string; status: string }>({
    q: "",
    role: "",
    status: "",
  })
  const [users, setUsers] = useState<PublicUser[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)

  // (Re)load the first page whenever the applied filters change.
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    getAdminUsers({
      q: filters.q || null,
      role: (filters.role || null) as Role | null,
      status: (filters.status || null) as UserStatus | null,
    })
      .then((page) => {
        if (!active) return
        setUsers(page.data)
        setCursor(page.page.nextCursor)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [filters])

  function applySearch(event: FormEvent) {
    event.preventDefault()
    setFilters((prev) => ({ ...prev, q: queryInput.trim() }))
  }

  async function loadMore() {
    if (!cursor) return
    setLoadingMore(true)
    try {
      const page = await getAdminUsers({
        cursor,
        q: filters.q || null,
        role: (filters.role || null) as Role | null,
        status: (filters.status || null) as UserStatus | null,
      })
      setUsers((prev) => [...prev, ...page.data])
      setCursor(page.page.nextCursor)
    } catch {
      setError(true)
    } finally {
      setLoadingMore(false)
    }
  }

  function replaceUser(updated: PublicUser) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
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
          {loading ? (
            <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              {t("loading")}
            </p>
          ) : null}
          {error && !loading ? (
            <p className="py-6 text-sm text-destructive">{t("users.loadError")}</p>
          ) : null}
          {!loading && !error && users.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">{t("users.empty")}</p>
          ) : null}
          {users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              viewerId={viewer?.id ?? null}
              canManageRoles={canManageRoles}
              onUpdated={replaceUser}
              t={t}
            />
          ))}
        </CardContent>
      </Card>

      {cursor ? (
        <div className="flex justify-center">
          <Button type="button" variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? <LoaderCircle className="size-4 animate-spin" /> : null}
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
  onUpdated,
  t,
}: {
  user: PublicUser
  viewerId: string | null
  canManageRoles: boolean
  onUpdated: (user: PublicUser) => void
  t: PanelT
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [editingRoles, setEditingRoles] = useState(false)

  const isSelf = user.id === viewerId
  const suspended = user.status === "suspended"
  // Role editing is a super-admin capability and never applies to your own account.
  const showRoleEditor = canManageRoles && !isSelf

  function toggleStatus() {
    setError(null)
    startTransition(async () => {
      try {
        const updated = await setAdminUserStatus(user.id, {
          status: suspended ? "active" : "suspended",
        })
        onUpdated(updated)
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : t("users.actionError"))
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {user.roles.map((role) => (
            <Badge key={role} variant="secondary">
              {t(`breakdown.role.${role}`)}
            </Badge>
          ))}
          <Badge variant={statusVariant(user.status)}>{t(`breakdown.userStatus.${user.status}`)}</Badge>
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
        {showRoleEditor ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditingRoles((v) => !v)}
            disabled={isPending}
          >
            {t("users.editRoles")}
          </Button>
        ) : null}
        {isSelf ? <span className="text-xs text-muted-foreground">{t("users.youBadge")}</span> : null}
      </div>

      {editingRoles ? (
        <RoleEditor
          user={user}
          onSaved={(updated) => {
            onUpdated(updated)
            setEditingRoles(false)
          }}
          onCancel={() => setEditingRoles(false)}
          t={t}
        />
      ) : null}

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function RoleEditor({
  user,
  onSaved,
  onCancel,
  t,
}: {
  user: PublicUser
  onSaved: (user: PublicUser) => void
  onCancel: () => void
  t: PanelT
}) {
  const [selected, setSelected] = useState<Role[]>(user.roles)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggle(role: Role) {
    setSelected((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    )
  }

  function save() {
    if (selected.length === 0) {
      setError(t("users.rolesRequired"))
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const updated = await setAdminUserRoles(user.id, { roles: selected })
        onSaved(updated)
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : t("users.actionError"))
      }
    })
  }

  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{t("users.editRolesTitle")}</p>
      <div className="flex flex-wrap gap-1.5">
        {ROLES.map((role) => {
          const active = selected.includes(role)
          return (
            <button
              key={role}
              type="button"
              onClick={() => toggle(role)}
              aria-pressed={active}
              className={
                active
                  ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                  : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
              }
            >
              {t(`breakdown.role.${role}`)}
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button type="button" size="sm" onClick={save} disabled={isPending}>
          {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {t("users.saveRoles")}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={isPending}>
          {t("users.cancel")}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
