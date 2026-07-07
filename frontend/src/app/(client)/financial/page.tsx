import FinancialPlanner from '@/components/financial/FinancialPlanner';

export const metadata = {
  title: 'Financial Planning – PropAI',
  description: 'Estimate your borrowing power, track savings, and get a personalised timeline to home ownership.',
};

export default function FinancialPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10 text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">Financial Readiness Planner</h1>
        <p className="text-gray-500 mt-2 leading-relaxed">
          Not ready to buy yet? That&apos;s okay. Enter your financial details and we&apos;ll give you a personalised
          timeline, estimated borrowing power, and a savings roadmap — so you know exactly when and how much you can buy.
        </p>
      </div>

      {/* Lifecycle explainer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        {[
          {
            emoji: '📊',
            title: 'Understand Affordability',
            desc: 'We calculate your estimated borrowing power using your income, expenses, and savings.',
          },
          {
            emoji: '💾',
            title: 'Track Savings Progress',
            desc: 'See how close you are to your deposit goal and how long until you reach it.',
          },
          {
            emoji: '🤝',
            title: 'Stay Connected to Your Agent',
            desc: 'Your profile stays linked to your agent so they can nurture you until you\'re ready.',
          },
        ].map((c) => (
          <div key={c.title} className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm">
            <p className="text-3xl mb-2">{c.emoji}</p>
            <p className="font-semibold text-gray-800 mb-1">{c.title}</p>
            <p className="text-sm text-gray-500">{c.desc}</p>
          </div>
        ))}
      </div>

      <FinancialPlanner />
    </div>
  );
}
