import { Mic2, MousePointerClick } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section
      id="home"
      className="relative min-h-[88vh] bg-cover bg-center pt-32 pb-20"
      style={{
        backgroundImage: "linear-gradient(90deg, rgba(7, 18, 34, 0.86), rgba(7, 18, 34, 0.48)), url('https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1800&q=80')"
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-3xl text-white">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-sm font-semibold backdrop-blur">
            <Mic2 className="h-4 w-4" />
            MP3 call intelligence
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
            CallInsight For{" "}
            <span className="animate-text bg-gradient-to-r from-[#1e3a8a] via-[#a5f3fc] to-[#1e3a8a] bg-[length:200%_200%] bg-clip-text text-transparent font-semibold">
              Hike Education.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-relaxed text-blue-50">
            Convert sales call recordings into concise summaries, customer intent, lead quality, agent mistakes, and practical coaching suggestions.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-10 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-7 py-4 text-lg font-semibold text-white shadow-lg hover:bg-blue-700"
          >
            <MousePointerClick className="h-5 w-5" />
            Analyze a Call
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
