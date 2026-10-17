import { PageHeader } from '../ui/PageHeader';
import './screens.css';

const UPDATED = 'October 17, 2026';
const CONTACT = import.meta.env.VITE_SUPPORT_EMAIL as string | undefined;
const contact = CONTACT ? `email ${CONTACT}` : 'use the support address listed where you got Aced';

/**
 * Terms and privacy in plain language. Have them reviewed for your
 * jurisdiction before charging; set VITE_SUPPORT_EMAIL for the contact line.
 */
const DOCS = {
  terms: {
    title: 'Terms of use',
    sections: [
      [
        'What Aced is',
        'Aced is a training tool for No Limit Hold’em: lessons, drills, charts, a solver and stats. It teaches decisions. It is not gambling, does not take bets, and does not promise that you will win money.',
      ],
      [
        'Accuracy',
        'Aced labels where its numbers come from. Exact math is exact. Starter charts are built by hand to match published solver results and are marked Close to solver. Win rate figures mix arithmetic (rake and tips) with a model, and the app says which is which. Poker results carry a lot of luck. Use your own judgment at the table.',
      ],
      [
        'Your account',
        'You can use Aced without an account. If you create one, keep access to your email, since that is how you sign in. You are responsible for activity on your account.',
      ],
      [
        'Aced Pro',
        'Aced Pro is a subscription billed through Stripe (or the app store you bought it in). The price, any free trial and the date you are charged are shown before you subscribe. It renews automatically until you cancel. Cancel any time from Account, Manage subscription, or in the store you used. You keep Pro until the end of the period you paid for. Refunds follow the law where you live and the store’s policy.',
      ],
      [
        'Fair use',
        'Do not attack the service, scrape it, share accounts, or try to fake results in leagues or the daily challenge. We may remove league entries or accounts that do.',
      ],
      ['Content', 'Lessons, charts, text and design are Aced’s. You may use them for your own study. Hands and sessions you import stay yours.'],
      [
        'Liability',
        'Aced is provided as it is. To the extent the law allows, we are not liable for losses at the table or for indirect damages, and our total liability is limited to what you paid for Aced Pro in the last 12 months.',
      ],
      [
        'Changes',
        'We may update these terms. If a change matters, the app will tell you before it applies. Using Aced after that means you accept the new terms.',
      ],
      ['Age', 'Aced is for adults who are of legal age to play poker where they live.'],
      ['Contact', `Questions about these terms: ${contact}.`],
    ],
  },
  privacy: {
    title: 'Privacy',
    sections: [
      [
        'What stays on your device',
        'Without an account, your progress and ratings are stored in your browser on this device. So are your saves and imported hands. Aced has no ads and runs no third party trackers.',
      ],
      [
        'Anonymous usage counts',
        [
          'Aced sends short usage events to its own server. They show us what helps players and what to fix. Each event can carry these things.',
          'What happened, such as a lesson started or a hand dealt',
          'A few labels, such as which lesson or whether an answer was right',
          'A random id made on this device and an id for this visit',
          'Your kind of device (iPhone, Android or computer)',
          'Whether Aced runs as an installed app or inside another app',
          'Your time zone offset, so days count in your own time',
          'The link that brought you, such as a creator’s tag',
          'Speed numbers for some page loads',
          'A short code for an error, never its text',
        ],
      ],
      [
        'What is never sent',
        'Usage events never hold your email or your name. They never hold text you type or the cards you were dealt. Our server does not store your IP address. It does not store your browser’s details either. Aced uses no tracking cookies.',
      ],
      [
        'Turning it off',
        'Open Settings and then Your data. Turn off Share anonymous usage. Aced then sends nothing more and deletes what was waiting. It also asks our server to delete what this device sent. If your browser sends Global Privacy Control or Do Not Track, Aced sends nothing at all.',
      ],
      ['What others see', 'Other players see only your league display name and weekly points. Daily challenge stats are shown as totals, never by name.'],
      [
        'Services we use',
        'Stripe processes payments. Aced never sees your card number. An email provider sends sign in codes. Your browser’s push service delivers reminders if you turn them on. The server runs with a hosting provider. Each handles data only to provide that service.',
      ],
      [
        'Keeping and deleting',
        'Account data is kept while your account exists. Account, Delete my account removes your account and everything stored with it right away. Usage events stay, with the link to you removed. Usage events are deleted after 13 months. The random id on your device is replaced after 13 months too. Payment records are kept by Stripe as the law requires.',
      ],
      [
        'No selling',
        'We never sell or rent your data. We never share usage events with advertisers. They stay on our server.',
      ],
      [
        'Your rights',
        `You can ask for a copy of your data or for corrections. To ask, ${contact}. Settings, Your data also exports everything on your device.`,
      ],
      ['Changes', 'If this policy changes in a way that matters, the app will tell you first.'],
    ],
  },
} as const;

export function LegalPage({ doc }: { doc: keyof typeof DOCS }) {
  const d = DOCS[doc];
  return (
    <div className="stack legal sc-legal" style={{ gap: '1.5rem' }}>
      <PageHeader title={d.title} subtitle={`Updated ${UPDATED}`} back={{ to: '/settings', label: 'Settings' }} />
      {d.sections.map(([heading, text]) => (
        <section key={heading} className="stack" style={{ gap: '0.4rem' }}>
          <h2>{heading}</h2>
          {typeof text === 'string' ? (
            <p>{text}</p>
          ) : (
            <>
              <p>{text[0]}</p>
              <ul>
                {text.slice(1).map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      ))}
    </div>
  );
}
