
const UseCases = () => {
  const useCases = [
    {
      image: 'https://cdn.pixabay.com/video/2020/09/13/49811-458438860_large.mp4',
      title: 'Sales Teams',
      subtitle: 'Coach Every Conversation'
    },
    {
      image: 'https://cdn.pixabay.com/video/2024/06/06/215500_large.mp4',
      title: 'Revenue Leaders',
      subtitle: 'Spot Lead Quality Fast'
    },
    {
      image: 'https://cdn.pixabay.com/video/2024/03/15/204306-923909642_large.mp4',
      title: 'Call QA Teams',
      subtitle: 'Find Missed Opportunities'
    }
  ];

  return (
    <section id="use-cases" className="bg-gray-50 py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            Who Uses
            <span className="text-blue-600"> CallInsight</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Sales and quality teams use CallInsight to review conversations faster and turn every recording into coaching data.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 cursor-pointer border border-gray-100"
            >
              {/* Image Container */}
              <div className="relative h-64 overflow-hidden">
                {useCase.image.endsWith('.mp4') ? (
                  <video
                    src={useCase.image}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <img
                    src={useCase.image}
                    alt={useCase.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>

                {/* Title Overlay */}
                <div className="absolute bottom-6 left-6 right-6">
                  <h3 className="text-3xl font-bold text-white mb-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    {useCase.title}
                  </h3>
                  <p className="text-blue-200 font-semibold text-lg opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-100">
                    {useCase.subtitle}
                  </p>
                </div>
              </div>

              {/* Only CTA */}

            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UseCases;
