import type { Metadata } from "next";
import Container from "@/components/Container";
import Newsletter from "@/components/Newsletter";

export const metadata: Metadata = {
  title: "Publications",
  description: "Technical articles and insights from StackPrime Consulting Ltd — coming soon.",
};

export default function PublicationsPage() {
  return (
    <>
      <section className="bg-navy py-16 text-white md:py-20">
        <Container>
          <div className="text-sm font-semibold text-gold">Publications</div>
          <h1 className="mt-2 max-w-2xl font-serif text-4xl font-bold md:text-5xl">Insights, Knowledge & Resources</h1>
          <p className="mt-4 max-w-2xl text-white/85">
            Explore publications from the StackPrime team covering cloud computing, cybersecurity, networking, infrastructure, DevOps, systems administration,
             and technology management. From technical articles and practical guides to professional books, training resources, and industry insights,
              our publications are created to share practical knowledge, document real-world experience, and help professionals and organizations make better
               technology decisions..
          </p>
        </Container>
      </section>
      <section className="py-16">
  <Container>
    <div className="grid gap-4 md:grid-cols-3">
      {/* Book 1 */}
      <article className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex justify-center bg-[#F7F8FA] p-8">
          <a
            href="https://selar.com/239uuo50d1"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="/images/cisco-cli.png"
              alt="StackPrime publication - Book 1"
              className="h-90 w-auto object-contain transition-transform duration-300 hover:scale-105"
            />
          </a>
        </div>

        <div className="p-6">
          <p className="text-sm font-medium uppercase tracking-wider text-gold">
            Book
          </p>

          <h2 className="mt-2 font-serif text-xl font-semibold text-navy">
            Cisco CLI Mastery
          </h2>

          <p className="mt-3 text-muted">
            Master Cisco networking through hands-on CLI practice. Cisco CLI Mastery takes you from first console connection to full firewall deployment — covering CCNA fundamentals,
             CCNP Security topics, and real-world Cisco ASA and Firepower Threat Defense configuration. Every chapter pairs real command syntax with plain-language, line-by-line
              explanations and a hands-on lab, making this the practical companion for certification study and on-the-job configuration alike.
          </p>

          <a
            href="https://selar.com/239uuo50d1"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Get your copy
          </a>
        </div>
      </article>

      {/* Book 2 */}
      <article className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex justify-center bg-[#F7F8FA] p-8">
          <a
            href="https://selar.com/1kl498u4s4"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="/images/Cybersecurity-beginners.png"
              alt="StackPrime publication - Book 2"
              className="h-90 w-auto object-contain transition-transform duration-300 hover:scale-105"
            />
          </a>
        </div>

        <div className="p-6">
          <p className="text-sm font-medium uppercase tracking-wider text-gold">
            Book
          </p>

          <h2 className="mt-2 font-serif text-xl font-semibold text-navy">
            Cybersecurity for Absolute Beginners
          </h2>

          <p className="mt-3 text-muted">
            A practical, beginner-friendly guide to staying safe online. Cybersecurity for Absolute Beginners breaks down hackers, cyber attacks, network security, passwords,
             and multi-factor authentication, malware and ransomware, and safe browsing and email habits — all explained in plain English, with real-world examples, original
              diagrams, and hands-on practical labs. No technical background required.
          </p>

          <a
            href="https://selar.com/1kl498u4s4"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Get your copy
          </a>
        </div>
      </article>
    
    {/* Book 3 */}
      <article className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex justify-center bg-[#F7F8FA] p-8">
          <a
            href="https://selar.com/318x8549r0"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="/images/aws-coverpage.png"
              alt="StackPrime publication - Book 3"
              className="h-81 w-auto object-contain transition-transform duration-300 hover:scale-105"
            />
          </a>
        </div>

        <div className="p-6">
          <p className="text-sm font-medium uppercase tracking-wider text-gold">
            Book
          </p>

          <h2 className="mt-2 font-serif text-xl font-semibold text-navy">
            Cloud Without Fear - A Complete Beginner's Guide to Amazon Web Services
          </h2>

          <p className="mt-3 text-muted">
            Most AWS books are written for developers or assume you already work in IT. Cloud Without Fear was written for everyone else&mdash; — the entrepreneur
             launching a startup, the IT officer managing a small team, the student preparing for their first cloud certification, the professional switching careers.
              This book takes you from creating your very first AWS account to building a serverless API, configuring a secure virtual network, and managing cloud costs — all without assuming prior knowledge. 
               The cloud is not complicated — you just need the right guide.
          </p>

          <a
            href="https://selar.com/318x8549r0"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Get your copy
          </a>
        </div>
      </article>
    </div>
    

    {/* Newsletter */}
    <div className="mt-16">
      <Newsletter />
    </div>
  </Container>
</section>

    </>
  );
}
