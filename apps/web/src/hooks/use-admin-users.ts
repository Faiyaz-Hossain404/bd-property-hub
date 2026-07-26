import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import type {
  AdminAssignRoleInput,
  AdminUpdateUserStatusInput,
  ApiPage,
  PublicUser,
  Role,
  UserStatus,
} from '@bdph/types';
import { getAdminUsers, setAdminUserRole, setAdminUserStatus } from '@/lib/api';

export type AdminUsersFilters = { q: string; role: string; status: string }

const ADMIN_USERS_KEY = 'admin-users' as const

// Paginated admin user list (FR-A1) — caches per distinct filters value, same
// pattern as the public catalog's useListings. The two mutations below patch
// every cached page across all filter variants (setQueriesData with the
// partial key) so a status/role change is reflected immediately without
// waiting on a refetch, and stays correct if the admin later revisits a
// filter combo already cached this session.
export function useAdminUsers(filters: AdminUsersFilters) {
  return useInfiniteQuery({
    queryKey: [ADMIN_USERS_KEY, filters],
    queryFn: ({ pageParam }) =>
      getAdminUsers({
        cursor: pageParam,
        q: filters.q || null,
        role: (filters.role || null) as Role | null,
        status: (filters.status || null) as UserStatus | null,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.page.nextCursor ?? undefined,
  })
}

function patchCachedUser(
  queryClient: ReturnType<typeof useQueryClient>,
  updated: PublicUser,
) {
  queryClient.setQueriesData<InfiniteData<ApiPage<PublicUser>>>(
    { queryKey: [ADMIN_USERS_KEY] },
    (old) =>
      old && {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          data: page.data.map((user) => (user.id === updated.id ? updated : user)),
        })),
      },
  )
}

// A status/role change updates the user in place for instant feedback, then
// invalidates every admin-users query so the active filtered view refetches
// and RECONCILES membership: an in-place patch can flip a badge to "suspended"
// but can't drop that row out of a `status=active` filter (the client doesn't
// know the server-side predicate). The patch gives the immediate update; the
// background refetch corrects which rows belong in each filtered bucket.
function onUserMutated(queryClient: ReturnType<typeof useQueryClient>, updated: PublicUser) {
  patchCachedUser(queryClient, updated)
  void queryClient.invalidateQueries({ queryKey: [ADMIN_USERS_KEY] })
}

export function useSetAdminUserStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { userId: string; input: AdminUpdateUserStatusInput }) =>
      setAdminUserStatus(vars.userId, vars.input),
    onSuccess: (updated) => onUserMutated(queryClient, updated),
  })
}

export function useSetAdminUserRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { userId: string; input: AdminAssignRoleInput }) =>
      setAdminUserRole(vars.userId, vars.input),
    onSuccess: (updated) => onUserMutated(queryClient, updated),
  })
}
