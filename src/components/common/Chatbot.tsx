import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Sparkles } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
}

export const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Mabuhay! 👋 I am PLSNHS Bot, the virtual assistant of Placido L. Señor National High School. How can I assist you with enrollment, strands, or school services today?',
      timestamp: 'Just now',
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const quickPrompts = [
    'How do I enroll?',
    'What strands are offered?',
    'Enrollment requirements?',
    'School contact info',
  ];

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // Generate responsive bot answer
    setTimeout(() => {
      let botReply = '';
      const lower = query.toLowerCase();

      if (lower.includes('enroll') || lower.includes('register') || lower.includes('apply')) {
        botReply =
          'To enroll, click the "Enroll Now" button at the top of the homepage or navigate to the Student Enrollment page. Fill in your personal details, select your Senior High strand (STEM, HUMSS, GAS, or TVL), and submit your application for Registrar review.';
      } else if (lower.includes('strand') || lower.includes('course') || lower.includes('stem') || lower.includes('humss')) {
        botReply =
          'Placido L. Señor NHS proudly offers 4 Senior High School tracks:\n1. STEM (Science, Technology, Engineering, & Math)\n2. HUMSS (Humanities & Social Sciences)\n3. GAS (General Academic Strand)\n4. TVL (Technical-Vocational Livelihood: Cookery & ICT)';
      } else if (lower.includes('requirement') || lower.includes('document') || lower.includes('card')) {
        botReply =
          'Enrollment requirements include:\n• Form 138 (Junior High School Report Card)\n• PSA Birth Certificate (photocopy)\n• Certificate of Good Moral Character\n• 2x2 ID Pictures with white background\n• 12-digit Learner Reference Number (LRN)';
      } else if (lower.includes('contact') || lower.includes('location') || lower.includes('address') || lower.includes('phone')) {
        botReply =
          '📍 Address: Langtad, City of Naga, Cebu\n📞 Phone: (032) 123-4567\n✉️ Email: info@PLSNHS.edu.ph\nOffice hours are Monday to Friday, 8:00 AM – 5:00 PM.';
      } else if (lower.includes('login') || lower.includes('password') || lower.includes('account')) {
        botReply =
          'You can sign in from the Login page using your registered email and password. If you forgot your password, click "Forgot Password" or ask your class adviser for assistance.';
      } else {
        botReply =
          'Thank you for your message! For official queries, you may also reach our Registrar office at info@PLSNHS.edu.ph or visit the administration building during office hours.';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: botReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 500);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 print:hidden">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2 rounded-full bg-emerald-700 hover:bg-emerald-800 px-3.5 py-2 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-emerald-600/40"
        >
          <div className="relative">
            <Bot className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          </div>
          <span className="text-xs font-bold tracking-wide">Ask PLSNHS Bot</span>
        </button>
      )}

      {isOpen && (
        <div className="flex h-[520px] w-96 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between bg-emerald-800 px-4 py-3.5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-900/60 border border-emerald-600">
                <Bot className="h-5 w-5 text-emerald-200" />
              </div>
              <div>
                <h4 className="text-sm font-bold flex items-center gap-1.5">
                  PLSNHS Bot <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                </h4>
                <p className="text-[11px] text-emerald-200">PLSNHS Virtual Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-emerald-200 hover:bg-emerald-700 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick prompts */}
          <div className="flex gap-1.5 overflow-x-auto bg-slate-50 px-3 py-2 border-b border-slate-100 no-scrollbar">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                className="whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-all shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-emerald-700 text-white rounded-br-none shadow-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <span
                    className={`block mt-1 text-[10px] ${
                      msg.sender === 'user' ? 'text-emerald-200 text-right' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-slate-200 bg-white p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about enrollment, strands..."
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white disabled:opacity-40 hover:bg-emerald-800 transition-colors shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
