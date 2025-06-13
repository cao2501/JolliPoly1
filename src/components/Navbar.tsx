import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-extrabold tracking-tight text-[#2563eb] font-sans select-none">Jolli Poly</span>
        </Link>
        {/* Menu */}
        <div className="hidden md:flex gap-6 ml-8">
          <Link href="/" className="text-gray-700 hover:text-[#2563eb] font-medium transition-colors">Home</Link>
          <Link href="/career-library" className="text-gray-700 hover:text-[#2563eb] font-medium transition-colors">Career Library</Link>
          <Link href="/skill-assessment" className="text-gray-700 hover:text-[#2563eb] font-medium transition-colors">Skill Assessment</Link>
          <Link href="/expert-talk" className="text-gray-700 hover:text-[#2563eb] font-medium transition-colors">Expert Talk</Link>
          <Link href="/career-guidance" className="text-gray-700 hover:text-[#2563eb] font-medium transition-colors">Career Guidance</Link>
        </div>
        {/* Auth buttons */}
        <div className="flex gap-3">
          <Link href="/login">
            <button className="px-5 py-2 rounded-full border border-[#2563eb] text-[#2563eb] font-semibold hover:bg-[#2563eb] hover:text-white transition-colors">Login</button>
          </Link>
          <Link href="/signup">
            <button className="px-5 py-2 rounded-full bg-[#2563eb] text-white font-semibold hover:bg-blue-700 transition-colors">Signup</button>
          </Link>
        </div>
        {/* Mobile menu button */}
        <div className="md:hidden">
          {/* Placeholder for mobile menu (có thể thêm sau) */}
        </div>
      </div>
    </nav>
  );
} 