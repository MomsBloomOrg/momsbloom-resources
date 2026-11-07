# Admin login is an email link first; Microsoft 365 later if we can

Status: accepted, 2026-11-06.

Three MomsBloom staff members edit the directory. All three have the same rights. Families never
log in. The staff have Microsoft 365 email accounts and would like single sign-on (SSO: log in with
the Microsoft account they already use), but that needs a MomsBloom Microsoft 365 administrator to
register our app with Microsoft, and we may not get that done this weekend.

So the first login is an email link (also called a "magic link"): a staff member types their email
address, the app emails them a link through [Resend](https://resend.com/docs), and the link logs
them in. There is no password to store or forget. Only email addresses on an allow-list (the three
staff members) can get a link.

We build the login with [Auth.js](https://authjs.dev) (the `next-auth` package). Auth.js supports
both the email link and Microsoft (its "Microsoft Entra ID" provider), so we can add Microsoft
later as a second button on the same login page. Auth.js does not treat the two as the same person
by itself. We will match them by email address, as bikegr-calendar does for its Google login
(`src/auth/google.ts`): only an email address that Microsoft has verified counts.

## Considered options

- **Microsoft 365 SSO from the start.** The best experience for staff, and no emails to wait for.
  It depends on a MomsBloom administrator and an app registration in Microsoft Entra ID, which
  could block the admin work. We add it when that is ready.
- **Passwords.** We would have to store passwords safely, and build password reset, which is an
  email link anyway. More work and more risk for three users.
- **Google login** (what bikegr-calendar uses with its email link). The staff use Microsoft, not
  Google, so it does not help them.

## Consequences

- We need a Resend account and API key, and a sending address on a domain that Resend has verified
  (for example `notifications@momsbloom.org`). Verifying the domain adds DNS records in Squarespace.
- The allow-list of staff emails is kept outside the code (an environment variable or a database
  table), because this repo is public. The schema work decides which.
- Email links can be abused (someone could request many links). bikegr-calendar limits how often
  one address or one network can ask for a link; we should copy that.
- When Microsoft is ready: register the app in Entra ID, add the provider in Auth.js, and add its
  ID and secret to Vercel. The email link can stay as a backup.
