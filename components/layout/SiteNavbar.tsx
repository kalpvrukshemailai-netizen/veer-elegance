"use client";

/**
 * VEER ELEGANCE — SiteNavbar
 *
 * Floating transparent navbar over the cinematic hero.
 * Transitions to a subtle separated state on scroll.
 * Semantically correct, keyboard-accessible, ARIA-labelled.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Search, User, ShoppingBag, Menu, X } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import type { AnnouncementContent } from "@/lib/site-content";

// ── Navigation link definitions ──────────────────────────────────────
const NAV_LINKS = [
  { label: "Shop",        href: "/shop"        },
  { label: "Collections", href: "/collections" },
  { label: "About",       href: "/about"       },
] as const;

// ── Icon action definitions ───────────────────────────────────────────
const ICON_ACTIONS = [
  { label: "Search",      href: "/search",  Icon: Search      },
  { label: "Account",     href: "/account", Icon: User        },
  { label: "Bag",         href: "/bag",     Icon: ShoppingBag },
] as const;

// ─────────────────────────────────────────────────────────────────────

interface SiteNavbarProps {
  theme?: "light" | "dark";
  announcement?: AnnouncementContent | null;
}

export default function SiteNavbar({ theme = "dark", announcement: announcementProp }: SiteNavbarProps) {
  const [announcement, setAnnouncement] = useState<AnnouncementContent | null>(announcementProp ?? null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // If announcement prop was not explicitly provided, load it client-side
  useEffect(() => {
    if (announcementProp !== undefined) {
      setAnnouncement(announcementProp);
      return;
    }
    fetch("/api/content?section=announcement")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) {
          setAnnouncement(json.data);
        }
      })
      .catch(() => {});
  }, [announcementProp]);

  // Un-scrolled colour: ivory over dark hero (dark theme) OR espresso over light page (light theme)
  const unscrolledColor = theme === "light" ? "var(--color-espresso)" : "var(--color-ivory)";
  const navColor = scrolled ? "var(--foreground)" : unscrolledColor;

  const { itemCount, openDrawer } = useCart();

  // Handle navbar background change on scroll
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header
        role="banner"
        aria-label="Site navigation"
        style={{
          position:   "fixed",
          top:        0,
          left:       0,
          right:      0,
          zIndex:     100,
          transition: "background-color 400ms cubic-bezier(0.4,0,0.2,1), backdrop-filter 400ms ease, border-color 400ms ease",
          backgroundColor: scrolled
            ? "color-mix(in srgb, var(--color-ivory) 88%, transparent)"
            : "transparent",
          backdropFilter: scrolled ? "blur(12px) saturate(1.4)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(12px) saturate(1.4)" : "none",
          borderBottom: scrolled
            ? "1px solid var(--border)"
            : "1px solid transparent",
        }}
      >
        <AnnouncementBar content={announcement} />
        <nav
          aria-label="Primary"
          className="site-navbar-nav"
        >
          {/* ── LEFT: Mobile Hamburger Button (Hidden on Desktop) ────────── */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="navbar-mobile-toggle"
            style={{ color: navColor }}
          >
            {mobileMenuOpen ? (
              <X size={20} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Menu size={20} strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>

          {/* ── Logo (Left on Desktop, Centred on Mobile) ───────────────── */}
          <Link
            href="/"
            aria-label="Veer Elegance — return to homepage"
            className="navbar-brand-link"
          >
            <img
              src="/images/veer-elegance-logo.png"
              alt="Veer Elegance — Premium Anti-Tarnish Jewellery"
              className="navbar-logo-img"
            />
          </Link>

          {/* ── CENTRE: Desktop Primary Nav Links (Hidden on Mobile) ────── */}
          <ul
            role="list"
            className="navbar-desktop-links"
          >
            {NAV_LINKS.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-nav navbar-link-item"
                  style={{
                    color:          navColor,
                    transition:     "color 400ms ease, opacity 200ms ease",
                    letterSpacing:  "0.06em",
                    textTransform:  "uppercase",
                    fontSize:       "0.75rem",
                    fontWeight:     500,
                    opacity:        1,
                    textDecoration: "none",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "0.6")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {/* ── RIGHT: Icon Actions (Search, Account, Bag) ──────────────── */}
          <ul
            role="list"
            className="navbar-actions-list"
          >
            {ICON_ACTIONS.map(({ label, href, Icon }) => (
              <li key={href}>
                {label === "Bag" ? (
                  /* Bag icon — opens drawer, shows count */
                  <button
                    type="button"
                    aria-label={`Open bag${itemCount > 0 ? `, ${itemCount} item${itemCount !== 1 ? "s" : ""}` : ""}`}
                    onClick={openDrawer}
                    className="navbar-icon-btn navbar-bag-btn"
                    style={{
                      color:      navColor,
                      transition: "color 400ms ease, opacity 200ms ease",
                    }}
                  >
                    <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
                    {/* Count badge */}
                    {itemCount > 0 && (
                      <span
                        aria-hidden="true"
                        className="navbar-bag-badge"
                        style={{
                          background: (!scrolled && theme === "dark") ? "var(--color-ivory)" : "var(--color-espresso)",
                          color:      (!scrolled && theme === "dark") ? "var(--color-espresso)" : "var(--color-ivory)",
                        }}
                      >
                        {itemCount > 9 ? "9+" : itemCount}
                      </span>
                    )}
                  </button>
                ) : (
                  /* Search + Account — regular links */
                  <Link
                    href={href}
                    aria-label={label}
                    className="navbar-icon-btn"
                    style={{
                      color:      navColor,
                      transition: "color 400ms ease, opacity 200ms ease",
                      opacity:    1,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.6")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                  >
                    <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {/* ── Mobile Navigation Drawer & Backdrop ──────────────────────── */}
      <div
        id="mobile-nav-drawer"
        aria-hidden={!mobileMenuOpen}
        className={`mobile-nav-overlay ${mobileMenuOpen ? "open" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="mobile-nav-panel"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top bar with brand logo & close button */}
          <div className="mobile-nav-header">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Veer Elegance"
              style={{ display: "flex", alignItems: "center" }}
            >
              <img
                src="/images/veer-elegance-logo.png"
                alt="Veer Elegance"
                style={{ width: "105px", height: "auto", display: "block" }}
              />
            </Link>
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setMobileMenuOpen(false)}
              className="mobile-nav-close-btn"
            >
              <X size={22} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>

          <div className="mobile-nav-divider" />

          {/* Primary Navigation Links */}
          <div className="mobile-nav-links">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className="mobile-nav-item"
              >
                <span>{label}</span>
                <span className="mobile-nav-arrow" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>

          {/* Quick utility shortcuts */}
          <div className="mobile-nav-secondary">
            <Link
              href="/search"
              onClick={() => setMobileMenuOpen(false)}
              className="mobile-nav-secondary-item"
            >
              <Search size={16} strokeWidth={1.5} aria-hidden="true" />
              <span>Search Jewellery</span>
            </Link>

            <Link
              href="/account"
              onClick={() => setMobileMenuOpen(false)}
              className="mobile-nav-secondary-item"
            >
              <User size={16} strokeWidth={1.5} aria-hidden="true" />
              <span>My Account</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                openDrawer();
              }}
              className="mobile-nav-secondary-item mobile-nav-bag-item"
            >
              <ShoppingBag size={16} strokeWidth={1.5} aria-hidden="true" />
              <span>Shopping Bag {itemCount > 0 ? `(${itemCount})` : ""}</span>
            </button>
          </div>

          {/* Brand footer tagline */}
          <div className="mobile-nav-footer">
            <span className="mobile-nav-gold-dot" aria-hidden="true">•</span>
            <p className="mobile-nav-tagline">
              Anti-Tarnish · Understated · Timeless
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
