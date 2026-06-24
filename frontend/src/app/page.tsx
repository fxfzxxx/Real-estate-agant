import Link from "next/link";

const features = [
  {
    icon: "🏡",
    title: "Property Listing Portal",
    description:
      "Browse active listings with smart filters. Each property includes an AI chat assistant so you can ask any question instantly.",
    href: "/listings",
    cta: "Browse Listings",
  },
  {
    icon: "🧠",
    title: "AI Buyer Guidance Engine",
    description:
      "Describe what you want in plain English. Our AI interprets your needs and surfaces the best matching properties — no complex filters needed.",
    href: "/guidance",
    cta: "Start AI Search",
  },
  {
    icon: "📊",
    title: "Market Insights Dashboard",
    description:
      "Explore suburb price trends, days on market, and comparable listings. Understand the market before you make a move.",
    href: "/market",
    cta: "View Market Data",
  },
  {
    icon: "🤖",
    title: "Agentic CRM",
    description:
      "Agents see a prioritised lead pipeline scored by buyer intent. Automated next-action suggestions and behaviour tracking built in.",
    href: "/crm",
    cta: "Open CRM",
  },
  {
    icon: "💰",
    title: "Financial Readiness Planner",
    description:
      "Not ready to buy yet? Estimate your borrowing power, track savings progress, and get a personalised timeline to home ownership.",
    href: "/financial",
    cta: "Plan My Purchase",
  },
];

const workflow = [
  { step: "01", label: "Buyer chats or browses listing" },
  { step: "02", label: "AI interprets intent & preferences" },
  { step: "03", label: "System recommends best properties" },
  { step: "04", label: "Buyer asks questions via property chat" },
  { step: "05", label: "AI answers using listing & market data" },
  { step: "06", label: "CRM logs behaviour & scores lead" },
  { step: "07", label: "High-intent leads flagged to agent" },
  { step: "08", label: "Agent follows up & closes deal" },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: "url('https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1600')", backgroundSize: "cover", backgroundPosition: "center"}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 text-center">
          <span className="inline-block bg-white/10 backdrop-blur text-emerald-100 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6">
            AI-Driven Real Estate Platform
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
            Find Your Home <br className="hidden sm:block" />
            <span className="text-emerald-300">The Intelligent Way</span>
          </h1>
          <p className="text-lg sm:text-xl text-emerald-100 max-w-3xl mx-auto mb-10 leading-relaxed">
            A conversational AI platform that combines listing discovery, buyer education,
            and agent CRM automation into one integrated system — from first search to settlement.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/guidance"
              className="inline-flex items-center justify-center gap-2 bg-white text-emerald-700 font-bold px-8 py-3.5 rounded-xl hover:bg-emerald-50 transition-colors text-sm shadow-lg"
            >
              Start AI Property Search
            </Link>
            <Link
              href="/listings"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/50 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors text-sm"
            >
              Browse All Listings
            </Link>
          </div>
        </div>
      </section>

      {/* Buyer lifecycle stages */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">One Platform, Every Stage</h2>
          <p className="text-gray-500 mt-2 max-w-xl mx-auto">
            Whether you&apos;re ready to buy today or just beginning to explore — PropAI supports your entire journey.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              color: "border-emerald-400 bg-emerald-50",
              stage: "🟢 Discovery",
              subtitle: "Active Buyers",
              points: ["Chat-based property search", "AI listing recommendations", "Instant Q&A per property"],
            },
            {
              color: "border-amber-400 bg-amber-50",
              stage: "🟡 Engagement",
              subtitle: "Semi-Ready Buyers",
              points: ["Market insights & trends", "Personalised property suggestions", "Soft follow-ups from agent"],
            },
            {
              color: "border-sky-400 bg-sky-50",
              stage: "🔵 Preparation",
              subtitle: "Future Buyers",
              points: ["Financial planning tools", "Savings & affordability tracking", "Long-term agent nurturing"],
            },
          ].map((s) => (
            <div key={s.stage} className={`rounded-2xl border-2 ${s.color} p-6`}>
              <p className="text-lg font-bold text-gray-800">{s.stage}</p>
              <p className="text-sm text-gray-500 mb-4">{s.subtitle}</p>
              <ul className="space-y-2">
                {s.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Platform Features</h2>
            <p className="text-gray-500 mt-2">Everything you need, all in one place.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-gray-100 bg-gray-50 p-6 flex flex-col hover:shadow-md transition-shadow"
              >
                <p className="text-3xl mb-3">{f.icon}</p>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed flex-1">{f.description}</p>
                <Link
                  href={f.href}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  {f.cta}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
          <p className="text-gray-500 mt-2">End-to-end buyer journey, powered by AI.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {workflow.map((w) => (
            <div key={w.step} className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm flex items-center justify-center mx-auto mb-3">
                {w.step}
              </div>
              <p className="text-sm text-gray-700 font-medium">{w.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-emerald-700 text-white py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Start Your Property Journey Today</h2>
          <p className="text-emerald-100 mb-8 text-lg">
            Whether you&apos;re buying now or planning for the future — PropAI guides you every step of the way.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/guidance"
              className="bg-white text-emerald-700 font-bold px-8 py-3.5 rounded-xl hover:bg-emerald-50 transition-colors text-sm"
            >
              Find My Perfect Home
            </Link>
            <Link
              href="/financial"
              className="border-2 border-white/50 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors text-sm"
            >
              Check My Affordability
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
