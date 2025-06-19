export default function Hero() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto w-full flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-8 lg:gap-16">
        <div className="flex-1 text-center lg:text-left">
          <h2 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold leading-none mb-4">OHey!</h2>
          <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl opacity-90 italic leading-tight mb-8">
            nice to see you
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <a href="https://github.com/probablyangg/ohey" target="_blank" rel="noopener noreferrer" className="px-6 py-3 sm:px-8 bg-white text-primary rounded-lg text-base sm:text-lg font-medium transition-all hover:bg-gray-50 hover:-translate-y-0.5 w-full sm:w-auto inline-block text-center">
              Add to Chrome
            </a>
            <button disabled className="px-6 py-3 sm:px-8 bg-transparent text-white border-2 border-white rounded-lg text-base sm:text-lg font-medium transition-all hover:bg-white hover:text-primary w-full sm:w-auto opacity-50 cursor-not-allowed">
              Firefox - Coming Soon
            </button>
          </div>
          <p className="text-sm opacity-75 mt-4 text-center lg:text-left">
            Extension is under review for Chrome Web Store
          </p>
        </div>
        <div className="flex-shrink-0 order-first lg:order-last">
          <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className="text-white sm:w-[250px] sm:h-[250px] lg:w-[300px] lg:h-[300px]">
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