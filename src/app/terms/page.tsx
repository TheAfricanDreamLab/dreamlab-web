import Link from 'next/link';
import { LegalPage, Mail, OPERATOR } from '@/components/site/legal';

export const metadata = { title: 'Terms of use' };

/** The agreement between the platform and the people and organisations who use it. */
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      intro={
        <>
          <p>
            These terms are the agreement between you and {OPERATOR} (“we”, “us”), which runs The African Dream Lab learning platform at learn.theafricandreamlab.com and the sites
            of organisations that use it. By creating an account or using the platform you accept them. If you use it for an organisation, you also accept them for that
            organisation.
          </p>
          <p>
            How we handle personal data is set out in our{' '}
            <Link href="/privacy" className="font-semibold text-link hover:underline">
              privacy policy
            </Link>
            .
          </p>
        </>
      }
      sections={[
        {
          id: 'account',
          title: 'Your account',
          body: (
            <ul>
              <li>Give your real name and an email address or phone number you control. One account per person.</li>
              <li>Keep your password and sign-in codes to yourself. You are responsible for what happens under your account; tell us at once if you think someone else used it.</li>
              <li>You must be 18 or older, or use the platform through an organisation with the permission of a parent or guardian.</li>
            </ul>
          ),
        },
        {
          id: 'use',
          title: 'Using the platform fairly',
          body: (
            <>
              <p>You agree not to:</p>
              <ul>
                <li>submit someone else’s work as your own, or help others cheat on assessments;</li>
                <li>harass, threaten or discriminate against anyone, in classes, circles, meetings or anywhere on the platform;</li>
                <li>upload anything unlawful, harmful or that you have no right to share;</li>
                <li>record or share other people’s classes, meetings or work without their permission;</li>
                <li>try to get into accounts, data or parts of the platform you were not given, or disrupt the service;</li>
                <li>copy or resell course content outside the platform.</li>
              </ul>
              <p>We may remove content or suspend accounts that break these rules, and organisations may do the same in their own spaces.</p>
            </>
          ),
        },
        {
          id: 'organisations',
          title: 'Organisations',
          body: (
            <ul>
              <li>
                An organisation (a company, school, partner or sponsor) that sets up a space is responsible for who it invites, the roles it gives them, and the content and
                decisions of its staff, including grades, admissions and graduations.
              </li>
              <li>Schools, partners and sponsors are reviewed by us before their cohorts, courses and admissions open. We may decline or suspend an organisation that misuses the platform.</li>
              <li>Organisations must have a lawful basis for the learners’ data they ask us to process, and must handle requests from their learners about it.</li>
            </ul>
          ),
        },
        {
          id: 'content',
          title: 'Content and ownership',
          body: (
            <ul>
              <li>
                <b>Your work stays yours.</b> You keep the rights to what you submit (assignments, residency work, portfolio). You let us store and show it to the people your
                course or organisation needs to see it, and publicly only when you share it.
              </li>
              <li>
                <b>Course content</b> belongs to us or to the organisation or author who made it. You may use it for your own learning while you have access, but not copy or
                redistribute it.
              </li>
              <li>If you believe something on the platform infringes your rights, write to <Mail /> and we will look into it promptly.</li>
            </ul>
          ),
        },
        {
          id: 'credentials',
          title: 'Grades, credentials and AI help',
          body: (
            <ul>
              <li>Grades, admissions decisions and graduations are made by the people running your course or programme.</li>
              <li>
                Credentials can be checked by anyone at their public page. The organisation that issued one may revoke it, with a stated reason, if it was issued in error or
                obtained dishonestly; the check page then says so.
              </li>
              <li>
                If you agree to it, AI may suggest feedback or scores to reviewers. A person always makes the final decision, and you can withdraw your agreement at any time.
              </li>
            </ul>
          ),
        },
        {
          id: 'live',
          title: 'Live classes and meetings',
          body: (
            <p>
              Join live classes, mentor meetings and circle calls on time and treat others with respect. Classes and meetings are not recorded by the platform; faculty may record
              a class and share it with that class only. Do not record or share sessions yourself without everyone’s permission.
            </p>
          ),
        },
        {
          id: 'service',
          title: 'Availability and changes',
          body: (
            <p>
              We work to keep the platform available and your data safe, but we cannot promise it will always be uninterrupted or error-free. We may change or improve features;
              we will tell you before changes that significantly affect how you use it.
            </p>
          ),
        },
        {
          id: 'liability',
          title: 'Responsibility',
          body: (
            <p>
              The platform is provided as it is. To the extent the law allows, we are not liable for indirect losses, or for decisions organisations make about you. Nothing in
              these terms limits rights you have under Nigerian consumer law or liability that cannot lawfully be limited.
            </p>
          ),
        },
        {
          id: 'ending',
          title: 'Closing your account',
          body: (
            <p>
              You can stop using the platform at any time and ask us to close your account at <Mail />. We may suspend or close accounts that break these terms; where we
              can, we will tell you why and give you a chance to respond.
            </p>
          ),
        },
        {
          id: 'law',
          title: 'Law and contact',
          body: (
            <p>
              These terms are governed by the laws of the Federal Republic of Nigeria, and Nigerian courts can hear any dispute about them. We may update them; we will tell you
              in the app or by email before a significant change takes effect, and using the platform afterwards means you accept the new terms. Questions: <Mail />.
            </p>
          ),
        },
      ]}
    />
  );
}
