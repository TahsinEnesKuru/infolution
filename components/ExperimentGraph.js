// components/ExperimentGraph.js
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import * as THREE from 'three';

// SSR false ile import
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
  ssr: false,
  loading: () => <div className="text-white p-4">Loading 3D Graph...</div>
});

export default function ExperimentGraph() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false); // Buton animasyonu için
  
  const fgRef = useRef();
  const containerRef = useRef();

  // Kapsayıcı boyutunu dinle
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  const refreshData = async () => {
    // Zaten yükleniyorsa tekrar basılmasını engelle
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      console.log("Graph: Veri yenileniyor...");
      const res = await fetch('/api/experiment?mode=all');
      const experiments = await res.json();
      
      const nodes = [];
      const links = [];

      if (Array.isArray(experiments)) {
        experiments.forEach((exp) => {
          if (exp.images && Array.isArray(exp.images)) {
            exp.images.forEach((img, index) => {
              const nodeId = `${exp.id}-${index}`;
              
              nodes.push({
                id: nodeId,
                imgUrl: img.url,
                name: `Step ${index}`, 
                val: index === 0 ? 30 : 15,
              });

              if (img.source !== null && img.source !== undefined) {
                const sourceId = `${exp.id}-${img.source}`;
                links.push({
                  source: sourceId,
                  target: nodeId,
                  linkLabel : img.prompt
                });
              }
            });
          }
        });
      }
      
      setGraphData({ nodes, links });
    } catch (err) {
      console.error("Graph verisi hatası:", err);
    } finally {
      // İşlem bitince animasyonu durdur (biraz gecikme verelim ki görünsün)
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Sadece ilk açılışta bir kere çalışır (Interval YOK)
  useEffect(() => {
    refreshData();
  }, []);

  const nodeThreeObject = useCallback((node) => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    const imgTexture = loader.load(node.imgUrl);
    imgTexture.colorSpace = THREE.SRGBColorSpace;
    
    const material = new THREE.SpriteMaterial({ map: imgTexture });
    const sprite = new THREE.Sprite(material);
    
    const scale = node.val;
    sprite.scale.set(scale, scale, 1);
    
    return sprite;
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full bg-gray-900 relative overflow-hidden rounded-xl shadow-2xl">
      
      {dimensions.width > 0 && (
        <ForceGraph3D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeThreeObject={nodeThreeObject}
          nodeLabel="name"
          backgroundColor="#111111"
          linkColor={() => "#ffffff"}
          linkWidth={1}
          showNavInfo={false}
          onEngineStop={() => fgRef.current.zoomToFit(400)}
        />
      )}
      
      {/* Sol Üst Bilgi */}
      <div className="absolute top-4 left-4 text-white bg-black/60 p-2 rounded pointer-events-none backdrop-blur-sm z-10">
        <h3 className="font-bold text-sm">Experiment Universe</h3>
        <p className="text-xs text-gray-300">
           Nodes: {graphData.nodes.length} | Links: {graphData.links.length}
        </p>
      </div>

      {/* --- YENİ REFRESH BUTONU (SAĞ ALT) --- */}
      <button
        onClick={refreshData}
        className="absolute bottom-6 right-6 bg-white hover:bg-gray-200 text-black p-3 rounded-full shadow-lg transition-all active:scale-95 z-50 group"
        title="Refresh Graph"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className={`w-6 h-6 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`}
        >
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
          <path d="M16 16h5v5" />
        </svg>
      </button>

    </div>
  );
}