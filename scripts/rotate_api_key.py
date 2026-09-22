#!/usr/bin/env python3
"""Rotate the ODOO_API_KEY stored in .env for odoo-mcp-19.

Talks to Odoo directly — this is a standalone operational script, independent
of the odoo-mcp-19 MCP server. It does not go through server.py's safety
layer, which is why it can touch res.users.apikeys at all (that model is in
this project's own BLOCKED_MODELS for MCP tool calls, since an MCP agent
should never be able to mint or revoke API keys for itself; this script is
the intentionally-separate, narrowly-scoped operator tool that does).

DISCOVERED LIVE: res.users.apikeys.generate/.revoke cannot be driven headless
over plain HTTP at all, regardless of auth method. Both Bearer API-key auth
and a fresh session-cookie login (via /web/session/authenticate) got rejected
with the same AccessDenied ("The provided API key is invalid or does not
belong to the current user") — because Odoo guards these methods with its
built-in "confirm your identity" challenge (check_identity, Odoo 17+), which
only the web client's own UI flow satisfies. So this script drives the real
Settings > My Preferences > Security UI with Playwright: log in, open "Add
API Key" (re-entering the password when the Access Control dialog asks —
this identity check is cached per session for some minutes, so it does not
always reappear), read the generated key straight out of the DOM
(div[name="key"] span), then the same UI flow to delete the old key's row.

This is why ODOO_PASSWORD is now required in .env alongside ODOO_API_KEY.
This user's role also caps key validity at "1 Day" — the Security UI does
not expose a duration control in that case, so there is nothing to set; it
already satisfies the "<1 day" constraint on its own.

Safety invariants:
  - Never prints, logs, or raises with the old key, the new key, or the
    password. The password variable is set to None immediately after its
    last use in every code path.
  - .env is only written after the NEW key has been proven to work via a live
    context_get call. Any failure before that point leaves .env byte-for-byte
    unchanged.
  - .env is replaced atomically (write to a temp file in the same directory,
    then os.replace) and re-chmod'd to 0600 both before and after.
  - Only the ODOO_API_KEY line is rewritten; every other line (including
    MCP_SAFETY_MODE / MCP_READ_ONLY) is copied through verbatim and verified
    unchanged after the write, as a defense-in-depth check.
  - The old key is revoked (by name, via the same UI) only after the new key
    is confirmed working and written to disk, and only when exactly one
    other API-key record existed for this user before rotation (the expected
    single-service-account case). Zero or more than one other key found ->
    revocation is skipped with a warning rather than guessing which to delete.
  - Row targeting for delete uses an EXACT leaf-text match on the key's name,
    then walks upward from that specific leaf to find its own Delete button.
    An earlier version of this script matched on "ancestor text contains the
    target name", which is wrong: with several rows sharing a nearby common
    ancestor, that ancestor's combined text can contain a different row's
    name too, and the first Delete button found (in DOM order, not row order)
    gets clicked — it deleted a still-active key in testing. Do not revert to
    substring/ancestor matching here.
  - Authenticating the OLD key (to resolve uid / list prior keys for cleanup)
    is best-effort and never blocks recovery: an expired or revoked old key
    only skips that run's old-key revocation and is logged, since the
    browser-UI generation path authenticates with ODOO_USERNAME/PASSWORD, not
    the old key. Gating generation on the old key succeeding would make
    rotation unable to recover from the exact failure it exists to fix.
"""

import os
import stat
import sys
import tempfile
from datetime import datetime
from pathlib import Path

import requests
from dotenv import dotenv_values
from playwright.sync_api import sync_playwright

PROJECT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = PROJECT_DIR / ".env"
REQUEST_TIMEOUT = 30
PRESERVED_VARS = ("MCP_SAFETY_MODE", "MCP_READ_ONLY")
EXPECTED_SAFETY_MODE = "locked"
EXPECTED_READ_ONLY = "true"

# Exact-leaf-match row targeting -- see module docstring for why this must
# stay exact-match-from-a-leaf rather than ancestor-contains-substring.
_CLICK_ROW_BUTTON_JS = """
(args) => {
  const [target, buttonLabel] = args;
  const leaves = Array.from(document.querySelectorAll('*')).filter(el =>
    el.children.length === 0 && el.textContent.trim() === target
  );
  for (const leaf of leaves) {
    let cur = leaf;
    for (let depth = 0; depth < 6 && cur; depth++) {
      const btn = Array.from(cur.querySelectorAll('button')).find(b => b.textContent.trim() === buttonLabel);
      if (btn) { btn.click(); return true; }
      cur = cur.parentElement;
    }
  }
  return false;
}
"""


def log(message: str) -> None:
    print(f"[rotate-api-key] {message}", flush=True)


