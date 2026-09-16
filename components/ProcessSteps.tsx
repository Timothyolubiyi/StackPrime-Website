const steps = [
  {
    title: "Discovery Call",
    description: "We learn your environment, goals, and constraints before proposing anything.",
  },
  {
    title: "Scoping & Proposal",
    description: "A clearly scoped engagement plan with deliverables, timeline, and cost — no surprises.",
  },
  {
    title: "Delivery & Reporting",
    description: "Hands-on execution, with clear reporting and knowledge transfer at every milestone.",
  },
];

export default function ProcessSteps() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {steps.map((step, i) => (
        <div key={step.title} className="rounded-lg border border-gray-100 bg-white p-6">
          <div className="text-sm font-semibold text-gold">Step {i + 1}</div>
          <h3 className="mt-2 font-serif text-xl font-semibold text-navy">{step.title}</h3>
          <p className="mt-2 text-sm text-muted">{step.description}</p>
        </div>
      ))}
    </div>
  );
}
