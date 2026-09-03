import os
import sys
import re
import imaplib
import email
from email.header import decode_header
from dotenv import load_dotenv

# Load configuration from environment or .env file
# Look in the script's directory for .env first
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, '.env')
if os.path.exists(env_path):
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

IMAP_SERVER = os.getenv("IMAP_SERVER")
IMAP_PORT = int(os.getenv("IMAP_PORT", "993"))
IMAP_EMAIL = os.getenv("IMAP_EMAIL")
IMAP_PASSWORD = os.getenv("IMAP_PASSWORD")
IMAP_FOLDER = os.getenv("IMAP_FOLDER", "INBOX")

# True: only log what would be filtered; False: perform actual deletion/trash move.
DRY_RUN = os.getenv("DRY_RUN", "True").lower() in ("true", "1", "yes")
FILTER_ACTION = os.getenv("FILTER_ACTION", "TRASH").upper()  # 'TRASH' or 'DELETE'
TRASH_FOLDER_NAME = os.getenv("TRASH_FOLDER_NAME", "Trash")

def decode_mime_words(s):
    """Safely decode RFC 2047 MIME-encoded headers."""
    if not s:
        return ""
    try:
        decoded_parts = decode_header(s)
        decoded_str = ""
        for part, encoding in decoded_parts:
            if isinstance(part, bytes):
                decoded_str += part.decode(encoding or 'utf-8', errors='ignore')
            else:
                decoded_str += part
        return decoded_str
    except Exception:
        return str(s)

def extract_body(msg):
    """Extract plain text or HTML body from email.message."""
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition"))
            if content_type == "text/plain" and "attachment" not in content_disposition:
                try:
                    body += part.get_payload(decode=True).decode(part.get_content_charset() or 'utf-8', errors='ignore')
                except Exception:
                    pass
            elif content_type == "text/html" and "attachment" not in content_disposition:
                try:
                    html_content = part.get_payload(decode=True).decode(part.get_content_charset() or 'utf-8', errors='ignore')
                    # Strip basic HTML tags for text analysis
                    clean_text = re.sub(r'<[^>]+>', ' ', html_content)
                    body += clean_text
                except Exception:
                    pass
    else:
        content_type = msg.get_content_type()
        if content_type in ["text/plain", "text/html"]:
            try:
                body = msg.get_payload(decode=True).decode(msg.get_content_charset() or 'utf-8', errors='ignore')
                if content_type == "text/html":
                    body = re.sub(r'<[^>]+>', ' ', body)
            except Exception:
                pass
    return body

def should_filter(subject, sender, body):
    """
    Decides whether the email should be filtered (deleted/archived) or kept.
    Returns: (bool, reason_string)
    """
    subject_lower = subject.lower()
    sender_lower = sender.lower()
    body_lower = body.lower()

    # 1. Keep / Whitelist Rules (Check first to avoid false positives)
    # Check for direct messages (DMs)
    dm_keywords = ["direct message", "dm", "persönliche nachricht", "private message", "nachricht von"]
    for kw in dm_keywords:
        if kw in subject_lower:
            return False, f"Keep: Direct message/DM detected ('{kw}' in subject)"

    # Check for payment, support, server-meldungen, alerts
    keep_keywords = [
        "payment", "invoice", "receipt", "support", "ticket", "server", "alert", 
        "error", "warning", "rechnung", "quittung", "zahlung", "abbuchung", 
        "abonnement", "subscription", "stripe", "paypal", "lemon squeezy", "status check"
    ]
    for kw in keep_keywords:
        if kw in subject_lower or kw in sender_lower:
            return False, f"Keep: Support/Payment/Server/Alert keyword detected ('{kw}')"

    # 2. Buffer Recap / Summary Filter
    # Check if Buffer recap/summary with 0 interactions
    if "buffer" in sender_lower or "buffer" in subject_lower:
        # Buffer Recap / Weekly / Daily digest.
        # Find comments and reactions.
        # Examples of matches in text:
        # "0 comments", "0 reactions", "0 likes", "0 clicks"
        # Let's count comments and reactions. If we find non-zero numbers, we keep it.
        # We look for a pattern where comment/reaction/like/click count > 0.
        interactions = re.findall(r'(\d+)\s*(comment|reaction|like|click|interaction)', body_lower)
        
        if interactions:
            total_interactions = 0
            for val, type_str in interactions:
                total_interactions += int(val)
            
            if total_interactions > 0:
                return False, f"Keep: Buffer recap has {total_interactions} active interactions"
            else:
                return True, "Filter: Buffer recap has 0 interactions"
        
        # Fallback keyword checks if regex didn't extract counts cleanly
        if "0 comments" in body_lower or "0 reactions" in body_lower or "0 likes" in body_lower:
            # Check if there is any mention of non-zero numbers
            if not re.search(r'[1-9]\d*\s*(comment|reaction|like|click|interaction)', body_lower):
                return True, "Filter: Buffer recap has 0 interactions (explicit keywords found)"

    # 3. Social Media Suggestions & Recommendations
    social_filter_keywords = [
        "es gibt neue personen zu entdecken",
        "für dich vorgeschlagen",
        "für dich empfohlen",
        "suggested for you",
        "people you may know",
        "recommendation for you",
        "empfehlung für dich",
        "discover new people",
        "follow suggestions",
        "follow-vorschläge",
        "follow vorschläge",
        "neue personen zu entdecken",
        "sieh dir an",
        "in deinem feed"

    ]
    for kw in social_filter_keywords:
        if kw in subject_lower or kw in body_lower:
            return True, f"Filter: Social-media suggestions/recommendation keyword detected ('{kw}')"

    # 4. Standard Platform Newsletters & Follow proposals
    platform_newsletter_keywords = [
        "newsletter",
        "follow proposals",
        "weekly update",
        "monthly update",
        "monthly digest",
        "weekly digest",
        "weekly recommendations",
        "empfehlungen für dich",
        "plattform-newsletter"
    ]
    for kw in platform_newsletter_keywords:
        if kw in subject_lower:
            return True, f"Filter: Newsletter keyword in subject ('{kw}')"

    # Check if sender contains platform newsletter or updates (like news@, newsletter@, digest@, info@ with matching subject)
    if "newsletter@" in sender_lower or "news@" in sender_lower or "digest@" in sender_lower:
        return True, "Filter: Newsletter/Digest sender email address"
        
    return False, "Keep: Does not match any filtering criteria"

