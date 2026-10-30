import sys
from getpass import getpass
from itertools import count

from app.services.supabase_client import get_supabase_client


DEMO_OWNER_EMAIL = "demo-owner@example.com"


def main() -> int:
    supabase = get_supabase_client()

    matches = []
    for page in count(1):
        users = supabase.auth.admin.list_users(page=page, per_page=100)
        if not users:
            break
        matches.extend(user for user in users if user.email == DEMO_OWNER_EMAIL)

    if len(matches) != 1:
        if not matches:
            print(f"No user found for {DEMO_OWNER_EMAIL}.", file=sys.stderr)
        else:
            print(f"Multiple users found for {DEMO_OWNER_EMAIL}; no changes made.", file=sys.stderr)
        return 1

    password = getpass("New password: ")
    confirmation = getpass("Confirm new password: ")
    if not password:
        print("Password cannot be empty.", file=sys.stderr)
        return 1
    if password != confirmation:
        print("Passwords do not match.", file=sys.stderr)
        return 1

    supabase.auth.admin.update_user_by_id(matches[0].id, {"password": password})
    print(f"Password updated for {DEMO_OWNER_EMAIL}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
