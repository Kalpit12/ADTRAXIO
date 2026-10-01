/** Active state for app shell nav — supports nested workspace routes. */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  if (href === "/assistant") {
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`) ||
      pathname === "/ai" ||
      pathname.startsWith("/ai/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