def fail(message: str) -> None:
    log(f"FAILED: {message}")
    sys.exit(1)


def _json2(base_url: str, model: str, method: str, api_key: str, payload=None):
    url = f"{base_url.rstrip('/')}/json/2/{model}/{method}"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    resp = requests.post(url, headers=headers, json=payload or {}, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def _records(resp):
    """Normalize a JSON-2 list-style response into a list of dicts."""
    if isinstance(resp, list):
        return resp
    if isinstance(resp, dict):
        return resp.get("records", resp.get("result", []))
    return []


def ensure_env_permissions() -> None:
    if ENV_PATH.exists():
        mode = stat.S_IMODE(os.stat(ENV_PATH).st_mode)
        if mode != 0o600:
            os.chmod(ENV_PATH, 0o600)


def load_env() -> dict:
    if not ENV_PATH.exists():
        fail(f".env not found at {ENV_PATH}")
    values = dotenv_values(ENV_PATH)
    required = ["ODOO_URL", "ODOO_DB", "ODOO_USERNAME", "ODOO_API_KEY", "ODOO_PASSWORD"]
    missing = [k for k in required if not values.get(k)]
    if missing:
        fail(f".env missing required variable(s): {', '.join(missing)}")
    return values


def get_uid(base_url: str, username: str, api_key: str) -> int:
    resp = _json2(
        base_url,
        "res.users",
        "search_read",
        api_key,
        {"domain": [["login", "=", username]], "fields": ["id"]},
    )
    records = _records(resp)
    if not records:
        fail("could not resolve current user id from ODOO_USERNAME")
    return records[0]["id"]


def find_existing_keys(base_url: str, api_key: str, uid: int) -> list:
    """Read-only listing (id/name/create_date, never the secret) -- Bearer works fine for this."""
    resp = _json2(
        base_url,
        "res.users.apikeys",
        "search_read",
        api_key,
        {"domain": [["user_id", "=", uid]], "fields": ["id", "name", "create_date"]},
    )
    return _records(resp)


def test_key(base_url: str, api_key: str) -> bool:
    try:
        _json2(base_url, "res.users", "context_get", api_key, {})
        return True
    except requests.RequestException:
        return False


def read_preserved_vars(env_path: Path) -> dict:
    values = dotenv_values(env_path)
    return {k: values.get(k) for k in PRESERVED_VARS}


def atomic_replace_env_var(env_path: Path, key: str, new_value: str) -> None:
    with open(env_path, "r") as f:
        lines = f.readlines()

    out_lines = []
    replaced = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith(f"{key}=") or stripped.startswith(f"export {key}="):
            out_lines.append(f"{key}={new_value}\n")
            replaced = True
        else:
            out_lines.append(line)
    if not replaced:
        out_lines.append(f"{key}={new_value}\n")

    fd, tmp_path = tempfile.mkstemp(dir=str(env_path.parent), prefix=".env.tmp.")
    try:
        with os.fdopen(fd, "w") as f:
            f.writelines(out_lines)
        os.chmod(tmp_path, 0o600)
        os.replace(tmp_path, env_path)
    except Exception:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise


def _open_security_tab(page) -> None:
    page.locator(".o_user_menu").first.click()
    page.wait_for_timeout(500)
    page.get_by_text("My Preferences", exact=True).click()
    page.wait_for_timeout(1500)
    page.get_by_role("tab", name="Security").click()
    page.wait_for_timeout(1000)


def _confirm_identity_if_prompted(page, password: str) -> None:
    """The Access Control password dialog is cached per session for a few
    minutes, so it does not always reappear -- only fill it if it shows up."""
    pw_field = page.locator('.modal input[type="password"]')
    try:
        pw_field.wait_for(timeout=3000)
    except Exception:
        return
    pw_field.fill(password)
    page.get_by_role("button", name="Confirm Password").click()
    page.wait_for_timeout(1200)


def browser_login(playwright, base_url: str, db: str, username: str, password: str):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto(f"{base_url}/web/login?db={db}")
    page.wait_for_load_state("domcontentloaded")
    page.fill('input[name="login"]', username)
    page.fill('input[name="password"]', password)
    with page.expect_navigation(timeout=30000):
        page.locator('form.oe_login_form button[type="submit"]').first.click()
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(2000)
    return browser, page


def generate_key_via_ui(page, password: str, key_name: str) -> str:
    """Odoo auto-generates the secret server-side here -- there is no field
    for us to supply one, unlike the (blocked) JSON-2 generate call."""
    _open_security_tab(page)
    page.get_by_role("button", name="Add API Key").click()
    page.wait_for_timeout(1000)
    _confirm_identity_if_prompted(page, password)

    page.locator('.modal input[placeholder="What\'s this key for?"]').fill(key_name)
    page.get_by_role("button", name="Generate key").click()
    page.wait_for_timeout(1500)

    key_el = page.locator('.modal div[name="key"] span')
    key_el.wait_for(timeout=10000)
    new_key = key_el.inner_text()

    done_btn = page.get_by_role("button", name="Done!")
    if done_btn.count():
        done_btn.click()
    page.wait_for_timeout(500)
    return new_key


def revoke_key_via_ui(page, password: str, key_name: str) -> bool:
    _open_security_tab(page)
    clicked = page.evaluate(_CLICK_ROW_BUTTON_JS, [key_name, "Delete"])
    if not clicked:
        return False
    page.wait_for_timeout(800)
    _confirm_identity_if_prompted(page, password)
    return True


def main() -> None:
    ensure_env_permissions()
    env = load_env()
    base_url = env["ODOO_URL"].rstrip("/")
    db = env["ODOO_DB"]
    username = env["ODOO_USERNAME"]
    old_key = env["ODOO_API_KEY"]
    password = env["ODOO_PASSWORD"]
    before_preserved = read_preserved_vars(ENV_PATH)

    log("Starting API key rotation")

    # uid/prior_keys are best-effort cleanup info only -- an expired or
    # revoked old key must never block the password-based browser recovery
    # below, since recovering from exactly that situation is the point of
    # rotation.
    uid = None
    old_key_valid = True
    try:
        uid = get_uid(base_url, username, old_key)
    except requests.RequestException:
        old_key_valid = False
        log("Existing API key is invalid; continuing with browser recovery")

    prior_keys = None
    if old_key_valid:
        try:
            prior_keys = find_existing_keys(base_url, old_key, uid)
        except requests.RequestException:
            log("WARNING: could not list existing API keys; will skip old-key revocation")

    # Includes minutes, not just the date: the LaunchAgent runs 4x/day, and a
    # same-day name collision would make the "exclude the key we just made"
    # filter below wrongly treat the PREVIOUS rotation's still-active key as
    # if it were the one we just created, skipping its revocation.
    key_name = f"odoo-mcp-19 auto-rotation ({datetime.now().strftime('%Y-%m-%d %H:%M:%S')})"
    new_key = None
    try:
        with sync_playwright() as p:
            browser, page = browser_login(p, base_url, db, username, password)
            try:
                new_key = generate_key_via_ui(page, password, key_name)
                if not new_key:
                    fail("could not read generated key from the UI; .env left unchanged")

                if not test_key(base_url, new_key):
                    fail("new key failed the context_get test; .env left unchanged, old key remains active")

                log("New key generated and verified")
                atomic_replace_env_var(ENV_PATH, "ODOO_API_KEY", new_key)
                ensure_env_permissions()
                new_key = None  # written to disk, no longer needed in memory

                after_preserved = read_preserved_vars(ENV_PATH)
                if after_preserved != before_preserved:
                    log(f"WARNING: {', '.join(PRESERVED_VARS)} changed during rotation — check .env manually")
                else:
                    log(".env updated (permissions 600, safety settings unchanged)")

                if after_preserved.get("MCP_SAFETY_MODE") != EXPECTED_SAFETY_MODE:
                    log(
                        f"WARNING: MCP_SAFETY_MODE is {after_preserved.get('MCP_SAFETY_MODE')!r}, "
                        f"expected {EXPECTED_SAFETY_MODE!r} — check .env manually"
                    )
                if after_preserved.get("MCP_READ_ONLY") != EXPECTED_READ_ONLY:
                    log(
                        f"WARNING: MCP_READ_ONLY is {after_preserved.get('MCP_READ_ONLY')!r}, "
                        f"expected {EXPECTED_READ_ONLY!r} — check .env manually"
                    )

                if not old_key_valid:
                    log(
                        "Previous-key cleanup skipped because the previous credential "
                        "could not be authenticated."
                    )
                elif prior_keys is None:
                    log("Old-key revocation skipped (could not list keys)")
                else:
                    targets = [r["name"] for r in prior_keys if r["name"] != key_name]
                    if len(targets) == 0:
                        log("No prior key found to revoke (first rotation)")
                    elif len(targets) == 1:
                        if revoke_key_via_ui(page, password, targets[0]):
                            log(f"Old key ({targets[0]!r}) revoked")
                        else:
                            log(
                                f"WARNING: could not find old key {targets[0]!r} to revoke; "
                                "revoke it manually in Odoo Settings > Account Security"
                            )
                    else:
                        log(
                            f"WARNING: {len(targets)} other API keys exist for this user; "
                            "not auto-revoking any of them to avoid affecting an unrelated integration. "
                            "Review Settings > Account Security manually."
                        )
            finally:
                password = None
                browser.close()
    finally:
        password = None

    log("Rotation completed successfully")


if __name__ == "__main__":
    main()
