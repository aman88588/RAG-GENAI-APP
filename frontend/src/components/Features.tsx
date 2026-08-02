import { AlertCircle, Flame, Lightbulb, Mic2, Target, Upload } from 'lucide-react';

const Features = () => {
  const features = [
    {
      icon: Upload,
      title: 'MP3 Uploads',
      description: 'Accept call recordings as MP3 files and send them through a purpose-built audio analysis flow.'
    },
    {
      icon: Mic2,
      title: 'Speech to Text',
      description: 'Transcribe customer and agent speech with speaker labels and quality markers for unclear sections.'
    },
    {
      icon: Target,
      title: 'Customer Intent',
      description: 'Identify what the customer is trying to solve, compare, buy, or clarify during the conversation.'
    },
    {
      icon: Flame,
      title: 'Lead Quality',
      description: 'Classify each lead as Hot, Warm, or Cold with a short explanation grounded in the call.'
    },
    {
      icon: AlertCircle,
      title: 'Agent Mistakes',
      description: 'Surface missed discovery, objection handling, rapport, positioning, and next-step opportunities.'
    },
    {
      icon: Lightbulb,
      title: 'Coaching Actions',
      description: 'Return specific suggestions the sales agent can apply in the next customer conversation.'
    }
  ];

  return (
    <section id="features" className="bg-gray-50 py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            Sales Call
            <span className="text-blue-600"> Intelligence</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A focused workflow for turning recorded conversations into structured, review-ready JSON.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-white rounded-lg p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
              >
                <div className="bg-blue-100 p-4 rounded-lg w-fit mb-6">
                  <IconComponent className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-semibold text-black mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
