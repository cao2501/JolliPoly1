import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="bg-white min-h-screen">
      {/* Banner Section */}
      <section className="w-full bg-white pt-12 pb-16">
        <div className="max-w-7xl mx-auto flex flex-col-reverse md:flex-row items-center gap-10 px-4">
          {/* Left: Text */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-extrabold text-[#2563eb] mb-6 leading-tight">
              DISCOVER THE BEST CAREER OPTION FOR YOU
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto md:mx-0">
              Get personalized guidance to choose your ideal IT career path.
            </p>
            <Link href="/career-library">
              <button className="px-8 py-4 bg-[#2563eb] text-white text-lg font-semibold rounded-full shadow-md hover:bg-blue-700 transition-colors">
                Get Guidance
              </button>
            </Link>
          </div>
          {/* Right: SVG Illustration */}
          {/* <div className="flex-1 flex justify-center md:justify-end">
            <Image
              src="/career-hero.svg"
              alt="Career Guidance Illustration"
              width={380}
              height={320}
              className="w-[260px] md:w-[380px] h-auto"
              priority
            />
          </div> */}
        </div>
      </section>

      {/* Highlight Section */}
      <section className="w-full bg-gray-50 py-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl shadow p-8 flex flex-col items-center text-center">
            <div className="bg-[#2563eb]/10 rounded-full p-4 mb-4">
              <svg className="w-10 h-10 text-[#2563eb]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m0 0H6m6 0h6" /></svg>
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900">Personalized Career Guidance</h3>
            <p className="text-gray-500 text-base">Tailored advice for your unique strengths and interests.</p>
          </div>
          {/* Card 2 */}
          <div className="bg-white rounded-2xl shadow p-8 flex flex-col items-center text-center">
            <div className="bg-[#2563eb]/10 rounded-full p-4 mb-4">
              <svg className="w-10 h-10 text-[#2563eb]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-4V6a4 4 0 00-3-3.87M9 4V6a4 4 0 003 3.87" /></svg>
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900">300+ Career Options</h3>
            <p className="text-gray-500 text-base">Explore a wide range of IT and tech career paths.</p>
          </div>
          {/* Card 3 */}
          <div className="bg-white rounded-2xl shadow p-8 flex flex-col items-center text-center">
            <div className="bg-[#2563eb]/10 rounded-full p-4 mb-4">
              <svg className="w-10 h-10 text-[#2563eb]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 17l4 4 4-4m0-5V3m-8 9v6a4 4 0 004 4h4a4 4 0 004-4v-6" /></svg>
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900">200+ Expert Talks</h3>
            <p className="text-gray-500 text-base">Learn from industry leaders and successful professionals.</p>
          </div>
        </div>
      </section>
    </main>
  );
} 