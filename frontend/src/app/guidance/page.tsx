import GuidanceChat from '@/components/guidance/GuidanceChat';

export const metadata = {
  title: 'AI Buyer Guide – PropAI',
  description: 'Describe your ideal property and let our AI match you with the best listings.',
};

export default function GuidancePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Buyer Guidance Engine</h1>
        <p className="text-gray-500 mt-1">
          Tell me what you&apos;re looking for in plain English — I&apos;ll find the best matching properties for you.
        </p>
      </div>
      <GuidanceChat />
    </div>
  );
}