def process_emails():
    # Validate server configuration
    if not all([IMAP_SERVER, IMAP_EMAIL, IMAP_PASSWORD]):
        print("Error: IMAP Server, Email, or Password is not set. Please check your .env configuration.")
        sys.exit(1)

    print(f"Connecting to IMAP server: {IMAP_SERVER}:{IMAP_PORT}...")
    try:
        mail = imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT)
    except Exception as e:
        print(f"Error connecting to IMAP server: {e}")
        sys.exit(1)

    print("Logging in...")
    try:
        mail.login(IMAP_EMAIL, IMAP_PASSWORD)
    except Exception as e:
        print(f"Login failed: {e}")
        sys.exit(1)

    print(f"Selecting folder: {IMAP_FOLDER}...")
    status, data = mail.select(IMAP_FOLDER)
    if status != 'OK':
        print(f"Error selecting folder {IMAP_FOLDER}: {data}")
        mail.logout()
        sys.exit(1)

    # Search for all unread emails or recent emails
    print("Searching for messages...")
    # Using 'ALL' to search all emails in the selected folder.
    # To restrict only to unread emails, replace with 'UNSEEN'.
    status, response_data = mail.search(None, 'ALL')
    if status != 'OK':
        print(f"Error searching emails: {response_data}")
        mail.logout()
        sys.exit(1)

    email_ids = response_data[0].split()
    total_emails = len(email_ids)
    print(f"Found {total_emails} emails in {IMAP_FOLDER}.")

    if total_emails == 0:
        print("No emails to process.")
        mail.logout()
        return

    # Process the emails (newest first)
    email_ids.reverse()

    filtered_count = 0
    kept_count = 0

    print("\n--- Starting Analysis ---")
    if DRY_RUN:
        print("[DRY RUN MODE] No emails will be modified or deleted.")

    for i, email_id in enumerate(email_ids):
        # Fetch the email headers and body
        status, msg_data = mail.fetch(email_id, '(RFC822)')
        if status != 'OK':
            print(f"Failed to fetch email ID {email_id.decode()}: {msg_data}")
            continue

        raw_email = msg_data[0][1]
        msg = email.message_from_bytes(raw_email)

        # Parse Subject and From
        subject = decode_mime_words(msg.get("Subject"))
        sender = decode_mime_words(msg.get("From"))
        body = extract_body(msg)

        # Analyze email
        should_del, reason = should_filter(subject, sender, body)

        index_str = f"[{i+1}/{total_emails}]"
        print(f"\n{index_str} Sender: {sender}")
        print(f"{index_str} Subject: {subject}")

        if should_del:
            filtered_count += 1
            print(f"\033[91m--> ACTION: FILTER ({reason})\033[0m")
            if not DRY_RUN:
                if FILTER_ACTION == "TRASH":
                    print(f"    Moving to Trash folder: '{TRASH_FOLDER_NAME}'...")
                    # Try copying to Trash folder
                    copy_status, copy_detail = mail.copy(email_id, TRASH_FOLDER_NAME)
                    if copy_status == 'OK':
                        # Mark as deleted
                        mail.store(email_id, '+FLAGS', '\\Deleted')
                        print("    Moved to Trash successfully.")
                    else:
                        print(f"    \033[93mFailed to move to Trash: {copy_detail}. Falling back to mark for deletion.\033[0m")
                        mail.store(email_id, '+FLAGS', '\\Deleted')
                else:
                    print("    Marking as deleted...")
                    mail.store(email_id, '+FLAGS', '\\Deleted')
        else:
            kept_count += 1
            print(f"\033[92m--> ACTION: KEEP ({reason})\033[0m")

    # Expunge to permanently apply deletions if not dry run
    if not DRY_RUN and filtered_count > 0:
        print("\nExpunging deleted messages from IMAP server...")
        mail.expunge()

    print("\n--- Summary ---")
    print(f"Total processed: {total_emails}")
    print(f"Kept: {kept_count}")
    print(f"Filtered (deleted/archived): {filtered_count}")

    mail.logout()
    print("Logged out successfully.")

if __name__ == "__main__":
    process_emails()
