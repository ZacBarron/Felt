import { PageHeader } from '../ui/PageHeader';
import './screens.css';

const UPDATED = 'October 12, 2026';
const CONTACT = import.meta.env.VITE_SUPPORT_EMAIL as string | undefined;
const contact = CONTACT ? `email ${CONTACT}` : 'use the support address listed where you got Felt';

/**
 * Terms and privacy in plain language. Have them reviewed for your
 * jurisdiction before charging; set VITE_SUPPORT_EMAIL for the contact line.
 */
const DOCS = {
  terms: {
    title: 'Terms of use',
    sections: [
      [
        'What Felt is',
        'Felt is a training tool for No Limit Hold’em: lessons, drills, charts, a solver and stats. It teaches decisions. It is not gambling, does not take bets, and does not promise that you will win money.',
      ],
      [
        'Accuracy',
        'Felt labels where its numbers come from. Exact math is exact. Starter charts are approximations of published solver results and are marked Approximate. Win rate figures mix arithmetic (rake and tips) with a model, and the app says which is which. Poker results carry a lot of luck. Use your own judgment at the table.',
      ],
      [
        'Your account',
        'You can use Felt without an account. If you create one, keep access to your email, since that is how you sign in. You are responsible for activity on your account.',
      ],
      [
        'Felt Pro',
        'Felt Pro is a subscription billed through Stripe (or the app store you bought it in). The price, any free trial and the date you are charged are shown before you subscribe. It renews automatically until you cancel. Cancel any time from Account, Manage subscription, or in the store you used. You keep Pro until the end of the period you paid for. Refunds follow the law where you live and the store’s policy.',
      ],
      [
        'Fair use',
        'Do not attack the service, scrape it, share accounts, or try to fake results in leagues or the daily challenge. We may remove league entries or accounts that do.',
      ],
      ['Content', 'Lessons, charts, text and design are Felt’s. You may use them for your own study. Hands and sessions you import stay yours.'],
      [
        'Liability',
        'Felt is provided as it is. To the extent the law allows, we are not liable for losses at the table or for indirect damages, and our total liability is limited to what you paid for Felt Pro in the last 12 months.',
      ],
      [
        'Changes',
        'We may update these terms. If a change matters, the app will tell you before it applies. Using Felt after that means you accept the new terms.',
      ],
      ['Age', 'Felt is for adults who are of legal age to play poker where they live.'],
      ['Contact', `Questions about these terms: ${contact}.`],
    ],
  },
  privacy: {
    title: 'Privacy',
    sections: [
      [
        'By default, nothing leaves your device',
        'Without an account, your progress, ratings, saves and imported hands are stored in your browser on this device. Felt has no ads, sells no data and runs no third party tracking scripts. The usage log in Settings stays on your device unless you export it.',
      ],
      [
        'With an account',
        [
          'If you sign in, Felt stores these things.',
          'Your email address',
          'A copy of your progress for sync, including any hands and sessions you imported',
          'Your reminder time and time zone',
          'Your daily challenge results',
          'Your league display name and weekly rating change',
          'Your graded answers with your rating at the time, used to measure how hard each question is',
        ],
      ],
      ['What others see', 'Other players see only your league display name and weekly points. Daily challenge stats are shown as totals, never by name.'],
      [
        'Services we use',
        'Stripe processes payments. Felt never sees your card number. An email provider sends sign in codes. Your browser’s push service delivers reminders if you turn them on. The server runs with a hosting provider. Each handles data only to provide that service.',
      ],
      [
        'Keeping and deleting',
        'Account data is kept while your account exists. Account, Delete my account removes your account and everything stored with it right away. Payment records are kept by Stripe as the law requires.',
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
