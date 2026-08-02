import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'What file formats do you support?',
      answer: 'The active pipeline supports MP3 call recordings up to 50MB.'
    },
    {
      question: 'What does the analysis return?',
      answer: 'Each completed analysis returns a summary, customer intent, lead quality with reasoning, sales agent mistakes, and improvement suggestions.'
    },
    {
      question: 'Is my data safe and private?',
      answer: 'Call analyses are associated with your account, and uploaded temporary audio files are removed after processing. You can delete stored analyses from the dashboard.'
    },
    {
      question: 'How are poor recordings handled?',
      answer: 'The transcript marks inaudible or poor-quality sections, and the insights note limitations when the conversation is incomplete or unclear.'
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faqs" className="bg-white py-20">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            Frequently Asked
            <span className="text-blue-600"> Questions</span>
          </h2>
          <p className="text-xl text-gray-600">
            Everything you need to know about CallInsight and how it works.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            const isTopRow = index < 2;
            const shouldShift = openIndex !== null && openIndex < 2 && !isTopRow;

            return (
              <div
                key={index}
                className={`bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-500 ease-out cursor-pointer ${shouldShift ? 'transform translate-y-8' : ''
                  } ${isOpen ? 'shadow-xl ring-2 ring-blue-100' : 'shadow-md'}`}
                onClick={() => toggleFAQ(index)}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold text-black pr-4 leading-tight">
                      {faq.question}
                    </h3>
                    <div className={`flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    </div>
                  </div>

                  <div className={`overflow-hidden transition-all duration-500 ease-out ${isOpen ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'
                    }`}>
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-gray-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-16">
          <p className="text-gray-600 mb-4">
            Still have questions?
          </p>
          <button
            onClick={() => window.location.href = 'mailto:hi@amandev.tech'}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold hover:shadow-lg transform hover:-translate-y-1">
            Contact Support
          </button>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
