'use client';
import { useState } from 'react';
import ExperimentGraph from '@/components/ExperimentGraph';
import { ArrowsRightLeftIcon, CubeTransparentIcon, BeakerIcon } from '@heroicons/react/24/solid';

export default function Home() {
  const [view, setView] = useState('HOME'); 
  const [showMobileGraph, setShowMobileGraph] = useState(false);
  
  const [experimentList, setExperimentList] = useState([]);
  const [selectedExperimentId, setSelectedExperimentId] = useState(null);
  const [currentImageCtx, setCurrentImageCtx] = useState(null); 
  
  const [description, setDescription] = useState('');
  const [newExpName, setNewExpName] = useState('');
  const [resultEntry, setResultEntry] = useState(null);

  // --- HANDLERS ---
  const handleShowList = async () => {
    setView('LOADING');
    try {
      const res = await fetch('/api/experiment');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setExperimentList(data);
        setView('LIST');
      } else {
        alert("Henüz hiç deney yok. Lütfen önce yeni bir tane başlatın.");
        setView('HOME');
      }
    } catch (err) {
      console.error(err);
      setView('HOME');
    }
  };

  const handleSelectExperiment = async (expId) => {
    setView('LOADING');
    setSelectedExperimentId(expId);
    try {
      const res = await fetch(`/api/experiment?id=${expId}`);
      const data = await res.json();
      setCurrentImageCtx(data);
      setView('DESCRIBE');
    } catch (err) {
      alert("Hata oluştu");
      setView('LIST');
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    const file = e.target.files[0];
    if (!file) return;

    setView('LOADING');
    const formData = new FormData();
    formData.append('type', 'start');
    formData.append('file', file);
    formData.append('name', newExpName || `Experiment #${Date.now()}`);

    try {
      await fetch('/api/experiment', { method: 'POST', body: formData });
      alert("Yeni deney başlatıldı! Şimdi listeye dönüp katılabilirsin.");
      setView('HOME');
    } catch (err) {
      alert('Yükleme başarısız');
      setView('HOME');
    }
  };

  const handleDescriptionSubmit = async () => {
    if (!description) return;
    setView('LOADING');

    const formData = new FormData();
    formData.append('type', 'generate');
    formData.append('prompt', description);
    formData.append('experimentId', selectedExperimentId);
    formData.append('sourceIndex', currentImageCtx.index); 

    try {
      const res = await fetch('/api/experiment', { method: 'POST', body: formData });
      const data = await res.json();
      setResultEntry(data.entry);
      setView('RESULT');
    } catch (err) {
      alert('Üretim başarısız');
      setView('DESCRIBE');
    }
  };

  return (
    <main className="flex h-screen w-full font-sans relative overflow-hidden text-white">
      
      {/* BACKGROUND IMAGE LAYER */}
      <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
              src="/background.jpg" 
              alt="Background" 
              className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      </div>

      {/* CONTENT LAYER */}
      <div className="relative z-10 flex w-full h-full">

        {/*Left Side (Visualization) */}
        <section 
          className={`
            transition-all duration-300
            h-full flex items-center justify-center relative p-0
            ${showMobileGraph ? 'w-full block' : 'hidden'} 
            md:w-1/2 md:block 
          `}
        >
          <div className="w-full h-full">
            <ExperimentGraph />
          </div>
        </section>

        {/*Right Side (Interaction)*/}
        <section 
          className={`
            h-full 
            overflow-y-auto
            ${!showMobileGraph ? 'w-full block' : 'hidden'} 
            md:w-1/2 md:block
            bg-white/10 backdrop-blur-xl border-l border-white/20 shadow-2xl
          `}
        >
          {/* ORTALAYICI WRAPPER: min-h-full kullanarak dikey ortalamayı garanti ediyoruz */}
          <div className="w-full min-h-full flex flex-col items-center justify-center p-6 md:p-12">
            
            {view === 'HOME' && (
              <div className="space-y-8 text-center max-w-md w-full animate-fadeIn">
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="/Logo.svg" 
                    alt="Infolution Logo" 
                    className="mx-auto w-auto h-12 md:h-16 object-contain mb-6 drop-shadow-lg"
                  />
                  <p className="text-gray-200 mt-4 text-lg font-light leading-relaxed">
                    A real-time generative platform tracing the evolution of information.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8 w-full">
                  <button onClick={() => setView('UPLOAD')} className="flex-1 py-4 bg-white/20 hover:bg-white/30 text-white rounded-full border border-white/30 backdrop-blur-md transition font-semibold shadow-lg">
                    Start New Experiment
                  </button>
                  <button onClick={handleShowList} className="flex-1 py-4 bg-white/20 hover:bg-white/30 text-white rounded-full border border-white/30 backdrop-blur-md transition font-semibold shadow-lg">
                    Join Existing Experiment
                  </button>
                </div>
              </div>
            )}

            {view === 'UPLOAD' && (
              <div className="w-full max-w-md space-y-6 p-8 bg-black/40 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl animate-fadeIn">
                <h2 className="text-2xl font-bold text-center">Start New Chain</h2>
                <div className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Experiment Name (Optional)" 
                    className="w-full p-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-white/50 focus:bg-white/10 transition"
                    onChange={(e) => setNewExpName(e.target.value)}
                  />
                  <div className="relative border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:bg-white/5 transition cursor-pointer">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <p className="text-gray-300 text-sm">Drag & drop or click to upload root image</p>
                  </div>
                </div>
                <button onClick={() => setView('HOME')} className="w-full text-sm text-gray-400 hover:text-white transition mt-2">Cancel</button>
              </div>
            )}

            {view === 'LIST' && (
              <div className="w-full max-w-md p-8 bg-black/40 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl animate-fadeIn h-[600px] flex flex-col">
                <h2 className="text-2xl font-bold mb-6 text-center">Select an Experiment</h2>
                <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                  {experimentList.map((exp) => (
                    <button 
                      key={exp.id}
                      onClick={() => handleSelectExperiment(exp.id)}
                      className="w-full p-4 text-left bg-white/5 border border-white/10 rounded-xl hover:bg-white/20 transition flex justify-between items-center group"
                    >
                      <span className="font-semibold truncate group-hover:text-white transition">{exp.name}</span>
                      <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-gray-300 group-hover:bg-white/30 transition">{exp.count} images</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setView('HOME')} className="mt-6 w-full py-2 text-sm text-gray-400 hover:text-white transition">Back to Home</button>
              </div>
            )}

            {view === 'DESCRIBE' && currentImageCtx && (
              <div className="w-full max-w-xl space-y-6 p-6 bg-black/40 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl animate-fadeIn">
                <div className="flex justify-between items-center">
                   <h2 className="text-xl font-bold">Describe what you see</h2>
                   <button onClick={() => setView('LIST')} className="text-xs text-gray-400 hover:text-white">Change Image</button>
                </div>
                
                <div className="rounded-2xl overflow-hidden bg-black/50 border border-white/10 shadow-inner relative group">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 pointer-events-none"></div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={currentImageCtx.image_data.url} alt="Source" className="w-full h-auto object-contain max-h-[350px] relative z-0 transition-transform duration-700 group-hover:scale-105" />
                </div>
                
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-4">
                  <textarea
                    className="w-full p-3 bg-transparent border-none text-white placeholder-gray-500 focus:outline-none resize-none h-24 text-lg"
                    placeholder="Describe in details (minimum: at least one word)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <div className="flex justify-end pt-2 border-t border-white/10">
                    <button onClick={handleDescriptionSubmit} className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition flex items-center gap-2 shadow-lg hover:shadow-white/20 transform hover:-translate-y-1">
                      <BeakerIcon className="w-5 h-5"/> Generate
                    </button>
                  </div>
                </div>
              </div>
            )}

            {view === 'LOADING' && (
              <div className="animate-pulse text-center p-12 bg-black/40 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl">
                <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
                <h3 className="text-xl font-bold mb-2">Processing...</h3>
                <p className="text-sm text-gray-400">Consulting the latent space</p>
              </div>
            )}

            {view === 'RESULT' && resultEntry && (
              <div className="w-full max-w-md text-center space-y-6 p-8 bg-black/40 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl animate-fadeIn">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">Added to Chain!</h2>
                <div className="p-2 bg-white/5 rounded-2xl border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resultEntry.url} alt="Result" className="w-full rounded-xl shadow-lg" />
                </div>
                <div className="bg-white/5 p-4 rounded-xl">
                  <p className="italic text-gray-300 text-lg">"{resultEntry.prompt}"</p>
                </div>
                <button 
                  onClick={() => {
                    setDescription('');
                    setResultEntry(null);
                    handleShowList(); 
                  }} 
                  className="w-full py-4 bg-white/10 border border-white/30 rounded-full hover:bg-white/20 transition font-semibold"
                >
                  Back to List
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* MOBILE TOGGLE BUTTON */}
      <button
        onClick={() => setShowMobileGraph(!showMobileGraph)}
        className="md:hidden fixed bottom-6 left-6 z-50 bg-white/10 text-white p-4 rounded-full shadow-2xl border border-white/30 backdrop-blur-md active:scale-90 transition-transform"
      >
        {showMobileGraph ? (
          <div className="flex items-center gap-2">
            <ArrowsRightLeftIcon className="w-6 h-6" />
            <span className="text-xs font-bold">Interaction</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
             <CubeTransparentIcon className="w-6 h-6" />
            <span className="text-xs font-bold">Graph</span>
          </div>
        )}
      </button>

    </main>
  );
}