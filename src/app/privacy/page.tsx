import Link from 'next/link';
import { LegalPage, Mail, OPERATOR } from '@/components/site/legal';

export const metadata = { title: 'Privacy policy' };

/** What the platform collects, why, who it shares it with, and the rights people have (NDPA 2023). */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro={
        <>
          <p>
            The African Dream Lab is a learning platform run by {OPERATOR} (“we”, “us”). This policy explains what personal data we collect when you use the platform at
            learn.theafricandreamlab.com and the sites of organisations that use it, why we use it, who we share it with, and the choices and rights you have. We follow the
            Nigeria Data Protection Act 2023 (NDPA).
          </p>
          <p>
            Questions or requests: <Mail />.
          </p>
        </>
      }
      sections={[
        {
          id: 'who',
          title: 'Who is responsible for your data',
          body: (
            <>
              <p>
                {OPERATOR} decides how the platform uses personal data and is the data controller for your account and for learning you do on your own.
              </p>
              <p>
                When you learn, teach or apply through an organisation (a school, company or partner), that organisation also decides how your learning records are used for its
                own purposes, for example to follow your progress or decide on an application. In that case we process those records for the organisation and it is responsible for
                answering requests about its own use of them; you can still contact us and we will pass your request on.
              </p>
            </>
          ),
        },
        {
          id: 'collect',
          title: 'What we collect',
          body: (
            <ul>
              <li>
                <b>Account details:</b> your name, email address or phone number, password (stored only as a secure hash), and, if you sign in with Google or your organisation’s
                single sign-on, the identifier that service gives us.
              </li>
              <li>
                <b>Organisations and roles:</b> which organisations you belong to and the roles you hold there.
              </li>
              <li>
                <b>Learning records:</b> courses and programmes you join, progress, quiz answers, assignments and files you submit, grades and feedback, attendance at classes,
                residency work, your action plan, Dream Score, portfolio and the credentials you earn.
              </li>
              <li>
                <b>Applications:</b> if you apply to a programme, what you write in your application, interview notes, scores and the decision.
              </li>
              <li>
                <b>Live classes and meetings:</b> when you join and leave (for attendance). Audio and video pass through our live-class service and are not recorded by it; a
                recording exists only if your faculty record a class and upload it, and it is then shared only with that class.
              </li>
              <li>
                <b>Messages and notifications:</b> notifications we show you and the emails or text messages we send you.
              </li>
              <li>
                <b>Technical and security data:</b> sign-in times, the device and browser you use, IP addresses and security logs, kept to protect your account and the platform.
              </li>
            </ul>
          ),
        },
        {
          id: 'use',
          title: 'Why we use it, and on what basis',
          body: (
            <ul>
              <li>
                <b>To run your account and your learning</b> (our contract with you): signing you in, showing your courses, recording progress, issuing credentials.
              </li>
              <li>
                <b>For the organisations you join</b> (our contract with them and their legitimate interests): letting their staff teach, grade, mentor, review applications and
                report on learning.
              </li>
              <li>
                <b>To keep the platform safe</b> (legitimate interests and legal obligations): preventing fraud and abuse, investigating security incidents, keeping records the
                law requires.
              </li>
              <li>
                <b>AI help with reviews, only if you agree</b> (consent): if you tick “AI may help review my work”, an AI model may suggest feedback or scores on your work or
                application to the people reviewing it. A person always makes the final decision. You can withdraw this consent at any time; it does not affect reviews already
                made.
              </li>
              <li>
                <b>To tell you about your learning</b> (contract and legitimate interests): emails about grades, classes, applications and your account. You choose which
                categories reach you by email under Account &gt; Notification emails; sign-in codes and security messages are always sent.
              </li>
            </ul>
          ),
        },
        {
          id: 'share',
          title: 'Who we share it with',
          body: (
            <>
              <p>We do not sell personal data or use it for advertising. We share it only with:</p>
              <ul>
                <li>
                  <b>Organisations you belong to,</b> whose staff see what their role needs (for example your instructor sees your submissions; an admissions reviewer sees your
                  application).
                </li>
                <li>
                  <b>Anyone you choose to show:</b> a credential’s public check page shows your name, the achievement and who issued it; your portfolio is public only while you
                  share its link.
                </li>
                <li>
                  <b>Service providers who process data for us under contract:</b> Microsoft Azure (hosting and file storage), Resend (email), Termii (text messages and
                  WhatsApp codes), Google (only if you sign in with Google), Anthropic (AI-assisted reviews, only with your consent) and YouTube (course videos, loaded only when
                  you press play, through its privacy-enhanced mode).
                </li>
                <li>
                  <b>Authorities,</b> where the law requires it.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: 'transfers',
          title: 'Where your data is kept',
          body: (
            <p>
              The platform is hosted on Microsoft Azure in India, and some of our service providers process data in the United States and the European Union. When data leaves
              Nigeria we rely on the safeguards the NDPA allows, including contracts with each provider that require them to protect it to the standard of Nigerian law.
            </p>
          ),
        },
        {
          id: 'retention',
          title: 'How long we keep it',
          body: (
            <ul>
              <li>Your account and learning records: for as long as your account is open, then deleted within 90 days of a deletion request or of closing your account.</li>
              <li>
                Credentials: the record behind a credential’s public check is kept so that people can keep checking it; if you ask, we show it as withdrawn instead of deleting
                it.
              </li>
              <li>Records an organisation needs (for example grades and graduation decisions) may be kept for as long as that organisation must keep them.</li>
              <li>Security logs: up to 12 months. Backups: overwritten within 7 days.</li>
            </ul>
          ),
        },
        {
          id: 'rights',
          title: 'Your rights',
          body: (
            <>
              <p>Under the NDPA you may ask us to:</p>
              <ul>
                <li>give you a copy of the personal data we hold about you;</li>
                <li>correct data that is wrong or incomplete;</li>
                <li>delete your data, or restrict how we use it;</li>
                <li>stop using it where we rely on legitimate interests, and withdraw any consent you gave;</li>
                <li>send your data to you or to another service in a common format.</li>
              </ul>
              <p>
                Write to <Mail /> from the email address on your account. We reply within 30 days. If you are not satisfied, you can complain to the Nigeria Data Protection
                Commission.
              </p>
            </>
          ),
        },
        {
          id: 'security',
          title: 'Security',
          body: (
            <p>
              Data travels encrypted (HTTPS), passwords are stored only as hashes, staff see only what their role needs, and organisations can require two-step sign-in for their
              admins. No system is perfectly secure: if a breach affects you, we will tell you and the regulator as the law requires.
            </p>
          ),
        },
        {
          id: 'cookies',
          title: 'Cookies',
          body: (
            <p>
              We use only the cookies the platform needs to work: keeping you signed in, remembering your choices (such as the sidebar) and protecting forms. We do not use
              advertising or cross-site tracking cookies.
            </p>
          ),
        },
        {
          id: 'age',
          title: 'Age',
          body: (
            <p>
              The platform is for people aged 18 and over. Younger learners may use it only through an organisation (such as their school) with the permission of a parent or
              guardian; that organisation is responsible for obtaining it.
            </p>
          ),
        },
        {
          id: 'changes',
          title: 'Changes and contact',
          body: (
            <p>
              We will update this policy when the platform changes, and tell you by email or in the app before any change that affects how we use your data takes effect. Read
              it together with our{' '}
              <Link href="/terms" className="font-semibold text-link hover:underline">
                terms of use
              </Link>
              . Contact: <Mail />.
            </p>
          ),
        },
      ]}
    />
  );
}
