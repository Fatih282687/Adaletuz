import React from 'react';
import { Shield, Scale, Gavel, ChevronLeft } from 'lucide-react';

const Hakkimizda = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Üst Header / Görsel Bölümü */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        {/* Adalet Temalı Arkaplan Görseli (Placeholder) */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=2070" 
            alt="Adalet ve Hukuk" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900"></div>
        </div>

        <div className="relative z-10 text-center px-6">
          <button 
            onClick={() => onNavigate('home')} 
            className="mb-8 inline-flex items-center gap-2 text-amber-500 hover:text-amber-400 transition-colors text-sm font-medium"
          >
            <ChevronLeft size={16} /> Anasayfa'ya Dön
          </button>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">Hakkımızda</h1>
          <div className="h-1.5 w-24 bg-amber-500 mx-auto rounded-full"></div>
        </div>
      </section>

      {/* İçerik Bölümü */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800/50 border border-slate-700/50 p-8 md:p-12 rounded-3xl backdrop-blur-sm shadow-2xl">
            <h2 className="text-2xl md:text-3xl font-bold text-amber-500 mb-8 leading-tight">
              Güvenle Geleceğe, Uzmanlıkla Çözüme
            </h2>

            <div className="space-y-6 text-slate-300 leading-relaxed text-lg">
              <p>
                Uzman Hukuk & Danışmanlık olarak, hukukun sadece kurallar bütünü değil, hak ve özgürlüklerin en güçlü kalesi olduğuna inanıyoruz. Değişen dünyanın getirdiği yeni nesil ihtiyaçları, köklü hukuk disipliniyle harmanlayarak müvekkillerimize dinamik çözümler sunuyoruz.
              </p>

              <div className="grid md:grid-cols-3 gap-6 my-10">
                <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                  <Scale className="text-amber-500 mb-3" size={24} />
                  <h3 className="text-white font-bold mb-1">İş Hukuku</h3>
                  <p className="text-xs text-slate-400">Çalışma hayatındaki haklarınızın güvencesi.</p>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                  <Gavel className="text-amber-500 mb-3" size={24} />
                  <h3 className="text-white font-bold mb-1">İcra İflas</h3>
                  <p className="text-xs text-slate-400">Alacak takibi ve finansal süreç yönetimi.</p>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                  <Shield className="text-amber-500 mb-3" size={24} />
                  <h3 className="text-white font-bold mb-1">Gayrimenkul</h3>
                  <p className="text-xs text-slate-400">Mülkiyet ve taşınmaz hukukunda uzmanlık.</p>
                </div>
              </div>

              <p>
                Hizmetlerimizde şeffaflık, mutlak gizlilik ve ulaşılabilirlik temel önceliklerimizdir. Kurumsal danışmanlık başta olmak üzere geniş bir yelpazede, her hukuki süreci büyük bir titizlikle yönetiyoruz. Sorunların henüz oluşmadan önlenmesi ve mevcut süreçlerin en efektif şekilde sonuçlandırılması için stratejik bir yaklaşımla hareket ediyoruz.
              </p>

              <p className="italic border-l-4 border-amber-500 pl-6 py-2 bg-amber-500/5 rounded-r-lg">
                "Bizim için her hukuki süreç sadece bir işlem değil, karşılıklı güvene dayalı bir yol arkadaşlığıdır. Bu bilinçle, ihtiyaçlarınızı en ince ayrıntısına kadar analiz ediyor, sizi dikkatle dinliyor ve menfaatlerinizi korumak için kararlılıkla çalışıyoruz."
              </p>

              <p>
                Gebze merkezli ofisimizden tüm Türkiye’ye uzanan bir güven köprüsü kurarak, hukuki güvenliğinizi sağlamak için buradayız.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Hakkimizda;