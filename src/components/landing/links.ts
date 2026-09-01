import type { Route } from 'next';

// Every action on the public site funnels into the auth surface at /sign-in.
// `?mode=signup` opens the "create account" tab of <EmailAuthForm/> directly.
// Cast through Route because typedRoutes can't type a query string statically.
export const SIGN_IN = '/sign-in' as Route;
export const REGISTER = '/sign-in?mode=signup' as Route;
export const ACCOUNT = '/account' as Route;
export const CONTACT = '/contacto' as Route;
export const PRIVACY = '/legal/privacy' as Route;
export const TERMS = '/legal/terms' as Route;
