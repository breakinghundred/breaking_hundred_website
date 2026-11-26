/**
 * Step-by-step help for every admin page, written for someone using the dashboard
 * for the first time. Each page shows its help in a "How to use this page" popup
 * that opens when its button is clicked. Keep the wording plain: no codes, no jargon, and
 * say exactly what to click.
 */
import type { ReactNode } from "react";
import { HelpPopup } from "./HelpPopup";

export function PageHelp({ title = "How to use this page", children }: { title?: string; children: ReactNode }) {
  return (
    <div className="page-help">
      <HelpPopup title={title}>{children}</HelpPopup>
    </div>
  );
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="page-help-part">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

const Copy = () => (
  <>
    To copy, press <kbd>Ctrl</kbd> + <kbd>C</kbd> on Windows or <kbd>⌘ Cmd</kbd> + <kbd>C</kbd> on a Mac. To paste, press{" "}
    <kbd>Ctrl</kbd> + <kbd>V</kbd> or <kbd>⌘ Cmd</kbd> + <kbd>V</kbd>.
  </>
);

/* ---------------- Sign in and welcome ---------------- */

export function LoginHelp() {
  return (
    <PageHelp title="Trouble signing in?">
      <ol>
        <li>Type the email address the team added you with, exactly as it appears in your invitation email.</li>
        <li>Type your password. Passwords are case sensitive, so check Caps Lock is off.</li>
        <li>Press <b>Sign in</b>. You stay signed in on this device for 12 hours, then you are asked again.</li>
      </ol>
      <p><b>Forgotten your password?</b> There is no reset button here. Ask an admin to open <b>Team</b> and press <b>Send a new password link</b> next to your name. You will get an email with a link to choose a new password.</p>
      <p><b>Told to wait?</b> After 5 wrong tries in 15 minutes, sign-in is paused for that internet connection. Wait 15 minutes and try again.</p>
    </PageHelp>
  );
}

export function WelcomeHelp() {
  return (
    <PageHelp title="Choosing your password">
      <ol>
        <li>Think of a password at least 10 characters long. A short sentence you will remember works well, for example <i>purple kettle on a Tuesday</i>.</li>
        <li>Type it into both boxes. They must match exactly.</li>
        <li>Press <b>Save password and sign in</b>. You are signed in straight away.</li>
        <li>Next time, go to the website, scroll to the very bottom and click <b>Admin</b>, or go straight to <code>/admin/login</code>, then sign in with your email and this password.</li>
      </ol>
      <p>This link works once and lasts 7 days. If it has expired, ask an admin to send a new one from the Team page.</p>
    </PageHelp>
  );
}

/* ---------------- Dashboard ---------------- */

export function DashboardHelp({ isAdmin }: { isAdmin: boolean }) {
  return (
    <PageHelp>
      <Part title="What this page is for">
        <p>This is the home page of the admin area. It shows everyone who has registered interest in The Circle, what stage each person has reached, and anything the team needs to do by hand. You can get back here from any admin page with <b>← Back to the dashboard</b>.</p>
      </Part>

      <Part title="The four boxes at the top">
        <ul>
          <li><b>People in total</b>: everyone who has registered, paid or not. Click it to see everyone.</li>
          <li><b>Interested, not paid yet</b>: people who registered but haven&apos;t paid.</li>
          <li><b>Paying members</b>: people whose payment has been received.</li>
          <li><b>Things need you</b>: the number of jobs in <i>Needs your attention</i> below. Click it to jump there.</li>
        </ul>
      </Part>

      {isAdmin && (
        <Part title="Sending payment links (only on the day payments open)">
          <ol>
            <li>Before you start, open <b>Settings</b> and check every box at the top is green. If <b>Payments</b> is red, members can&apos;t pay yet and the button won&apos;t work.</li>
            <li>Come back to this page and find the box that says <i>people are waiting for a payment link</i>.</li>
            <li>Press <b>Send payment links</b>. A box pops up saying how many people will be emailed.</li>
            <li>Press the button in that box to confirm. Each person gets their own personal link to pay. Nobody can use someone else&apos;s link.</li>
            <li>People who register after this are not emailed automatically. Press <b>Send payment links</b> again whenever you want to include them. Anyone already sent a link is never sent a second one this way.</li>
          </ol>
        </Part>
      )}

      <Part title="Reminding people who haven't paid">
        <ol>
          <li>You usually don&apos;t need to do anything: the site emails a reminder 3 days and 7 days after the payment link.</li>
          <li>To remind everyone who hasn&apos;t paid at once, press <b>Resend payment links</b> and confirm. Pressing it twice on the same day only reaches people not already emailed that day.</li>
          <li>To remind one person, find their name under <b>Members</b> and click <b>Resend payment link</b> under their payment details. That email always goes, even if they were emailed earlier.</li>
        </ol>
      </Part>

      <Part title="Ticking that someone has joined the platform">
        <p>While the site can&apos;t see Mighty Networks by itself, tell it when a paid member has joined:</p>
        <ol>
          <li>On Mighty Networks, check the person is in <b>Start Here</b>.</li>
          <li>Under <b>Members</b>, find their name. Under their stage, click <b>Tick: joined the platform</b> (or open their details page and press <b>✓ She has joined the platform</b> in the <b>Journey</b> box).</li>
          <li>Read the pop-up and press <b>Yes, she has joined</b>. This also stops the &ldquo;please join&rdquo; reminder emails.</li>
          <li>They now appear in <b>Needs your attention</b> as &ldquo;Add [name] to the private spaces&rdquo;. Follow the steps below.</li>
          <li>Once they are in all five spaces, click <b>Tick: joined spaces</b> under their stage (or <b>Spaces added</b> in Needs your attention; both do the same). Confirm with <b>Yes, all five</b>. Their welcome email goes out straight away.</li>
        </ol>
      </Part>

      <Part title="“Needs your attention”: jobs to do by hand">
        <p><b>“Add [name] to the private spaces”</b> means they have paid and created their Mighty Networks account, but still need to be put into the private areas:</p>
        <ol>
          <li>Open Mighty Networks in a new browser tab and sign in as a host.</li>
          <li>Open each of the five private spaces in turn: <b>Academy</b>, <b>Library</b>, <b>Community</b>, <b>Monthly Live</b> and <b>Partner Directory</b>.</li>
          <li>In each space, open its members list, choose to add or invite a member, type the email address shown in the job, and confirm. Menu names on Mighty Networks can change; look for <i>Members</i> in the space&apos;s settings.</li>
          <li>When the person is in <b>all five</b>, come back here and press <b>Spaces added</b>, then confirm. Their welcome email goes out immediately.</li>
          <li>If you see <b>Try automatically again</b>, the site tried to add them itself and failed. You can press it once to retry before doing it by hand.</li>
        </ol>
        <p><b>“Get in touch with [name]”</b> means the automatic reminders have stopped (for example, they still haven&apos;t paid after every reminder). Their email and phone number are shown. Contact them personally, write what happened in their notes (click their name), then press <b>Done</b>.</p>
        <p><b>Other jobs</b>, for example a payment from someone we don&apos;t recognise, describe what happened and when. Deal with it, then press <b>Done</b> to clear it. If you are not sure what to do, leave it and ask an admin.</p>
      </Part>

      <Part title="Finding someone">
        <ol>
          <li>Under <b>Members</b>, click one of the rounded buttons to show only people at that stage, for example <b>Payment link sent</b>. The number on each button is how many people are at that stage. Click <b>Everyone</b> to show all again.</li>
          <li>Or type part of their name, email address or phone number into the search box and press <b>Search</b>. Press <b>Clear</b> to go back.</li>
          <li>Click a person&apos;s name (or <b>View details</b> on a phone) to open their full page with payments, emails sent and notes.</li>
        </ol>
      </Part>

      <Part title="What the stages mean">
        <ul>
          <li><b>Interested</b>: registered, waiting for a payment link.</li>
          <li><b>Payment link sent</b>: has a link, hasn&apos;t paid.</li>
          <li><b>Paid</b>: payment received; the invitation to Mighty Networks is on its way.</li>
          <li><b>Invited to platform</b>: has been invited to Mighty Networks but hasn&apos;t created an account yet.</li>
          <li><b>Needs spaces</b>: has an account; add them to the private spaces (see above).</li>
          <li><b>Active member</b>: fully set up.</li>
          <li><b>Academy complete</b>: finished every Academy masterclass.</li>
          <li><b>Membership ended</b>: cancelled or didn&apos;t renew.</li>
        </ul>
      </Part>

      {!isAdmin && (
        <Part title="What you can't do with a Team account">
          <p>Changing payments, settings, email wording and who has access needs an Admin account. If something needs one of those, ask an admin.</p>
        </Part>
      )}
    </PageHelp>
  );
}

/* ---------------- Member details ---------------- */

export function MemberHelp({ isAdmin }: { isAdmin: boolean }) {
  return (
    <PageHelp>
      <Part title="What this page shows">
        <p>Everything about one person: what they filled in when registering, their payment, each step they have reached (with dates), every email the site has sent them, and private team notes.</p>
      </Part>
      <Part title="Sending their payment link again">
        <ol>
          <li>In the <b>Payment</b> box, press <b>Resend payment link</b>.</li>
          <li>Check the email address in the pop-up is right, then press <b>Send link</b>.</li>
        </ol>
        <p>The button only appears while they haven&apos;t paid.</p>
      </Part>
      {isAdmin && (
        <Part title="Recording a payment made another way (for example, a bank transfer)">
          <ol>
            <li>First check the money has actually arrived in the bank account.</li>
            <li>In the <b>Payment</b> box, click <b>Change payment status</b> to open it.</li>
            <li>Choose <b>Paid (record a payment made outside the website)</b> from the list.</li>
            <li>Fill in <b>every</b> box: check the <b>Amount paid</b> (it starts at the current membership price) and type the <b>Payment reference</b> (for example the bank transfer reference). Neither can be left empty.</li>
            <li>Type <b>Your full name</b>, then sign in the white <b>Your signature</b> box with your mouse or finger. Press <b>Clear</b> to start the signature again.</li>
            <li>Press the button, read the pop-up, which says which email they will get, and confirm.</li>
          </ol>
          <p>Your name, email address and signature are saved with the payment and shown in the <b>Payment</b> box, so everyone can see who recorded it and when.</p>
          <p><b>Every status change emails them</b>, so only do it when you mean it. These changes only update our records: they never take, refund or cancel money in Stripe. To refund or cancel a card payment, do it in Stripe as well (use <b>View her membership in Stripe ↗</b> in the Payment box).</p>
        </Part>
      )}
      <Part title="Writing them an email">
        <ol>
          <li>In <b>Emails sent to her</b>, press <b>Write an email to her</b>. A new draft opens with them already chosen as the recipient.</li>
          <li>Write it and send it (the draft page explains each step).</li>
        </ol>
      </Part>
      <Part title="Notes and follow-ups">
        <ol>
          <li>Type anything worth remembering in <b>Team notes</b>, for example <i>Called 12 Nov, paying by transfer on the 30th</i>. Only the team can see notes.</li>
          <li>Press <b>Save notes</b>. Whatever is in the box replaces what was there before, so add to the existing text rather than deleting it.</li>
          <li>If they are marked as needing a follow-up, contact them, then press <b>Mark as done</b>.</li>
        </ol>
      </Part>
      <Part title="Ticking that they have joined the platform">
        <ol>
          <li>Check on Mighty Networks that they are in <b>Start Here</b>.</li>
          <li>In the <b>Journey</b> box, press <b>✓ She has joined the platform</b>, then <b>Yes, she has joined</b>.</li>
          <li>Add them to the five private spaces on Mighty Networks.</li>
          <li>Back in the <b>Journey</b> box, press <b>✓ She has joined the private spaces</b>, then <b>Yes, all five</b>. That sends their welcome email.</li>
        </ol>
        <p>Each button only shows at its step: the first for people who have paid but aren&apos;t marked as joined, the second once they are marked as joined.</p>
      </Part>
      {isAdmin && (
        <Part title="Moving them to a different stage by hand">
          <ol>
            <li>In the <b>Journey</b> box, click <b>Change stage</b> to open it.</li>
            <li>Choose the stage they should be at. You can move them forwards or backwards.</li>
            <li>Type a short reason, for example <i>Added to the wrong stage by mistake</i>.</li>
            <li>Press <b>Change stage</b>, read the pop-up and confirm.</li>
          </ol>
          <p>This <b>sends no email</b> and changes nothing in Stripe or on Mighty Networks. It only changes the stage shown here and which automatic reminders apply to them from now on. Each change is listed under <b>Stage changed by hand</b> with who made it, when and why.</p>
          <p>To record a payment or end a membership, use <b>Change payment status</b> in the Payment box instead, because that also sends the right emails and removes access.</p>
        </Part>
      )}
      <Part title="They joined Mighty Networks with a different email">
        <ol>
          <li>Ask them which email address they used on Mighty Networks.</li>
          <li>Type it into the box under <b>Joined the platform with a different email?</b> and press <b>Link</b>.</li>
          <li>The site can now match their Mighty Networks account to their payment.</li>
        </ol>
      </Part>
      <Part title="Giving back">
        <p>If they have offered to contribute (for example, as a mentor), it shows here. When you have paired them with someone, press <b>Mark mentor matched</b>. Press it again to undo.</p>
      </Part>
      {isAdmin && (
        <Part title="Deleting someone">
          <ol>
            <li>Scroll to the <b>Delete this person</b> box at the bottom and click <b>Delete this person</b> to open it.</li>
            <li>Type their email address exactly as it is shown above the box. The button stays greyed out until it matches.</li>
            <li>Press <b>Delete this person</b>, read the pop-up, then press <b>Delete for good</b>.</li>
            <li>You go back to the dashboard, which says they have been deleted.</li>
          </ol>
          <p><b>This cannot be undone.</b> Their registration, payment details, notes and email history are removed, and any emails still waiting to go out to them are stopped. Payments recorded by hand and stage changes stay in the records.</p>
          <p>If they still have a card membership running in Stripe, deleting them cancels it in Stripe straight away, so they are not charged again. Nothing is refunded: do that in Stripe if needed. Deleting changes nothing on Mighty Networks, so remove them there yourself if they had joined.</p>
        </Part>
      )}
    </PageHelp>
  );
}

/* ---------------- Settings ---------------- */

export function SettingsHelp() {
  return (
    <PageHelp>
      <Part title="How this page works">
        <ol>
          <li>The four boxes at the top give a quick health check. Green is fine. Amber needs filling in. Red is broken. Click a box to jump to its section.</li>
          <li>Change a box, then press that section&apos;s <b>Save</b> button. Each section saves on its own. Changed boxes are highlighted until you save.</li>
          <li>Pressed by mistake? <b>Undo changes</b> puts everything in that section back as it was.</li>
          <li>Under each box, <i>Used in</i> lists the emails that use it, so you can see what your change affects.</li>
        </ol>
      </Part>

      <Part title="Payments (checked here, changed in Vercel)">
        <p>Payments go through Stripe. The Stripe keys are kept with the website&apos;s hosting (Vercel) for security, so they can&apos;t be changed on this page. If this section is red, it lists exactly what is wrong. To fix it:</p>
        <ol>
          <li>Sign in to <b>dashboard.stripe.com</b>. Use the <b>Test mode</b> switch at the top to choose test or live. Use <b>live</b> before real payment links go out.</li>
          <li>Go to <b>Developers → API keys</b> and copy the <b>Secret key</b> (it starts <code>sk_live_</code>). <Copy /></li>
          <li>Go to <b>Product catalogue</b>, open the membership product, and copy the yearly price&apos;s ID (it starts <code>price_</code>). The price must be in pounds and repeat every 12 months. The amount in Stripe doesn&apos;t matter: members pay the price set below.</li>
          <li>Go to <b>Developers → Webhooks</b>, open the endpoint ending <code>/api/stripe/webhook</code>, and copy its <b>Signing secret</b> (it starts <code>whsec_</code>).</li>
          <li>Sign in to <b>vercel.com</b>, open this project, then <b>Settings → Environment Variables</b>. Edit <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_PRICE_ID</code> and <code>STRIPE_WEBHOOK_SECRET</code>, pasting the three values, and save.</li>
          <li>Go to <b>Deployments</b>, click <b>⋯</b> next to the newest one, and press <b>Redeploy</b>. New keys only take effect after this.</li>
          <li>When it finishes (a minute or two), reload this page. The Payments box should be green.</li>
        </ol>
      </Part>

      <Part title="Membership price">
        <ol>
          <li>Type the price for 12 months in pounds, numbers only, for example <code>299</code> or <code>299.50</code>. Don&apos;t type the £ sign.</li>
          <li>Check the line underneath, <i>Members will see</i>, then press <b>Save change</b>.</li>
          <li>The new price shows straight away on the website, on payment pages, in emails and at checkout.</li>
        </ol>
        <p><b>To offer a discount:</b></p>
        <ol>
          <li>Leave the main price as it is and type the lower price in <b>Discounted price (£)</b>, for example <code>199</code>. It must be less than the main price.</li>
          <li>Check the <i>Members will see</i> line: the main price is shown crossed out, followed by the discounted price. Then press <b>Save change</b>.</li>
          <li>While the discount is on, the website shows the crossed-out main price, and new members pay the discounted price at checkout and when they renew. Emails quote the discounted price.</li>
          <li>To end the discount, empty the <b>Discounted price (£)</b> box and press <b>Save change</b>. New payments go back to the main price.</li>
        </ol>
        <p>People who have already paid keep the price they joined at, including at renewal. If an amber line lists emails with a price typed in by hand, open each one in <b>Emails → Automated emails</b>, delete the typed price, and click <code>{"{{membership_price}}"}</code> in the list on the right to put the live price in its place.</p>
      </Part>

      <Part title="Onboarding call">
        <ol>
          <li><b>Date and time</b>: click the box, pick the day from the calendar, then type the time. Use UK time. The line underneath shows exactly how members will see it.</li>
          <li><b>Joining link</b>: in Zoom, Teams or Google Meet, create the meeting, copy its invite link, and paste it here.</li>
          <li><b>Add-to-calendar link</b> (optional): a link that adds the call to someone&apos;s calendar, if your meeting tool gives you one.</li>
          <li>Press <b>Save</b>. Reminder emails go out automatically 7 days and 24 hours before the call.</li>
          <li><b>After the call</b>: upload the recording (for example to Zoom cloud or YouTube as <i>unlisted</i>), copy its link, paste it into <b>Recording link</b> and save. From then on emails share the recording instead of the joining link.</li>
        </ol>
        <p>Don&apos;t know the date yet? Leave it empty. Emails will say it is &ldquo;to be confirmed shortly&rdquo;.</p>
      </Part>

      <Part title="Platform links (Mighty Networks)">
        <p>These are the addresses emails send members to. Fill in all of them before payment links go out. For each space:</p>
        <ol>
          <li>On a computer, open Mighty Networks in a web browser (not the phone app) and sign in as a host.</li>
          <li>Click the space in the menu on the left, for example <b>Academy</b>.</li>
          <li>Click once in the address bar at the very top of the browser so the whole address is highlighted, and copy it. <Copy /></li>
          <li>Come back to this page, click in the matching box and paste.</li>
          <li>Repeat for the other spaces, then press <b>Save</b> at the bottom of the section.</li>
          <li>Click <b>Test link ↗</b> next to each box to check it opens the right place.</li>
        </ol>
        <p><b>Your network&apos;s web address</b> is the address of your network&apos;s home page, for example <code>https://yourname.mn.co</code>. <b>Invite link</b>: in Mighty Networks, use the <b>Invite</b> option and copy the shareable invite link.</p>
      </Part>

      <Part title="Add people from a file">
        <ol>
          <li>Open your list in Excel or Google Sheets.</li>
          <li>Make sure row 1 has headings: <b>First name</b>, <b>Last name</b> and <b>Email</b>. (One <b>Name</b> column instead of first and last is fine.) Other columns are ignored.</li>
          <li>Save it as a file. In Excel: <b>File → Save As</b>, choose <b>Excel Workbook (.xlsx)</b> or <b>CSV</b>. In Google Sheets: <b>File → Download → Microsoft Excel (.xlsx)</b> or <b>Comma-separated values (.csv)</b>.</li>
          <li>Click the dashed box on this page and pick the file. Its name appears in the box.</li>
          <li>Press <b>Add to the list</b>. A message says how many were added, how many were already on the list, and how many rows were skipped because they had no valid email.</li>
        </ol>
        <p>Nobody is emailed when you do this. They get their payment link when <b>Send payment links</b> is pressed on the dashboard.</p>
      </Part>

      <Part title="Automatic emails and connections">
        <p>Every morning the site sends any reminders that are due. You don&apos;t need to do anything. If you have just changed something (for example, the call date) and want reminders to go now rather than tomorrow, press <b>Run the check now</b>. It is safe to press more than once: nobody gets the same email twice.</p>
      </Part>
    </PageHelp>
  );
}

/* ---------------- Team ---------------- */

export function TeamHelp() {
  return (
    <PageHelp>
      <Part title="Adding someone">
        <ol>
          <li>Under <b>Add someone</b>, type their full name and their email address.</li>
          <li>Choose a role. <b>Team</b> can see members and do day-to-day jobs. <b>Admin</b> can also change payments, settings, email wording and who has access. If unsure, choose Team: you can change it later.</li>
          <li>Press <b>Add and email them</b>. They get an email with a link to choose their password. The link works once and lasts 7 days.</li>
          <li>Tell them to look in their spam folder if it hasn&apos;t arrived within a few minutes.</li>
        </ol>
      </Part>
      <Part title="Changing someone's access">
        <ul>
          <li><b>Make Admin</b> / <b>Change to Team</b>: switches their role. It takes effect immediately.</li>
          <li><b>Resend invite</b>: for people who haven&apos;t set a password yet, for example because the first link expired.</li>
          <li><b>Send a new password link</b>: for people who have forgotten their password. Their old password stops working once they choose a new one.</li>
          <li><b>Remove access</b>: signs them out immediately and stops them signing in. Use this when someone leaves.</li>
          <li><b>Restore access</b>: lets a removed person sign in again with their old password.</li>
        </ul>
        <p>You can&apos;t change your own access: another admin has to. The main admin account (set up with the website) is always on and can&apos;t be removed.</p>
      </Part>
    </PageHelp>
  );
}

/* ---------------- Emails ---------------- */

export function AutomatedEmailsHelp() {
  return (
    <PageHelp>
      <Part title="What automated emails are">
        <p>These emails send themselves at the right moment, for example when someone registers, pays or joins Mighty Networks. The list shows each email and when it goes out. You only need to change them if you want different wording.</p>
      </Part>
      <Part title="Checking what members receive">
        <ol>
          <li>In <b>Send test emails</b>, type the address to send to (it starts as yours).</li>
          <li>In <b>What to send</b>, choose a quick check, one particular email, or every email.</li>
          <li>Press <b>Send test</b> and check that inbox. Tests have <b>[Test]</b> in the subject, use a pretend member (Ada Okafor), and are not sent to any real member.</li>
        </ol>
      </Part>
      <Part title="Turning an email off">
        <ol>
          <li>In the list, the <b>Sending</b> column shows <b>On</b> or <b>Off</b> for each email.</li>
          <li>Click <b>Turn off</b> next to the email, read the pop-up and press <b>Turn off</b>. The site stops sending that email to anyone: reminders, welcome emails, and the emails that go out when you change a payment status.</li>
          <li>To start it again, click <b>Turn on</b>. Emails that were skipped while it was off are <b>not</b> sent afterwards.</li>
        </ol>
        <p>Turning an email off doesn&apos;t stop you sending it to one person on purpose: <b>Contacts</b> and <b>Resend payment link</b> for one person still send it. Test emails also still work.</p>
      </Part>
      <Part title="Changing the wording of an email">
        <ol>
          <li>Click the email&apos;s name in the list. Its editor opens.</li>
          <li>Change the subject or the text. The preview on the right updates as you type.</li>
          <li>Press <b>Save changes</b>. The next time the email is sent, it uses your wording. Emails already sent don&apos;t change.</li>
          <li>In the list, emails you have changed say <b>Edited</b> with the date. The others say <b>Original</b>. You can always go back with <b>Reset to original</b> in the editor.</li>
        </ol>
      </Part>
    </PageHelp>
  );
}

const FormatTips = () => (
  <>
    <ul>
      <li>Leave an empty line between paragraphs. Pressing Enter once keeps a simple line break (useful for &ldquo;Kind regards,&rdquo; then a name).</li>
      <li>Start a line with a dash and a space (<code>- </code>) for a bullet point, or <code>1. </code> for a numbered list.</li>
      <li>Put two hash signs and a space at the start of a line (<code>## </code>) for a small heading. Put two stars on each side of words (<code>**like this**</code>) for bold.</li>
      <li>Paste web addresses as they are: they become clickable automatically.</li>
    </ul>
  </>
);

export function EmailEditorHelp() {
  return (
    <PageHelp title="How to edit this email">
      <Part title="Step by step">
        <ol>
          <li>Change the <b>Subject</b> (the line people see in their inbox) and the main text in <b>Email</b>.</li>
          <li>Words in double curly brackets, like <code>{"{{first_name}}"}</code>, are <b>merge fields</b>: each member sees their own details there. Don&apos;t change the spelling inside the brackets. To add one, click where you want it in the text, then click the field in the <b>Merge fields</b> list on the right.</li>
          <li>Check the <b>Preview</b> on the right. It uses a pretend member so you can see the finished email.</li>
          <li>To see it in a real inbox, type your email next to <b>Send test</b> and press it. This works before saving.</li>
          <li>To change how the email looks rather than what it says, pick a design under the text.</li>
          <li>To send a file with every copy of this email (for example a welcome pack PDF), press <b>Attach a file</b> under <b>Attached files</b>. Each file can be up to 4 MB, and up to 10 MB all together. Files are kept straight away, without pressing Save, and go out with the next email sent. <b>Remove</b> takes a file off. Emails sent on a delay can&apos;t carry files, so the page says so instead; put a link to the file in the text.</li>
          <li>Press <b>Save changes</b>. If anything is wrong (an empty subject, a misspelt merge field), a red message explains it and saving waits until it&apos;s fixed. The button says <b>Saved</b> when there is nothing new to save.</li>
          <li><b>Reset to original</b> brings back the built-in wording. Your changes are lost, so the site asks first.</li>
        </ol>
      </Part>
      <Part title="Formatting">
        <FormatTips />
      </Part>
    </PageHelp>
  );
}

export function DraftsHelp() {
  return (
    <PageHelp>
      <ol>
        <li>Press <b>Write a new email</b>. A blank draft opens.</li>
        <li>Choose who it goes to, write it, and send it. The draft page explains each step.</li>
        <li>Drafts are saved here so you can come back to them. Click a draft&apos;s subject to open it again.</li>
        <li>Each draft shows whether it has been sent and to how many people.</li>
      </ol>
      <p>To email just one person, it can be quicker to use <b>Manual mails</b>, find them, and choose <b>Write a new email to her</b>.</p>
    </PageHelp>
  );
}

export function DraftEditorHelp() {
  return (
    <PageHelp title="How to write and send this email">
      <Part title="1. Choose who it goes to">
        <ol>
          <li>To send to a whole group, choose it in the first list, for example <b>Everyone registered</b> or <b>Payment link sent</b>. The number in brackets is how many people are in it.</li>
          <li>To add particular people, type part of a name or email in <b>Add people one by one</b> and click them in the list that appears. They show as tags. Click × on a tag to remove someone.</li>
          <li>You can use a group and individual people together. Nobody gets the email twice.</li>
          <li>The line underneath tells you how many people it will go to.</li>
        </ol>
      </Part>
      <Part title="2. Write it">
        <ol>
          <li>Type a <b>Subject</b> and the email text.</li>
          <li>To greet everyone by name, click where you want the name, then click <code>{"{{first_name}}"}</code> in the <b>Merge fields</b> list on the right.</li>
          <li>Tick the logos you want at the top, and pick a design if you want something other than the house look.</li>
          <li>To send a file with it (a PDF, a Word document, a picture), press <b>Attach a file</b> under <b>Attached files</b> and choose it. You can pick several at once. Each file can be up to 4 MB, and up to 10 MB all together. Files are kept as soon as you add them, without pressing Save. Click a file&apos;s name to check it, or <b>Remove</b> to take it off.</li>
          <li>Press <b>Save draft</b> to keep it and come back later.</li>
        </ol>
        <FormatTips />
      </Part>
      <Part title="3. Check, then send">
        <ol>
          <li>Type your own email next to <b>Send test</b> and press it. Check the email in your inbox, on your phone too if you can. The test carries the attached files too, so you can open them.</li>
          <li>Press <b>Send to …</b> (the button shows how many people). A pop-up asks you to check. Press the button in the pop-up to confirm.</li>
          <li>Sent emails can&apos;t be recalled, so check the recipients carefully.</li>
        </ol>
        <p><b>Delete draft</b> removes the draft. Emails already sent are not affected.</p>
      </Part>
    </PageHelp>
  );
}

export function ManualMailsHelp() {
  return (
    <PageHelp>
      <Part title="What this page is for">
        <p>Everyone who registers appears here automatically. Use it to send one particular person an email, for example if they say they didn&apos;t receive something.</p>
      </Part>
      <Part title="Sending one person an email">
        <ol>
          <li>Find them: type part of their name or email in the search box and press <b>Search</b>. You can also choose a stage from the list to narrow it down.</li>
          <li>On their card, open <b>Choose an email…</b> and pick one: one of your own saved emails, or one of the automated emails.</li>
          <li>Press <b>Send</b>, check the address in the pop-up, and confirm. It is filled in with their own details.</li>
          <li>To write something new just for them, press <b>Write a new email to her</b>. A draft opens with them already added.</li>
        </ol>
        <p>Each card shows the last email they were sent and when, so you can check before sending again.</p>
      </Part>
    </PageHelp>
  );
}

export function DesignsHelp() {
  return (
    <PageHelp>
      <ol>
        <li>Each card shows the same email in a different design. The wording never changes, only the look.</li>
        <li>Use <b>Preview with</b> at the top to try the designs on a different email.</li>
        <li>Press <b>Use for automated emails</b> on the design you like. All automated emails switch to it straight away. This is the <b>house design</b>.</li>
        <li>To give one automated email a different look, open it in <b>Automated emails</b> and choose a design under its text.</li>
        <li>Your own emails choose their design in the draft editor. If you don&apos;t choose one, they use the house design.</li>
      </ol>
      <p>Send yourself a test from <b>Automated emails</b> to see the design in a real inbox.</p>
    </PageHelp>
  );
}

export function LogosHelp() {
  return (
    <PageHelp>
      <Part title="Adding a logo">
        <ol>
          <li>Get the logo as a <b>PNG</b> (best, ideally with a transparent background), <b>JPG</b> or <b>GIF</b> file, no bigger than 2 MB. SVG files can&apos;t be used because many email apps don&apos;t show them.</li>
          <li>Under <b>Add a logo</b>, click <b>Image</b> and pick the file.</li>
          <li>Type a <b>Name</b>, for example <i>Breaking Hundred</i>. People who use screen readers hear this name.</li>
          <li>Set the <b>Width</b> in pixels (between 40 and 560). 160 suits most logos. The image is resized to fit.</li>
          <li>Leave <b>Show on the automated emails</b> ticked to put it at the top of every automated email, or untick it to keep it just for your own emails.</li>
          <li>Press <b>Upload logo</b>. The preview at the top shows how the automated emails will start.</li>
        </ol>
      </Part>
      <Part title="Changing or removing a logo">
        <ul>
          <li>Change a logo&apos;s name, width or tick box on its card, then press <b>Save</b>.</li>
          <li><b>Move left</b> / <b>Move right</b> changes the order when there is more than one.</li>
          <li><b>Remove</b> takes it off future emails. Emails already sent still show it.</li>
        </ul>
        <p>With no logos ticked, automated emails start with the words <i>Breaking Hundred · The Circle</i> instead.</p>
      </Part>
    </PageHelp>
  );
}
