import { AuthFormSkeleton } from '@/components/auth/auth-form-skeleton';

// Route-level loading UI for the auth pages. The (auth) layout already renders the
// minimal header + a centered <main>, so this only stands in for the auth card
// itself. Its main job is to keep the home skeleton (the parent [locale] boundary)
// from bleeding onto /login, /register, etc. during navigation.
//
// The card shape now lives in AuthFormSkeleton because the Clerk mount gate
// (SignInForm/SignUpForm) shows the identical placeholder while it waits — one
// definition keeps the two from drifting apart and flickering against each other.
export default function AuthLoading() {
  return <AuthFormSkeleton />;
}
