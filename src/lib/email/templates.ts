/**
 * The Circle email catalogue (C01–C18), copied from the member flow spec.
 * Each template returns a subject and a list of blocks, rendered to both
 * HTML and plain text by ./render.ts.
 */

export type Block =
  | string
  | { list: string[] }
  | { ordered: string[] }
  | { strong: string }
  | { facts: [string, string][] }
  | { heading: string }
  | { signoff: string };

export type Vars = Record<string, string>;
export type Template = (v: Vars) => { subject: string; blocks: Block[] };

const funmi = { signoff: "Kind regards,\nFunmi" };
const kindTeam = { signoff: "Kind regards,\nThe Breaking Hundred Team" };
const team = { signoff: "The Breaking Hundred Team" };

export const templates = {
  C01: (v) => ({
    subject: "Your place in The Circle",
    blocks: [
      `Dear ${v.first_name},`,
      "Thank you for registering your interest in joining The Circle, we are delighted to have you with us from the outset.",
      `You will receive your payment link and full details by 21 November. In December we will hold an onboarding call (${v.onboarding_call_date_or_tbc}), where we will take you through the platform, introduce you to the community and help you get set up so you can begin using everything straight away.`,
      "In the meantime, there is nothing you need to do. If you would like to be reminded of what The Circle offers, you can visit www.breakinghundred.org. If you have any questions, please reply to this email and we will come back to you.",
      "We look forward to welcoming you.",
      funmi,
    ],
  }),

  C02: (v) => ({
    subject: `Your Circle membership is now open, ${v.first_name}`,
    blocks: [
      `Dear ${v.first_name},`,
      "Membership of The Circle is now open, and your place is ready to confirm.",
      `Membership is £299 for 12 months. It renews automatically on ${v.renewal_date} and every 12 months after that, and you can cancel at any time before a renewal date and keep your access until then. To join, use your personal link below, which takes you to our website to pay securely by card through Stripe:`,
      v.payment_link,
      `Once your payment is confirmed you will receive a separate email within minutes with step by step instructions for joining the platform. Our onboarding call takes place in December (${v.onboarding_call_date_or_tbc}).`,
      "If you have any difficulty paying, reply to this email and we will help.",
      funmi,
    ],
  }),

  C03: (v) => ({
    subject: "Your place in The Circle is waiting",
    blocks: [
      `Dear ${v.first_name},`,
      "We have not yet received your membership payment, so your place in The Circle is not yet confirmed. Membership is £299 for 12 months.",
      `To complete your membership, use your personal link: ${v.payment_link}`,
      "If you have already paid, you do not need to do anything, your confirmation will arrive shortly. If you had a problem paying, reply to this email and we will help.",
      team,
    ],
  }),

  C04: (v) => ({
    subject: "Payment confirmed: welcome to The Circle",
    blocks: [
      `Dear ${v.first_name},`,
      "Your payment has been received and your place in The Circle is confirmed.",
      {
        facts: [
          ["Amount", `${v.amount} ${v.currency}`],
          ["Payment reference", v.payment_reference],
          ["Date", v.paid_at],
          ["Next renewal date", v.renewal_date],
        ],
      },
      "Your next step is to join our online platform, Mighty Networks. You will receive a separate email within the next few minutes with step by step instructions. Please keep this email as your record of payment.",
      `Your membership renews automatically on ${v.renewal_date} and every 12 months after that. You can cancel at any time before a renewal date and keep your access until then, or update your payment details, here: ${v.manage_billing_link}`,
      // TODO(before launch): refund wording to be checked by a solicitor / Trading Standards.
      "You also have 14 days from today to change your mind. If you cancel within that time we will refund your payment, less a proportionate amount for any access you have used. To cancel, use the link above or reply to this email.",
      kindTeam,
    ],
  }),

  C05: (v) => ({
    subject: "Action needed: join The Circle on Mighty Networks",
    blocks: [
      `Dear ${v.first_name},`,
      "The Circle lives on Mighty Networks. Follow these steps to set up your account, it takes about five minutes.",
      {
        strong: `Important: sign up with this email address: ${v.email}. We use it to give you access to your member spaces. A different email address will delay your access.`,
      },
      { heading: "Step 1: choose how you will access the platform" },
      {
        list: [
          `On your phone: download the Mighty Networks app from the App Store (${v.ios_app_link}) or Google Play (${v.android_app_link}).`,
          `On a laptop or desktop: open this link in your browser: ${v.network_url}`,
        ],
      },
      { heading: "Step 2: create your account" },
      {
        ordered: [
          `Open this invitation link: ${v.network_invite_link}`,
          `Select Sign up and enter ${v.email}.`,
          "Create a password and confirm your email address when prompted.",
          "Add your full name and a clear profile photo so other members can recognise you.",
        ],
      },
      { heading: "Step 3: join the Start Here space" },
      `Open ${v.start_here_space_url} and select Join. This is where you will find your welcome, how the platform works and how to introduce yourself.`,
      { heading: "What happens next" },
      "As soon as you join, you will be added automatically to the rest of your member spaces: Academy, Library, Community, Monthly Live and Partner Directory. We will email you when this is done. If you are using the app, sign in with the same details on every device.",
      team,
    ],
  }),

  C06: (v) => ({
    subject: "Reminder: you have not yet joined The Circle platform",
    blocks: [
      `Dear ${v.first_name},`,
      "Your place in The Circle is confirmed, but you have not yet joined Mighty Networks, so your member spaces cannot be opened until you do.",
      {
        ordered: [
          `Open ${v.network_invite_link} in your browser or the Mighty Networks app.`,
          `Sign up with ${v.email}.`,
          `Join the Start Here space: ${v.start_here_space_url}`,
        ],
      },
      "If you have already joined with a different email address, reply to this email with that address and we will link your account.",
      team,
    ],
  }),

  C07: (v) => ({
    subject: `Welcome to The Circle, ${v.first_name}`,
    blocks: [
      `Dear ${v.first_name},`,
      `You now have access to all of your Circle spaces: ${v.network_url}`,
      "Please do these three things first:",
      {
        ordered: [
          "Open Start Here, watch the welcome from Funmi and complete your leadership self-assessment.",
          "Introduce yourself in Community: your name, your role and what you hope to get from The Circle.",
          ...(v.onboarding_call_line ? [v.onboarding_call_line] : []),
        ],
      },
      "Tomorrow we will send you a short guide to finding your way around.",
      funmi,
    ],
  }),

  C08: (v) => ({
    subject: "How to find your way around The Circle",
    blocks: [
      `Dear ${v.first_name},`,
      `Here is a quick guide to your member spaces: ${v.network_url}`,
      {
        list: [
          "Start Here: your welcome, how the platform works and your leadership self-assessment.",
          "Academy: nine recorded masterclasses to work through at your own pace. Your progress is saved automatically.",
          "Library: templates, toolkits and worksheets, including the Five Fs and the BET Framework.",
          "Community: share wins, ask questions, find opportunities and meet other members.",
          "Monthly Live: our live sessions each month. RSVP to receive the joining link and a reminder, and find replays here if you miss one.",
          "Partner Directory: trusted independent support for your next move, such as CV, interview coaching and executive branding.",
        ],
      },
      "You do not need to do everything at once. A good start is Start Here, one Academy masterclass and your first Monthly Live session.",
      "If you get stuck, post a question in Community or reply to this email.",
      team,
    ],
  }),

  C09: (v) => ({
    subject: `Your Circle onboarding call: ${v.onboarding_call_date}`,
    blocks: [
      `Dear ${v.first_name},`,
      `This is a reminder that your onboarding call takes place on ${v.onboarding_call_date} at ${v.onboarding_call_time} (${v.timezone}). We will take you through the platform, introduce you to the community and help you get set up.`,
      `Join here: ${v.onboarding_call_link}`,
      ...(v.calendar_link ? [`Add it to your calendar: ${v.calendar_link}`] : []),
      "If you cannot make it, we will share the recording in Start Here.",
      team,
    ],
  }),

  C10: (v) => ({
    subject: `Ready to start, ${v.first_name}?`,
    blocks: [
      `Dear ${v.first_name},`,
      `You joined The Circle a few days ago, and we would love to see you in the community. A good first step is to introduce yourself in Community, because a short introduction is the quickest way for other members to find you. Then start your first masterclass in the Academy: ${v.academy_space_url}`,
      "If something is getting in the way, reply to this email and tell us.",
      team,
    ],
  }),

  C11: (v) => ({
    subject: `You are ${v.milestone_label} of the way through the Academy`,
    blocks: [
      `Dear ${v.first_name},`,
      `Congratulations, you have completed ${v.masterclasses_done} of the 9 masterclasses in the Academy.`,
      `Your next masterclass is waiting: ${v.academy_space_url}`,
      "Why not share what you took from it in Community? Other members will want to hear.",
      team,
    ],
  }),

  C12: (v) => ({
    subject: "You have completed all nine Academy masterclasses",
    blocks: [
      `Dear ${v.first_name},`,
      "Congratulations, you have completed all nine masterclasses in the Academy.",
      "Here are three ways to keep going:",
      {
        list: [
          "Put it to work: share a win or an update in Community.",
          `Join the next Monthly Live session: ${v.monthly_live_url}`,
          `Think about giving back: you could mentor another member, welcome new members or help shape new content. Tell us where you would like to contribute: ${v.contributor_form_link}`,
        ],
      },
      funmi,
    ],
  }),

  C13: (v) => ({
    subject: "Pick up where you left off",
    blocks: [
      `Dear ${v.first_name},`,
      `You are ${v.academy_progress_pct}% of the way through the Academy. We have not seen any progress for a few weeks, so this is a gentle reminder that your masterclasses are waiting: ${v.academy_space_url}`,
      `If you would like a different way back in, the Monthly Live calendar is a good place to start: ${v.monthly_live_url}`,
      "If something is getting in the way, reply to this email and tell us.",
      team,
    ],
  }),

  C14: (v) => ({
    subject: "Would you like to give back through The Circle?",
    blocks: [
      `Dear ${v.first_name},`,
      "You have been part of The Circle for a few months now. We are building it with its members, and there are several ways to contribute, whatever time you have:",
      {
        list: [
          "Mentor: support three or four members through the Mentor Network.",
          "Onboarding buddy: welcome new members in their first 30 days.",
          "Enrolment champion: introduce The Circle to women who would benefit from it.",
          "Content and product contributor: help shape new masterclasses, resources and Q&A formats.",
          "Monthly Live contributor: speak, host or join a panel.",
          "Evidence base contributor: share your outcomes so we can show what works.",
        ],
      },
      `Tell us where you would like to help: ${v.contributor_form_link}`,
      funmi,
    ],
  }),

  C15: (v) => ({
    subject: `Your Circle membership renews on ${v.renewal_date}`,
    blocks: [
      `Dear ${v.first_name},`,
      `Your Circle membership will renew automatically on ${v.renewal_date}, and your membership fee will be taken from the card you used to join. You do not need to do anything to keep your access to the Academy, Library, Community, Monthly Live and Partner Directory.`,
      `If you would like to cancel, or to update your card, you can do so before that date here: ${v.manage_billing_link}`,
      "If you have any questions, reply to this email and we will help.",
      kindTeam,
    ],
  }),

  C16: (v) => ({
    subject: "Your Circle renewal payment did not go through",
    blocks: [
      `Dear ${v.first_name},`,
      `We tried to take your Circle membership renewal payment, but it did not go through. The quickest way to put this right is to update your payment details here: ${v.manage_billing_link}`,
      `${v.retry_line} If you need help, reply to this email.`,
      team,
    ],
  }),

  C17: (v) => ({
    subject: "Your Circle cancellation is confirmed",
    blocks: [
      `Dear ${v.first_name},`,
      `We have received your cancellation. Your membership will not renew, and you will keep access to your member spaces until ${v.access_end_date}.`,
      `If you change your mind before then, you can reverse this here: ${v.manage_billing_link}`,
      "Thank you for being part of The Circle. We hope to welcome you back.",
      kindTeam,
    ],
  }),

  // Provisional: renewal cooling-off wording depends on DMCC regulations still to be published.
  C18: (v) => ({
    subject: "Your Circle membership has renewed",
    blocks: [
      `Dear ${v.first_name},`,
      `Your Circle membership renewed today, and your next renewal date is ${v.renewal_date}.`,
      `You have 14 days from today to cancel this renewal if you wish, and to receive a refund. You can cancel here: ${v.manage_billing_link}`,
      "Thank you for being part of The Circle.",
      kindTeam,
    ],
  }),

  // Sent when the team changes a payment status by hand in /admin.
  C19: (v) => ({
    subject: "Your Circle payment has not been received",
    blocks: [
      `Dear ${v.first_name},`,
      "We have updated your membership record: our records show that your membership payment has not been received, so your place in The Circle is not yet confirmed.",
      `To complete your membership, use your personal link: ${v.payment_link}`,
      "If you think this is a mistake, or you have already paid, please reply to this email and we will put it right.",
      team,
    ],
  }),

  C20: (v) => ({
    subject: "Your Circle payments are up to date",
    blocks: [
      `Dear ${v.first_name},`,
      "Good news: we have updated your membership record and your payments are now up to date. Your access to The Circle continues as normal.",
      `Your next renewal date is ${v.renewal_date}.`,
      "If you have any questions, reply to this email and we will help.",
      kindTeam,
    ],
  }),

  C21: (v) => ({
    subject: "Your Circle membership has ended",
    blocks: [
      `Dear ${v.first_name},`,
      "We have updated your membership record: your membership of The Circle has now ended, and your access to the member spaces has been removed.",
      "If you think this is a mistake, or you would like to rejoin, please reply to this email and we will help.",
      "Thank you for being part of The Circle.",
      kindTeam,
    ],
  }),
} satisfies Record<string, Template>;

export type TemplateId = keyof typeof templates;
