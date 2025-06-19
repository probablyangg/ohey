export default function Hero() {
  return (
    <section className="h-screen flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white">
      <div className="max-w-6xl mx-auto px-5 flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-[6rem] font-semibold text-left leading-none">OHey</h2>
          <p className="text-[3rem] opacity-90 text-left italic leading-none">
nice to see you!          </p>
          <div className="flex gap-4 justify-start mt-10">
            <button className="px-8 py-3 bg-white text-primary rounded-lg text-lg font-medium transition-all hover:bg-gray-50 hover:-translate-y-0.5">
              Add to Chrome
            </button>
            <button className="px-8 py-3 bg-transparent text-white border-2 border-white rounded-lg text-lg font-medium transition-all hover:bg-white hover:text-primary">
              Firefox - Coming Soon
            </button>
          </div>
        </div>
        <div className="flex-shrink-0 ml-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className="text-white">
            <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/>
            <path d="M14 3v4a2 2 0 0 0 2 2h4"/>
            <path d="M8 13h.01"/>
            <path d="M16 13h.01"/>
            <path d="M10 16s.8 1 2 1c1.3 0 2-1 2-1"/>
          </svg>
        </div>
      </div>
    </section>
  )
}