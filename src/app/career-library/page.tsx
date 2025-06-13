import Link from 'next/link';

export default function CareerLibrary() {
  return (
    <main className="min-h-screen bg-gray-50 py-16 px-4 flex flex-col items-center justify-center">
      <h1 className="text-3xl md:text-4xl font-extrabold text-[#2563eb] mb-8">Career Library</h1>
      <p className="text-lg text-gray-600 mb-12 max-w-xl text-center">
        Explore a wide range of career options. Start with IT or browse other fields.
      </p>
      <Link href="/analysis">
        <button className="px-8 py-4 bg-[#2563eb] text-white text-lg font-semibold rounded-full shadow-md hover:bg-blue-700 transition-colors">
          IT
        </button>
      </Link>
    </main>
  );
} 