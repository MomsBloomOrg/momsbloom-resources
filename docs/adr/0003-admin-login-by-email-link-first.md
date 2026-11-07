# Admin login is an email link only

Status: accepted, 2026-11-06. Updated 2026-11-07: the email link is the final decision; Microsoft 365
SSO was dropped.

Three MomsBloom staff members edit the directory. All three have the same rights. Families never
log in.

The login is an email link (also called a "magic link"): a staff member types their email address,
the app emails them a **Login link** through [Resend](https://resend.com/docs), and the link logs
them in. There is no password to store or forget. Only email addresses on the allow-list
(`ADMIN_EMAILS`) can get a link.

We build the login with [Auth.js](https://authjs.dev) (the `next-auth` package), with database
sessions that last 7 days.

## Considered options

- **Microsoft 365 SSO.** The staff have Microsoft 365 accounts. SSO needs a MomsBloom Microsoft 365
  administrator to register the app in Microsoft Entra ID. We first planned it as a second button
  for later. On 2026-11-07 it was dropped: the email link is enough for three people, and a second
  login way adds a provider, an accounts table, and email matching to maintain.
- **Passwords.** We would have to store passwords safely, and build password reset, which is an
  email link anyway. More work and more risk for three users.
- **Google login** (what bikegr-calendar uses with its email link). The staff use Microsoft, not
  Google, so it does not help them.

## Consequences

- We need a Resend account and API key, and a sending address on a domain that Resend has verified
  (`no-reply@momsbloom.org`). Verifying the domain adds DNS records in Squarespace.
- The allow-list is the `ADMIN_EMAILS` environment variable, because this repo is public. Removing
  an address locks that person out on their next request (their sessions are deleted). On Vercel, a
  change needs a redeploy.
- Email links can be abused. The app limits link requests for an allowed address: **20 per hour per
  network (IP) and 10 per hour per email address**. A limited request gets the same answer as a sent
  link. Someone who knows a staff address can use up its 10 links for an hour; with no second login
  way, that staff member then waits for the next hour. The limit is high enough that a real person
  does not hit it, and low enough to stop a flood of emails.
- A stranger's request and a staff request take the same path and the same answer, and the email
  is sent after the response, so the response time does not show who is on the list.
- The Email link is the only login way, so a Resend outage stops logins until Resend is back.
